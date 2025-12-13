# Phase 08: Audit Logging & Compliance

## Context Links
- [Main Plan](plan.md)
- [Phase 02: Auth](phase-02-authentication.md)
- [Phase 03: Messaging](phase-03-messaging.md)

## Overview

| Attribute | Value |
|-----------|-------|
| Priority | P1 (High) |
| Status | Pending |
| Est. Duration | 1 week |
| Dependencies | Phase 02, 03, 05 |

Enterprise compliance features: comprehensive audit logging, data retention policies, GDPR/compliance exports, admin dashboard for log review.

## Key Insights

- Audit logs immutable (append-only)
- Separate audit database for security
- Log auth, messaging, file, and admin events
- Data retention: configurable per org
- GDPR export generates user data package
- Admin UI for log search and filtering

## Requirements

### Functional
- [ ] Log all authentication events
- [ ] Log messaging actions (create, delete)
- [ ] Log file operations
- [ ] Log admin actions
- [ ] Admin audit log viewer
- [ ] Data retention enforcement
- [ ] GDPR data export
- [ ] GDPR data deletion
- [ ] Compliance reports

### Non-Functional
- [ ] Logs tamper-evident
- [ ] Log queries <500ms
- [ ] 90-day default retention
- [ ] Export completes in <1hr

## Architecture

```
Audit Log Flow:
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Service │────▶│  Audit   │────▶│ PostgreSQL│
│  Action  │     │Interceptor│    │ (audit_db)│
└──────────┘     └──────────┘     └──────────┘
                      │
                      ▼
                ┌──────────┐
                │  Queue   │ (async for high-volume)
                │ (Redis)  │
                └──────────┘

Event Categories:
- AUTH: login, logout, password_change, 2fa_enabled
- MESSAGE: sent, deleted, edited
- FILE: uploaded, downloaded, deleted
- CONVERSATION: created, member_added, member_removed
- ADMIN: role_changed, user_suspended, config_changed
- SECURITY: failed_login, suspicious_activity
```

## Database Schema

```typescript
// apps/api/src/database/audit-schema.ts
// Separate schema for audit logs

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Event identification
  eventType: varchar('event_type', { length: 50 }).notNull(),
  eventCategory: varchar('event_category', { length: 20 }).notNull(),
  // AUTH | MESSAGE | FILE | CONVERSATION | ADMIN | SECURITY

  // Actor (who performed the action)
  actorId: uuid('actor_id'), // null for system events
  actorType: varchar('actor_type', { length: 20 }), // 'user' | 'system' | 'admin'
  actorIp: varchar('actor_ip', { length: 45 }),
  actorUserAgent: text('actor_user_agent'),

  // Target (what was affected)
  targetType: varchar('target_type', { length: 50 }),
  targetId: uuid('target_id'),

  // Event details
  details: jsonb('details'), // Event-specific data
  previousState: jsonb('previous_state'), // For updates
  newState: jsonb('new_state'),

  // Context
  conversationId: uuid('conversation_id'),
  organizationId: uuid('organization_id'),

  // Metadata
  success: boolean('success').default(true).notNull(),
  errorMessage: text('error_message'),

  // Immutability
  checksum: varchar('checksum', { length: 64 }).notNull(), // SHA-256 of event
  previousChecksum: varchar('previous_checksum', { length: 64 }), // Chain

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Indexes for common queries
// CREATE INDEX audit_logs_actor_idx ON audit_logs(actor_id, created_at DESC);
// CREATE INDEX audit_logs_target_idx ON audit_logs(target_type, target_id, created_at DESC);
// CREATE INDEX audit_logs_category_idx ON audit_logs(event_category, created_at DESC);
// CREATE INDEX audit_logs_created_idx ON audit_logs(created_at DESC);

// Data retention configuration
export const retentionPolicies = pgTable('retention_policies', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id'),
  resourceType: varchar('resource_type', { length: 50 }).notNull(),
  // 'messages' | 'files' | 'audit_logs' | 'call_history'
  retentionDays: integer('retention_days').notNull(),
  deleteAction: varchar('delete_action', { length: 20 }).default('soft').notNull(),
  // 'soft' | 'hard' | 'archive'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// GDPR data requests
export const dataRequests = pgTable('data_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  requestType: varchar('request_type', { length: 20 }).notNull(),
  // 'export' | 'delete'
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  // 'pending' | 'processing' | 'completed' | 'failed'
  exportUrl: text('export_url'), // Presigned URL for download
  expiresAt: timestamp('expires_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

## Related Code Files

### Files to Create

| Path | Purpose |
|------|---------|
| `apps/api/src/modules/audit/audit.module.ts` | Audit module |
| `apps/api/src/modules/audit/audit.service.ts` | Audit logging logic |
| `apps/api/src/modules/audit/audit.interceptor.ts` | Auto-logging interceptor |
| `apps/api/src/modules/audit/audit.controller.ts` | Admin audit endpoints |
| `apps/api/src/modules/compliance/compliance.module.ts` | Compliance module |
| `apps/api/src/modules/compliance/compliance.service.ts` | GDPR exports, retention |
| `apps/api/src/modules/compliance/retention.service.ts` | Retention enforcement |
| `apps/web/src/features/admin/components/audit-log-viewer.tsx` | Admin UI |
| `apps/web/src/features/settings/components/data-export.tsx` | User data export |

## Implementation Steps

### Step 1: Audit Service

```typescript
// apps/api/src/modules/audit/audit.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { createHash } from 'crypto';
import { Redis } from 'ioredis';
import { DATABASE_CONNECTION } from '../../database/drizzle.provider';
import * as schema from '../../database/audit-schema';
import { desc, eq, and, gte, lte, sql } from 'drizzle-orm';

export interface AuditEvent {
  eventType: string;
  eventCategory: 'AUTH' | 'MESSAGE' | 'FILE' | 'CONVERSATION' | 'ADMIN' | 'SECURITY';
  actorId?: string;
  actorType?: 'user' | 'system' | 'admin';
  actorIp?: string;
  actorUserAgent?: string;
  targetType?: string;
  targetId?: string;
  details?: Record<string, any>;
  previousState?: Record<string, any>;
  newState?: Record<string, any>;
  conversationId?: string;
  organizationId?: string;
  success?: boolean;
  errorMessage?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private redis: Redis;
  private lastChecksum: string | null = null;

  constructor(@Inject(DATABASE_CONNECTION) private db: typeof schema) {
    this.redis = new Redis(process.env.REDIS_URL);
  }

  async log(event: AuditEvent): Promise<void> {
    try {
      // Calculate checksum for tamper detection
      const eventData = JSON.stringify({
        ...event,
        timestamp: new Date().toISOString(),
        previousChecksum: this.lastChecksum,
      });
      const checksum = createHash('sha256').update(eventData).digest('hex');

      await this.db.insert(schema.auditLogs).values({
        ...event,
        checksum,
        previousChecksum: this.lastChecksum,
        success: event.success ?? true,
      });

      this.lastChecksum = checksum;
    } catch (error) {
      this.logger.error('Failed to write audit log:', error);
      // Queue for retry
      await this.redis.rpush('audit:retry', JSON.stringify(event));
    }
  }

  async logAsync(event: AuditEvent): Promise<void> {
    // Push to queue for async processing
    await this.redis.rpush('audit:queue', JSON.stringify(event));
  }

  async query(options: {
    actorId?: string;
    targetType?: string;
    targetId?: string;
    eventCategory?: string;
    eventType?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    const {
      actorId,
      targetType,
      targetId,
      eventCategory,
      eventType,
      startDate,
      endDate,
      limit = 100,
      offset = 0,
    } = options;

    const conditions = [];

    if (actorId) conditions.push(eq(schema.auditLogs.actorId, actorId));
    if (targetType) conditions.push(eq(schema.auditLogs.targetType, targetType));
    if (targetId) conditions.push(eq(schema.auditLogs.targetId, targetId));
    if (eventCategory) conditions.push(eq(schema.auditLogs.eventCategory, eventCategory));
    if (eventType) conditions.push(eq(schema.auditLogs.eventType, eventType));
    if (startDate) conditions.push(gte(schema.auditLogs.createdAt, startDate));
    if (endDate) conditions.push(lte(schema.auditLogs.createdAt, endDate));

    const logs = await this.db
      .select()
      .from(schema.auditLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(schema.auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    return logs;
  }

  async verifyIntegrity(logId: string): Promise<boolean> {
    const [log] = await this.db
      .select()
      .from(schema.auditLogs)
      .where(eq(schema.auditLogs.id, logId))
      .limit(1);

    if (!log) return false;

    // Recalculate checksum
    const eventData = JSON.stringify({
      eventType: log.eventType,
      eventCategory: log.eventCategory,
      actorId: log.actorId,
      targetType: log.targetType,
      targetId: log.targetId,
      details: log.details,
      timestamp: log.createdAt.toISOString(),
      previousChecksum: log.previousChecksum,
    });
    const calculatedChecksum = createHash('sha256').update(eventData).digest('hex');

    return calculatedChecksum === log.checksum;
  }

  // Predefined event helpers
  async logAuth(type: string, actorId: string, details: Record<string, any>, req?: any) {
    await this.log({
      eventType: type,
      eventCategory: 'AUTH',
      actorId,
      actorType: 'user',
      actorIp: req?.ip,
      actorUserAgent: req?.headers?.['user-agent'],
      details,
    });
  }

  async logMessage(type: string, actorId: string, messageId: string, conversationId: string, details?: Record<string, any>) {
    await this.logAsync({
      eventType: type,
      eventCategory: 'MESSAGE',
      actorId,
      actorType: 'user',
      targetType: 'message',
      targetId: messageId,
      conversationId,
      details,
    });
  }

  async logFile(type: string, actorId: string, fileId: string, details?: Record<string, any>) {
    await this.log({
      eventType: type,
      eventCategory: 'FILE',
      actorId,
      actorType: 'user',
      targetType: 'file',
      targetId: fileId,
      details,
    });
  }

  async logAdmin(type: string, adminId: string, targetType: string, targetId: string, details?: Record<string, any>) {
    await this.log({
      eventType: type,
      eventCategory: 'ADMIN',
      actorId: adminId,
      actorType: 'admin',
      targetType,
      targetId,
      details,
    });
  }
}
```

### Step 2: Audit Interceptor

```typescript
// apps/api/src/modules/audit/audit.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap, catchError } from 'rxjs';
import { AuditService } from './audit.service';
import { Reflector } from '@nestjs/core';

export const AUDIT_METADATA_KEY = 'audit';

export interface AuditMetadata {
  eventType: string;
  eventCategory: 'AUTH' | 'MESSAGE' | 'FILE' | 'CONVERSATION' | 'ADMIN' | 'SECURITY';
  targetType?: string;
  getTargetId?: (req: any, result: any) => string;
  getDetails?: (req: any, result: any) => Record<string, any>;
}

export const Audit = (metadata: AuditMetadata) =>
  (target: any, key: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(AUDIT_METADATA_KEY, metadata, target, key);
    return descriptor;
  };

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private auditService: AuditService,
    private reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const metadata = this.reflector.get<AuditMetadata>(
      AUDIT_METADATA_KEY,
      context.getHandler(),
    );

    if (!metadata) return next.handle();

    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();

    return next.handle().pipe(
      tap(async (result) => {
        await this.auditService.log({
          eventType: metadata.eventType,
          eventCategory: metadata.eventCategory,
          actorId: request.user?.userId,
          actorType: 'user',
          actorIp: request.ip,
          actorUserAgent: request.headers['user-agent'],
          targetType: metadata.targetType,
          targetId: metadata.getTargetId?.(request, result),
          details: {
            ...metadata.getDetails?.(request, result),
            duration: Date.now() - startTime,
          },
          success: true,
        });
      }),
      catchError(async (error) => {
        await this.auditService.log({
          eventType: metadata.eventType,
          eventCategory: metadata.eventCategory,
          actorId: request.user?.userId,
          actorType: 'user',
          actorIp: request.ip,
          actorUserAgent: request.headers['user-agent'],
          targetType: metadata.targetType,
          success: false,
          errorMessage: error.message,
        });
        throw error;
      }),
    );
  }
}
```

### Step 3: Compliance Service

```typescript
// apps/api/src/modules/compliance/compliance.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../../database/drizzle.provider';
import * as schema from '../../database/schema';
import * as auditSchema from '../../database/audit-schema';
import { eq, and, lte } from 'drizzle-orm';
import { StorageService } from '../files/services/storage.service';
import * as archiver from 'archiver';

@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);

  constructor(
    @Inject(DATABASE_CONNECTION) private db: typeof schema,
    @Inject('AUDIT_DB') private auditDb: typeof auditSchema,
    private storageService: StorageService,
  ) {}

  async createDataExport(userId: string): Promise<{ requestId: string }> {
    // Create request record
    const [request] = await this.auditDb
      .insert(auditSchema.dataRequests)
      .values({
        userId,
        requestType: 'export',
        status: 'pending',
      })
      .returning();

    // Queue export job
    this.processExport(request.id, userId).catch((error) => {
      this.logger.error(`Export failed for request ${request.id}:`, error);
    });

    return { requestId: request.id };
  }

  private async processExport(requestId: string, userId: string) {
    await this.auditDb
      .update(auditSchema.dataRequests)
      .set({ status: 'processing' })
      .where(eq(auditSchema.dataRequests.id, requestId));

    try {
      // Gather user data
      const userData = await this.gatherUserData(userId);

      // Create ZIP archive
      const archive = archiver('zip', { zlib: { level: 9 } });
      const chunks: Buffer[] = [];

      archive.on('data', (chunk) => chunks.push(chunk));

      // Add data files
      archive.append(JSON.stringify(userData.profile, null, 2), { name: 'profile.json' });
      archive.append(JSON.stringify(userData.messages, null, 2), { name: 'messages.json' });
      archive.append(JSON.stringify(userData.conversations, null, 2), { name: 'conversations.json' });
      archive.append(JSON.stringify(userData.files, null, 2), { name: 'files.json' });
      archive.append(JSON.stringify(userData.auditLogs, null, 2), { name: 'activity_log.json' });

      await archive.finalize();

      const zipBuffer = Buffer.concat(chunks);

      // Upload to S3
      const exportPath = `exports/${userId}/${requestId}.zip`;
      const uploadUrl = await this.storageService.getPresignedUploadUrl(exportPath, 'application/zip');
      await fetch(uploadUrl, { method: 'PUT', body: zipBuffer });

      // Get download URL (valid for 7 days)
      const downloadUrl = await this.storageService.getPresignedDownloadUrl(exportPath, 7 * 24 * 60 * 60);

      // Update request
      await this.auditDb
        .update(auditSchema.dataRequests)
        .set({
          status: 'completed',
          exportUrl: downloadUrl,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          completedAt: new Date(),
        })
        .where(eq(auditSchema.dataRequests.id, requestId));

    } catch (error) {
      await this.auditDb
        .update(auditSchema.dataRequests)
        .set({ status: 'failed' })
        .where(eq(auditSchema.dataRequests.id, requestId));
      throw error;
    }
  }

  private async gatherUserData(userId: string) {
    // Profile
    const [profile] = await this.db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        username: schema.users.username,
        displayName: schema.users.displayName,
        createdAt: schema.users.createdAt,
      })
      .from(schema.users)
      .where(eq(schema.users.id, userId));

    // Messages (encrypted, user has keys)
    const messages = await this.db
      .select()
      .from(schema.messages)
      .where(eq(schema.messages.senderId, userId));

    // Conversations
    const conversations = await this.db
      .select()
      .from(schema.conversationMembers)
      .innerJoin(schema.conversations, eq(schema.conversationMembers.conversationId, schema.conversations.id))
      .where(eq(schema.conversationMembers.userId, userId));

    // Files
    const files = await this.db
      .select({
        id: schema.files.id,
        name: schema.files.originalName,
        type: schema.files.mimeType,
        size: schema.files.size,
        uploadedAt: schema.files.createdAt,
      })
      .from(schema.files)
      .where(eq(schema.files.uploaderId, userId));

    // Audit logs
    const auditLogs = await this.auditDb
      .select({
        eventType: auditSchema.auditLogs.eventType,
        eventCategory: auditSchema.auditLogs.eventCategory,
        timestamp: auditSchema.auditLogs.createdAt,
        details: auditSchema.auditLogs.details,
      })
      .from(auditSchema.auditLogs)
      .where(eq(auditSchema.auditLogs.actorId, userId));

    return { profile, messages, conversations, files, auditLogs };
  }

  async requestDataDeletion(userId: string): Promise<{ requestId: string }> {
    const [request] = await this.auditDb
      .insert(auditSchema.dataRequests)
      .values({
        userId,
        requestType: 'delete',
        status: 'pending',
      })
      .returning();

    // Note: Actual deletion should be reviewed by admin
    // and processed after retention period check

    return { requestId: request.id };
  }

  async getDataRequestStatus(requestId: string, userId: string) {
    const [request] = await this.auditDb
      .select()
      .from(auditSchema.dataRequests)
      .where(
        and(
          eq(auditSchema.dataRequests.id, requestId),
          eq(auditSchema.dataRequests.userId, userId)
        )
      );

    return request;
  }
}
```

### Step 4: Retention Service

```typescript
// apps/api/src/modules/compliance/retention.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../../database/drizzle.provider';
import * as schema from '../../database/schema';
import { lt, and, eq, isNull } from 'drizzle-orm';

@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name);

  constructor(@Inject(DATABASE_CONNECTION) private db: typeof schema) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async enforceRetentionPolicies() {
    this.logger.log('Starting retention policy enforcement');

    const policies = await this.db.select().from(schema.retentionPolicies);

    for (const policy of policies) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

      try {
        switch (policy.resourceType) {
          case 'messages':
            await this.enforceMessageRetention(cutoffDate, policy);
            break;
          case 'files':
            await this.enforceFileRetention(cutoffDate, policy);
            break;
          case 'audit_logs':
            // Audit logs have separate retention
            break;
        }
      } catch (error) {
        this.logger.error(`Retention enforcement failed for ${policy.resourceType}:`, error);
      }
    }

    this.logger.log('Retention policy enforcement completed');
  }

  private async enforceMessageRetention(cutoffDate: Date, policy: any) {
    if (policy.deleteAction === 'soft') {
      // Mark as deleted
      await this.db
        .update(schema.messages)
        .set({ deletedAt: new Date() })
        .where(
          and(
            lt(schema.messages.createdAt, cutoffDate),
            isNull(schema.messages.deletedAt),
            policy.organizationId
              ? eq(schema.messages.organizationId, policy.organizationId)
              : undefined
          )
        );
    } else if (policy.deleteAction === 'hard') {
      // Actually delete
      await this.db
        .delete(schema.messages)
        .where(
          and(
            lt(schema.messages.createdAt, cutoffDate),
            policy.organizationId
              ? eq(schema.messages.organizationId, policy.organizationId)
              : undefined
          )
        );
    }
  }

  private async enforceFileRetention(cutoffDate: Date, policy: any) {
    // Get files to delete
    const files = await this.db
      .select()
      .from(schema.files)
      .where(
        and(
          lt(schema.files.createdAt, cutoffDate),
          isNull(schema.files.deletedAt)
        )
      );

    for (const file of files) {
      // Mark as deleted (or actually delete from S3 based on policy)
      await this.db
        .update(schema.files)
        .set({ deletedAt: new Date() })
        .where(eq(schema.files.id, file.id));
    }
  }
}
```

### Step 5: Admin Audit Controller

```typescript
// apps/api/src/modules/audit/audit.controller.ts
import { Controller, Get, Query, UseGuards, Param } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('admin/audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get('logs')
  async getLogs(
    @Query('actorId') actorId?: string,
    @Query('targetType') targetType?: string,
    @Query('targetId') targetId?: string,
    @Query('eventCategory') eventCategory?: string,
    @Query('eventType') eventType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit = 100,
    @Query('offset') offset = 0,
  ) {
    return this.auditService.query({
      actorId,
      targetType,
      targetId,
      eventCategory,
      eventType,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: Number(limit),
      offset: Number(offset),
    });
  }

  @Get('logs/:id/verify')
  async verifyLogIntegrity(@Param('id') id: string) {
    const isValid = await this.auditService.verifyIntegrity(id);
    return { id, integrityValid: isValid };
  }
}
```

## Todo List

- [ ] Create audit database schema
- [ ] Implement audit service
- [ ] Create audit interceptor
- [ ] Add predefined audit events
- [ ] Integrate audit logging across modules
- [ ] Implement compliance service
- [ ] Create GDPR export functionality
- [ ] Implement retention service
- [ ] Setup retention cron jobs
- [ ] Create admin audit endpoints
- [ ] Build admin audit log viewer
- [ ] Build user data export UI
- [ ] Write compliance tests

## Success Criteria

1. All auth events logged
2. All message events logged
3. All file events logged
4. Admin actions logged
5. Logs tamper-evident (checksum chain)
6. GDPR export completes successfully
7. Retention policies enforced
8. Admin can search/filter logs

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Log storage growth | Medium | Retention, archival |
| Performance impact | Medium | Async logging, queue |
| Data export timeout | Low | Background job, progress |

## Security Considerations

- Audit logs append-only
- Admin access required for audit queries
- Checksum chain for tamper detection
- GDPR exports encrypted
- Retention compliance verified

## Next Steps

After completing Phase 08:
1. Proceed to Phase 09 (Testing)
2. Comprehensive test coverage
3. Load testing
