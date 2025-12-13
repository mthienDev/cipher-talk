# Research Report: Secure File Sharing for Enterprise Chat

**Date:** December 13, 2025
**Focus:** TypeScript/Node.js stack, enterprise-grade implementation

---

## Executive Summary

Enterprise file sharing requires multi-layered approach: chunked uploads (resumable via TUS/UpChunk), S3-compatible storage (AWS S3 or MinIO for on-premise), virus scanning (ClamAV via clamscan npm), AES-256-GCM encryption at rest, and RBAC with per-file quotas. Prioritize simple, battle-tested libraries over custom implementations.

---

## Key Findings

### File Upload Strategy: Chunking & Resumability

**Best Practice:** Implement TUS (Tus Resumable Upload Protocol) or use UpChunk library.

**Libraries:**
- `@mux/upchunk` - Client-side chunking (v3.5.0, actively maintained)
- `huge-uploader-nodejs` - Server-side reassembly
- `multer` - Express middleware for chunk handling

**Implementation:** Split 1GB+ files into 5-10MB chunks. If upload fails mid-stream, only failed chunks re-upload. Dramatically reduces bandwidth for resume scenarios.

---

### Storage Solutions

**Production:** AWS S3 (managed, 11-9s durability)
**On-Premise:** MinIO (S3-compatible, AGPLv3)
**Local Dev:** MinIO in Docker

**TypeScript Integration:**
```typescript
// AWS SDK v3
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// MinIO SDK
import * as Minio from 'minio';
const minioClient = new Minio.Client({
  endPoint: 'localhost',
  port: 9000,
  useSSL: false,
  accessKey: 'minioadmin',
  secretKey: 'minioadmin'
});
```

**Decision:** S3 for managed ops, MinIO for compliance/data residency.

---

### Virus Scanning: ClamAV Integration

**Package:** `clamscan` (npm, supports file/stream/buffer scanning)

**Architecture:**
1. Upload file to temp directory
2. Scan via ClamAV daemon (TCP socket or binary)
3. If clean, move to permanent storage; if infected, quarantine/reject
4. Return metadata to client

**Setup:**
```bash
# Install ClamAV daemon
apt install clamav-daemon clamav-freshclam

# Node.js integration
npm install clamscan
```

**Performance:** ~10-50ms per file depending on size (use stream scanning for large files).

---

### Encryption at Rest

**Algorithm:** AES-256-GCM (authenticated encryption, preferred over CBC)

**Key Management:**
- Store encryption key in secret manager (HashiCorp Vault, AWS Secrets Manager)
- Never commit keys to git
- Rotate keys quarterly (track via metadata)
- Use per-file IV (initialization vector)

**Implementation Pattern:**
```typescript
const iv = crypto.randomBytes(16);
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
const encrypted = Buffer.concat([
  cipher.update(data),
  cipher.final()
]);
const authTag = cipher.getAuthTag();
// Store: {encrypted, iv, authTag, algorithm}
```

---

### Access Control & File-Level Permissions

**RBAC Framework:** node-casbin (supports ACL, RBAC, ABAC)

**Per-File Controls:**
- File owner (implicit admin)
- Role-based access (viewer, editor, admin)
- Time-limited shares (expiring links)
- IP-based restrictions (optional)

**Quotas & Limits:**
- Per-user: 10GB storage default
- Per-file: 500MB max (configurable)
- Rate limiting: 5 files/min per user
- Enforce at middleware level before upload starts

**Example Check:**
```typescript
const userQuotaUsed = await getUserStorageUsed(userId);
const fileSize = req.headers['content-length'];
if (userQuotaUsed + fileSize > USER_QUOTA) {
  throw new QuotaExceededError();
}
```

---

### Content Type Validation

**Whitelist Approach (mandatory):**
```typescript
const ALLOWED_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'video/mp4',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  // Expand per requirements
]);

if (!ALLOWED_TYPES.has(req.file.mimetype)) {
  throw new InvalidContentTypeError();
}

// Double-check via file magic bytes (file-type npm package)
const fileType = await FileType.fromBuffer(buffer);
if (!ALLOWED_TYPES.has(fileType.mime)) {
  throw new InvalidContentTypeError('Magic bytes mismatch');
}
```

---

## Architecture Overview

```
┌─────────────┐
│   Client    │ (UpChunk library, chunked POST)
└──────┬──────┘
       │
┌──────▼──────────────────────────────────┐
│  Node.js API (Express/NestJS)           │
│  ├─ Chunk receiver (multer)             │
│  ├─ Quota check middleware              │
│  ├─ Content-type validator              │
│  └─ ClamAV scanner trigger              │
└──────┬──────────────────────────────────┘
       │
┌──────▼──────────────────────────────────┐
│  ClamAV Daemon (virus scan)             │
└──────┬──────────────────────────────────┘
       │ (clean/infected)
┌──────▼──────────────────────────────────┐
│  Encryption Layer (AES-256-GCM)         │
└──────┬──────────────────────────────────┘
       │
┌──────▼──────────────────────────────────┐
│  Storage Backend                        │
│  ├─ S3 (AWS) or MinIO (on-prem)        │
│  └─ File metadata DB (PostgreSQL)       │
└──────────────────────────────────────────┘

Access Layer:
├─ Download: Check RBAC + file ownership
├─ Share: Generate signed URLs (1h expiry)
└─ Delete: Owner/admin only
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1)
- [ ] Set up chunk upload endpoint (multer + directory for temp)
- [ ] Implement quota middleware
- [ ] Add content-type validator

### Phase 2: Scanning & Encryption (Week 2)
- [ ] Integrate ClamAV
- [ ] Implement AES-256-GCM encryption
- [ ] Store encryption metadata (iv, authTag, algorithm)

### Phase 3: Storage & Access (Week 3)
- [ ] Configure S3/MinIO client
- [ ] Implement file metadata DB schema
- [ ] Build RBAC permission checks (node-casbin)

### Phase 4: Polish (Week 4)
- [ ] Add signed URLs for downloads
- [ ] Implement share links with expiry
- [ ] Add audit logging (who accessed what, when)

---

## Critical Dependencies

| Package | Purpose | Latest | Notes |
|---------|---------|--------|-------|
| @mux/upchunk | Client chunking | 3.5.0 | Use for FE |
| multer | Server multipart | 1.4.5+ | Stream config |
| clamscan | Virus scanning | 2.12.1+ | Requires ClamAV daemon |
| @aws-sdk/client-s3 | S3 client | 3.x | Or `minio` npm |
| node-casbin | RBAC engine | 5.x | Declarative rules |
| crypto | AES encryption | Built-in Node | No external dep |

---

## Security Checklist

- [ ] All file uploads scanned before storage
- [ ] Encryption keys rotated quarterly
- [ ] File access logged (audit trail)
- [ ] Quotas enforced per user/org
- [ ] Content-type validated (magic bytes + MIME)
- [ ] Uploaded files outside webroot (no direct HTTP)
- [ ] Signed URLs expire within 1 hour
- [ ] Delete operations cascade (chunks + metadata)
- [ ] Temp upload directory cleaned on failure

---

## Unresolved Questions

1. **File versioning:** Keep all versions or single latest? (impacts storage cost)
2. **Soft delete:** Trash/recovery period before permanent deletion?
3. **Audit retention:** How long to keep access logs? (compliance requirement)
4. **Encryption key escrow:** Backup strategy if key manager fails?
5. **Rate limiting granularity:** Per file, per session, per IP, or all?

---

## Sources

- [UpChunk - Mux](https://github.com/muxinc/upchunk)
- [Resumable File Upload Pattern](https://www.w3tutorials.net/blog/resumable-file-upload-nodejs/)
- [Chunked Uploads Guide - Ionic Frameworks](https://www.ionicframeworks.com/2025/08/handling-large-file-uploads-in-nodejs.html)
- [MinIO Official](https://www.min.io/)
- [MinIO TypeScript Guide](https://www.webdevtutor.net/blog/typescript-minio-client)
- [ClamAV Integration - DEV Community](https://dev.to/jfbloom22/how-to-virus-scan-file-users-upload-using-clamav-2i5d)
- [ClamAV in Node.js - Transloadit](https://transloadit.com/devtips/implementing-server-side-malware-scanning-with-clamav-in-node-js/)
- [AES Encryption TypeScript - DEV Community](https://dev.to/ruffiano/understanding-and-implementing-advanced-encryption-standard-aes-in-nodejs-with-typescript-57lh)
- [Node.js Crypto Module Guide - Medium](https://medium.com/@tony.infisical/guide-to-nodes-crypto-module-for-encryption-decryption-65c077176980)
- [RBAC in Node.js - Permify](https://permify.co/post/role-based-access-control-rbac-nodejs-expressjs/)
- [node-casbin Authorization Library](https://github.com/casbin/node-casbin)
- [AccessControl for RBAC/ABAC - LogRocket](https://blog.logrocket.com/using-accesscontrol-for-rbac-and-abac-in-node-js/)
