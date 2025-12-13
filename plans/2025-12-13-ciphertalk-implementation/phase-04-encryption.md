# Phase 04: End-to-End Encryption (E2E)

## Context Links
- [Main Plan](plan.md)
- [Phase 03: Messaging](phase-03-messaging.md)
- Signal Protocol: https://signal.org/docs/
- libsignal-protocol-typescript: https://github.com/nicktomlin/libsignal-protocol-typescript

## Overview

| Attribute | Value |
|-----------|-------|
| Priority | P0 (Critical) |
| Status | Pending |
| Est. Duration | 2 weeks |
| Dependencies | Phase 03 |

Implement Signal Protocol for E2E encryption. Server never sees plaintext messages. Per-conversation session keys with forward secrecy.

## Key Insights

- Signal Protocol: Double Ratchet + X3DH key agreement
- Pre-keys allow async key exchange (offline users)
- Forward secrecy: compromised key doesn't expose past messages
- Server stores encrypted messages only
- Key management in IndexedDB (browser) with backup option

## Requirements

### Functional
- [ ] Generate identity keys per user
- [ ] Pre-key bundle generation & upload
- [ ] X3DH key exchange for new conversations
- [ ] Message encryption with Signal Protocol
- [ ] Decrypt incoming messages
- [ ] Key rotation (ratchet)
- [ ] Multi-device key sync (optional MVP)

### Non-Functional
- [ ] Forward secrecy maintained
- [ ] Sub-50ms encrypt/decrypt
- [ ] Keys persist across sessions
- [ ] Recovery mechanism for key loss

## Architecture

```
Signal Protocol Components:
┌─────────────────────────────────────────────────────┐
│                    User A                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │  Identity   │  │   Signed    │  │   One-Time  │  │
│  │    Key      │  │   Pre-Key   │  │   Pre-Keys  │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────┘
         │                  │                  │
         ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────┐
│              Server (Pre-Key Bundle Storage)         │
│           Only stores PUBLIC keys                    │
└─────────────────────────────────────────────────────┘
         │                  │                  │
         ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────┐
│                    User B                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │  Identity   │  │   Signed    │  │   One-Time  │  │
│  │    Key      │  │   Pre-Key   │  │   Pre-Keys  │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────┘

X3DH Key Exchange:
1. Alice fetches Bob's pre-key bundle
2. Alice performs X3DH to derive shared secret
3. Alice initializes Double Ratchet session
4. Alice encrypts first message
5. Bob receives and completes key exchange
6. Both have synchronized session

Double Ratchet:
- Each message uses new encryption key
- Keys derived from chain of KDF operations
- Compromised key reveals only that message
```

## Database Schema Extensions

```typescript
// Server stores ONLY public keys and encrypted messages

export const userPreKeys = pgTable('user_pre_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),

  // Identity key (long-term, public only)
  identityKeyPublic: text('identity_key_public').notNull(),

  // Signed pre-key (medium-term, rotated periodically)
  signedPreKeyId: integer('signed_pre_key_id').notNull(),
  signedPreKeyPublic: text('signed_pre_key_public').notNull(),
  signedPreKeySignature: text('signed_pre_key_signature').notNull(),

  // Registration ID
  registrationId: integer('registration_id').notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const userOneTimePreKeys = pgTable('user_one_time_pre_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  keyId: integer('key_id').notNull(),
  publicKey: text('public_key').notNull(),
  used: boolean('used').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Messages table already stores encrypted content
// Metadata for group encryption
export const conversationSessions = pgTable('conversation_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').references(() => conversations.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  // Session state stored client-side, this is just for tracking
  sessionEstablished: boolean('session_established').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

## Related Code Files

### Files to Create

| Path | Purpose |
|------|---------|
| `apps/api/src/modules/encryption/encryption.module.ts` | Encryption module |
| `apps/api/src/modules/encryption/encryption.controller.ts` | Key bundle endpoints |
| `apps/api/src/modules/encryption/encryption.service.ts` | Key storage service |
| `apps/web/src/lib/signal/signal-protocol.ts` | Signal Protocol wrapper |
| `apps/web/src/lib/signal/key-storage.ts` | IndexedDB key store |
| `apps/web/src/lib/signal/session-manager.ts` | Session management |
| `apps/web/src/hooks/use-encryption.ts` | Encryption hook |
| `packages/shared/src/types/encryption.ts` | Encryption types |

## Implementation Steps

### Step 1: Install Dependencies

```bash
cd apps/web
pnpm add @privacyresearch/libsignal-protocol-typescript
pnpm add idb  # IndexedDB wrapper
```

### Step 2: Shared Encryption Types

```typescript
// packages/shared/src/types/encryption.ts
export interface PreKeyBundle {
  identityKey: string;      // Base64 encoded
  signedPreKey: {
    keyId: number;
    publicKey: string;      // Base64 encoded
    signature: string;      // Base64 encoded
  };
  preKey?: {
    keyId: number;
    publicKey: string;      // Base64 encoded
  };
  registrationId: number;
}

export interface EncryptedMessage {
  type: number;             // Signal message type
  body: string;             // Base64 encoded ciphertext
  registrationId: number;
}

export interface KeyUploadRequest {
  identityKey: string;
  signedPreKey: {
    keyId: number;
    publicKey: string;
    signature: string;
  };
  preKeys: Array<{
    keyId: number;
    publicKey: string;
  }>;
  registrationId: number;
}
```

### Step 3: Signal Protocol Wrapper

```typescript
// apps/web/src/lib/signal/signal-protocol.ts
import {
  SignalProtocolAddress,
  SessionBuilder,
  SessionCipher,
  PreKeyBundle,
  MessageType,
} from '@privacyresearch/libsignal-protocol-typescript';
import { SignalKeyStorage } from './key-storage';

export class SignalProtocolManager {
  private storage: SignalKeyStorage;
  private sessions: Map<string, SessionCipher> = new Map();

  constructor() {
    this.storage = new SignalKeyStorage();
  }

  async initialize(userId: string): Promise<void> {
    await this.storage.initialize(userId);

    // Generate identity keys if not exists
    if (!(await this.storage.hasIdentityKey())) {
      await this.generateIdentityKeys();
    }
  }

  private async generateIdentityKeys(): Promise<void> {
    const { KeyHelper } = await import('@privacyresearch/libsignal-protocol-typescript');

    // Generate registration ID (random 1-16380)
    const registrationId = KeyHelper.generateRegistrationId();
    await this.storage.put('registrationId', registrationId);

    // Generate identity key pair
    const identityKeyPair = await KeyHelper.generateIdentityKeyPair();
    await this.storage.put('identityKey', identityKeyPair);

    // Generate signed pre-key
    const signedPreKey = await KeyHelper.generateSignedPreKey(identityKeyPair, 1);
    await this.storage.storeSignedPreKey(1, signedPreKey.keyPair);
    await this.storage.put('signedPreKeySignature', signedPreKey.signature);

    // Generate one-time pre-keys (batch of 100)
    const preKeys = await KeyHelper.generatePreKeys(1, 100);
    for (const preKey of preKeys) {
      await this.storage.storePreKey(preKey.keyId, preKey.keyPair);
    }
  }

  async getPreKeyBundle(): Promise<PreKeyBundleData> {
    const registrationId = await this.storage.get('registrationId');
    const identityKey = await this.storage.getIdentityKeyPair();
    const signedPreKey = await this.storage.loadSignedPreKey(1);
    const signature = await this.storage.get('signedPreKeySignature');

    // Get available one-time pre-keys
    const preKeys = await this.storage.getAvailablePreKeys(10);

    return {
      registrationId,
      identityKey: this.arrayBufferToBase64(identityKey.pubKey),
      signedPreKey: {
        keyId: 1,
        publicKey: this.arrayBufferToBase64(signedPreKey.pubKey),
        signature: this.arrayBufferToBase64(signature),
      },
      preKeys: preKeys.map((pk) => ({
        keyId: pk.keyId,
        publicKey: this.arrayBufferToBase64(pk.keyPair.pubKey),
      })),
    };
  }

  async establishSession(recipientId: string, bundle: PreKeyBundle): Promise<void> {
    const address = new SignalProtocolAddress(recipientId, 1);
    const sessionBuilder = new SessionBuilder(this.storage, address);

    const preKeyBundle: PreKeyBundle = {
      registrationId: bundle.registrationId,
      identityKey: this.base64ToArrayBuffer(bundle.identityKey),
      signedPreKey: {
        keyId: bundle.signedPreKey.keyId,
        publicKey: this.base64ToArrayBuffer(bundle.signedPreKey.publicKey),
        signature: this.base64ToArrayBuffer(bundle.signedPreKey.signature),
      },
      preKey: bundle.preKey ? {
        keyId: bundle.preKey.keyId,
        publicKey: this.base64ToArrayBuffer(bundle.preKey.publicKey),
      } : undefined,
    };

    await sessionBuilder.processPreKey(preKeyBundle);
  }

  async encryptMessage(recipientId: string, plaintext: string): Promise<EncryptedMessage> {
    const address = new SignalProtocolAddress(recipientId, 1);

    let cipher = this.sessions.get(recipientId);
    if (!cipher) {
      cipher = new SessionCipher(this.storage, address);
      this.sessions.set(recipientId, cipher);
    }

    const encrypted = await cipher.encrypt(this.stringToArrayBuffer(plaintext));

    return {
      type: encrypted.type,
      body: this.arrayBufferToBase64(encrypted.body),
      registrationId: encrypted.registrationId,
    };
  }

  async decryptMessage(senderId: string, encrypted: EncryptedMessage): Promise<string> {
    const address = new SignalProtocolAddress(senderId, 1);

    let cipher = this.sessions.get(senderId);
    if (!cipher) {
      cipher = new SessionCipher(this.storage, address);
      this.sessions.set(senderId, cipher);
    }

    let plaintext: ArrayBuffer;

    if (encrypted.type === MessageType.PreKeyMessage) {
      // First message in session
      plaintext = await cipher.decryptPreKeyWhisperMessage(
        this.base64ToArrayBuffer(encrypted.body),
        'binary'
      );
    } else {
      // Regular message
      plaintext = await cipher.decryptWhisperMessage(
        this.base64ToArrayBuffer(encrypted.body),
        'binary'
      );
    }

    return this.arrayBufferToString(plaintext);
  }

  // Utility methods
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    return btoa(String.fromCharCode(...bytes));
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  private stringToArrayBuffer(str: string): ArrayBuffer {
    const encoder = new TextEncoder();
    return encoder.encode(str).buffer;
  }

  private arrayBufferToString(buffer: ArrayBuffer): string {
    const decoder = new TextDecoder();
    return decoder.decode(buffer);
  }
}

export const signalProtocol = new SignalProtocolManager();
```

### Step 4: IndexedDB Key Storage

```typescript
// apps/web/src/lib/signal/key-storage.ts
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { SignalProtocolStore } from '@privacyresearch/libsignal-protocol-typescript';

interface SignalDBSchema extends DBSchema {
  identityKeys: {
    key: string;
    value: ArrayBuffer;
  };
  preKeys: {
    key: number;
    value: {
      keyId: number;
      keyPair: { pubKey: ArrayBuffer; privKey: ArrayBuffer };
    };
  };
  signedPreKeys: {
    key: number;
    value: {
      keyId: number;
      keyPair: { pubKey: ArrayBuffer; privKey: ArrayBuffer };
    };
  };
  sessions: {
    key: string;
    value: ArrayBuffer;
  };
  misc: {
    key: string;
    value: any;
  };
}

export class SignalKeyStorage implements SignalProtocolStore {
  private db: IDBPDatabase<SignalDBSchema> | null = null;
  private userId: string = '';

  async initialize(userId: string): Promise<void> {
    this.userId = userId;
    this.db = await openDB<SignalDBSchema>(`signal-${userId}`, 1, {
      upgrade(db) {
        db.createObjectStore('identityKeys');
        db.createObjectStore('preKeys', { keyPath: 'keyId' });
        db.createObjectStore('signedPreKeys', { keyPath: 'keyId' });
        db.createObjectStore('sessions');
        db.createObjectStore('misc');
      },
    });
  }

  // Identity key methods
  async getIdentityKeyPair(): Promise<{ pubKey: ArrayBuffer; privKey: ArrayBuffer }> {
    return this.get('identityKey');
  }

  async getLocalRegistrationId(): Promise<number> {
    return this.get('registrationId');
  }

  async hasIdentityKey(): Promise<boolean> {
    const key = await this.get('identityKey');
    return key !== undefined;
  }

  // Trusted identity (for verification)
  async isTrustedIdentity(
    identifier: string,
    identityKey: ArrayBuffer,
    _direction: number
  ): Promise<boolean> {
    const trusted = await this.db!.get('identityKeys', identifier);
    if (!trusted) {
      // First time seeing this identity, trust it
      return true;
    }
    // Compare keys
    return this.compareArrayBuffers(trusted, identityKey);
  }

  async saveIdentity(identifier: string, identityKey: ArrayBuffer): Promise<boolean> {
    const existing = await this.db!.get('identityKeys', identifier);
    await this.db!.put('identityKeys', identityKey, identifier);
    return existing !== undefined;
  }

  // Pre-key methods
  async loadPreKey(keyId: number): Promise<{ pubKey: ArrayBuffer; privKey: ArrayBuffer }> {
    const preKey = await this.db!.get('preKeys', keyId);
    if (!preKey) throw new Error(`PreKey ${keyId} not found`);
    return preKey.keyPair;
  }

  async storePreKey(keyId: number, keyPair: { pubKey: ArrayBuffer; privKey: ArrayBuffer }): Promise<void> {
    await this.db!.put('preKeys', { keyId, keyPair });
  }

  async removePreKey(keyId: number): Promise<void> {
    await this.db!.delete('preKeys', keyId);
  }

  // Signed pre-key methods
  async loadSignedPreKey(keyId: number): Promise<{ pubKey: ArrayBuffer; privKey: ArrayBuffer }> {
    const signedPreKey = await this.db!.get('signedPreKeys', keyId);
    if (!signedPreKey) throw new Error(`SignedPreKey ${keyId} not found`);
    return signedPreKey.keyPair;
  }

  async storeSignedPreKey(keyId: number, keyPair: { pubKey: ArrayBuffer; privKey: ArrayBuffer }): Promise<void> {
    await this.db!.put('signedPreKeys', { keyId, keyPair });
  }

  async removeSignedPreKey(keyId: number): Promise<void> {
    await this.db!.delete('signedPreKeys', keyId);
  }

  // Session methods
  async loadSession(identifier: string): Promise<ArrayBuffer | undefined> {
    return this.db!.get('sessions', identifier);
  }

  async storeSession(identifier: string, record: ArrayBuffer): Promise<void> {
    await this.db!.put('sessions', record, identifier);
  }

  async removeSession(identifier: string): Promise<void> {
    await this.db!.delete('sessions', identifier);
  }

  async removeAllSessions(identifier: string): Promise<void> {
    const tx = this.db!.transaction('sessions', 'readwrite');
    const keys = await tx.store.getAllKeys();
    for (const key of keys) {
      if (key.toString().startsWith(identifier)) {
        await tx.store.delete(key);
      }
    }
  }

  // Misc storage
  async get(key: string): Promise<any> {
    return this.db!.get('misc', key);
  }

  async put(key: string, value: any): Promise<void> {
    await this.db!.put('misc', value, key);
  }

  async getAvailablePreKeys(count: number): Promise<Array<{ keyId: number; keyPair: any }>> {
    const all = await this.db!.getAll('preKeys');
    return all.slice(0, count);
  }

  private compareArrayBuffers(a: ArrayBuffer, b: ArrayBuffer): boolean {
    if (a.byteLength !== b.byteLength) return false;
    const viewA = new Uint8Array(a);
    const viewB = new Uint8Array(b);
    for (let i = 0; i < viewA.length; i++) {
      if (viewA[i] !== viewB[i]) return false;
    }
    return true;
  }
}
```

### Step 5: Backend Key Bundle API

```typescript
// apps/api/src/modules/encryption/encryption.controller.ts
import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { EncryptionService } from './encryption.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { KeyUploadDto } from './dto/key-upload.dto';

@Controller('encryption')
@UseGuards(JwtAuthGuard)
export class EncryptionController {
  constructor(private encryptionService: EncryptionService) {}

  @Post('keys')
  async uploadKeys(@Body() dto: KeyUploadDto, @Req() req: any) {
    return this.encryptionService.uploadKeys(req.user.userId, dto);
  }

  @Get('keys/:userId')
  async getPreKeyBundle(@Param('userId') userId: string) {
    return this.encryptionService.getPreKeyBundle(userId);
  }

  @Post('keys/replenish')
  async replenishPreKeys(@Body() dto: { preKeys: Array<{ keyId: number; publicKey: string }> }, @Req() req: any) {
    return this.encryptionService.replenishPreKeys(req.user.userId, dto.preKeys);
  }
}
```

```typescript
// apps/api/src/modules/encryption/encryption.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../../database/drizzle.provider';
import { eq, and } from 'drizzle-orm';
import * as schema from '../../database/schema';

@Injectable()
export class EncryptionService {
  constructor(@Inject(DATABASE_CONNECTION) private db: typeof schema) {}

  async uploadKeys(userId: string, dto: KeyUploadDto) {
    // Store/update pre-key bundle
    await this.db
      .insert(schema.userPreKeys)
      .values({
        userId,
        identityKeyPublic: dto.identityKey,
        signedPreKeyId: dto.signedPreKey.keyId,
        signedPreKeyPublic: dto.signedPreKey.publicKey,
        signedPreKeySignature: dto.signedPreKey.signature,
        registrationId: dto.registrationId,
      })
      .onConflictDoUpdate({
        target: [schema.userPreKeys.userId],
        set: {
          signedPreKeyId: dto.signedPreKey.keyId,
          signedPreKeyPublic: dto.signedPreKey.publicKey,
          signedPreKeySignature: dto.signedPreKey.signature,
          updatedAt: new Date(),
        },
      });

    // Store one-time pre-keys
    for (const preKey of dto.preKeys) {
      await this.db
        .insert(schema.userOneTimePreKeys)
        .values({
          userId,
          keyId: preKey.keyId,
          publicKey: preKey.publicKey,
        })
        .onConflictDoNothing();
    }

    return { success: true };
  }

  async getPreKeyBundle(userId: string): Promise<PreKeyBundle> {
    // Get main pre-key bundle
    const [bundle] = await this.db
      .select()
      .from(schema.userPreKeys)
      .where(eq(schema.userPreKeys.userId, userId))
      .limit(1);

    if (!bundle) {
      throw new NotFoundException('Pre-key bundle not found');
    }

    // Get one unused one-time pre-key
    const [oneTimePreKey] = await this.db
      .select()
      .from(schema.userOneTimePreKeys)
      .where(
        and(
          eq(schema.userOneTimePreKeys.userId, userId),
          eq(schema.userOneTimePreKeys.used, false)
        )
      )
      .limit(1);

    // Mark pre-key as used
    if (oneTimePreKey) {
      await this.db
        .update(schema.userOneTimePreKeys)
        .set({ used: true })
        .where(eq(schema.userOneTimePreKeys.id, oneTimePreKey.id));
    }

    return {
      identityKey: bundle.identityKeyPublic,
      signedPreKey: {
        keyId: bundle.signedPreKeyId,
        publicKey: bundle.signedPreKeyPublic,
        signature: bundle.signedPreKeySignature,
      },
      preKey: oneTimePreKey ? {
        keyId: oneTimePreKey.keyId,
        publicKey: oneTimePreKey.publicKey,
      } : undefined,
      registrationId: bundle.registrationId,
    };
  }

  async replenishPreKeys(userId: string, preKeys: Array<{ keyId: number; publicKey: string }>) {
    for (const preKey of preKeys) {
      await this.db
        .insert(schema.userOneTimePreKeys)
        .values({
          userId,
          keyId: preKey.keyId,
          publicKey: preKey.publicKey,
        })
        .onConflictDoNothing();
    }

    return { success: true, count: preKeys.length };
  }
}
```

### Step 6: Encryption Hook for UI

```typescript
// apps/web/src/hooks/use-encryption.ts
import { useEffect, useCallback, useRef } from 'react';
import { signalProtocol } from '@/lib/signal/signal-protocol';
import { useAuthStore } from '@/stores/auth-store';
import { encryptionApi } from '@/features/chat/api/encryption-api';

export function useEncryption() {
  const user = useAuthStore((s) => s.user);
  const initialized = useRef(false);

  useEffect(() => {
    if (!user || initialized.current) return;

    const init = async () => {
      await signalProtocol.initialize(user.id);

      // Upload keys to server
      const bundle = await signalProtocol.getPreKeyBundle();
      await encryptionApi.uploadKeys(bundle);

      initialized.current = true;
    };

    init().catch(console.error);
  }, [user]);

  const encryptMessage = useCallback(async (recipientId: string, plaintext: string) => {
    // Check if session exists
    const hasSession = await signalProtocol.hasSession(recipientId);

    if (!hasSession) {
      // Fetch recipient's pre-key bundle
      const bundle = await encryptionApi.getPreKeyBundle(recipientId);
      await signalProtocol.establishSession(recipientId, bundle);
    }

    return signalProtocol.encryptMessage(recipientId, plaintext);
  }, []);

  const decryptMessage = useCallback(async (senderId: string, encrypted: EncryptedMessage) => {
    return signalProtocol.decryptMessage(senderId, encrypted);
  }, []);

  return { encryptMessage, decryptMessage };
}
```

### Step 7: Integration with Chat

```typescript
// apps/web/src/features/chat/hooks/use-encrypted-chat.ts
import { useSocket } from '@/hooks/use-socket';
import { useEncryption } from '@/hooks/use-encryption';
import { useChatStore } from '../stores/chat-store';

export function useEncryptedChat(conversationId: string) {
  const { socket } = useSocket();
  const { encryptMessage, decryptMessage } = useEncryption();
  const addMessage = useChatStore((s) => s.addMessage);

  // Handle incoming encrypted messages
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = async (encryptedMsg: any) => {
      if (encryptedMsg.conversationId !== conversationId) return;

      try {
        const plaintext = await decryptMessage(encryptedMsg.senderId, {
          type: encryptedMsg.encryptedContent.type,
          body: encryptedMsg.encryptedContent.body,
          registrationId: encryptedMsg.encryptedContent.registrationId,
        });

        addMessage(conversationId, {
          ...encryptedMsg,
          content: plaintext,
        });
      } catch (error) {
        console.error('Failed to decrypt message:', error);
      }
    };

    socket.on('message:new', handleNewMessage);
    return () => { socket.off('message:new', handleNewMessage); };
  }, [socket, conversationId, decryptMessage, addMessage]);

  const sendEncryptedMessage = async (recipientId: string, plaintext: string) => {
    const encrypted = await encryptMessage(recipientId, plaintext);

    socket?.emit('message:send', {
      conversationId,
      encryptedContent: encrypted,
      type: 'text',
    });
  };

  return { sendEncryptedMessage };
}
```

## Todo List

- [ ] Install Signal Protocol library
- [ ] Create IndexedDB key storage
- [ ] Implement key generation
- [ ] Build Signal Protocol wrapper
- [ ] Create key bundle API endpoints
- [ ] Implement X3DH key exchange
- [ ] Implement message encryption
- [ ] Implement message decryption
- [ ] Add key rotation logic
- [ ] Create encryption hook
- [ ] Integrate with chat gateway
- [ ] Handle first-message key exchange
- [ ] Add pre-key replenishment
- [ ] Write encryption tests

## Success Criteria

1. Keys generated on first login
2. Pre-key bundle uploaded to server
3. New conversations establish session via X3DH
4. Messages encrypted before sending
5. Messages decrypted on receive
6. Server only sees ciphertext
7. Keys persist across browser sessions
8. Forward secrecy maintained

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Key loss | High | Key backup option, recovery mechanism |
| Library bugs | Medium | Use well-tested Signal implementation |
| IndexedDB cleared | High | Optional cloud key backup (encrypted) |
| Multi-device sync | Medium | Defer to future phase |

## Security Considerations

- Private keys never leave client
- Server stores only public keys
- Pre-keys consumed on use (one-time)
- Session keys rotated per message
- Fingerprint verification UI (future)
- Key backup encrypted with user password

## Next Steps

After completing Phase 04:
1. Proceed to Phase 05 (File Sharing)
2. Encrypt file content with AES-256-GCM
3. Use Signal session keys for file key exchange
