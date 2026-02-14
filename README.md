# FutureVest

Production-ready full-stack application with **Spring Boot** (backend) and **React + TypeScript** (frontend), following hexagonal architecture and security best practices.

## Stack

| Layer      | Tech |
|-----------|------|
| Backend   | Spring Boot 3.2, Java 21, Spring Web, Data JPA, Security, WebSocket, Validation, Actuator, Resilience4j, MySQL, Redis, AWS S3, Razorpay, Quartz, JWT, Lombok |
| Frontend  | React 18, TypeScript, Vite, Redux Toolkit, Axios, Socket.io-client, Material-UI, Vitest, React Testing Library |
| Infra     | Docker, Docker Compose (MySQL 8, Redis 7) |

## Project structure

### Backend (hexagonal)

```
backend/src/main/java/com/futurevest/
├── domain/           # Entities, value objects (no framework)
├── application/      # Use cases, ports (in/out), application services
├── infrastructure/   # Persistence (JPA), S3, Razorpay, Redis, Quartz
└── presentation/    # REST controllers, WebSocket, Security, CORS config
```

### Frontend (modular)

```
frontend/src/
├── components/   # Reusable UI
├── pages/        # Route-level views
├── hooks/        # useAppDispatch, useAppSelector, custom hooks
├── services/     # api (Axios), socket (Socket.io)
├── store/        # Redux store and slices
├── theme.ts      # MUI theme
└── test/         # Vitest setup
```

## Quick start

### Prerequisites

- JDK 21, Maven, Node.js 20+, Docker & Docker Compose

### Local development (without Docker)

1. **MySQL & Redis** (required for backend):

   ```bash
   docker compose up -d mysql redis
   ```

2. **Backend**

   ```bash
   cd backend
   mvn spring-boot:run -Dspring-boot.run.profiles=dev
   ```

   API: `http://localhost:8080/api`  
   Health: `http://localhost:8080/api/actuator/health`

3. **Frontend**

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

   App: `http://localhost:3000` (proxies `/api` and `/ws` to backend)

### Full stack with Docker

```bash
docker compose up -d
```

- Frontend: http://localhost:3000  
- Backend API: http://localhost:8080/api  
- MySQL: localhost:3306 (user `futurevest` / password `futurevest`)  
- Redis: localhost:6379  

## Configuration

### Environment variables (secrets)

**Never commit real secrets.** Use environment variables or a secrets manager.

| Variable            | Description                    | Example (dev) |
|---------------------|--------------------------------|----------------|
| `JWT_SECRET`        | Min 256-bit key for JWT        | (min 32 chars) |
| `MYSQL_*`           | DB host, port, database, user, password | - |
| `REDIS_HOST`, `REDIS_PASSWORD` | Redis connection       | - |
| `AWS_S3_BUCKET`, `AWS_REGION` | S3 bucket and region   | - |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Razorpay API keys | - |
| `CORS_ALLOWED_ORIGINS` | Allowed frontend origins (prod) | `https://app.example.com` |
| `SPRING_PROFILES_ACTIVE` | `dev` or `prod`            | `dev` |

Backend reads these from `application.yml` / profile-specific yml; placeholders are used for optional dev defaults.

### Profiles

- **dev**: `ddl-auto: update`, relaxed CORS (localhost), debug logging, optional Redis.
- **prod**: `ddl-auto: validate`, strict CORS from env, SSL for MySQL, no debug logs.

## Security

- **HTTPS**: In production, run the app behind a reverse proxy (e.g. Nginx, ALB) that terminates TLS. Set `X-Forwarded-Proto: https` so links and cookies use HTTPS.
- **CORS**: Configured in `app.cors.*`; in prod set `CORS_ALLOWED_ORIGINS` to your frontend origin(s) only.
- **Secrets**: JWT secret, DB and Redis passwords, AWS and Razorpay keys must come from env (or secret manager), not from config files in repo.
- **JWT**: Stateless; stored in memory on client; send via `Authorization: Bearer <token>`.

## Scalability and async processing

- **Async I/O**: Backend uses `@Async` with a dedicated `TaskExecutor` for non-blocking work (e.g. S3 uploads in `S3Service.uploadAsync`). Use the same pattern for email, notifications, or external API calls.
- **Caching**: Add Redis for session or response caching where needed (Redis is already in the stack).
- **Quartz**: Use for scheduled jobs (reports, cleanup, sync). Configure thread pool size per job type.
- **Resilience4j**: Circuit breakers and retries are configured; wrap external calls (S3, Razorpay, etc.) in resilience4j decorators to avoid cascading failures.
- **DB**: Use connection pooling (HikariCP); in prod tune `maximum-pool-size` and use read replicas if required.

## Testing

- **Backend**: `cd backend && mvn test`
- **Frontend**: `cd frontend && npm run test` (Vitest; Jest-compatible API with React Testing Library)

## License

Proprietary.
