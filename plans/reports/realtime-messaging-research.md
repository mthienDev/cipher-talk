# Research Report: Real-Time Messaging Solutions for Web Chat

**Date:** December 13, 2025
**Focus:** TypeScript/Node.js implementations
**Research Scope:** WebSocket libraries, WebRTC, SSE, delivery guarantees, presence, typing indicators, read receipts

---

## Executive Summary

**WebSocket** is the foundation for modern real-time chat. Three libraries dominate: **Socket.IO** (feature-rich with fallbacks), **ws** (performance-optimized), and **uWebSockets** (ultra-lightweight). **SSE** works for one-way server-to-client updates but inadequate for chat. **WebRTC** excels for P2P but requires signaling server. Core features—message ordering, presence detection, typing indicators, read receipts—demand application-layer implementation across all protocols.

---

## WebSocket Libraries: Comparative Analysis

| Aspect | Socket.IO | ws | uWebSockets |
|--------|-----------|----|----|
| **Perf** | Standard | 50K+ conns/server | 20x faster |
| **Fallback** | HTTP long-poll | None | None |
| **Features** | Rooms, namespaces, auto-reconnect | Minimal | Minimal |
| **Learning curve** | Low | Low | Low |
| **Protocol** | Custom (WebSocket) | Standard WS | Standard WS |
| **Bundle size** | 10.4kB | ~2kB | ~1kB |
| **Lock-in** | High | None | None |

**Recommendation:**
- **Socket.IO**: Production apps needing reliability, cross-browser support, rooms/broadcasting
- **ws**: Performance-critical systems, full control over reconnection logic
- **uWebSockets**: Extreme performance scenarios, high-frequency trading, gaming

---

## Alternative Protocols

### Server-Sent Events (SSE)
**One-way server→client only.** Uses standard HTTP/HTTPS. Auto-reconnect built-in. Perfect for notifications, live feeds, dashboards—**not suitable for chat** requiring bidirectional communication.

**Advantage:** Simpler than WebSocket, HTTP/2 compatible
**Limitation:** Can't send client→server via SSE

### WebRTC Data Channels
**True P2P messaging** with RTCDataChannel (WebSocket-like API). Requires signaling server (typically Socket.IO/ws) for initial connection negotiation.

**Popular libs:** PeerJS, simple-peer
**Use case:** End-to-end encrypted chat, reduced server load
**Trade-off:** Complex NAT/firewall traversal, STUN/TURN server overhead

---

## Core Chat Features Implementation

### 1. Message Delivery Guarantees
**Not built-in to any transport.** Implement application layer:
- **Sequencing:** Attach monotonic IDs (server timestamp + sequence counter)
- **Exactly-once delivery:** Track ACKs on server; resend unacked messages
- **Ordering:** Client-side buffer + sort by timestamp if concurrent arrival

**TypeScript pattern:**
```typescript
interface Message {
  id: string; // uuid or `${timestamp}-${seq}`
  timestamp: number;
  content: string;
  acked?: boolean;
}
```

### 2. Presence Detection
Track user online/offline status. **Strategies:**
- **Heartbeat:** Client sends periodic ping (30s interval)
- **Connection event:** Server marks user online on connect, offline on disconnect + timeout
- **Redis for scale:** Store presence in Redis with TTL, emit updates to subscribers

```typescript
socket.on('connect', () => {
  server.presence.set(userId, { status: 'online', lastSeen: Date.now() });
  broadcast('userJoined', userId);
});
```

### 3. Typing Indicators
User is composing. **Flow:**
- Client: `typing:start` → Server throttles (100-300ms) → Broadcast to room
- Client: `typing:stop` after 500ms inactivity → Server clears

**No persistent storage needed.** Set auto-expire on server (3s timeout).

### 4. Read Receipts
**Two states:** delivered, read.

```typescript
enum ReceiptStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read'
}

interface Receipt {
  messageId: string;
  userId: string;
  status: ReceiptStatus;
  timestamp: number;
}
```

Server tracks on DB; client emits `message:read` when viewport visible (Intersection Observer).

---

## Performance Baselines (2025)

- **Socket.IO:** ~5ms latency, 10K concurrent users (single server)
- **ws:** ~2ms latency, 50K concurrent users
- **uWebSockets:** <1ms latency, 100K+ concurrent users
- **SSE:** 50-200ms (HTTP overhead), good for notification feeds
- **WebRTC:** Variable (depends on NAT); <10ms on LAN

**For 10K users:** Socket.IO suffices. **For 100K+:** Cluster with Redis adapter or uWebSockets + horizontal scaling.

---

## Node.js/TypeScript Implementation Stack

**Recommended setup for production chat:**

```typescript
// Socket.IO + Redis adapter for horizontal scaling
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import redis from 'redis';

const io = new Server(httpServer);
const pubClient = redis.createClient();
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));

io.on('connection', (socket) => {
  socket.on('message', (data) => {
    io.to(data.roomId).emit('message', {
      ...data,
      id: generateUUID(),
      timestamp: Date.now(),
      from: socket.data.userId
    });
  });
});
```

---

## Security Considerations

1. **Message validation:** Sanitize content (DOMPurify for XSS)
2. **Authentication:** JWT in socket handshake, verify on each event
3. **Rate limiting:** Prevent spam (5 msg/sec per user)
4. **End-to-end:** Use TweetNaCl.js or libsodium for E2EE (encrypt client-side)
5. **WSS (TLS):** Always use wss:// in production

---

## Unresolved Questions

1. Should chat favor strong consistency (ordered messages) or availability (partition tolerance)?
2. How long to persist read receipts in DB? (Cost vs. UX tradeoff)
3. Multi-region chat—should messages replicate synchronously or eventually consistent?
4. WebRTC signaling protocol: custom JSON or standard (JSEP)?

---

## References

- [Socket.IO Docs](https://socket.io/docs/v4/)
- [WebSockets vs Socket.IO: Complete Real-Time Guide 2025](https://www.mergesociety.com/code-report/websocets-explained)
- [Node.js WebSockets: When to Use ws vs socket.io](https://dev.to/alex_aslam/nodejs-websockets-when-to-use-ws-vs-socketio-and-why-we-switched-di9)
- [Socket.IO vs uWebSockets Comparison](https://stackshare.io/stackups/socket-io-vs-uwebsockets)
- [PeerJS - WebRTC Simplified](https://peerjs.com/)
- [simple-peer GitHub](https://github.com/feross/simple-peer)
- [WebRTC Signaling with WebSocket and Node.js](https://blog.logrocket.com/webrtc-signaling-websocket-node-js/)
- [WebSockets vs SSE: Comprehensive Comparison 2025](https://dev.to/haraf/server-sent-events-sse-vs-websockets-vs-long-polling-whats-best-in-2025-5ep8)
- [Ably: Websockets vs SSE](https://ably.com/blog/websockets-vs-sse)
- [Live Chat Features List 2025](https://ably.com/blog/live-chat-features)
- [Typing Indicators in Chat Engagement](https://www.pubnub.com/guides/how-a-typing-indicator-enables-chat-engagement/)
