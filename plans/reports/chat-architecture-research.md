# Research Report: Scalable Chat Architecture for 500+ Users

**Research Date:** December 13, 2025
**Focus:** TypeScript/JavaScript Stack

---

## Executive Summary

For 500+ concurrent users, **start with modular monolith using Node.js/TypeScript**, evolve to microservices only when bottlenecks appear. Redis + PostgreSQL combo optimal for baseline. Horizontal scaling via Socket.IO + Redis Adapter pattern with sticky session load balancing. Avoid premature Kafka/Cassandra complexity; 2025 consensus favors "smart hybrids" over pure architectures.

---

## Architecture Decision

### Monolithic vs Microservices

**Recommendation: Smart Modular Monolith → Microservices Migration Path**

| Aspect | Monolith | Microservices |
|--------|----------|--------------|
| **Dev Speed** | Fast (single codebase) | Slower (service coordination) |
| **Deployment** | Single unit redeployment | Independent service scaling |
| **500+ Users** | Sufficient if well-designed | Overkill unless team>10 |
| **Database** | Shared DB (simpler) | Per-service DB (complex) |

**2025 Industry Consensus:** Start monolithic, migrate services only when specific components become bottlenecks. Premature microservices adoption increases complexity without solving actual problems.

---

## Message Queue Patterns

### RabbitMQ, Redis, Kafka Comparison

| Use Case | Technology | Rationale |
|----------|------------|-----------|
| **Real-time notifications** | Redis Pub/Sub | Lowest latency, in-memory, 500 users manageable |
| **Complex routing** | RabbitMQ | Fanout/topic/direct exchanges for multi-room routing |
| **Message durability** | RabbitMQ (Quorum Queues) | Persistence without Kafka overhead |
| **Event replay/analytics** | Kafka | Only if building time-series analytics |
| **Hybrid approach** | Redis + RabbitMQ | Redis for hot real-time, RabbitMQ for routing |

**For 500 users:** Redis Pub/Sub is primary; add RabbitMQ only if complex room-based routing emerges. Avoid Kafka until 5M+ daily messages.

**2025 Update:** RabbitMQ's Quorum Queues and Kafka's KRaft (ZooKeeper removal) reduce operational overhead.

---

## Database Architecture

### PostgreSQL vs MongoDB vs Cassandra

**Optimal for 500+ Users: PostgreSQL + Read Replicas**

| Database | Strength | Weakness | 500 Users? |
|----------|----------|----------|-----------|
| **PostgreSQL** | ACID, complex queries, JSON support | Vertical scaling ceiling | YES - Primary choice |
| **MongoDB** | Horizontal scaling, flexible schema | Slower joins, eventual consistency | YES - Alternative if schema fluid |
| **Cassandra** | Extreme horizontal scale (10k+ concurrent) | 3-node minimum, complex tuning | NO - Overkill overhead |

**Architecture:**
- Primary: PostgreSQL for messages, users, rooms
- Scaling: Read replicas for read-heavy queries
- Cache layer: Redis for active conversation state (last 100 messages, online users)
- No need for MongoDB unless schema changes frequently; Cassandra unnecessary <1M users

---

## Real-Time Communication

### WebSocket/Socket.IO Scaling Pattern

**Standard 2025 Architecture:**

```
                    [Load Balancer - Sticky Sessions]
                    /           |           \
            [Node 1]      [Node 2]      [Node 3]
            Socket.IO     Socket.IO     Socket.IO
                  \           |           /
                    [Redis Adapter]
                    (Pub/Sub Bridge)
```

**Key Components:**
1. **Sticky Sessions:** Client maps to same server instance (IP/cookie affinity)
2. **Redis Adapter:** Cross-server message broadcasting via Redis Pub/Sub
3. **Load Balancer:** Least-connection algorithm better than round-robin for varying connection weights
4. **Connection Limits:** ~12k WebSocket clients per Node.js instance (8GB RAM, single core)

**Socket.IO Configuration:**
```typescript
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";

const pubClient = createClient({ host: "redis" });
const subClient = pubClient.duplicate();

const io = new Server(3000);
io.adapter(createAdapter(pubClient, subClient));
```

**Scaling Math:** 500 users ÷ 12k per instance = 1 Node sufficient; add 2nd for redundancy.

---

## Horizontal Scaling Strategies

### Multi-Node Deployment Pattern

**3-Tier Approach:**

1. **Stateless Application Layer** (Horizontal ✓)
   - Multiple Node.js instances (Docker/K8s)
   - Load balanced via sticky sessions
   - Scales linearly until database becomes bottleneck

2. **Stateful Cache Layer** (Replicated ✓)
   - Redis Sentinel or Cluster mode
   - Handles session state, online presence, message buffer
   - Scales to ~100M operations/sec

3. **Database Layer** (Replicated ✓)
   - PostgreSQL primary + read replicas
   - Replication lag: ~1ms local, ~100ms cross-region
   - Connection pooling via PgBouncer (min 100 connections @ 500 users)

**Performance Per Node (Node.js 18+, 8GB RAM):**
- 12,000 concurrent WebSocket connections
- ~500 messages/sec throughput per connection
- CPU: 60-80% under sustained load
- Memory: 1-2GB per 5k connections

---

## Load Balancing Approaches

### Recommended: NGINX + Sticky Sessions

```nginx
upstream socket_io {
    # Sticky sessions via IP hash
    hash $remote_addr consistent;

    server app1:3000 weight=1;
    server app2:3000 weight=1;
    server app3:3000 weight=1;
}

server {
    listen 80;
    location / {
        proxy_pass http://socket_io;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

**Alternative: Kubernetes + HPA**
- Auto-scale based on CPU/memory metrics
- KEDA for event-driven scaling (Redis queue depth)
- Istio service mesh for advanced routing

**Load Balancing Algorithms:**
- **Round Robin:** Fair distribution, ignores connection weight
- **Least Connection:** Better for heterogeneous load (chatty users)
- **IP Hash:** Ensures sticky sessions (required for WebSocket)

---

## Recommended Tech Stack (500 Users)

### Production-Ready TypeScript Setup

```
Frontend: TypeScript + React + Socket.IO client
Backend: Node.js + Express + TypeScript
WebSocket: Socket.IO v4+ with Redis adapter
Database: PostgreSQL 15+ with pgBouncer
Cache: Redis 7+ (Sentinel for HA)
Load Balancer: NGINX / Kubernetes
Deployment: Docker + Docker Compose (dev) / K8s (prod)
```

### Deployment Checklist

- [ ] Socket.IO with Redis adapter configured
- [ ] Sticky session load balancing enabled
- [ ] PostgreSQL connection pooling (PgBouncer)
- [ ] Redis persistence (RDB snapshots or AOF)
- [ ] Database read replicas for scaling reads
- [ ] Monitoring: Prometheus + Grafana
- [ ] Logging: ELK Stack / CloudWatch
- [ ] Zero-downtime deployments via blue-green

---

## Migration Path (When to Scale)

| User Count | Architectural Changes |
|------------|----------------------|
| **50-500** | Single Node monolith + Redis cache |
| **500-2K** | Multi-node (3x) + PgSQL read replicas |
| **2K-10K** | Add message queue (RabbitMQ) for complex routing |
| **10K+** | Consider service extraction (auth, presence, notifications) |
| **50K+** | Full microservices + Kafka event streaming |

---

## Common Pitfalls to Avoid

1. **Sticky Sessions Not Configured:** WebSocket clients reconnect on every request
2. **Redis as Primary DB:** Data loss on restart; use for cache only
3. **Monolithic Over-Engineering:** Microservices before 10K users adds 3-5x complexity
4. **Kafka Premature Adoption:** Overkill for <1M events/day; use RabbitMQ instead
5. **Cassandra for Small Scale:** Minimum 3 nodes, complex tuning; use PostgreSQL first
6. **No Connection Pooling:** Direct DB connections exhaust after 100 concurrent users
7. **Single Redis Instance:** No failover; use Sentinel or Cluster mode from start

---

## References

### Microservices vs Monolith (2025)
- [Monolith vs Microservices: DEV Community](https://dev.to/prateekbka/monolith-vs-microservices-making-the-right-architectural-choice-in-2025-4a27)
- [Scalo: 2025 Comparison](https://www.scalosoft.com/blog/monolithic-vs-microservices-architecture-pros-and-cons-for-2025/)
- [Atlassian: Architecture Guide](https://www.atlassian.com/microservices/microservices-architecture/microservices-vs-monolith)

### Message Queue Patterns
- [Choosing the Right Queue: Naman Vashishtha](https://medium.com/@unclejiyo/choosing-the-right-message-queue-rabbitmq-apache-kafka-and-redis-compared-eb5ad4b83449)
- [2025 Decision Framework: Java Code Geeks](https://www.javacodegeeks.com/2025/12/event-driven-architecture-kafka-vs-rabbitmq-vs-pulsar-a-2025-decision-framework.html)
- [Redis vs Kafka: ByteByteGo](https://blog.bytebytego.com/p/how-to-choose-a-message-queue-kafka)

### Database Scaling
- [MongoDB vs PostgreSQL 2025](https://www.sevensquaretech.com/mongodb-vs-postgresql/)
- [Cassandra vs MongoDB: OpenLogic](https://www.openlogic.com/blog/cassandra-vs-mongodb)
- [Chat2DB: DBMS Comparison 2025](https://articles.chat2db.ai/best-database-management-systems-2025/)

### WebSocket/Socket.IO Scaling
- [Socket.IO Scaling: Ably](https://ably.com/topic/scaling-socketio)
- [WebSocket Horizontal Scaling: TSH](https://tsh.io/blog/how-to-scale-websocket)
- [Socket.IO + RabbitMQ: Crisp](https://crisp.chat/en/blog/horizontal-scaling-of-socket-io-microservices-with-rabbitmq/)
- [WebSocket Scale 2025: VideoSDK](https://www.videosdk.live/developer-hub/websocket/websocket-scale)

---

## Unresolved Questions

1. **Encryption at Rest:** Should messages be encrypted in PostgreSQL or handled app-layer only?
2. **Message Retention Policy:** How long to store messages before archival/deletion?
3. **Geographic Distribution:** Single region vs multi-region replication strategy?
4. **Authentication:** JWT vs sessions; refresh token rotation details?
5. **Rate Limiting:** Per-user message limits and enforcement location (app vs middleware)?
