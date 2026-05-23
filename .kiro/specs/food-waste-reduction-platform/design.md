# Design Document: Food Waste Reduction Platform

## Overview

The Food Waste Reduction Platform is a microservices-based web application that connects food donors (restaurants) with recipients (NGOs). It consists of four Spring Boot backend services, a React frontend, and a shared PostgreSQL database, all orchestrated via Docker Compose. CI is handled by GitHub Actions and CD by Jenkins.

The system uses stateless JWT authentication — each service independently validates tokens using a shared secret. Inter-service communication is synchronous HTTP (RestTemplate/Feign). Notifications are triggered via internal HTTP calls from claim-service and food-service to notification-service.

---

## Architecture

### System Architecture Diagram

```
                          ┌─────────────────────────────────────────────────────┐
                          │                  food-network (Docker)               │
                          │                                                       │
  Browser ──────────────► │  frontend:3000 (React + Nginx)                       │
                          │       │                                               │
                          │       ├──► auth-service:8081  ──────────────────┐    │
                          │       │        │                                 │    │
                          │       ├──► food-service:8082  ──► notification  │    │
                          │       │        │               │   service:8084  │    │
                          │       └──► claim-service:8083 ─┘       │        │    │
                          │                │                        │        │    │
                          │                └────────────────────────┘        │    │
                          │                         │                        │    │
                          │                    postgres:5432 ◄───────────────┘    │
                          │                    (named volume: postgres_data)      │
                          └─────────────────────────────────────────────────────┘
```

### Service Responsibilities

| Service              | Port | Responsibility                                              |
|----------------------|------|-------------------------------------------------------------|
| auth-service         | 8081 | Registration, login, JWT issuance, admin user management    |
| food-service         | 8082 | Food post CRUD, search/filter, expiry scheduler             |
| claim-service        | 8083 | Claim lifecycle state machine, inter-service orchestration  |
| notification-service | 8084 | Notification storage, log simulation                        |
| frontend             | 3000 | React SPA, role-based routing, JWT management               |
| postgres             | 5432 | Shared relational database                                  |

---

## Components and Interfaces

### auth-service

**Packages:** `controller`, `service`, `repository`, `dto`, `entity`, `security`, `config`, `exception`

| Layer      | Class                    | Responsibility                                              |
|------------|--------------------------|-------------------------------------------------------------|
| Controller | `AuthController`         | POST /api/auth/register, POST /api/auth/login               |
| Controller | `AdminController`        | GET /api/admin/users, DELETE /api/admin/users/{id}          |
| Service    | `AuthService`            | Registration logic, BCrypt hashing, JWT generation          |
| Service    | `AdminService`           | User listing, deactivation                                  |
| Repository | `UserRepository`         | JPA queries on users table                                  |
| Security   | `JwtFilter`              | Validates Bearer token on every request                     |
| Security   | `SecurityConfig`         | Permit /api/auth/**, restrict /api/admin/** to ADMIN        |
| Config     | `JwtConfig`              | Secret key, expiry configuration                            |
| Exception  | `GlobalExceptionHandler` | @ControllerAdvice for validation and business errors        |

### food-service

**Packages:** `controller`, `service`, `repository`, `dto`, `entity`, `security`, `config`, `exception`, `scheduler`

| Layer      | Class                    | Responsibility                                              |
|------------|--------------------------|-------------------------------------------------------------|
| Controller | `FoodController`         | CRUD endpoints, search endpoint                             |
| Service    | `FoodService`            | Business logic, ownership checks, status transitions        |
| Repository | `FoodPostRepository`     | JPA queries including search filters                        |
| Scheduler  | `ExpiryScheduler`        | @Scheduled every 60s, marks expired posts, calls notif-svc  |
| Security   | `JwtFilter`              | Validates Bearer token (shared secret)                      |
| Config     | `RestTemplateConfig`     | RestTemplate bean for inter-service calls                   |
| Exception  | `GlobalExceptionHandler` | @ControllerAdvice                                           |

### claim-service

**Packages:** `controller`, `service`, `repository`, `dto`, `entity`, `security`, `config`, `exception`

| Layer      | Class                    | Responsibility                                              |
|------------|--------------------------|-------------------------------------------------------------|
| Controller | `ClaimController`        | POST /api/claims, GET /api/claims, PUT /api/claims/{id}     |
| Service    | `ClaimService`           | State machine transitions, calls food-service & notif-svc   |
| Repository | `ClaimRepository`        | JPA queries filtered by ngo_id or food_post owner           |
| Security   | `JwtFilter`              | Validates Bearer token                                      |
| Config     | `RestTemplateConfig`     | RestTemplate bean                                           |
| Exception  | `GlobalExceptionHandler` | @ControllerAdvice, HTTP 422 for invalid transitions         |

### notification-service

**Packages:** `controller`, `service`, `repository`, `dto`, `entity`, `security`, `config`, `exception`

| Layer      | Class                    | Responsibility                                              |
|------------|--------------------------|-------------------------------------------------------------|
| Controller | `NotificationController` | GET /api/notifications, POST /api/notifications/internal    |
| Service    | `NotificationService`    | Persist notification, log simulated email/SMS               |
| Repository | `NotificationRepository` | JPA queries ordered by created_at DESC                      |
| Security   | `JwtFilter`              | Validates Bearer token for GET; internal POST is unsecured  |
| Exception  | `GlobalExceptionHandler` | @ControllerAdvice                                           |

### frontend

**Structure:** `src/context`, `src/pages`, `src/components`, `src/services`, `src/hooks`

| Module              | Responsibility                                              |
|---------------------|-------------------------------------------------------------|
| `AuthContext`       | JWT storage, user state, login/logout actions               |
| `AxiosInstance`     | Base URL config, request interceptor (Bearer token), 401 handler |
| `ProtectedRoute`    | Redirects unauthenticated users to /login                   |
| `RoleRoute`         | Redirects users to role-appropriate page                    |
| `authService`       | Calls /api/auth/register, /api/auth/login                   |
| `foodService`       | Calls /api/foods CRUD and search                            |
| `claimService`      | Calls /api/claims CRUD                                      |
| `notificationService` | Calls /api/notifications                                  |

---

## API Endpoint Table

### auth-service (port 8081)

| Method | Path                      | Auth Required | Role  | Description                        |
|--------|---------------------------|---------------|-------|------------------------------------|
| POST   | /api/auth/register        | No            | Any   | Register new user                  |
| POST   | /api/auth/login           | No            | Any   | Login, returns JWT                 |
| GET    | /api/admin/users          | Yes           | ADMIN | List all users (paginated)         |
| DELETE | /api/admin/users/{id}     | Yes           | ADMIN | Deactivate user account            |

### food-service (port 8082)

| Method | Path                      | Auth Required | Role       | Description                        |
|--------|---------------------------|---------------|------------|------------------------------------|
| GET    | /api/foods                | No            | Any        | List AVAILABLE posts (paginated)   |
| GET    | /api/foods/search         | No            | Any        | Search with filters                |
| GET    | /api/foods/{id}           | No            | Any        | Get food post by ID                |
| POST   | /api/foods                | Yes           | RESTAURANT | Create food post                   |
| PUT    | /api/foods/{id}           | Yes           | RESTAURANT | Update food post (owner only)      |
| PUT    | /api/foods/{id}/status    | Yes           | RESTAURANT | Update status (internal use)       |
| DELETE | /api/foods/{id}           | Yes           | RESTAURANT | Delete food post (owner only)      |

### claim-service (port 8083)

| Method | Path                      | Auth Required | Role           | Description                        |
|--------|---------------------------|---------------|----------------|------------------------------------|
| POST   | /api/claims               | Yes           | NGO            | Create claim (PENDING)             |
| GET    | /api/claims               | Yes           | NGO/RESTAURANT | List claims (filtered by role)     |
| PUT    | /api/claims/{id}          | Yes           | NGO/RESTAURANT | Transition claim status            |

### notification-service (port 8084)

| Method | Path                              | Auth Required | Role | Description                        |
|--------|-----------------------------------|---------------|------|------------------------------------|
| GET    | /api/notifications                | Yes           | Any  | Get user's notifications           |
| POST   | /api/notifications/internal       | No (internal) | N/A  | Create notification (service-to-service) |

---

## Data Models

### Entity Relationship Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  users                          food_posts                                   │
│  ┌─────────────────────┐        ┌──────────────────────────────────────┐    │
│  │ id          UUID PK │◄───────│ id             UUID PK               │    │
│  │ name        VARCHAR │  1:N   │ restaurant_id  UUID FK → users.id    │    │
│  │ email       VARCHAR │        │ title          VARCHAR               │    │
│  │ password    VARCHAR │        │ food_type      VARCHAR               │    │
│  │ role        VARCHAR │        │ quantity       INTEGER               │    │
│  │ city        VARCHAR │        │ expiry_time    TIMESTAMP             │    │
│  │ active      BOOLEAN │        │ pickup_address VARCHAR               │    │
│  │ created_at  TIMESTAMP│       │ image_url      VARCHAR               │    │
│  └─────────────────────┘        │ status         VARCHAR               │    │
│           │                     │                (AVAILABLE/CLAIMED/   │    │
│           │                     │                 EXPIRED)             │    │
│           │                     │ created_at     TIMESTAMP             │    │
│           │                     └──────────────────────────────────────┘    │
│           │                                      │                          │
│           │  notifications                        │  claims                  │
│           │  ┌──────────────────────────┐        │  ┌──────────────────────┐│
│           └─►│ id         UUID PK       │        └─►│ id       UUID PK     ││
│              │ user_id    UUID FK→users │           │ food_post_id UUID FK  ││
│              │ message    TEXT          │    1:N    │ ngo_id   UUID FK→users││
│              │ type       VARCHAR       │           │ status   VARCHAR      ││
│              │ created_at TIMESTAMP     │           │          (PENDING/    ││
│              └──────────────────────────┘           │           APPROVED/   ││
│                                                     │           PICKED_UP/  ││
│                                                     │           CANCELLED)  ││
│                                                     │ claimed_at TIMESTAMP  ││
│                                                     └──────────────────────┘│
└──────────────────────────────────────────────────────────────────────────────┘
```

### Database Schema (DDL)

```sql
CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) NOT NULL,
    email       VARCHAR(255) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    role        VARCHAR(20)  NOT NULL CHECK (role IN ('RESTAURANT','NGO','ADMIN')),
    city        VARCHAR(100) NOT NULL,
    active      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE food_posts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id   UUID         NOT NULL REFERENCES users(id),
    title           VARCHAR(255) NOT NULL,
    food_type       VARCHAR(100) NOT NULL,
    quantity        INTEGER      NOT NULL CHECK (quantity > 0),
    expiry_time     TIMESTAMP    NOT NULL,
    pickup_address  VARCHAR(500) NOT NULL,
    image_url       VARCHAR(500),
    status          VARCHAR(20)  NOT NULL DEFAULT 'AVAILABLE'
                        CHECK (status IN ('AVAILABLE','CLAIMED','EXPIRED')),
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE claims (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    food_post_id UUID        NOT NULL REFERENCES food_posts(id),
    ngo_id       UUID        NOT NULL REFERENCES users(id),
    status       VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                     CHECK (status IN ('PENDING','APPROVED','PICKED_UP','CANCELLED')),
    claimed_at   TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE TABLE notifications (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID         NOT NULL REFERENCES users(id),
    message    TEXT         NOT NULL,
    type       VARCHAR(50)  NOT NULL,
    created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);
```

---

## Claim State Machine

```
                    ┌─────────────────────────────────────────────────────┐
                    │                  CLAIM STATE MACHINE                 │
                    └─────────────────────────────────────────────────────┘

                              ┌──────────┐
                    POST      │          │
                  /api/claims │  PENDING │
                 ────────────►│          │
                              └────┬─────┘
                                   │
                    ┌──────────────┼──────────────────┐
                    │              │                  │
              RESTAURANT     RESTAURANT           NGO
              APPROVED       CANCELLED          CANCELLED
                    │              │                  │
                    ▼              ▼                  ▼
              ┌──────────┐  ┌───────────┐      ┌───────────┐
              │          │  │           │      │           │
              │ APPROVED │  │ CANCELLED │      │ CANCELLED │
              │          │  │           │      │           │
              └────┬─────┘  └───────────┘      └───────────┘
                   │
         ┌─────────┴──────────┐
         │                    │
       NGO                RESTAURANT
     PICKED_UP             CANCELLED
       or NGO
         │                    │
         ▼                    ▼
   ┌──────────┐         ┌───────────┐
   │          │         │           │
   │ PICKED_UP│         │ CANCELLED │
   │          │         │           │
   └──────────┘         └───────────┘

  Valid transitions:
    PENDING  → APPROVED   (RESTAURANT only)
    PENDING  → CANCELLED  (RESTAURANT or NGO)
    APPROVED → PICKED_UP  (NGO only)
    APPROVED → CANCELLED  (RESTAURANT or NGO)

  All other transitions → HTTP 422 Unprocessable Entity

  Side effects:
    PENDING  created  → notify Restaurant (new claim)
    APPROVED          → food-service sets food_post.status = CLAIMED
                      → notify NGO (claim approved)
    CANCELLED from    → food-service restores food_post.status = AVAILABLE
      APPROVED        → notify NGO (claim cancelled)
    CANCELLED from    → notify NGO (claim cancelled)
      PENDING
```

---

## Inter-Service Communication

### Communication Patterns

All inter-service calls are synchronous HTTP using `RestTemplate`. Services pass the original JWT token in the Authorization header when calling food-service (which validates ownership). Calls to notification-service use the internal POST endpoint which requires no auth.

```
claim-service ──POST /api/notifications/internal──► notification-service
claim-service ──PUT  /api/foods/{id}/status      ──► food-service
food-service  ──POST /api/notifications/internal ──► notification-service
```

### Notification Trigger Matrix

| Event                          | Caller         | Target User  | Notification Type     |
|--------------------------------|----------------|--------------|-----------------------|
| Claim created (PENDING)        | claim-service  | Restaurant   | CLAIM_PENDING         |
| Claim → APPROVED               | claim-service  | NGO          | CLAIM_APPROVED        |
| Claim → CANCELLED              | claim-service  | NGO          | CLAIM_CANCELLED       |
| Food post → EXPIRED (scheduler)| food-service   | Restaurant   | FOOD_EXPIRED          |

### Internal Notification Request DTO

```json
{
  "userId": "uuid",
  "message": "Your food post 'Bread Surplus' has been claimed by NGO XYZ.",
  "type": "CLAIM_PENDING"
}
```

### Food Status Update Request

claim-service calls `PUT /api/foods/{id}/status` with body:
```json
{ "status": "CLAIMED" }
```
or `{ "status": "AVAILABLE" }` on cancellation from APPROVED.

---

## Docker Compose Service Dependency Graph

```
                    ┌──────────────────────────────────────────────────┐
                    │              docker-compose.yml                   │
                    └──────────────────────────────────────────────────┘

  postgres ◄──────────────────────────────────────────────────────────┐
  (healthcheck: pg_isready)                                           │
       │                                                              │
       │ depends_on: service_healthy                                  │
       ▼                                                              │
  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐  ┌──────────────┤
  │auth-service │  │food-service │  │claim-service │  │notification  │
  │   :8081     │  │   :8082     │  │   :8083      │  │service :8084 │
  └─────────────┘  └─────────────┘  └──────────────┘  └──────────────┘
         │                │                │                  │
         └────────────────┴────────────────┴──────────────────┘
                                    │
                                    │ all Spring Boot services healthy
                                    ▼
                             ┌─────────────┐
                             │  frontend   │
                             │   :3000     │
                             └─────────────┘

  Named volume:  postgres_data → /var/lib/postgresql/data
  Network:       food-network (bridge)
```

### Environment Variables per Service

| Variable              | Used By                          | Description                    |
|-----------------------|----------------------------------|--------------------------------|
| SPRING_DATASOURCE_URL | All Spring Boot services         | JDBC URL to postgres           |
| SPRING_DATASOURCE_USERNAME | All Spring Boot services    | DB username                    |
| SPRING_DATASOURCE_PASSWORD | All Spring Boot services    | DB password                    |
| JWT_SECRET            | All Spring Boot services         | Shared JWT signing secret      |
| JWT_EXPIRATION        | auth-service                     | Token TTL in ms                |
| FOOD_SERVICE_URL      | claim-service                    | http://food-service:8082       |
| NOTIFICATION_SERVICE_URL | food-service, claim-service   | http://notification-service:8084 |
| REACT_APP_API_BASE_URL | frontend                        | Backend API base URL           |

---

## CI/CD Pipeline

### CI Pipeline (GitHub Actions)

```
.github/workflows/ci.yml

  Trigger: push / pull_request → main
  │
  ├── Job: test-auth-service
  │     actions/checkout@v3
  │     actions/setup-java@v3 (java-version: 17, distribution: temurin)
  │     run: cd auth-service && mvn clean test
  │
  ├── Job: test-food-service
  │     (same pattern)
  │
  ├── Job: test-claim-service
  │     (same pattern)
  │
  ├── Job: test-notification-service
  │     (same pattern)
  │
  ├── Job: build-and-push (needs: all test jobs)
  │     docker/login-action → GHCR (secrets: GITHUB_TOKEN)
  │     docker/build-push-action × 5 services
  │     tags: ghcr.io/{owner}/{service}:latest, :{sha}
  │
  └── Job: validate-compose (needs: build-and-push)
        run: docker-compose config
```

### CD Pipeline (Jenkins)

```
Jenkinsfile

  Stage 1: Pull Images
    sh 'docker-compose pull'

  Stage 2: Stop Containers
    sh 'docker-compose down --remove-orphans'

  Stage 3: Deploy
    sh 'docker-compose up -d'

  Stage 4: Verify
    sh 'docker ps --filter status=running --format "{{.Names}}"'
    Fail if any expected container is absent

  Stage 5: Cleanup
    sh 'docker image prune -f'
```

---

## Security Model

### JWT Architecture

Each service contains an identical `JwtFilter` that:
1. Extracts the `Authorization: Bearer <token>` header
2. Validates signature using the shared `JWT_SECRET` environment variable
3. Parses claims: `userId`, `email`, `role`
4. Populates `SecurityContextHolder` with a `UsernamePasswordAuthenticationToken`

No service calls auth-service to validate tokens — validation is local and stateless.

### Endpoint Security Matrix

| Service              | Endpoint Pattern          | Access Rule                          |
|----------------------|---------------------------|--------------------------------------|
| auth-service         | /api/auth/**              | Public                               |
| auth-service         | /api/admin/**             | ADMIN role required                  |
| food-service         | GET /api/foods/**         | Public                               |
| food-service         | POST/PUT/DELETE /api/foods| RESTAURANT role required             |
| claim-service        | POST /api/claims          | NGO role required                    |
| claim-service        | GET /api/claims           | NGO or RESTAURANT role required      |
| claim-service        | PUT /api/claims/{id}      | NGO or RESTAURANT role required      |
| notification-service | GET /api/notifications    | Authenticated (any role)             |
| notification-service | POST /api/notifications/internal | No auth (internal network only) |

### Blocked User Handling

`AuthService.loadUserByUsername` checks `user.active`. If `false`, throws `DisabledException`, which Spring Security maps to HTTP 403.

### Password Security

BCrypt with default strength (10 rounds) via `BCryptPasswordEncoder` bean. Raw passwords are never logged or returned in responses.

---

## Error Handling

Each service has a `@ControllerAdvice` `GlobalExceptionHandler` that maps exceptions to HTTP responses:

| Exception                        | HTTP Status | Scenario                                  |
|----------------------------------|-------------|-------------------------------------------|
| `MethodArgumentNotValidException`| 400         | Bean validation failure (@Valid)          |
| `DataIntegrityViolationException`| 409         | Duplicate email on registration           |
| `EntityNotFoundException`        | 404         | Resource not found                        |
| `AccessDeniedException`          | 403         | Insufficient role                         |
| `InvalidStateTransitionException`| 422         | Illegal claim state transition            |
| `ResourceConflictException`      | 409         | Claim on non-AVAILABLE food post          |
| `JwtException`                   | 401         | Malformed or expired JWT                  |
| `DisabledException`              | 403         | Blocked user login attempt                |
| `BadCredentialsException`        | 401         | Wrong email or password                   |

All error responses follow a consistent JSON envelope:
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "status": 422,
  "error": "Unprocessable Entity",
  "message": "Transition from PICKED_UP to APPROVED is not permitted",
  "path": "/api/claims/abc-123"
}
```

---

## Testing Strategy

### Dual Testing Approach

Both unit tests and property-based tests are required. Unit tests cover specific examples, integration points, and error conditions. Property-based tests verify universal invariants across randomly generated inputs.

### Unit Testing

Each service uses JUnit 5 + Mockito. Key test targets:

- `AuthService`: registration happy path, duplicate email, missing fields, blocked user login
- `FoodService`: CRUD ownership checks, expiry scheduler logic
- `ClaimService`: each valid state transition, each invalid transition (expect 422), side-effect calls to food-service and notification-service
- `NotificationService`: persistence and log output per notification type
- `JwtFilter`: valid token, expired token, malformed token, missing header
- Frontend: React Testing Library for ProtectedRoute, RoleRoute, toast on error/success

### Property-Based Testing

Use **jqwik** (Java) for Spring Boot services and **fast-check** (TypeScript) for the React frontend.

Each property test runs a minimum of 100 iterations.

Tag format: `// Feature: food-waste-reduction-platform, Property {N}: {property_text}`


---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

---

### Property 1: Registration round-trip

*For any* valid combination of name, email, password, role (RESTAURANT/NGO/ADMIN), and city, submitting a registration request should return HTTP 201 and a subsequent login with those credentials should succeed with HTTP 200.

**Validates: Requirements 1.1, 2.1**

---

### Property 2: Password is never stored in plaintext

*For any* registration input, the password value stored in the database should never equal the raw plaintext password, and BCrypt verification of the raw password against the stored hash should return true.

**Validates: Requirements 1.2**

---

### Property 3: Invalid registration inputs are rejected

*For any* registration request that is missing a required field (name, email, password, role, or city), or that contains a role value outside {RESTAURANT, NGO, ADMIN}, or that uses an already-registered email, the Auth_Service should return a 4xx error (400 for validation failures, 409 for duplicate email) and no new user record should be created.

**Validates: Requirements 1.3, 1.4, 1.5**

---

### Property 4: JWT claims round-trip

*For any* registered user, the JWT returned on successful login should decode (using the shared secret) to a payload containing the correct userId, email, and role — matching the values used during registration.

**Validates: Requirements 2.2**

---

### Property 5: Invalid authentication always returns 401

*For any* request to a protected endpoint made with a missing Authorization header, a randomly generated token string, or a token signed with a different secret, the service should return HTTP 401.

**Validates: Requirements 2.3, 2.5, 2.6**

---

### Property 6: Food post creation and retrieval round-trip

*For any* RESTAURANT user and any valid food post input (title, food_type, quantity > 0, expiry_time, pickup_address), creating a food post should return HTTP 201 with a new ID, and a subsequent GET /api/foods/{id} should return the same field values with status AVAILABLE.

**Validates: Requirements 3.1, 3.6**

---

### Property 7: Food post ownership is enforced

*For any* food post and any user who is not the owning restaurant, a PUT or DELETE request to that food post should return HTTP 403, and the food post should remain unchanged.

**Validates: Requirements 3.4**

---

### Property 8: Expiry scheduler sets AVAILABLE posts to EXPIRED

*For any* food post with status AVAILABLE whose expiry_time is strictly in the past, after the scheduler executes, the food post's status should be EXPIRED and should no longer appear in GET /api/foods results.

**Validates: Requirements 3.8, 4.1**

---

### Property 9: Search filters are conjunctive and complete

*For any* combination of search parameters (city, food_type, min_quantity), every food post returned by GET /api/foods/search should satisfy all provided filter conditions simultaneously, and no food post satisfying all conditions should be absent from the results. When no posts match, the response should be HTTP 200 with an empty array.

**Validates: Requirements 4.2, 4.3, 4.4, 4.5, 4.6**

---

### Property 10: Claim creation sets PENDING status

*For any* NGO user and any food post with status AVAILABLE, creating a claim should return HTTP 201 and the claim's status should be PENDING. A claim attempt on a food post with status CLAIMED or EXPIRED should return HTTP 409.

**Validates: Requirements 5.1, 5.2**

---

### Property 11: Claim state machine transitions are valid

*For any* claim, only the following transitions should succeed: PENDING→APPROVED (restaurant), PENDING→CANCELLED (restaurant or NGO), APPROVED→PICKED_UP (NGO), APPROVED→CANCELLED (restaurant or NGO). All other transitions should return HTTP 422, and the claim status should remain unchanged.

**Validates: Requirements 5.3, 5.5, 5.6**

---

### Property 12: Claim approval/cancellation round-trip on food post status

*For any* PENDING claim that is approved, the associated food post's status should become CLAIMED. If that APPROVED claim is subsequently cancelled, the food post's status should be restored to AVAILABLE.

**Validates: Requirements 5.3, 5.4**

---

### Property 13: Claim list is scoped to the requesting user

*For any* NGO user, GET /api/claims should return only claims where ngo_id matches that user's ID. For any RESTAURANT user, GET /api/claims should return only claims for food posts owned by that restaurant. No claim belonging to a different user should appear in the results.

**Validates: Requirements 5.7, 5.8**

---

### Property 14: Notification is created for every triggering event

*For any* claim creation (PENDING), claim status change to APPROVED or CANCELLED, or food post expiry, a notification record should exist in the notifications table for the correct target user (restaurant for PENDING/EXPIRED, NGO for APPROVED/CANCELLED) with a non-empty message.

**Validates: Requirements 6.1, 6.2, 6.3**

---

### Property 15: Notification retrieval is scoped and ordered

*For any* authenticated user, GET /api/notifications should return only notification records where user_id matches that user's ID, and the records should be ordered by created_at descending (newest first).

**Validates: Requirements 6.4**

---

### Property 16: Admin deactivation prevents login

*For any* active user, after an admin sends DELETE /api/admin/users/{id}, the user's active field should be false, and a subsequent login attempt with that user's credentials should return HTTP 403.

**Validates: Requirements 7.2, 7.5, 7.6**

---

### Property 17: Admin endpoints reject non-ADMIN tokens

*For any* request to /api/admin/** made with a JWT token whose role is not ADMIN (including NGO, RESTAURANT, or no token), the Auth_Service should return HTTP 403.

**Validates: Requirements 7.3, 13.5, 13.6**

---

### Property 18: Frontend route guards enforce authentication and role

*For any* protected route accessed without a valid JWT in localStorage, the frontend should redirect to /login. For any role-restricted route accessed by a user whose role does not match, the frontend should redirect to an appropriate page rather than rendering the protected content.

**Validates: Requirements 8.2, 8.3**

---

### Property 19: JWT localStorage round-trip

*For any* successful login, the JWT should be stored in localStorage and attached as `Authorization: Bearer <token>` on all subsequent API requests. After logout, localStorage should contain no JWT and the user should be redirected to the home page.

**Validates: Requirements 8.6, 8.7**

---

### Property 20: Referential integrity is enforced

*For any* attempt to insert a food_post with a non-existent restaurant_id, a claim with a non-existent food_post_id or ngo_id, or a notification with a non-existent user_id, the database should reject the insert with a foreign key constraint violation.

**Validates: Requirements 9.5**

---

## Error Handling (continued)

### Inter-Service Failure Handling

When claim-service or food-service calls notification-service and the call fails (connection refused, timeout), the primary operation should still succeed — notification failures are non-blocking. Log the failure at ERROR level.

When claim-service calls food-service to update food post status and the call fails, the claim transition should be rolled back (or retried) to maintain consistency. This is a critical path — the claim status update and food post status update should be treated as a logical unit.

### Validation Error Response Format

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "errors": {
    "email": "must be a well-formed email address",
    "quantity": "must be greater than 0"
  },
  "path": "/api/foods"
}
```

