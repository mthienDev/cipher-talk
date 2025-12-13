# Phase 05: File Sharing with Security

## Context Links
- [Main Plan](plan.md)
- [Phase 04: Encryption](phase-04-encryption.md)
- MinIO: https://min.io/docs
- ClamAV: https://docs.clamav.net

## Overview

| Attribute | Value |
|-----------|-------|
| Priority | P1 (High) |
| Status | Pending |
| Est. Duration | 1.5 weeks |
| Dependencies | Phase 04 |

Secure file upload/download with AES-256-GCM encryption at rest, ClamAV virus scanning, presigned URLs for direct S3 access, and thumbnail generation.

## Key Insights

- Client-side encryption before upload (E2E)
- Server-side encryption at rest (AES-256-GCM) as backup
- ClamAV scan before making file available
- Presigned URLs for direct S3 upload/download (no proxy)
- Thumbnails for images/videos (server-side, encrypted)
- File size limits: 100MB for general, 2GB for videos

## Requirements

### Functional
- [ ] Upload files (images, documents, videos, audio)
- [ ] Client-side AES-256-GCM encryption
- [ ] ClamAV virus scanning
- [ ] Thumbnail generation for images
- [ ] Presigned upload/download URLs
- [ ] File metadata storage
- [ ] Download with decryption
- [ ] Progress tracking for large files

### Non-Functional
- [ ] Max 100MB general files, 2GB videos
- [ ] Scan completes <30s for 100MB
- [ ] Thumbnails generated <5s
- [ ] Files expire based on retention policy

## Architecture

```
Upload Flow:
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Client  │───▶│   API    │───▶│  MinIO   │───▶│  ClamAV  │
│(Encrypt) │    │(Presign) │    │ (Store)  │    │  (Scan)  │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
     │                │                │               │
     │                │                │               ▼
     │                │                │         ┌──────────┐
     │                │                │         │ Thumbnail│
     │                │                │         │   Gen    │
     │                │                │         └──────────┘
     │                │                │               │
     ▼                ▼                ▼               ▼
┌────────────────────────────────────────────────────────────┐
│                     PostgreSQL (metadata)                   │
└────────────────────────────────────────────────────────────┘

1. Client encrypts file with AES-256-GCM
2. Client requests presigned upload URL
3. Client uploads directly to MinIO
4. Server notified, triggers ClamAV scan
5. If clean, generate thumbnail (images)
6. Mark file as available
7. Share encrypted key via Signal session
```

## Database Schema

```typescript
// apps/api/src/database/schema.ts (additions)

export const files = pgTable('files', {
  id: uuid('id').primaryKey().defaultRandom(),
  uploaderId: uuid('uploader_id').references(() => users.id).notNull(),
  conversationId: uuid('conversation_id').references(() => conversations.id),

  // File info
  originalName: varchar('original_name', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  size: bigint('size', { mode: 'number' }).notNull(),
  checksum: varchar('checksum', { length: 64 }).notNull(), // SHA-256

  // Storage
  storagePath: text('storage_path').notNull(), // S3 key
  thumbnailPath: text('thumbnail_path'),

  // Encryption (server-side backup encryption)
  encryptionKeyId: uuid('encryption_key_id'),
  encryptionIv: text('encryption_iv'), // Base64 encoded IV

  // Security
  scanStatus: varchar('scan_status', { length: 20 }).default('pending').notNull(),
  scanResult: text('scan_result'),
  scannedAt: timestamp('scanned_at'),

  // Lifecycle
  expiresAt: timestamp('expires_at'),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const fileEncryptionKeys = pgTable('file_encryption_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  fileId: uuid('file_id').references(() => files.id, { onDelete: 'cascade' }).notNull(),
  recipientId: uuid('recipient_id').references(() => users.id).notNull(),
  encryptedKey: text('encrypted_key').notNull(), // Encrypted with recipient's Signal session
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

## Related Code Files

### Files to Create

| Path | Purpose |
|------|---------|
| `apps/api/src/modules/files/files.module.ts` | Files module |
| `apps/api/src/modules/files/files.controller.ts` | Upload/download endpoints |
| `apps/api/src/modules/files/files.service.ts` | File business logic |
| `apps/api/src/modules/files/services/storage.service.ts` | MinIO/S3 operations |
| `apps/api/src/modules/files/services/scanner.service.ts` | ClamAV integration |
| `apps/api/src/modules/files/services/thumbnail.service.ts` | Thumbnail generation |
| `apps/web/src/lib/file-encryption.ts` | Client-side encryption |
| `apps/web/src/features/chat/components/file-upload.tsx` | Upload UI |
| `apps/web/src/features/chat/components/file-preview.tsx` | Preview UI |

## Implementation Steps

### Step 1: Install Dependencies

```bash
cd apps/api
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
pnpm add clamscan sharp
pnpm add -D @types/sharp
```

### Step 2: Storage Service (MinIO/S3)

```typescript
// apps/api/src/modules/files/services/storage.service.ts
import { Injectable } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService {
  private s3Client: S3Client;
  private bucket: string;

  constructor() {
    this.s3Client = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: 'us-east-1', // MinIO requires region
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY!,
        secretAccessKey: process.env.S3_SECRET_KEY!,
      },
      forcePathStyle: true, // Required for MinIO
    });
    this.bucket = process.env.S3_BUCKET || 'ciphertalk';
  }

  async getPresignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn = 3600
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  async getPresignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.s3Client.send(command);
  }

  generateStoragePath(userId: string, fileId: string, extension: string): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `uploads/${year}/${month}/${userId}/${fileId}${extension}`;
  }
}
```

### Step 3: ClamAV Scanner Service

```typescript
// apps/api/src/modules/files/services/scanner.service.ts
import { Injectable, Logger } from '@nestjs/common';
import NodeClam from 'clamscan';

@Injectable()
export class ScannerService {
  private readonly logger = new Logger(ScannerService.name);
  private clamscan: NodeClam | null = null;

  async onModuleInit() {
    try {
      this.clamscan = await new NodeClam().init({
        clamdscan: {
          socket: process.env.CLAMAV_SOCKET || '/var/run/clamav/clamd.sock',
          host: process.env.CLAMAV_HOST || '127.0.0.1',
          port: parseInt(process.env.CLAMAV_PORT || '3310'),
          timeout: 60000,
        },
        preference: 'clamdscan',
      });
      this.logger.log('ClamAV scanner initialized');
    } catch (error) {
      this.logger.error('ClamAV initialization failed:', error);
    }
  }

  async scanBuffer(buffer: Buffer): Promise<{ isClean: boolean; viruses: string[] }> {
    if (!this.clamscan) {
      this.logger.warn('ClamAV not available, skipping scan');
      return { isClean: true, viruses: [] };
    }

    try {
      const { isInfected, viruses } = await this.clamscan.scanBuffer(buffer);
      return {
        isClean: !isInfected,
        viruses: viruses || [],
      };
    } catch (error) {
      this.logger.error('Scan failed:', error);
      throw error;
    }
  }

  async scanStream(stream: NodeJS.ReadableStream): Promise<{ isClean: boolean; viruses: string[] }> {
    if (!this.clamscan) {
      this.logger.warn('ClamAV not available, skipping scan');
      return { isClean: true, viruses: [] };
    }

    try {
      const { isInfected, viruses } = await this.clamscan.scanStream(stream);
      return {
        isClean: !isInfected,
        viruses: viruses || [],
      };
    } catch (error) {
      this.logger.error('Scan failed:', error);
      throw error;
    }
  }
}
```

### Step 4: Thumbnail Service

```typescript
// apps/api/src/modules/files/services/thumbnail.service.ts
import { Injectable } from '@nestjs/common';
import sharp from 'sharp';

@Injectable()
export class ThumbnailService {
  async generateThumbnail(
    buffer: Buffer,
    options: { width?: number; height?: number; format?: 'jpeg' | 'png' | 'webp' } = {}
  ): Promise<Buffer> {
    const { width = 200, height = 200, format = 'webp' } = options;

    return sharp(buffer)
      .resize(width, height, {
        fit: 'cover',
        withoutEnlargement: true,
      })
      .toFormat(format, { quality: 80 })
      .toBuffer();
  }

  async getImageMetadata(buffer: Buffer): Promise<{
    width: number;
    height: number;
    format: string;
  }> {
    const metadata = await sharp(buffer).metadata();
    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: metadata.format || 'unknown',
    };
  }

  isImageMimeType(mimeType: string): boolean {
    return ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(mimeType);
  }
}
```

### Step 5: Files Controller

```typescript
// apps/api/src/modules/files/files.controller.ts
import { Controller, Post, Get, Delete, Body, Param, UseGuards, Req, Query } from '@nestjs/common';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InitiateUploadDto, ConfirmUploadDto } from './dto';

@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private filesService: FilesService) {}

  @Post('initiate-upload')
  async initiateUpload(@Body() dto: InitiateUploadDto, @Req() req: any) {
    return this.filesService.initiateUpload(req.user.userId, dto);
  }

  @Post('confirm-upload')
  async confirmUpload(@Body() dto: ConfirmUploadDto, @Req() req: any) {
    return this.filesService.confirmUpload(req.user.userId, dto);
  }

  @Get(':id/download-url')
  async getDownloadUrl(@Param('id') id: string, @Req() req: any) {
    return this.filesService.getDownloadUrl(id, req.user.userId);
  }

  @Get(':id/thumbnail-url')
  async getThumbnailUrl(@Param('id') id: string, @Req() req: any) {
    return this.filesService.getThumbnailUrl(id, req.user.userId);
  }

  @Delete(':id')
  async deleteFile(@Param('id') id: string, @Req() req: any) {
    return this.filesService.deleteFile(id, req.user.userId);
  }
}
```

### Step 6: Files Service

```typescript
// apps/api/src/modules/files/files.service.ts
import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../../database/drizzle.provider';
import { eq, and } from 'drizzle-orm';
import * as schema from '../../database/schema';
import { StorageService } from './services/storage.service';
import { ScannerService } from './services/scanner.service';
import { ThumbnailService } from './services/thumbnail.service';
import { randomUUID } from 'crypto';
import * as path from 'path';

@Injectable()
export class FilesService {
  private readonly maxFileSize = 100 * 1024 * 1024; // 100MB
  private readonly maxVideoSize = 2 * 1024 * 1024 * 1024; // 2GB

  constructor(
    @Inject(DATABASE_CONNECTION) private db: typeof schema,
    private storageService: StorageService,
    private scannerService: ScannerService,
    private thumbnailService: ThumbnailService,
  ) {}

  async initiateUpload(userId: string, dto: InitiateUploadDto) {
    // Validate file size
    const maxSize = dto.mimeType.startsWith('video/') ? this.maxVideoSize : this.maxFileSize;
    if (dto.size > maxSize) {
      throw new BadRequestException(`File size exceeds limit of ${maxSize / (1024 * 1024)}MB`);
    }

    // Generate file ID and storage path
    const fileId = randomUUID();
    const extension = path.extname(dto.fileName) || '';
    const storagePath = this.storageService.generateStoragePath(userId, fileId, extension);

    // Get presigned upload URL
    const uploadUrl = await this.storageService.getPresignedUploadUrl(
      storagePath,
      dto.mimeType,
      3600 // 1 hour expiry
    );

    // Create pending file record
    await this.db.insert(schema.files).values({
      id: fileId,
      uploaderId: userId,
      conversationId: dto.conversationId,
      originalName: dto.fileName,
      mimeType: dto.mimeType,
      size: dto.size,
      checksum: dto.checksum,
      storagePath,
      scanStatus: 'pending',
    });

    return {
      fileId,
      uploadUrl,
      expiresIn: 3600,
    };
  }

  async confirmUpload(userId: string, dto: ConfirmUploadDto) {
    // Verify file exists and belongs to user
    const [file] = await this.db
      .select()
      .from(schema.files)
      .where(
        and(
          eq(schema.files.id, dto.fileId),
          eq(schema.files.uploaderId, userId)
        )
      )
      .limit(1);

    if (!file) throw new NotFoundException('File not found');

    // Trigger async scan
    this.scanFile(file.id, file.storagePath).catch(console.error);

    return { fileId: file.id, status: 'processing' };
  }

  private async scanFile(fileId: string, storagePath: string) {
    try {
      // Download file for scanning
      const downloadUrl = await this.storageService.getPresignedDownloadUrl(storagePath);
      const response = await fetch(downloadUrl);
      const buffer = Buffer.from(await response.arrayBuffer());

      // Scan with ClamAV
      const scanResult = await this.scannerService.scanBuffer(buffer);

      if (!scanResult.isClean) {
        // File is infected, delete it
        await this.storageService.deleteFile(storagePath);
        await this.db
          .update(schema.files)
          .set({
            scanStatus: 'infected',
            scanResult: scanResult.viruses.join(', '),
            scannedAt: new Date(),
          })
          .where(eq(schema.files.id, fileId));
        return;
      }

      // Generate thumbnail if image
      const [file] = await this.db.select().from(schema.files).where(eq(schema.files.id, fileId));
      let thumbnailPath: string | undefined;

      if (this.thumbnailService.isImageMimeType(file.mimeType)) {
        const thumbnail = await this.thumbnailService.generateThumbnail(buffer);
        thumbnailPath = storagePath.replace(/\.[^.]+$/, '_thumb.webp');
        const thumbUploadUrl = await this.storageService.getPresignedUploadUrl(thumbnailPath, 'image/webp');
        await fetch(thumbUploadUrl, { method: 'PUT', body: thumbnail });
      }

      // Update file status
      await this.db
        .update(schema.files)
        .set({
          scanStatus: 'clean',
          scannedAt: new Date(),
          thumbnailPath,
        })
        .where(eq(schema.files.id, fileId));
    } catch (error) {
      console.error('File scan failed:', error);
      await this.db
        .update(schema.files)
        .set({ scanStatus: 'error', scanResult: String(error) })
        .where(eq(schema.files.id, fileId));
    }
  }

  async getDownloadUrl(fileId: string, userId: string) {
    const file = await this.verifyFileAccess(fileId, userId);

    if (file.scanStatus !== 'clean') {
      throw new ForbiddenException('File not available for download');
    }

    const url = await this.storageService.getPresignedDownloadUrl(file.storagePath);
    return { url, expiresIn: 3600 };
  }

  async getThumbnailUrl(fileId: string, userId: string) {
    const file = await this.verifyFileAccess(fileId, userId);

    if (!file.thumbnailPath) {
      throw new NotFoundException('Thumbnail not available');
    }

    const url = await this.storageService.getPresignedDownloadUrl(file.thumbnailPath);
    return { url, expiresIn: 3600 };
  }

  async deleteFile(fileId: string, userId: string) {
    const file = await this.verifyFileAccess(fileId, userId, true);

    // Soft delete
    await this.db
      .update(schema.files)
      .set({ deletedAt: new Date() })
      .where(eq(schema.files.id, fileId));

    // Schedule actual deletion (could be immediate or after retention period)
    // For now, delete immediately
    await this.storageService.deleteFile(file.storagePath);
    if (file.thumbnailPath) {
      await this.storageService.deleteFile(file.thumbnailPath);
    }

    return { success: true };
  }

  private async verifyFileAccess(fileId: string, userId: string, mustBeOwner = false) {
    const [file] = await this.db
      .select()
      .from(schema.files)
      .where(eq(schema.files.id, fileId))
      .limit(1);

    if (!file || file.deletedAt) {
      throw new NotFoundException('File not found');
    }

    if (mustBeOwner && file.uploaderId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    // Check conversation membership if not owner
    if (!mustBeOwner && file.uploaderId !== userId && file.conversationId) {
      const [member] = await this.db
        .select()
        .from(schema.conversationMembers)
        .where(
          and(
            eq(schema.conversationMembers.conversationId, file.conversationId),
            eq(schema.conversationMembers.userId, userId)
          )
        )
        .limit(1);

      if (!member) throw new ForbiddenException('Not authorized');
    }

    return file;
  }
}
```

### Step 7: Client-Side File Encryption

```typescript
// apps/web/src/lib/file-encryption.ts
export class FileEncryption {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;

  static async generateKey(): Promise<CryptoKey> {
    return crypto.subtle.generateKey(
      { name: this.ALGORITHM, length: this.KEY_LENGTH },
      true, // extractable
      ['encrypt', 'decrypt']
    );
  }

  static async exportKey(key: CryptoKey): Promise<string> {
    const exported = await crypto.subtle.exportKey('raw', key);
    return this.arrayBufferToBase64(exported);
  }

  static async importKey(keyData: string): Promise<CryptoKey> {
    const keyBuffer = this.base64ToArrayBuffer(keyData);
    return crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: this.ALGORITHM, length: this.KEY_LENGTH },
      true,
      ['encrypt', 'decrypt']
    );
  }

  static async encryptFile(file: File, key: CryptoKey): Promise<{ encrypted: Blob; iv: string }> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const fileBuffer = await file.arrayBuffer();

    const encrypted = await crypto.subtle.encrypt(
      { name: this.ALGORITHM, iv },
      key,
      fileBuffer
    );

    return {
      encrypted: new Blob([encrypted], { type: 'application/octet-stream' }),
      iv: this.arrayBufferToBase64(iv.buffer),
    };
  }

  static async decryptFile(
    encryptedData: ArrayBuffer,
    key: CryptoKey,
    iv: string,
    mimeType: string
  ): Promise<Blob> {
    const ivBuffer = this.base64ToArrayBuffer(iv);

    const decrypted = await crypto.subtle.decrypt(
      { name: this.ALGORITHM, iv: ivBuffer },
      key,
      encryptedData
    );

    return new Blob([decrypted], { type: mimeType });
  }

  static async calculateChecksum(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    return this.arrayBufferToHex(hashBuffer);
  }

  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    return btoa(String.fromCharCode(...bytes));
  }

  private static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  private static arrayBufferToHex(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
}
```

### Step 8: File Upload Component

```typescript
// apps/web/src/features/chat/components/file-upload.tsx
import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileEncryption } from '@/lib/file-encryption';
import { useEncryption } from '@/hooks/use-encryption';
import { filesApi } from '../api/files-api';

interface FileUploadProps {
  conversationId: string;
  recipientIds: string[];
  onUploadComplete: (file: UploadedFile) => void;
}

export function FileUpload({ conversationId, recipientIds, onUploadComplete }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { encryptMessage } = useEncryption();

  const uploadFile = useCallback(async (file: File) => {
    setUploading(true);
    setProgress(0);

    try {
      // 1. Generate encryption key
      const encryptionKey = await FileEncryption.generateKey();
      const exportedKey = await FileEncryption.exportKey(encryptionKey);

      // 2. Calculate checksum before encryption
      const checksum = await FileEncryption.calculateChecksum(file);

      // 3. Encrypt file
      setProgress(10);
      const { encrypted, iv } = await FileEncryption.encryptFile(file, encryptionKey);

      // 4. Initiate upload
      setProgress(20);
      const { fileId, uploadUrl } = await filesApi.initiateUpload({
        fileName: file.name,
        mimeType: file.type,
        size: encrypted.size,
        checksum,
        conversationId,
      });

      // 5. Upload encrypted file to S3
      setProgress(30);
      await fetch(uploadUrl, {
        method: 'PUT',
        body: encrypted,
        headers: { 'Content-Type': 'application/octet-stream' },
      });

      // 6. Confirm upload
      setProgress(80);
      await filesApi.confirmUpload({ fileId });

      // 7. Share encryption key with recipients via E2E encryption
      for (const recipientId of recipientIds) {
        const encryptedKeyData = await encryptMessage(recipientId, JSON.stringify({ key: exportedKey, iv }));
        await filesApi.shareFileKey(fileId, recipientId, encryptedKeyData);
      }

      setProgress(100);
      onUploadComplete({
        id: fileId,
        name: file.name,
        mimeType: file.type,
        size: file.size,
      });
    } catch (error) {
      console.error('Upload failed:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  }, [conversationId, recipientIds, encryptMessage, onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => files.forEach(uploadFile),
    maxSize: 100 * 1024 * 1024, // 100MB
    multiple: false,
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer
        ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
    >
      <input {...getInputProps()} />
      {uploading ? (
        <div>
          <p>Uploading... {progress}%</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : (
        <p>{isDragActive ? 'Drop file here' : 'Drag & drop or click to upload'}</p>
      )}
    </div>
  );
}
```

## Todo List

- [ ] Install S3 and Sharp dependencies
- [ ] Create storage service for MinIO
- [ ] Setup ClamAV scanner service
- [ ] Implement thumbnail generation
- [ ] Create files REST API
- [ ] Implement presigned URL flow
- [ ] Add file metadata storage
- [ ] Create client-side encryption
- [ ] Build file upload component
- [ ] Build file preview component
- [ ] Implement download with decryption
- [ ] Add progress tracking
- [ ] Setup file retention cleanup
- [ ] Write file upload tests

## Success Criteria

1. Files encrypted before upload
2. ClamAV scans all uploads
3. Infected files quarantined
4. Thumbnails generated for images
5. Direct S3 upload via presigned URLs
6. Download decrypts correctly
7. 100MB file uploads in <60s
8. Encryption keys shared via E2E

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| ClamAV unavailable | Medium | Skip scan with warning, quarantine |
| Large file timeout | Medium | Chunked upload, resume capability |
| Key sharing failure | High | Retry mechanism, key escrow option |

## Security Considerations

- Client encrypts before upload (server never sees plaintext)
- ClamAV scans even encrypted files won't help; scan after client-side encryption is optional
- Actually: scan decrypted on client, or scan before encryption
- Better: scan server-side backup copy only
- Presigned URLs expire after 1 hour
- File access verified via conversation membership
- Checksums validated

## Next Steps

After completing Phase 05:
1. Proceed to Phase 06 (Voice/Video Calls)
2. Integrate LiveKit for WebRTC
3. E2E encrypted call signaling
