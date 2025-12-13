# Phase 10: Deployment & Monitoring

## Context Links
- [Main Plan](plan.md)
- [Phase 09: Testing](phase-09-testing.md)
- Docker: https://docs.docker.com
- Kubernetes: https://kubernetes.io/docs

## Overview

| Attribute | Value |
|-----------|-------|
| Priority | P0 (Critical) |
| Status | Pending |
| Est. Duration | 1 week |
| Dependencies | Phase 09 |

Production deployment with Docker, CI/CD pipeline, monitoring (Prometheus/Grafana), logging (ELK), and alerting.

## Key Insights

- Docker Compose for staging, Kubernetes for production
- Blue-green deployment for zero downtime
- Prometheus for metrics, Grafana for dashboards
- ELK stack for centralized logging
- Health checks for all services
- Secrets management via environment/vault

## Requirements

### Functional
- [ ] Docker images for all services
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Blue-green deployment
- [ ] Health check endpoints
- [ ] Prometheus metrics export
- [ ] Grafana dashboards
- [ ] Centralized logging
- [ ] Alerting rules

### Non-Functional
- [ ] Zero-downtime deployments
- [ ] Auto-scaling capability
- [ ] 99.9% uptime target
- [ ] <5min incident detection

## Architecture

```
Production Infrastructure:
┌─────────────────────────────────────────────────────┐
│                     Load Balancer                    │
│                    (nginx/traefik)                   │
└──────────────────────┬──────────────────────────────┘
                       │
       ┌───────────────┼───────────────┐
       ▼               ▼               ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│   API Pod   │ │   API Pod   │ │   API Pod   │
│  (NestJS)   │ │  (NestJS)   │ │  (NestJS)   │
└─────────────┘ └─────────────┘ └─────────────┘
       │               │               │
       └───────────────┼───────────────┘
                       │
       ┌───────────────┼───────────────┐
       ▼               ▼               ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│  PostgreSQL │ │    Redis    │ │    MinIO    │
│   (Primary) │ │  (Cluster)  │ │  (Cluster)  │
└─────────────┘ └─────────────┘ └─────────────┘

Monitoring Stack:
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│  Prometheus │ │   Grafana   │ │   Loki/ELK  │
│  (Metrics)  │ │ (Dashboard) │ │  (Logging)  │
└─────────────┘ └─────────────┘ └─────────────┘
```

## Docker Configuration

### Dockerfile - API

```dockerfile
# apps/api/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
RUN corepack enable && pnpm install --frozen-lockfile

# Build
COPY tsconfig.base.json ./
COPY apps/api ./apps/api
COPY packages/shared ./packages/shared
RUN pnpm --filter api build

# Production image
FROM node:20-alpine AS runner

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./

USER nestjs

EXPOSE 3000

ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/main.js"]
```

### Dockerfile - Web

```dockerfile
# apps/web/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
RUN corepack enable && pnpm install --frozen-lockfile

COPY tsconfig.base.json ./
COPY apps/web ./apps/web
COPY packages/shared ./packages/shared

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN pnpm --filter web build

# Production image with nginx
FROM nginx:alpine AS runner

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
```

### Docker Compose - Production

```yaml
# docker/docker-compose.prod.yml
version: '3.8'

services:
  api:
    image: ciphertalk/api:${VERSION:-latest}
    build:
      context: ..
      dockerfile: apps/api/Dockerfile
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - JWT_SECRET=${JWT_SECRET}
      - S3_ENDPOINT=${S3_ENDPOINT}
      - S3_ACCESS_KEY=${S3_ACCESS_KEY}
      - S3_SECRET_KEY=${S3_SECRET_KEY}
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
        order: start-first
      restart_policy:
        condition: on-failure
    healthcheck:
      test: ["CMD", "wget", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - ciphertalk

  web:
    image: ciphertalk/web:${VERSION:-latest}
    build:
      context: ..
      dockerfile: apps/web/Dockerfile
      args:
        - VITE_API_URL=${API_URL}
    deploy:
      replicas: 2
      update_config:
        parallelism: 1
        delay: 10s
    healthcheck:
      test: ["CMD", "wget", "--spider", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - ciphertalk

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
    depends_on:
      - api
      - web
    networks:
      - ciphertalk

  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.retention.time=15d'
    networks:
      - ciphertalk

  grafana:
    image: grafana/grafana:latest
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
    depends_on:
      - prometheus
    networks:
      - ciphertalk

networks:
  ciphertalk:
    driver: overlay

volumes:
  prometheus_data:
  grafana_data:
```

## CI/CD Pipeline

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm lint

      - name: Type check
        run: pnpm type-check

      - name: Unit tests
        run: pnpm test:unit
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test
          REDIS_URL: redis://localhost:6379

      - name: Integration tests
        run: pnpm test:integration
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test
          REDIS_URL: redis://localhost:6379

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.event_name == 'push'

    steps:
      - uses: actions/checkout@v4

      - name: Login to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push API
        uses: docker/build-push-action@v5
        with:
          context: .
          file: apps/api/Dockerfile
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/api:${{ github.sha }}
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/api:latest

      - name: Build and push Web
        uses: docker/build-push-action@v5
        with:
          context: .
          file: apps/web/Dockerfile
          push: true
          build-args: |
            VITE_API_URL=${{ secrets.API_URL }}
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/web:${{ github.sha }}
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/web:latest

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    environment: staging

    steps:
      - name: Deploy to staging
        run: |
          # Deploy using kubectl, docker-compose, or cloud provider CLI
          echo "Deploying to staging..."

  deploy-production:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: production

    steps:
      - name: Deploy to production
        run: |
          # Blue-green deployment
          echo "Deploying to production..."
```

## Health Check Endpoint

```typescript
// apps/api/src/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024), // 150MB
      () => this.memory.checkRSS('memory_rss', 300 * 1024 * 1024), // 300MB
      () => this.disk.checkStorage('storage', { path: '/', thresholdPercent: 0.9 }),
    ]);
  }

  @Get('live')
  liveness() {
    return { status: 'ok' };
  }

  @Get('ready')
  @HealthCheck()
  readiness() {
    return this.health.check([
      () => this.db.pingCheck('database'),
    ]);
  }
}
```

## Prometheus Metrics

```typescript
// apps/api/src/metrics/metrics.service.ts
import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Gauge, register } from 'prom-client';

@Injectable()
export class MetricsService {
  public readonly httpRequestsTotal: Counter;
  public readonly httpRequestDuration: Histogram;
  public readonly websocketConnections: Gauge;
  public readonly messagesTotal: Counter;
  public readonly activeUsers: Gauge;

  constructor() {
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'path', 'status'],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'path'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
    });

    this.websocketConnections = new Gauge({
      name: 'websocket_connections',
      help: 'Number of active WebSocket connections',
    });

    this.messagesTotal = new Counter({
      name: 'messages_total',
      help: 'Total number of messages sent',
      labelNames: ['type'],
    });

    this.activeUsers = new Gauge({
      name: 'active_users',
      help: 'Number of active users',
    });
  }

  getMetrics(): Promise<string> {
    return register.metrics();
  }
}
```

```yaml
# docker/prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alerts.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093

scrape_configs:
  - job_name: 'ciphertalk-api'
    static_configs:
      - targets: ['api:3000']
    metrics_path: '/metrics'

  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']
```

```yaml
# docker/prometheus/alerts.yml
groups:
  - name: ciphertalk
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: High error rate detected
          description: Error rate is {{ $value }} per second

      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: High latency detected
          description: 95th percentile latency is {{ $value }} seconds

      - alert: LowWebSocketConnections
        expr: websocket_connections < 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: No WebSocket connections
          description: WebSocket connections dropped to {{ $value }}

      - alert: DatabaseDown
        expr: up{job="ciphertalk-api"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: API server is down
          description: API server has been down for more than 1 minute
```

## Grafana Dashboard

```json
{
  "dashboard": {
    "title": "CipherTalk Overview",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{path}}"
          }
        ]
      },
      {
        "title": "Response Time (p95)",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "WebSocket Connections",
        "type": "stat",
        "targets": [
          {
            "expr": "websocket_connections",
            "legendFormat": "Connections"
          }
        ]
      },
      {
        "title": "Messages per Minute",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(messages_total[1m]) * 60",
            "legendFormat": "{{type}}"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m])",
            "legendFormat": "5xx errors"
          }
        ]
      },
      {
        "title": "Active Users",
        "type": "stat",
        "targets": [
          {
            "expr": "active_users",
            "legendFormat": "Active Users"
          }
        ]
      }
    ]
  }
}
```

## Todo List

- [ ] Create API Dockerfile
- [ ] Create Web Dockerfile
- [ ] Setup Docker Compose production
- [ ] Configure nginx reverse proxy
- [ ] Setup GitHub Actions CI/CD
- [ ] Implement health check endpoints
- [ ] Add Prometheus metrics
- [ ] Configure Prometheus scraping
- [ ] Create alerting rules
- [ ] Setup Grafana dashboards
- [ ] Configure log aggregation
- [ ] Setup SSL certificates
- [ ] Document deployment process
- [ ] Create runbooks for incidents

## Success Criteria

1. Docker images build successfully
2. CI pipeline passes all tests
3. Zero-downtime deployment works
4. Health checks pass
5. Metrics visible in Grafana
6. Alerts trigger correctly
7. Logs searchable
8. 99.9% uptime achieved

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Deployment failure | High | Blue-green, rollback plan |
| Secret exposure | Critical | Vault, env injection |
| Resource exhaustion | High | Monitoring, auto-scaling |

## Security Checklist

- [ ] Secrets in environment/vault (never in code)
- [ ] SSL/TLS enabled
- [ ] Network policies configured
- [ ] Security headers set
- [ ] Rate limiting enabled
- [ ] WAF configured
- [ ] Vulnerability scanning in CI

## Post-Deployment Checklist

1. Verify all services healthy
2. Check metrics flowing
3. Test critical user flows
4. Verify logging works
5. Test alerting
6. Document any issues
7. Communicate to stakeholders

## Next Steps

After completing Phase 10:
1. Monitor production stability
2. Gather user feedback
3. Plan iteration 2 features
4. Continuous improvement
