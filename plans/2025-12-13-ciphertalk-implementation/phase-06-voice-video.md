# Phase 06: Voice/Video Calls (WebRTC)

## Context Links
- [Main Plan](plan.md)
- [Phase 03: Messaging](phase-03-messaging.md)
- LiveKit: https://docs.livekit.io
- WebRTC: https://webrtc.org

## Overview

| Attribute | Value |
|-----------|-------|
| Priority | P1 (High) |
| Status | Pending |
| Est. Duration | 2 weeks |
| Dependencies | Phase 03, Phase 07 (presence) |

Real-time voice/video calls using LiveKit SFU. Supports 1-on-1 and group calls with screen sharing. E2E encryption for call signaling.

## Key Insights

- LiveKit SFU vs peer-to-peer: better for group calls, NAT traversal
- Self-hosted LiveKit for enterprise control
- DTLS-SRTP for media encryption (WebRTC standard)
- Additional E2E encryption layer possible with insertable streams
- Call state managed via Socket.IO signaling
- Quality adaptation based on network conditions

## Requirements

### Functional
- [ ] Initiate 1-on-1 voice call
- [ ] Initiate 1-on-1 video call
- [ ] Group calls (up to 10 participants)
- [ ] Screen sharing
- [ ] Mute/unmute audio
- [ ] Enable/disable video
- [ ] Call notifications
- [ ] Call history

### Non-Functional
- [ ] <300ms call setup time
- [ ] Adaptive bitrate for quality
- [ ] Echo cancellation
- [ ] Noise suppression
- [ ] Support 720p video
- [ ] Reconnect on network change

## Architecture

```
Call Flow:
┌──────────┐     ┌──────────┐     ┌──────────┐
│ Caller   │────▶│   API    │────▶│  Callee  │
│ (Alice)  │     │(Signaling│     │  (Bob)   │
└──────────┘     └──────────┘     └──────────┘
     │                │                 │
     │    1. Request call               │
     │────────────────▶                 │
     │                │                 │
     │    2. Create LiveKit room        │
     │                │                 │
     │    3. Notify callee (Socket.IO)  │
     │                │────────────────▶│
     │                │                 │
     │                │    4. Accept    │
     │                │◀────────────────│
     │                │                 │
     │    5. Send room tokens           │
     │◀───────────────│────────────────▶│
     │                │                 │
     ▼                                  ▼
┌──────────────────────────────────────────┐
│              LiveKit SFU                  │
│         (Media Relay Server)              │
└──────────────────────────────────────────┘
     ▲                                  ▲
     │         WebRTC Media             │
     └──────────────────────────────────┘
```

## Database Schema

```typescript
// apps/api/src/database/schema.ts (additions)

export const calls = pgTable('calls', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').references(() => conversations.id),
  roomId: varchar('room_id', { length: 100 }).unique().notNull(), // LiveKit room ID
  type: varchar('type', { length: 20 }).notNull(), // 'voice' | 'video'
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  // 'pending' | 'ringing' | 'active' | 'ended' | 'missed' | 'declined'
  initiatorId: uuid('initiator_id').references(() => users.id).notNull(),
  startedAt: timestamp('started_at'),
  endedAt: timestamp('ended_at'),
  endReason: varchar('end_reason', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const callParticipants = pgTable('call_participants', {
  id: uuid('id').primaryKey().defaultRandom(),
  callId: uuid('call_id').references(() => calls.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  joinedAt: timestamp('joined_at'),
  leftAt: timestamp('left_at'),
  status: varchar('status', { length: 20 }).default('invited').notNull(),
  // 'invited' | 'joined' | 'left' | 'declined'
});
```

## Related Code Files

### Files to Create

| Path | Purpose |
|------|---------|
| `apps/api/src/modules/calls/calls.module.ts` | Calls module |
| `apps/api/src/modules/calls/calls.controller.ts` | Call REST endpoints |
| `apps/api/src/modules/calls/calls.service.ts` | Call business logic |
| `apps/api/src/modules/calls/calls.gateway.ts` | Call signaling gateway |
| `apps/api/src/modules/calls/services/livekit.service.ts` | LiveKit integration |
| `apps/web/src/features/calls/components/call-view.tsx` | Call UI |
| `apps/web/src/features/calls/components/incoming-call.tsx` | Incoming call modal |
| `apps/web/src/features/calls/hooks/use-call.ts` | Call state hook |
| `apps/web/src/features/calls/hooks/use-livekit.ts` | LiveKit room hook |

## Implementation Steps

### Step 1: Install Dependencies

```bash
cd apps/api
pnpm add livekit-server-sdk

cd ../web
pnpm add @livekit/components-react @livekit/react-core livekit-client
```

### Step 2: LiveKit Service

```typescript
// apps/api/src/modules/calls/services/livekit.service.ts
import { Injectable } from '@nestjs/common';
import { AccessToken, RoomServiceClient, Room } from 'livekit-server-sdk';

@Injectable()
export class LiveKitService {
  private roomService: RoomServiceClient;
  private apiKey: string;
  private apiSecret: string;
  private wsUrl: string;

  constructor() {
    this.apiKey = process.env.LIVEKIT_API_KEY!;
    this.apiSecret = process.env.LIVEKIT_API_SECRET!;
    this.wsUrl = process.env.LIVEKIT_WS_URL!;

    this.roomService = new RoomServiceClient(
      process.env.LIVEKIT_HOST!,
      this.apiKey,
      this.apiSecret
    );
  }

  async createRoom(roomId: string, options?: { maxParticipants?: number }): Promise<Room> {
    return this.roomService.createRoom({
      name: roomId,
      maxParticipants: options?.maxParticipants || 10,
      emptyTimeout: 60 * 5, // 5 minutes
    });
  }

  async deleteRoom(roomId: string): Promise<void> {
    await this.roomService.deleteRoom(roomId);
  }

  generateToken(
    roomId: string,
    participantId: string,
    participantName: string,
    options?: {
      canPublish?: boolean;
      canSubscribe?: boolean;
      canPublishData?: boolean;
    }
  ): string {
    const token = new AccessToken(this.apiKey, this.apiSecret, {
      identity: participantId,
      name: participantName,
      ttl: 60 * 60 * 4, // 4 hours
    });

    token.addGrant({
      room: roomId,
      roomJoin: true,
      canPublish: options?.canPublish ?? true,
      canSubscribe: options?.canSubscribe ?? true,
      canPublishData: options?.canPublishData ?? true,
    });

    return token.toJwt();
  }

  async getParticipants(roomId: string) {
    return this.roomService.listParticipants(roomId);
  }

  async removeParticipant(roomId: string, participantId: string) {
    await this.roomService.removeParticipant(roomId, participantId);
  }

  getWsUrl(): string {
    return this.wsUrl;
  }
}
```

### Step 3: Calls Service

```typescript
// apps/api/src/modules/calls/calls.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../../database/drizzle.provider';
import { eq, and } from 'drizzle-orm';
import * as schema from '../../database/schema';
import { LiveKitService } from './services/livekit.service';
import { randomUUID } from 'crypto';

@Injectable()
export class CallsService {
  constructor(
    @Inject(DATABASE_CONNECTION) private db: typeof schema,
    private livekitService: LiveKitService,
  ) {}

  async initiateCall(initiatorId: string, dto: { conversationId: string; type: 'voice' | 'video' }) {
    // Get conversation members
    const members = await this.db
      .select()
      .from(schema.conversationMembers)
      .where(eq(schema.conversationMembers.conversationId, dto.conversationId));

    if (!members.some((m) => m.userId === initiatorId)) {
      throw new ForbiddenException('Not a member of this conversation');
    }

    // Create LiveKit room
    const roomId = `call_${randomUUID()}`;
    await this.livekitService.createRoom(roomId, {
      maxParticipants: members.length,
    });

    // Create call record
    const [call] = await this.db
      .insert(schema.calls)
      .values({
        conversationId: dto.conversationId,
        roomId,
        type: dto.type,
        status: 'ringing',
        initiatorId,
      })
      .returning();

    // Add participants
    for (const member of members) {
      await this.db.insert(schema.callParticipants).values({
        callId: call.id,
        userId: member.userId,
        status: member.userId === initiatorId ? 'joined' : 'invited',
        joinedAt: member.userId === initiatorId ? new Date() : null,
      });
    }

    return call;
  }

  async getCallToken(callId: string, userId: string) {
    const [participant] = await this.db
      .select()
      .from(schema.callParticipants)
      .where(
        and(
          eq(schema.callParticipants.callId, callId),
          eq(schema.callParticipants.userId, userId)
        )
      )
      .limit(1);

    if (!participant) throw new ForbiddenException('Not invited to this call');

    const [call] = await this.db
      .select()
      .from(schema.calls)
      .where(eq(schema.calls.id, callId))
      .limit(1);

    if (!call) throw new NotFoundException('Call not found');

    // Get user info
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    const token = this.livekitService.generateToken(
      call.roomId,
      userId,
      user.displayName
    );

    return {
      token,
      wsUrl: this.livekitService.getWsUrl(),
      roomId: call.roomId,
    };
  }

  async answerCall(callId: string, userId: string, accept: boolean) {
    const [participant] = await this.db
      .select()
      .from(schema.callParticipants)
      .where(
        and(
          eq(schema.callParticipants.callId, callId),
          eq(schema.callParticipants.userId, userId)
        )
      )
      .limit(1);

    if (!participant) throw new ForbiddenException('Not invited to this call');

    if (accept) {
      await this.db
        .update(schema.callParticipants)
        .set({ status: 'joined', joinedAt: new Date() })
        .where(eq(schema.callParticipants.id, participant.id));

      // Check if this is first answer, start the call
      const [call] = await this.db
        .select()
        .from(schema.calls)
        .where(eq(schema.calls.id, callId))
        .limit(1);

      if (call.status === 'ringing') {
        await this.db
          .update(schema.calls)
          .set({ status: 'active', startedAt: new Date() })
          .where(eq(schema.calls.id, callId));
      }
    } else {
      await this.db
        .update(schema.callParticipants)
        .set({ status: 'declined' })
        .where(eq(schema.callParticipants.id, participant.id));
    }

    return { success: true };
  }

  async endCall(callId: string, userId: string, reason?: string) {
    const [call] = await this.db
      .select()
      .from(schema.calls)
      .where(eq(schema.calls.id, callId))
      .limit(1);

    if (!call) throw new NotFoundException('Call not found');

    // Update call status
    await this.db
      .update(schema.calls)
      .set({
        status: 'ended',
        endedAt: new Date(),
        endReason: reason || 'ended_by_user',
      })
      .where(eq(schema.calls.id, callId));

    // Update participant who left
    await this.db
      .update(schema.callParticipants)
      .set({ status: 'left', leftAt: new Date() })
      .where(
        and(
          eq(schema.callParticipants.callId, callId),
          eq(schema.callParticipants.userId, userId)
        )
      );

    // Delete LiveKit room
    try {
      await this.livekitService.deleteRoom(call.roomId);
    } catch (error) {
      console.error('Failed to delete LiveKit room:', error);
    }

    return { success: true };
  }

  async getCallHistory(userId: string, limit = 50) {
    const calls = await this.db
      .select({
        call: schema.calls,
        participant: schema.callParticipants,
      })
      .from(schema.callParticipants)
      .innerJoin(schema.calls, eq(schema.callParticipants.callId, schema.calls.id))
      .where(eq(schema.callParticipants.userId, userId))
      .orderBy(schema.calls.createdAt)
      .limit(limit);

    return calls;
  }
}
```

### Step 4: Call Signaling Gateway

```typescript
// apps/api/src/modules/calls/calls.gateway.ts
import {
  WebSocketGateway,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { CallsService } from './calls.service';

@WebSocketGateway()
export class CallsGateway {
  constructor(private callsService: CallsService) {}

  @SubscribeMessage('call:initiate')
  async handleInitiateCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: { conversationId: string; type: 'voice' | 'video' },
  ) {
    const userId = client.data.userId;

    const call = await this.callsService.initiateCall(userId, dto);
    const token = await this.callsService.getCallToken(call.id, userId);

    // Notify other participants
    client.to(`conversation:${dto.conversationId}`).emit('call:incoming', {
      callId: call.id,
      type: call.type,
      initiatorId: userId,
      conversationId: dto.conversationId,
    });

    return { call, token };
  }

  @SubscribeMessage('call:answer')
  async handleAnswerCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: { callId: string; accept: boolean },
  ) {
    const userId = client.data.userId;

    await this.callsService.answerCall(dto.callId, userId, dto.accept);

    if (dto.accept) {
      const token = await this.callsService.getCallToken(dto.callId, userId);

      // Notify other participants
      const [call] = await this.callsService.getCall(dto.callId);
      client.to(`conversation:${call.conversationId}`).emit('call:answered', {
        callId: dto.callId,
        userId,
      });

      return { token };
    } else {
      // Notify caller of decline
      const [call] = await this.callsService.getCall(dto.callId);
      client.to(`conversation:${call.conversationId}`).emit('call:declined', {
        callId: dto.callId,
        userId,
      });

      return { success: true };
    }
  }

  @SubscribeMessage('call:end')
  async handleEndCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: { callId: string },
  ) {
    const userId = client.data.userId;

    const [call] = await this.callsService.getCall(dto.callId);
    await this.callsService.endCall(dto.callId, userId);

    // Notify participants
    client.to(`conversation:${call.conversationId}`).emit('call:ended', {
      callId: dto.callId,
      endedBy: userId,
    });

    return { success: true };
  }
}
```

### Step 5: Frontend Call Hook

```typescript
// apps/web/src/features/calls/hooks/use-call.ts
import { useState, useCallback, useEffect } from 'react';
import { useSocket } from '@/hooks/use-socket';

interface CallState {
  callId: string | null;
  type: 'voice' | 'video' | null;
  status: 'idle' | 'calling' | 'ringing' | 'active' | 'ended';
  participants: string[];
}

export function useCall() {
  const { socket } = useSocket();
  const [callState, setCallState] = useState<CallState>({
    callId: null,
    type: null,
    status: 'idle',
    participants: [],
  });
  const [incomingCall, setIncomingCall] = useState<{
    callId: string;
    type: 'voice' | 'video';
    initiatorId: string;
  } | null>(null);

  useEffect(() => {
    if (!socket) return;

    socket.on('call:incoming', (data) => {
      setIncomingCall(data);
    });

    socket.on('call:answered', (data) => {
      setCallState((prev) => ({
        ...prev,
        status: 'active',
        participants: [...prev.participants, data.userId],
      }));
    });

    socket.on('call:declined', (data) => {
      // Handle decline
    });

    socket.on('call:ended', (data) => {
      setCallState({
        callId: null,
        type: null,
        status: 'idle',
        participants: [],
      });
    });

    return () => {
      socket.off('call:incoming');
      socket.off('call:answered');
      socket.off('call:declined');
      socket.off('call:ended');
    };
  }, [socket]);

  const initiateCall = useCallback(
    async (conversationId: string, type: 'voice' | 'video') => {
      if (!socket) return null;

      return new Promise((resolve) => {
        socket.emit(
          'call:initiate',
          { conversationId, type },
          (response: any) => {
            setCallState({
              callId: response.call.id,
              type,
              status: 'calling',
              participants: [],
            });
            resolve(response);
          }
        );
      });
    },
    [socket]
  );

  const answerCall = useCallback(
    async (callId: string, accept: boolean) => {
      if (!socket) return null;

      return new Promise((resolve) => {
        socket.emit('call:answer', { callId, accept }, (response: any) => {
          if (accept) {
            setCallState((prev) => ({
              ...prev,
              callId,
              status: 'active',
            }));
          }
          setIncomingCall(null);
          resolve(response);
        });
      });
    },
    [socket]
  );

  const endCall = useCallback(
    async (callId: string) => {
      if (!socket) return;

      socket.emit('call:end', { callId }, () => {
        setCallState({
          callId: null,
          type: null,
          status: 'idle',
          participants: [],
        });
      });
    },
    [socket]
  );

  return {
    callState,
    incomingCall,
    initiateCall,
    answerCall,
    endCall,
  };
}
```

### Step 6: LiveKit Room Component

```typescript
// apps/web/src/features/calls/components/call-view.tsx
import { useState, useEffect } from 'react';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  ControlBar,
} from '@livekit/components-react';
import '@livekit/components-styles';

interface CallViewProps {
  token: string;
  serverUrl: string;
  type: 'voice' | 'video';
  onDisconnected: () => void;
}

export function CallView({ token, serverUrl, type, onDisconnected }: CallViewProps) {
  return (
    <div className="fixed inset-0 bg-gray-900 z-50">
      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        connect={true}
        video={type === 'video'}
        audio={true}
        onDisconnected={onDisconnected}
      >
        <RoomAudioRenderer />
        {type === 'video' ? (
          <VideoConference />
        ) : (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-white text-xl mb-4">Voice Call</div>
            <ControlBar variation="minimal" />
          </div>
        )}
      </LiveKitRoom>
    </div>
  );
}
```

### Step 7: Incoming Call Modal

```typescript
// apps/web/src/features/calls/components/incoming-call.tsx
import { useCall } from '../hooks/use-call';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff, Video } from 'lucide-react';

export function IncomingCallModal() {
  const { incomingCall, answerCall } = useCall();

  if (!incomingCall) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full">
        <div className="text-center mb-6">
          <div className="text-lg font-semibold mb-2">
            Incoming {incomingCall.type === 'video' ? 'Video' : 'Voice'} Call
          </div>
          <div className="text-gray-500">
            {/* Show caller name */}
            Someone is calling...
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <Button
            variant="destructive"
            size="lg"
            className="rounded-full w-14 h-14"
            onClick={() => answerCall(incomingCall.callId, false)}
          >
            <PhoneOff className="w-6 h-6" />
          </Button>

          <Button
            variant="default"
            size="lg"
            className="rounded-full w-14 h-14 bg-green-500 hover:bg-green-600"
            onClick={() => answerCall(incomingCall.callId, true)}
          >
            {incomingCall.type === 'video' ? (
              <Video className="w-6 h-6" />
            ) : (
              <Phone className="w-6 h-6" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

## Todo List

- [ ] Install LiveKit dependencies
- [ ] Create LiveKit service
- [ ] Setup call database schema
- [ ] Implement call initiation
- [ ] Implement call answering
- [ ] Implement call ending
- [ ] Create call signaling gateway
- [ ] Build call UI components
- [ ] Implement incoming call modal
- [ ] Add screen sharing
- [ ] Add call history
- [ ] Handle network disconnection
- [ ] Add call quality indicators
- [ ] Write call tests

## Success Criteria

1. 1-on-1 voice calls work
2. 1-on-1 video calls work
3. Group calls support 10 users
4. Screen sharing works
5. Call setup <300ms
6. Audio/video quality adaptive
7. Reconnection on network change
8. Call notifications delivered

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| LiveKit downtime | High | Health monitoring, fallback UI |
| NAT traversal issues | Medium | TURN server configuration |
| Poor network quality | Medium | Adaptive bitrate, quality indicators |

## Security Considerations

- DTLS-SRTP encrypts media (WebRTC default)
- LiveKit room tokens short-lived
- Verify call membership before token issue
- Consider insertable streams for E2E media encryption
- Call signaling via authenticated WebSocket

## Next Steps

After completing Phase 06:
1. Proceed to Phase 07 (Advanced Features)
2. Add presence indicators
3. Implement typing indicators
4. Add read receipts UI
