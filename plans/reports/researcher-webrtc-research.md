# Research Report: WebRTC for Voice & Video Calls

**Date:** December 13, 2025 | **Focus:** TypeScript Implementations

## Executive Summary

WebRTC enables peer-to-peer voice/video with fallback via STUN/TURN servers for NAT traversal. SFU (Selective Forwarding Unit) dominates for group calls—lower server cost, flexible layouts, better scalability than MCU. TypeScript ecosystem mature: mediasoup (low-level, high control), LiveKit (abstraction, production-ready), Jitsi (feature-rich). Recording varies by architecture; SFU flexible (per-stream), MCU simpler (composite). Signaling via WebSocket (Socket.IO/NestJS) is standard.

## Key Findings

### 1. Signaling Server Architecture

**WebSocket-based signaling** via Socket.IO + Node.js/NestJS handles session negotiation. Responsibilities:
- SDP offer/answer exchange (session descriptors)
- ICE candidate gathering
- Connection state management
- E2EE key exchange (if implemented)

NestJS recommended for production (DI containers, modules, security). Deno serverless approach possible. AWS Lambda + DynamoDB deployments available for cost efficiency.

### 2. NAT Traversal: STUN vs TURN

| Protocol | Purpose | Port | Cost |
|----------|---------|------|------|
| **STUN** | Discover public IP, determine NAT type | UDP/TCP 3478 | Free (Google: UDP 19302) |
| **TURN** | Relay traffic (symmetric NAT fallback) | TCP 3478-3480, UDP 5349 | Paid (COTURN self-hosted or cloud) |

**Deployment:** Always combine both. Self-host COTURN for control; consider STUNner for Kubernetes. Production: 1-2% calls hit TURN; bandwidth expensive.

### 3. Architecture Comparison

#### **SFU (Selective Forwarding Unit)** ✓ Recommended
- **Model:** Server forwards N streams (one per participant)
- **Bandwidth:** Higher per-client (downloads multiple streams)
- **Server Cost:** Low CPU (no transcoding)
- **Scalability:** 20-30 native; horizontal scaling easy
- **Layout:** Flexible (app controls composition)
- **Recording:** Per-stream flexibility
- **Use Case:** 5-100+ participants, modern clients

#### **MCU (Multipoint Control Unit)**
- **Model:** Server composes 1 stream (all participants mixed)
- **Bandwidth:** Lowest (single stream download)
- **Server Cost:** High CPU (transcoding all streams)
- **Scalability:** Expensive to scale
- **Layout:** Fixed (server controls)
- **Recording:** Pre-composed (simple)
- **Use Case:** Legacy systems, low-bandwidth clients

#### **Mesh (P2P)**
- **Model:** Direct peer connections, no server
- **Bandwidth:** Highest (N-1 uploads per participant)
- **Cost:** Zero infrastructure
- **Scalability:** 2-4 participants max
- **Use Case:** Small private calls

### 4. TypeScript Library Ecosystem

#### **mediasoup** (C++/Rust core, Node.js API)
- **Architecture:** Embedded SFU; logic inside app process
- **Maturity:** Stable, production-proven
- **Control:** Low-level (maximum flexibility)
- **Scalability:** Single-machine; Rust variant for parallel workers
- **Recording:** Per-stream via recorders
- **Best for:** Custom implementations, cost-sensitive

#### **LiveKit** (Higher abstraction)
- **Architecture:** Standalone SFU service
- **Maturity:** Production-ready, commercial backing
- **SDKs:** Browser, React, iOS, Android
- **Recording:** Built-in, per-stream or composite
- **Scaling:** Cloud-native, horizontal
- **Best for:** Rapid deployment, turnkey solution

#### **Jitsi** (Feature-rich)
- **Architecture:** Full stack (Videobridge + components)
- **Maturity:** Established, widely deployed
- **Feature:** Screensharing, chat, recording, breakout rooms
- **Customization:** Medium (less flexible than mediasoup)
- **Best for:** Feature completeness, community support

#### **Janus** (Gateway-based)
- **Architecture:** Modular plugin system
- **Plugins:** Video conference, streaming, recording
- **Scalability:** Moderate
- **Use:** Flexible for mixed workloads

**Recommendation for CipherTalk:** LiveKit for rapid production, mediasoup for custom control.

### 5. Group Video Architecture Patterns

```
Signaling Layer (WebSocket):
├── NestJS/Socket.IO server
├── User authentication
├── Room management
└── SDP/ICE orchestration

Media Layer (RTC):
├── SFU Media Server (mediasoup/LiveKit)
├── STUN server (Google or self-hosted)
├── TURN server (COTURN for fallback)
└── Recording service (per-stream pipelines)

Client (Browser/Mobile):
├── RTCPeerConnection
├── WebRTC constraints negotiation
└── Layout rendering (app controls)
```

### 6. Recording Strategies

**SFU approach (recommended):**
- Record each stream independently
- Post-process composite in cloud (FFmpeg)
- Flexible editing/transcoding
- Scales horizontally

**MCU approach:**
- Single composite stream recorded
- No post-processing needed
- High server resource cost
- Layout fixed by server

**Implementation:** mediasoup/LiveKit both support per-stream recording via codecs (H.264, VP8, VP9). Use FFmpeg for composition.

## Implementation Recommendations

### Quick Start (LiveKit)

```typescript
// Server (NestJS)
import { WebSocketGateway, SubscribeMessage } from '@nestjs/websockets';
import { AccessToken } from 'livekit-server-sdk';

@WebSocketGateway()
export class LiveKitGateway {
  @SubscribeMessage('join-room')
  async joinRoom(client: Socket, payload: { room: string; identity: string }) {
    const token = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET)
      .addGrant({ room: payload.room, roomJoin: true, canPublish: true })
      .toJwt();
    return { token, url: process.env.LIVEKIT_URL };
  }
}

// Client (React + TypeScript)
import { LiveKitRoom, VideoConference } from '@livekit/components-react';

export function CallRoom({ token, url }: { token: string; url: string }) {
  return (
    <LiveKitRoom token={token} serverUrl={url}>
      <VideoConference />
    </LiveKitRoom>
  );
}
```

### Production Checklist

- [ ] Configure STUN (Google or self-hosted)
- [ ] Deploy TURN (COTURN/STUNner) for NAT fallback
- [ ] Implement session-level E2EE key exchange (server facilitates, never sees keys)
- [ ] Monitoring: latency, packet loss, CPU/bandwidth metrics
- [ ] Recording backend (S3/GCS with FFmpeg compositing)
- [ ] Rate limiting on signaling (prevent DoS)
- [ ] Test on 4G/5G and symmetric NAT conditions

## Common Pitfalls

1. **No TURN fallback** → Calls fail ~2-5% (behind symmetric NAT)
2. **MCU for growth** → CPU costs explode; scale horizontally with SFU
3. **P2P for 5+ users** → Bandwidth/CPU client-side becomes prohibitive
4. **Ignoring E2EE signaling** → Keys exchanged in plaintext; implement server-facilitated key exchange
5. **Single region SFU** → High latency; use geo-distributed edge gateways
6. **No recording backup** → Plan redundancy (multi-zone storage)

## Unresolved Questions

1. What is CipherTalk's max concurrent users target? (shapes STUN/TURN capacity)
2. E2EE requirement? (impacts signaling complexity, key distribution)
3. Budget constraints? (influences SFU vs MCU, self-hosted vs managed)
4. Recording compliance needs? (retention, encryption, jurisdictional)
5. Mobile support priority? (native vs WebRTC; affects SDK selection)

## Sources & References

- [TypeScript WebRTC Signaling (Deno)](https://dev.to/piterweb/typescript-webrtc-how-to-implement-a-free-signaling-server-gamelinksafe-c8g)
- [NestJS WebRTC Integration](https://reelmind.ai/blog/webrtc-api-integration-for-business-real-time-video-conferencing-powered-by-nestjs-backend)
- [Signaling Server Fundamentals](https://getstream.io/resources/projects/webrtc/basics/signaling-server/)
- [MDN WebRTC Signaling](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling)
- [STUN/TURN NAT Traversal Guide](https://webrtc.link/en/articles/stun-turn-servers-webrtc-nat-traversal/)
- [Google STUN Server 2025](https://www.videosdk.live/developer-hub/stun-turn-server/google-stun-server)
- [MDN WebRTC Protocols](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Protocols)
- [STUNner Kubernetes Deployment](https://webrtc.ventures/2025/06/how-to-deploy-stunner-as-a-webrtc-stun-turn-server-on-kubernetes/)
- [SFU vs MCU Comparison](https://webrtc.ventures/2020/12/webrtc-media-servers-sfus-vs-mcus/)
- [SFU Architecture Deep Dive](https://bloggeek.me/webrtc-multiparty-video-alternatives/)
- [WebRTC Architecture Patterns](https://signalwire.com/blogs/industry/p2p-sfu-mcu-find-out-which-webrtc-architecture-is-right-for-you)
- [mediasoup GitHub](https://github.com/versatica/mediasoup)
- [mediasoup Documentation](https://mediasoup.org/documentation/v3/mediasoup/api/)
- [WebRTC Open Source Review 2024](https://bloggeek.me/state-of-webrtc-open-source-projects/)
- [LiveKit Documentation](https://docs.livekit.io/reference/internals/livekit-sfu/)

