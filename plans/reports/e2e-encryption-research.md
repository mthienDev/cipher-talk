# End-to-End Encryption for Web Chat: Research Summary

## Signal Protocol

**Status**: Official implementation deprecated for browser use. Use @signalapp/libsignal-client (TypeScript, Rust-backed) for new apps. Community alternatives: @privacyresearch/libsignal-protocol-typescript uses WebCrypto + curve25519-typescript for pure browser support.

**Key Features**: Double Ratchet Algorithm, 3-DH handshake, prekey bundles. Provides forward secrecy & post-compromise security by generating unique keys per message.

## WebCrypto API

**Browser Support**: All modern browsers. W3C standard (Level 2 spec).

**Common Operations**:
- `crypto.subtle.generateKey()` - Generate key pairs (ECDH, ECDSA, AES)
- `crypto.subtle.deriveKey()` - ECDH key agreement, HKDF, PBKDF2
- `crypto.subtle.encrypt/decrypt()` - AES-GCM recommended
- `crypto.subtle.sign/verify()` - Ed25519, ECDSA

**Limitation**: Asynchronous only; slower than native libs but sufficient for chat.

## Key Exchange (ECDH)

**ECDH over traditional DH**: 256-bit ECDH ≈ 3072-bit DH. Uses elliptic curve math (P-256, Curve25519).

**Implementation**:
```typescript
// Generate ephemeral pair
const keyPair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, false, ["deriveKey"]);
// Perform key agreement
const sharedSecret = await crypto.subtle.deriveKey({ name: "ECDH", public: theirPublicKey }, myPrivateKey, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
```

**Forward Secrecy**: Ephemeral keys (ECDHE) discarded after use; past messages safe if future key compromised.

## Key Storage (IndexedDB)

**Reality**: No truly secure storage in browser. IndexedDB unencrypted at rest, accessible via DevTools.

**Best Practices**:
1. Store keys as non-extractable CryptoKeys (can't export key material via JavaScript)
2. Encrypt data with AES-GCM before IndexedDB storage
3. Derive encryption key from user passphrase (PBKDF2)
4. Store encrypted symmetric keys, not asymmetric keys
5. Use secure cookie flags for ephemeral session keys (though cookies have size limits)

**Libraries**: secure-webstore (promise-based, passphrase-derived encryption); RxDB premium plugin (10x faster with Web Crypto integration).

## Forward Secrecy & Double Ratchet

**Double Ratchet combines**:
- DH ratchet: Each message uses fresh DH exchange
- KDF ratchet: Key derivation function chains (hash-based)

**Result**: Perfect forward secrecy (old keys unrecoverable from new ones) + post-compromise recovery (isolated compromise doesn't break future security).

**Implementation**: Chain KDF outputs: `nextKey = HKDF(currentKey, DH_output)`.

## E2E Libraries (Browser)

| Library | Type | Support | Notes |
|---------|------|---------|-------|
| @signalapp/libsignal-client | Official Signal | TypeScript, Rust core | Production-ready but heavier; needs build setup |
| @privacyresearch/libsignal-protocol-typescript | Community Signal | Pure TS, WebCrypto | Browser-native, lighter, recommended for browser |
| olm + megolm.js | Matrix protocol | JS/C++ hybrid | Olm for 1:1, Megolm for groups (jitsi/megolm.js) |
| TweetNaCl.js | Generic | JS only | Educational; lacks Signal-style ratcheting |

**Recommendation**: Use @privacyresearch/libsignal-protocol-typescript for browser chat (pure TS) OR raw WebCrypto + custom ratcheting (KISS principle).

## Group Chat Encryption Challenges

**Key Issues**:

1. **Key Distribution**: Must securely share group key with all members without exposure.
   - Pairwise: Encrypt message N times (doesn't scale; ~Signal approach)
   - Shared group key: Encrypt once with symmetric key, distribute via 1:1 encrypted channels (Megolm)
   - MLS: Hierarchical key exchange (IETF standard, emerging)

2. **Forward Secrecy Weakness**: Group keys static per member. If compromised, past messages exposed. Megolm offers weak forward secrecy (key refresh needed).

3. **Membership Changes**: Adding/removing members requires re-keying group (expensive for large groups).

4. **Scalability**: O(N) messages for N members with pairwise; O(1) with shared key + distribution overhead.

**Megolm Solution**:
- Each sender has own outbound ratchet session
- Shares public signing key + encrypted ratchet state via Olm (1:1 encrypted)
- Receiver derives decryption key from shared state
- Trades off perfect forward secrecy for simplicity & scalability

## TypeScript/JavaScript Integration

**Minimal E2E Stack**:
```typescript
// 1. Key agreement
const dh = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, false, ["deriveKey"]);

// 2. Derive shared secret
const secret = await crypto.subtle.deriveKey({ name: "ECDH", public: theirPub }, myPrivate, { name: "HKDF" }, false, []);

// 3. Ratchet forward
const key = await crypto.subtle.deriveKey({ name: "HKDF", salt, hash: "SHA-256", info, length: 256 }, secret, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);

// 4. Encrypt
const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);

// 5. Store (encrypted)
const storageKey = await crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, userPassphrase, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
const encryptedKey = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, storageKey, JSON.stringify(keyPair));
await indexedDB.store(encryptedKey);
```

**Trade-offs**:
- WebCrypto: Lightweight, native, browser-compatible, slower
- libsignal: Production-proven, heavier build, Rust core
- Custom ratchet: Maximum control, high audit burden

## Unresolved Questions

1. How to handle key rotation/refresh in group chats without server trust?
2. Optimal IndexedDB encryption performance (async WebCrypto bottleneck)?
3. Browser support for Curve25519 (P-256 common but Signal uses Curve25519 ECDH)?
4. Recovery mechanisms if user loses password/key (key escrow tradeoffs)?

---

**Sources**:
- [Signal Protocol Official](https://signal.org/docs/)
- [Double Ratchet Algorithm](https://signal.org/docs/specifications/doubleratchet/)
- [WebCrypto API Spec](https://w3c.github.io/webcrypto/)
- [End-to-End Encrypted Chat with Web Crypto API](https://getstream.io/blog/web-crypto-api-chat/)
- [libsignal-client NPM](https://www.npmjs.com/package/@signalapp/libsignal-client)
- [libsignal-protocol-typescript](https://github.com/privacyresearchgroup/libsignal-protocol-typescript)
- [Olm/Megolm](https://github.com/matrix-org/olm/)
- [Megolm.js](https://github.com/jitsi/megolm.js/)
- [Group Chat E2E Challenges](https://blog.trailofbits.com/2019/08/06/better-encrypted-group-chat/)
- [ECDH Key Exchange](https://www.keithbartholomew.com/blog/posts/2024-01-22-webcrypto-diffie-hellman)
- [IndexedDB Key Storage](https://gist.github.com/saulshanabrook/b74984677bccd08b028b30d9968623f5)
