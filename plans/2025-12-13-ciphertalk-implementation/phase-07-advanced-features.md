# Phase 07: Advanced Features

## Context Links
- [Main Plan](plan.md)
- [Phase 03: Messaging](phase-03-messaging.md)

## Overview

| Attribute | Value |
|-----------|-------|
| Priority | P2 (Medium) |
| Status | Pending |
| Est. Duration | 1 week |
| Dependencies | Phase 03 |

User experience enhancements: presence indicators, typing indicators, read receipts, message reactions, message search.

## Key Insights

- Presence via Redis pub/sub for real-time updates
- Typing indicators debounced to reduce traffic
- Read receipts batched for efficiency
- Message search via PostgreSQL full-text search (defer Elasticsearch)
- Reactions stored per-message, aggregated for display

## Requirements

### Functional
- [ ] Online/offline/away presence status
- [ ] Last seen timestamp
- [ ] Typing indicators in conversations
- [ ] Read receipts with timestamps
- [ ] Message reactions (emoji)
- [ ] Full-text message search
- [ ] Message pinning

### Non-Functional
- [ ] Presence updates <1s latency
- [ ] Typing indicator debounce 300ms
- [ ] Search results <500ms

## Architecture

```
Presence System:
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │────▶│  Socket  │────▶│  Redis   │
│          │     │  Server  │     │  Pub/Sub │
└──────────┘     └──────────┘     └──────────┘
                      │                 │
                      ▼                 ▼
                 ┌──────────┐     ┌──────────┐
                 │PostgreSQL│     │ Broadcast│
                 │(lastSeen)│     │ to subs  │
                 └──────────┘     └──────────┘

Typing Flow:
1. User starts typing → emit 'typing:start'
2. Debounce 300ms → broadcast to conversation
3. User stops (2s timeout) → emit 'typing:stop'
```

## Database Schema Extensions

```typescript
// apps/api/src/database/schema.ts (additions)

// Read receipts already in Phase 03

export const messageReactions = pgTable('message_reactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  messageId: uuid('message_id').references(() => messages.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  emoji: varchar('emoji', { length: 32 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  unique: unique().on(table.messageId, table.userId, table.emoji),
}));

export const pinnedMessages = pgTable('pinned_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').references(() => conversations.id, { onDelete: 'cascade' }).notNull(),
  messageId: uuid('message_id').references(() => messages.id, { onDelete: 'cascade' }).notNull(),
  pinnedBy: uuid('pinned_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Add to users table
// lastSeenAt: timestamp('last_seen_at')
// status: varchar('status', { length: 20 }).default('offline')

// Full-text search index on messages.content
// CREATE INDEX messages_content_search_idx ON messages USING gin(to_tsvector('english', content));
```

## Related Code Files

### Files to Create

| Path | Purpose |
|------|---------|
| `apps/api/src/modules/presence/presence.module.ts` | Presence module |
| `apps/api/src/modules/presence/presence.service.ts` | Presence logic |
| `apps/api/src/modules/presence/presence.gateway.ts` | Presence events |
| `apps/api/src/modules/search/search.module.ts` | Search module |
| `apps/api/src/modules/search/search.service.ts` | Search logic |
| `apps/api/src/modules/reactions/reactions.service.ts` | Reactions logic |
| `apps/web/src/features/chat/components/typing-indicator.tsx` | Typing UI |
| `apps/web/src/features/chat/components/read-receipts.tsx` | Read receipts UI |
| `apps/web/src/features/chat/components/message-reactions.tsx` | Reactions UI |
| `apps/web/src/features/search/components/search-modal.tsx` | Search UI |

## Implementation Steps

### Step 1: Presence Service

```typescript
// apps/api/src/modules/presence/presence.service.ts
import { Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../../database/drizzle.provider';
import { eq } from 'drizzle-orm';
import * as schema from '../../database/schema';

@Injectable()
export class PresenceService {
  private redis: Redis;
  private publisher: Redis;
  private subscriber: Redis;

  constructor(@Inject(DATABASE_CONNECTION) private db: typeof schema) {
    this.redis = new Redis(process.env.REDIS_URL);
    this.publisher = new Redis(process.env.REDIS_URL);
    this.subscriber = new Redis(process.env.REDIS_URL);
  }

  async setOnline(userId: string): Promise<void> {
    const now = Date.now();

    // Set in Redis with TTL (for auto-offline if connection lost)
    await this.redis.setex(`presence:${userId}`, 60, 'online');
    await this.redis.set(`lastseen:${userId}`, now);

    // Update database
    await this.db
      .update(schema.users)
      .set({ status: 'online', updatedAt: new Date() })
      .where(eq(schema.users.id, userId));

    // Publish presence change
    await this.publisher.publish('presence:change', JSON.stringify({
      userId,
      status: 'online',
      timestamp: now,
    }));
  }

  async setOffline(userId: string): Promise<void> {
    const now = Date.now();

    await this.redis.del(`presence:${userId}`);
    await this.redis.set(`lastseen:${userId}`, now);

    await this.db
      .update(schema.users)
      .set({ status: 'offline', updatedAt: new Date() })
      .where(eq(schema.users.id, userId));

    await this.publisher.publish('presence:change', JSON.stringify({
      userId,
      status: 'offline',
      timestamp: now,
    }));
  }

  async setAway(userId: string): Promise<void> {
    await this.redis.setex(`presence:${userId}`, 60, 'away');

    await this.db
      .update(schema.users)
      .set({ status: 'away', updatedAt: new Date() })
      .where(eq(schema.users.id, userId));

    await this.publisher.publish('presence:change', JSON.stringify({
      userId,
      status: 'away',
      timestamp: Date.now(),
    }));
  }

  async getPresence(userId: string): Promise<{ status: string; lastSeen: number }> {
    const status = await this.redis.get(`presence:${userId}`) || 'offline';
    const lastSeen = parseInt(await this.redis.get(`lastseen:${userId}`) || '0');
    return { status, lastSeen };
  }

  async getMultiplePresence(userIds: string[]): Promise<Map<string, { status: string; lastSeen: number }>> {
    const pipeline = this.redis.pipeline();

    for (const userId of userIds) {
      pipeline.get(`presence:${userId}`);
      pipeline.get(`lastseen:${userId}`);
    }

    const results = await pipeline.exec();
    const presenceMap = new Map();

    for (let i = 0; i < userIds.length; i++) {
      presenceMap.set(userIds[i], {
        status: results![i * 2][1] || 'offline',
        lastSeen: parseInt(results![i * 2 + 1][1] as string || '0'),
      });
    }

    return presenceMap;
  }

  async heartbeat(userId: string): Promise<void> {
    // Extend presence TTL
    await this.redis.expire(`presence:${userId}`, 60);
  }

  subscribeToPresence(callback: (data: { userId: string; status: string; timestamp: number }) => void) {
    this.subscriber.subscribe('presence:change');
    this.subscriber.on('message', (channel, message) => {
      if (channel === 'presence:change') {
        callback(JSON.parse(message));
      }
    });
  }
}
```

### Step 2: Presence Gateway Extension

```typescript
// Add to apps/api/src/modules/chat/chat.gateway.ts

@SubscribeMessage('typing:start')
async handleTypingStart(
  @ConnectedSocket() client: Socket,
  @MessageBody() dto: { conversationId: string },
) {
  const userId = client.data.userId;

  // Broadcast to conversation (exclude sender)
  client.to(`conversation:${dto.conversationId}`).emit('typing:update', {
    conversationId: dto.conversationId,
    userId,
    isTyping: true,
  });
}

@SubscribeMessage('typing:stop')
async handleTypingStop(
  @ConnectedSocket() client: Socket,
  @MessageBody() dto: { conversationId: string },
) {
  const userId = client.data.userId;

  client.to(`conversation:${dto.conversationId}`).emit('typing:update', {
    conversationId: dto.conversationId,
    userId,
    isTyping: false,
  });
}

@SubscribeMessage('presence:heartbeat')
async handleHeartbeat(@ConnectedSocket() client: Socket) {
  const userId = client.data.userId;
  await this.presenceService.heartbeat(userId);
}
```

### Step 3: Search Service

```typescript
// apps/api/src/modules/search/search.service.ts
import { Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../../database/drizzle.provider';
import { sql, eq, and, or, ilike, desc } from 'drizzle-orm';
import * as schema from '../../database/schema';

@Injectable()
export class SearchService {
  constructor(@Inject(DATABASE_CONNECTION) private db: typeof schema) {}

  async searchMessages(
    userId: string,
    query: string,
    options?: {
      conversationId?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    const { conversationId, limit = 50, offset = 0 } = options || {};

    // Get user's conversations
    const userConversations = await this.db
      .select({ conversationId: schema.conversationMembers.conversationId })
      .from(schema.conversationMembers)
      .where(eq(schema.conversationMembers.userId, userId));

    const conversationIds = userConversations.map((c) => c.conversationId);

    if (conversationIds.length === 0) return [];

    // Full-text search with ts_rank
    // Note: Message content is encrypted, so we can only search metadata
    // or decrypted content stored separately (privacy trade-off)

    // For MVP: simple ILIKE search on non-encrypted metadata
    // Production: consider client-side search or encrypted search index

    const results = await this.db
      .select({
        message: schema.messages,
        conversation: schema.conversations,
        sender: schema.users,
      })
      .from(schema.messages)
      .innerJoin(schema.conversations, eq(schema.messages.conversationId, schema.conversations.id))
      .innerJoin(schema.users, eq(schema.messages.senderId, schema.users.id))
      .where(
        and(
          sql`${schema.messages.conversationId} = ANY(${conversationIds})`,
          conversationId ? eq(schema.messages.conversationId, conversationId) : undefined,
          // Search in metadata or type (content is encrypted)
          or(
            ilike(schema.messages.metadata, `%${query}%`),
            ilike(schema.messages.type, `%${query}%`)
          )
        )
      )
      .orderBy(desc(schema.messages.createdAt))
      .limit(limit)
      .offset(offset);

    return results;
  }

  async searchUsers(query: string, limit = 20) {
    return this.db
      .select({
        id: schema.users.id,
        username: schema.users.username,
        displayName: schema.users.displayName,
        avatarUrl: schema.users.avatarUrl,
      })
      .from(schema.users)
      .where(
        or(
          ilike(schema.users.username, `%${query}%`),
          ilike(schema.users.displayName, `%${query}%`)
        )
      )
      .limit(limit);
  }
}
```

### Step 4: Reactions Service

```typescript
// apps/api/src/modules/reactions/reactions.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../../database/drizzle.provider';
import { eq, and, sql } from 'drizzle-orm';
import * as schema from '../../database/schema';

@Injectable()
export class ReactionsService {
  constructor(@Inject(DATABASE_CONNECTION) private db: typeof schema) {}

  async addReaction(messageId: string, userId: string, emoji: string) {
    // Verify user has access to message
    const [message] = await this.db
      .select()
      .from(schema.messages)
      .where(eq(schema.messages.id, messageId))
      .limit(1);

    if (!message) throw new NotFoundException('Message not found');

    // Verify user is member of conversation
    const [member] = await this.db
      .select()
      .from(schema.conversationMembers)
      .where(
        and(
          eq(schema.conversationMembers.conversationId, message.conversationId),
          eq(schema.conversationMembers.userId, userId)
        )
      )
      .limit(1);

    if (!member) throw new ForbiddenException('Not a member of this conversation');

    // Add reaction (ignore if already exists)
    await this.db
      .insert(schema.messageReactions)
      .values({ messageId, userId, emoji })
      .onConflictDoNothing();

    return this.getMessageReactions(messageId);
  }

  async removeReaction(messageId: string, userId: string, emoji: string) {
    await this.db
      .delete(schema.messageReactions)
      .where(
        and(
          eq(schema.messageReactions.messageId, messageId),
          eq(schema.messageReactions.userId, userId),
          eq(schema.messageReactions.emoji, emoji)
        )
      );

    return this.getMessageReactions(messageId);
  }

  async getMessageReactions(messageId: string) {
    const reactions = await this.db
      .select({
        emoji: schema.messageReactions.emoji,
        count: sql<number>`count(*)`,
        users: sql<string[]>`array_agg(${schema.messageReactions.userId})`,
      })
      .from(schema.messageReactions)
      .where(eq(schema.messageReactions.messageId, messageId))
      .groupBy(schema.messageReactions.emoji);

    return reactions;
  }
}
```

### Step 5: Frontend Typing Indicator

```typescript
// apps/web/src/features/chat/components/typing-indicator.tsx
import { useEffect, useState, useCallback, useRef } from 'react';
import { useSocket } from '@/hooks/use-socket';

interface TypingIndicatorProps {
  conversationId: string;
}

export function TypingIndicator({ conversationId }: TypingIndicatorProps) {
  const { socket } = useSocket();
  const [typingUsers, setTypingUsers] = useState<Map<string, { name: string; timeout: NodeJS.Timeout }>>(new Map());

  useEffect(() => {
    if (!socket) return;

    const handleTypingUpdate = (data: { conversationId: string; userId: string; isTyping: boolean; userName?: string }) => {
      if (data.conversationId !== conversationId) return;

      setTypingUsers((prev) => {
        const next = new Map(prev);

        if (data.isTyping) {
          // Clear existing timeout
          const existing = next.get(data.userId);
          if (existing?.timeout) clearTimeout(existing.timeout);

          // Set new timeout to auto-clear
          const timeout = setTimeout(() => {
            setTypingUsers((p) => {
              const n = new Map(p);
              n.delete(data.userId);
              return n;
            });
          }, 3000);

          next.set(data.userId, { name: data.userName || 'Someone', timeout });
        } else {
          const existing = next.get(data.userId);
          if (existing?.timeout) clearTimeout(existing.timeout);
          next.delete(data.userId);
        }

        return next;
      });
    };

    socket.on('typing:update', handleTypingUpdate);
    return () => { socket.off('typing:update', handleTypingUpdate); };
  }, [socket, conversationId]);

  if (typingUsers.size === 0) return null;

  const names = Array.from(typingUsers.values()).map((u) => u.name);
  const text = names.length === 1
    ? `${names[0]} is typing...`
    : names.length === 2
    ? `${names[0]} and ${names[1]} are typing...`
    : `${names.length} people are typing...`;

  return (
    <div className="text-sm text-gray-500 px-4 py-1">
      <span className="inline-flex items-center">
        <span className="flex space-x-1 mr-2">
          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </span>
        {text}
      </span>
    </div>
  );
}

// Hook for emitting typing events
export function useTypingEmitter(conversationId: string) {
  const { socket } = useSocket();
  const typingRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const startTyping = useCallback(() => {
    if (!socket || typingRef.current) return;

    typingRef.current = true;
    socket.emit('typing:start', { conversationId });

    // Auto-stop after 2 seconds of no input
    timeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 2000);
  }, [socket, conversationId]);

  const stopTyping = useCallback(() => {
    if (!socket || !typingRef.current) return;

    typingRef.current = false;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    socket.emit('typing:stop', { conversationId });
  }, [socket, conversationId]);

  const resetTypingTimeout = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 2000);
  }, [stopTyping]);

  return { startTyping, stopTyping, resetTypingTimeout };
}
```

### Step 6: Read Receipts Component

```typescript
// apps/web/src/features/chat/components/read-receipts.tsx
import { useMemo } from 'react';
import { Check, CheckCheck } from 'lucide-react';

interface ReadReceiptsProps {
  messageId: string;
  senderId: string;
  currentUserId: string;
  readBy: Array<{ userId: string; readAt: Date }>;
  conversationMemberCount: number;
}

export function ReadReceipts({
  senderId,
  currentUserId,
  readBy,
  conversationMemberCount,
}: ReadReceiptsProps) {
  // Only show for sender's own messages
  if (senderId !== currentUserId) return null;

  const status = useMemo(() => {
    const readCount = readBy.length;
    const otherMemberCount = conversationMemberCount - 1; // Exclude sender

    if (readCount >= otherMemberCount) {
      return 'read'; // All read
    } else if (readCount > 0) {
      return 'partial'; // Some read
    }
    return 'delivered';
  }, [readBy, conversationMemberCount]);

  return (
    <span className="inline-flex items-center ml-1">
      {status === 'read' ? (
        <CheckCheck className="w-4 h-4 text-blue-500" />
      ) : status === 'partial' ? (
        <CheckCheck className="w-4 h-4 text-gray-400" />
      ) : (
        <Check className="w-4 h-4 text-gray-400" />
      )}
    </span>
  );
}
```

### Step 7: Message Reactions Component

```typescript
// apps/web/src/features/chat/components/message-reactions.tsx
import { useState } from 'react';
import { useSocket } from '@/hooks/use-socket';
import { cn } from '@/lib/utils';

interface Reaction {
  emoji: string;
  count: number;
  users: string[];
}

interface MessageReactionsProps {
  messageId: string;
  reactions: Reaction[];
  currentUserId: string;
}

export function MessageReactions({ messageId, reactions, currentUserId }: MessageReactionsProps) {
  const { socket } = useSocket();

  const toggleReaction = (emoji: string, hasReacted: boolean) => {
    if (hasReacted) {
      socket?.emit('reaction:remove', { messageId, emoji });
    } else {
      socket?.emit('reaction:add', { messageId, emoji });
    }
  };

  if (reactions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {reactions.map((reaction) => {
        const hasReacted = reaction.users.includes(currentUserId);
        return (
          <button
            key={reaction.emoji}
            onClick={() => toggleReaction(reaction.emoji, hasReacted)}
            className={cn(
              'inline-flex items-center px-2 py-0.5 rounded-full text-sm',
              'border transition-colors',
              hasReacted
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
            )}
          >
            <span className="mr-1">{reaction.emoji}</span>
            <span>{reaction.count}</span>
          </button>
        );
      })}
    </div>
  );
}

// Emoji picker for adding reactions
export function ReactionPicker({ onSelect }: { onSelect: (emoji: string) => void }) {
  const commonEmojis = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👏', '🎉'];

  return (
    <div className="flex gap-1 p-2 bg-white rounded-lg shadow-lg border">
      {commonEmojis.map((emoji) => (
        <button
          key={emoji}
          onClick={() => onSelect(emoji)}
          className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
```

## Todo List

- [ ] Implement presence service
- [ ] Add presence gateway events
- [ ] Setup Redis pub/sub for presence
- [ ] Implement typing indicators
- [ ] Add typing debounce logic
- [ ] Create read receipts tracking
- [ ] Implement reactions service
- [ ] Build search service
- [ ] Create typing indicator UI
- [ ] Create read receipts UI
- [ ] Create reactions UI
- [ ] Create search modal
- [ ] Write feature tests

## Success Criteria

1. Presence updates within 1s
2. Typing indicators show/hide correctly
3. Read receipts accurate
4. Reactions add/remove work
5. Search returns relevant results
6. UI responsive and smooth

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Redis unavailable | Medium | Fallback to DB-only presence |
| Typing spam | Low | Debounce, rate limit |
| Search performance | Medium | Index optimization, pagination |

## Security Considerations

- Presence visible only to contacts
- Typing visible only to conversation members
- Search respects conversation membership
- Rate limit reaction requests

## Next Steps

After completing Phase 07:
1. Proceed to Phase 08 (Audit & Compliance)
2. Implement audit logging
3. Add data retention policies
