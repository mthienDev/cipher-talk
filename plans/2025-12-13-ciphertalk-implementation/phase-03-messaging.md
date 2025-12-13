# Phase 03: Real-time Messaging Foundation

## Context Links
- [Main Plan](plan.md)
- [Phase 02: Auth](phase-02-authentication.md)
- Socket.IO: https://socket.io/docs/v4/
- Redis Adapter: https://socket.io/docs/v4/redis-adapter/

## Overview

| Attribute | Value |
|-----------|-------|
| Priority | P0 (Critical) |
| Status | Pending |
| Est. Duration | 2 weeks |
| Dependencies | Phase 02 |

Real-time messaging via Socket.IO with Redis adapter for horizontal scaling. Supports 1-on-1 and group conversations.

## Key Insights

- Socket.IO over raw WebSocket for reconnection, rooms, fallback
- Redis adapter enables multi-server deployment
- Message persistence before broadcast (consistency)
- Conversation-based rooms for targeted delivery
- JWT auth for WebSocket connections

## Requirements

### Functional
- [ ] WebSocket connection with JWT auth
- [ ] Create/join 1-on-1 conversations
- [ ] Create/manage group conversations
- [ ] Send/receive text messages
- [ ] Message delivery confirmation
- [ ] Conversation list with last message
- [ ] Message history with pagination
- [ ] Unread message counts

### Non-Functional
- [ ] Sub-100ms message delivery
- [ ] Reconnection with message sync
- [ ] Support 500+ concurrent connections
- [ ] Redis pub/sub for scaling

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Client 1   │────▶│   Server 1   │────▶│    Redis     │
└──────────────┘     └──────────────┘     │   Pub/Sub    │
                            │             └──────────────┘
┌──────────────┐     ┌──────────────┐            │
│   Client 2   │────▶│   Server 2   │────────────┘
└──────────────┘     └──────────────┘

Message Flow:
1. Client sends message → Server validates
2. Server persists to PostgreSQL
3. Server broadcasts via Redis pub/sub
4. All servers emit to conversation room
5. Clients in room receive message
```

### Room Strategy

```
Rooms:
- user:{userId}           → User's private channel (notifications)
- conversation:{convId}   → Conversation members
```

## Database Schema Extensions

```typescript
// Additional indexes and relations for messages

// Add to existing messages table
export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

// Message read receipts
export const messageReadReceipts = pgTable('message_read_receipts', {
  id: uuid('id').primaryKey().defaultRandom(),
  messageId: uuid('message_id').references(() => messages.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  readAt: timestamp('read_at').defaultNow().notNull(),
}, (table) => ({
  unique: unique().on(table.messageId, table.userId),
}));

// Conversation unread counts (materialized for performance)
export const conversationUnreadCounts = pgTable('conversation_unread_counts', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').references(() => conversations.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  unreadCount: integer('unread_count').default(0).notNull(),
  lastReadMessageId: uuid('last_read_message_id').references(() => messages.id),
}, (table) => ({
  unique: unique().on(table.conversationId, table.userId),
}));
```

## Related Code Files

### Files to Create

| Path | Purpose |
|------|---------|
| `apps/api/src/modules/chat/chat.module.ts` | Chat module |
| `apps/api/src/modules/chat/chat.gateway.ts` | Socket.IO gateway |
| `apps/api/src/modules/chat/chat.service.ts` | Chat business logic |
| `apps/api/src/modules/chat/guards/ws-auth.guard.ts` | WebSocket auth |
| `apps/api/src/modules/conversations/conversations.module.ts` | Conversations CRUD |
| `apps/api/src/modules/conversations/conversations.service.ts` | Conversation logic |
| `apps/api/src/modules/conversations/conversations.controller.ts` | REST endpoints |
| `apps/api/src/modules/messages/messages.module.ts` | Messages CRUD |
| `apps/api/src/modules/messages/messages.service.ts` | Message logic |
| `apps/web/src/features/chat/*` | Frontend chat UI |
| `apps/web/src/hooks/use-socket.ts` | Socket connection hook |

## Implementation Steps

### Step 1: Install Dependencies

```bash
cd apps/api
pnpm add @nestjs/websockets @nestjs/platform-socket.io socket.io
pnpm add @socket.io/redis-adapter redis

cd ../web
pnpm add socket.io-client
```

### Step 2: Socket.IO Gateway

```typescript
// apps/api/src/modules/chat/chat.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private jwtService: JwtService,
    private chatService: ChatService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      // Extract and verify JWT from handshake
      const token = client.handshake.auth.token ||
        client.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token);
      client.data.userId = payload.sub;

      // Join user's personal room
      client.join(`user:${payload.sub}`);

      // Join all conversation rooms
      const conversations = await this.chatService.getUserConversations(payload.sub);
      for (const conv of conversations) {
        client.join(`conversation:${conv.id}`);
      }

      // Update user status to online
      await this.chatService.updateUserStatus(payload.sub, 'online');

      // Broadcast presence to contacts
      this.server.to(`user:${payload.sub}`).emit('status:online', { userId: payload.sub });

      console.log(`Client connected: ${client.id}, User: ${payload.sub}`);
    } catch (error) {
      console.error('Connection auth failed:', error);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    if (client.data.userId) {
      await this.chatService.updateUserStatus(client.data.userId, 'offline');
      this.server.emit('status:offline', { userId: client.data.userId });
    }
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('message:send')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: SendMessageDto,
  ) {
    const userId = client.data.userId;

    // Validate user is member of conversation
    const isMember = await this.chatService.isConversationMember(dto.conversationId, userId);
    if (!isMember) {
      return { error: 'Not a member of this conversation' };
    }

    // Persist message
    const message = await this.chatService.createMessage({
      ...dto,
      senderId: userId,
    });

    // Broadcast to conversation room
    this.server.to(`conversation:${dto.conversationId}`).emit('message:new', message);

    // Send delivery confirmation to sender
    client.emit('message:sent', { id: message.id, status: 'sent' });

    return { success: true, messageId: message.id };
  }

  @SubscribeMessage('message:read')
  async handleMessageRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: { conversationId: string; messageId: string },
  ) {
    const userId = client.data.userId;

    await this.chatService.markMessageRead(dto.messageId, userId);

    // Notify sender that message was read
    this.server.to(`conversation:${dto.conversationId}`).emit('message:read', {
      messageId: dto.messageId,
      readBy: userId,
      readAt: new Date(),
    });
  }

  @SubscribeMessage('conversation:join')
  async handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: { conversationId: string },
  ) {
    const userId = client.data.userId;
    const isMember = await this.chatService.isConversationMember(dto.conversationId, userId);

    if (isMember) {
      client.join(`conversation:${dto.conversationId}`);
      return { success: true };
    }

    return { error: 'Not a member of this conversation' };
  }
}
```

### Step 3: Chat Service

```typescript
// apps/api/src/modules/chat/chat.service.ts
import { Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../../database/drizzle.provider';
import { eq, and, desc } from 'drizzle-orm';
import * as schema from '../../database/schema';

@Injectable()
export class ChatService {
  constructor(@Inject(DATABASE_CONNECTION) private db: typeof schema) {}

  async getUserConversations(userId: string) {
    return this.db
      .select({
        id: schema.conversations.id,
        type: schema.conversations.type,
        name: schema.conversations.name,
        updatedAt: schema.conversations.updatedAt,
      })
      .from(schema.conversationMembers)
      .innerJoin(
        schema.conversations,
        eq(schema.conversationMembers.conversationId, schema.conversations.id)
      )
      .where(eq(schema.conversationMembers.userId, userId))
      .orderBy(desc(schema.conversations.updatedAt));
  }

  async isConversationMember(conversationId: string, userId: string): Promise<boolean> {
    const member = await this.db
      .select()
      .from(schema.conversationMembers)
      .where(
        and(
          eq(schema.conversationMembers.conversationId, conversationId),
          eq(schema.conversationMembers.userId, userId)
        )
      )
      .limit(1);

    return member.length > 0;
  }

  async createMessage(data: {
    conversationId: string;
    senderId: string;
    content: string;
    type?: string;
  }) {
    const [message] = await this.db
      .insert(schema.messages)
      .values({
        conversationId: data.conversationId,
        senderId: data.senderId,
        content: data.content,
        type: data.type || 'text',
      })
      .returning();

    // Update conversation timestamp
    await this.db
      .update(schema.conversations)
      .set({ updatedAt: new Date() })
      .where(eq(schema.conversations.id, data.conversationId));

    // Increment unread counts for other members
    await this.incrementUnreadCounts(data.conversationId, data.senderId);

    return message;
  }

  async getMessages(conversationId: string, limit = 50, before?: string) {
    let query = this.db
      .select()
      .from(schema.messages)
      .where(eq(schema.messages.conversationId, conversationId))
      .orderBy(desc(schema.messages.createdAt))
      .limit(limit);

    if (before) {
      // Add cursor pagination
    }

    return query;
  }

  async markMessageRead(messageId: string, userId: string) {
    await this.db
      .insert(schema.messageReadReceipts)
      .values({ messageId, userId })
      .onConflictDoNothing();
  }

  async updateUserStatus(userId: string, status: string) {
    await this.db
      .update(schema.users)
      .set({ status, updatedAt: new Date() })
      .where(eq(schema.users.id, userId));
  }

  private async incrementUnreadCounts(conversationId: string, excludeUserId: string) {
    // Get all members except sender
    const members = await this.db
      .select()
      .from(schema.conversationMembers)
      .where(
        and(
          eq(schema.conversationMembers.conversationId, conversationId),
          // Exclude sender
        )
      );

    // Increment unread counts
    for (const member of members) {
      if (member.userId !== excludeUserId) {
        await this.db
          .insert(schema.conversationUnreadCounts)
          .values({ conversationId, userId: member.userId, unreadCount: 1 })
          .onConflictDoUpdate({
            target: [
              schema.conversationUnreadCounts.conversationId,
              schema.conversationUnreadCounts.userId,
            ],
            set: {
              unreadCount: sql`${schema.conversationUnreadCounts.unreadCount} + 1`,
            },
          });
      }
    }
  }
}
```

### Step 4: Redis Adapter Configuration

```typescript
// apps/api/src/modules/chat/chat.module.ts
import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

@Module({
  providers: [
    ChatGateway,
    ChatService,
    {
      provide: 'REDIS_ADAPTER',
      useFactory: async () => {
        const pubClient = createClient({ url: process.env.REDIS_URL });
        const subClient = pubClient.duplicate();
        await Promise.all([pubClient.connect(), subClient.connect()]);
        return createAdapter(pubClient, subClient);
      },
    },
  ],
  exports: [ChatService],
})
export class ChatModule {}
```

### Step 5: Conversations REST API

```typescript
// apps/api/src/modules/conversations/conversations.controller.ts
import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateConversationDto, AddMemberDto } from './dto';

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private conversationsService: ConversationsService) {}

  @Get()
  async getConversations(@Req() req: any) {
    return this.conversationsService.getUserConversations(req.user.userId);
  }

  @Get(':id')
  async getConversation(@Param('id') id: string, @Req() req: any) {
    return this.conversationsService.getConversation(id, req.user.userId);
  }

  @Get(':id/messages')
  async getMessages(
    @Param('id') id: string,
    @Req() req: any,
    @Query('limit') limit = 50,
    @Query('before') before?: string,
  ) {
    return this.conversationsService.getMessages(id, req.user.userId, limit, before);
  }

  @Post()
  async createConversation(@Body() dto: CreateConversationDto, @Req() req: any) {
    return this.conversationsService.create(dto, req.user.userId);
  }

  @Post(':id/members')
  async addMember(
    @Param('id') id: string,
    @Body() dto: AddMemberDto,
    @Req() req: any,
  ) {
    return this.conversationsService.addMember(id, dto.userId, req.user.userId);
  }
}
```

### Step 6: Frontend Socket Hook

```typescript
// apps/web/src/hooks/use-socket.ts
import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth-store';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!accessToken) return;

    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [accessToken]);

  const sendMessage = useCallback((conversationId: string, content: string) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current) {
        reject(new Error('Socket not connected'));
        return;
      }

      socketRef.current.emit(
        'message:send',
        { conversationId, content },
        (response: any) => {
          if (response.error) reject(new Error(response.error));
          else resolve(response);
        }
      );
    });
  }, []);

  const markAsRead = useCallback((conversationId: string, messageId: string) => {
    socketRef.current?.emit('message:read', { conversationId, messageId });
  }, []);

  return {
    socket: socketRef.current,
    sendMessage,
    markAsRead,
  };
}
```

### Step 7: Chat UI Components

```typescript
// apps/web/src/features/chat/components/chat-window.tsx
import { useState, useEffect, useRef } from 'react';
import { useSocket } from '@/hooks/use-socket';
import { useChatStore } from '../stores/chat-store';
import { MessageList } from './message-list';
import { MessageInput } from './message-input';

export function ChatWindow({ conversationId }: { conversationId: string }) {
  const { socket, sendMessage, markAsRead } = useSocket();
  const messages = useChatStore((s) => s.messages[conversationId] || []);
  const addMessage = useChatStore((s) => s.addMessage);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message: Message) => {
      if (message.conversationId === conversationId) {
        addMessage(conversationId, message);
        markAsRead(conversationId, message.id);
      }
    };

    socket.on('message:new', handleNewMessage);

    return () => {
      socket.off('message:new', handleNewMessage);
    };
  }, [socket, conversationId, addMessage, markAsRead]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (content: string) => {
    try {
      await sendMessage(conversationId, content);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <MessageList messages={messages} />
      <div ref={messagesEndRef} />
      <MessageInput onSend={handleSend} />
    </div>
  );
}
```

## Todo List

- [ ] Install Socket.IO dependencies
- [ ] Create chat gateway with JWT auth
- [ ] Setup Redis adapter for scaling
- [ ] Implement message persistence
- [ ] Create conversations REST API
- [ ] Add message pagination
- [ ] Implement read receipts
- [ ] Create unread count tracking
- [ ] Build frontend socket hook
- [ ] Create chat UI components
- [ ] Add conversation list UI
- [ ] Implement message input
- [ ] Add reconnection handling
- [ ] Write chat integration tests

## Success Criteria

1. Users can connect via WebSocket with JWT
2. Messages delivered in <100ms
3. Messages persist to database
4. Conversation members receive messages
5. Read receipts update correctly
6. Unread counts accurate
7. Reconnection syncs missed messages
8. 500+ concurrent connections supported

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Message loss | High | Persist before broadcast |
| Connection storms | Medium | Exponential backoff |
| Redis failure | High | Graceful degradation |

## Security Considerations

- JWT validation on WebSocket connect
- Verify conversation membership before message delivery
- Rate limit message sending
- Sanitize message content
- No sensitive data in socket events

## Next Steps

After completing Phase 03:
1. Proceed to Phase 04 (E2E Encryption)
2. Encrypt message content before sending
3. Key exchange via Signal Protocol
