# Implementation Plan: Food Waste Reduction Platform

## Overview

Build the complete Food Waste Reduction Platform from scratch: four Spring Boot microservices (auth, food, claim, notification), a React + Tailwind CSS frontend, Docker infrastructure, GitHub Actions CI, Jenkins CD, and a README. All services share a PostgreSQL database and communicate via synchronous HTTP. JWT authentication is validated locally in each service using a shared secret.

## Tasks

- [ ] 1. Project scaffolding and Git initialisation
  - Initialise a Git repository in the project root with `git init`
  - Create the top-level directory structure: `auth-service/`, `food-service/`, `claim-service/`, `notification-service/`, `frontend/`, `.github/workflows/`
  - Add a root `.gitignore` covering Java (`target/`, `*.class`), Maven (`~/.m2`), Node (`node_modules/`, `dist/`), environment files (`.env`), and IDE files
  - Add the remote origin: `git remote add origin https://github.com/Antriksh55/Food_waste_Management.git`
  - _Requirements: 10.1, 11.1_

- [ ] 2. Shared database schema
  - [ ] 2.1 Create `db/init.sql` with the full DDL for `users`, `food_posts`, `claims`, and `notifications` tables including UUID primary keys, CHECK constraints, foreign keys, and DEFAULT values as specified in the design
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 3. auth-service
  - [ ] 3.1 Generate Maven project structure under `auth-service/` with `pom.xml` declaring dependencies: `spring-boot-starter-web`, `spring-boot-starter-data-jpa`, `spring-boot-starter-security`, `spring-boot-starter-validation`, `jjwt-api`, `jjwt-impl`, `jjwt-jackson`, `spring-boot-starter-test`, `jqwik`, `postgresql` driver, and Lombok
  - [ ] 3.2 Create `User` JPA entity mapping the `users` table (UUID id, name, email, password, role, city, active, created_at); add `UserRepository` with `findByEmail` query
  - [ ] 3.3 Create `JwtConfig` reading `JWT_SECRET` and `JWT_EXPIRATION` from environment; create `JwtUtil` with `generateToken(userId, email, role)` and `validateToken(token)` methods
  - [ ] 3.4 Create `JwtFilter` extending `OncePerRequestFilter` that extracts the Bearer token, validates it via `JwtUtil`, and populates `SecurityContextHolder`
  - [ ] 3.5 Create `SecurityConfig` permitting `/api/auth/**` publicly, restricting `/api/admin/**` to `ADMIN` role, and requiring authentication on all other endpoints; wire `JwtFilter` before `UsernamePasswordAuthenticationFilter`
  - [ ] 3.6 Create `AuthService` with `register(RegisterRequest)` (BCrypt hash, save user, return HTTP 201) and `login(LoginRequest)` (verify credentials, check active flag, return JWT); create `RegisterRequest` and `LoginRequest` DTOs with `@Valid` constraints
  - [ ] 3.7 Create `AuthController` mapping `POST /api/auth/register` and `POST /api/auth/login`
  - [ ] 3.8 Create `AdminService` with `listUsers(Pageable)` and `deactivateUser(UUID)`; create `AdminController` mapping `GET /api/admin/users` and `DELETE /api/admin/users/{id}`
  - [ ] 3.9 Create `GlobalExceptionHandler` (`@ControllerAdvice`) mapping `MethodArgumentNotValidException` → 400, `DataIntegrityViolationException` → 409, `BadCredentialsException` → 401, `DisabledException` → 403, `AccessDeniedException` → 403, `JwtException` → 401; all responses use the standard JSON envelope from the design
  - [ ] 3.10 Create `application.yml` reading `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`, `JWT_SECRET`, `JWT_EXPIRATION` from environment variables; set `spring.jpa.hibernate.ddl-auto=validate`
  - [ ]* 3.11 Write property test for registration round-trip (Property 1)
    - **Property 1: Registration round-trip**
    - For any valid (name, email, password, role, city) tuple, POST /api/auth/register returns 201 and POST /api/auth/login with the same credentials returns 200 with a JWT
    - Use jqwik `@Property` with `@ForAll` string arbitraries; run 100 iterations
    - Tag: `// Feature: food-waste-reduction-platform, Property 1: Registration round-trip`
    - **Validates: Requirements 1.1, 2.1**
  - [ ]* 3.12 Write property test for password storage (Property 2)
    - **Property 2: Password is never stored in plaintext**
    - For any registration input, assert stored password ≠ raw password and BCrypt matches
    - Tag: `// Feature: food-waste-reduction-platform, Property 2: Password is never stored in plaintext`
    - **Validates: Requirements 1.2**
  - [ ]* 3.13 Write property test for invalid registration inputs (Property 3)
    - **Property 3: Invalid registration inputs are rejected**
    - For any request missing a required field, with an invalid role, or with a duplicate email, assert 4xx and no new user row
    - Tag: `// Feature: food-waste-reduction-platform, Property 3: Invalid registration inputs are rejected`
    - **Validates: Requirements 1.3, 1.4, 1.5**
  - [ ]* 3.14 Write property test for JWT claims round-trip (Property 4)
    - **Property 4: JWT claims round-trip**
    - For any registered user, decode the login JWT and assert userId, email, role match registration values
    - Tag: `// Feature: food-waste-reduction-platform, Property 4: JWT claims round-trip`
    - **Validates: Requirements 2.2**
  - [ ]* 3.15 Write property test for invalid authentication (Property 5)
    - **Property 5: Invalid authentication always returns 401**
    - For any protected endpoint, assert 401 for missing header, random token string, or token signed with wrong secret
    - Tag: `// Feature: food-waste-reduction-platform, Property 5: Invalid authentication always returns 401`
    - **Validates: Requirements 2.3, 2.5, 2.6**
  - [ ]* 3.16 Write property test for admin endpoint role enforcement (Property 17)
    - **Property 17: Admin endpoints reject non-ADMIN tokens**
    - For any request to /api/admin/** with NGO, RESTAURANT, or no token, assert 403
    - Tag: `// Feature: food-waste-reduction-platform, Property 17: Admin endpoints reject non-ADMIN tokens`
    - **Validates: Requirements 7.3, 13.5, 13.6**
  - [ ]* 3.17 Write property test for admin deactivation (Property 16)
    - **Property 16: Admin deactivation prevents login**
    - For any active user, after DELETE /api/admin/users/{id}, assert active=false and login returns 403
    - Tag: `// Feature: food-waste-reduction-platform, Property 16: Admin deactivation prevents login`
    - **Validates: Requirements 7.2, 7.5, 7.6**

- [ ] 4. Checkpoint — auth-service
  - Ensure all auth-service tests pass. Ask the user if questions arise.

- [ ] 5. food-service
  - [ ] 5.1 Generate Maven project structure under `food-service/` with `pom.xml` declaring the same core dependencies as auth-service plus `jqwik`; include `spring-boot-starter-scheduling`
  - [ ] 5.2 Create `FoodPost` JPA entity mapping the `food_posts` table (UUID id, restaurant_id, title, food_type, quantity, expiry_time, pickup_address, image_url, status, created_at); add `FoodPostRepository` with custom JPQL queries for search filters and a query finding AVAILABLE posts with expiry_time before now
  - [ ] 5.3 Copy the identical `JwtFilter`, `JwtConfig`, `JwtUtil`, and `SecurityConfig` from auth-service; configure security to permit GET `/api/foods/**` publicly and require RESTAURANT role for POST/PUT/DELETE
  - [ ] 5.4 Create `FoodService` with methods: `createPost`, `updatePost` (ownership check → 403), `deletePost` (ownership check → 403), `getById`, `listAvailable(Pageable)`, `search(city, foodType, minQuantity, Pageable)`; status transitions: set CLAIMED/AVAILABLE via internal endpoint
  - [ ] 5.5 Create `FoodController` mapping all endpoints from the API table: `GET /api/foods`, `GET /api/foods/search`, `GET /api/foods/{id}`, `POST /api/foods`, `PUT /api/foods/{id}`, `PUT /api/foods/{id}/status`, `DELETE /api/foods/{id}`; use `@Valid` on request bodies
  - [ ] 5.6 Create `ExpiryScheduler` with `@Scheduled(fixedDelay = 60000)` that queries all AVAILABLE posts with `expiry_time < NOW()`, sets status to EXPIRED, saves them, and calls `POST /api/notifications/internal` for each owning restaurant via `RestTemplate`; notification failures must be caught and logged at ERROR level without rolling back the expiry update
  - [ ] 5.7 Create `RestTemplateConfig` bean and `application.yml` reading all environment variables including `NOTIFICATION_SERVICE_URL`
  - [ ] 5.8 Create `GlobalExceptionHandler` with the same exception mappings as auth-service plus `ResourceConflictException` → 409
  - [ ]* 5.9 Write property test for food post creation and retrieval round-trip (Property 6)
    - **Property 6: Food post creation and retrieval round-trip**
    - For any RESTAURANT user and valid food post input (quantity > 0), POST returns 201 with new ID and GET /api/foods/{id} returns same fields with status AVAILABLE
    - Tag: `// Feature: food-waste-reduction-platform, Property 6: Food post creation and retrieval round-trip`
    - **Validates: Requirements 3.1, 3.6**
  - [ ]* 5.10 Write property test for food post ownership enforcement (Property 7)
    - **Property 7: Food post ownership is enforced**
    - For any food post and any user who is not the owning restaurant, PUT or DELETE returns 403
    - Tag: `// Feature: food-waste-reduction-platform, Property 7: Food post ownership is enforced`
    - **Validates: Requirements 3.4**
  - [ ]* 5.11 Write property test for expiry scheduler (Property 8)
    - **Property 8: Expiry scheduler sets AVAILABLE posts to EXPIRED**
    - For any AVAILABLE post with expiry_time in the past, after scheduler runs, status is EXPIRED and post absent from GET /api/foods
    - Tag: `// Feature: food-waste-reduction-platform, Property 8: Expiry scheduler sets AVAILABLE posts to EXPIRED`
    - **Validates: Requirements 3.8, 4.1**
  - [ ]* 5.12 Write property test for conjunctive search filters (Property 9)
    - **Property 9: Search filters are conjunctive and complete**
    - For any combination of city, food_type, min_quantity, every returned post satisfies all filters; no matching post is absent; empty match returns 200 with []
    - Tag: `// Feature: food-waste-reduction-platform, Property 9: Search filters are conjunctive and complete`
    - **Validates: Requirements 4.2, 4.3, 4.4, 4.5, 4.6**

- [ ] 6. Checkpoint — food-service
  - Ensure all food-service tests pass. Ask the user if questions arise.

- [ ] 7. notification-service
  - [ ] 7.1 Generate Maven project structure under `notification-service/` with `pom.xml`; same core dependencies as auth-service plus `jqwik`
  - [ ] 7.2 Create `Notification` JPA entity mapping the `notifications` table (UUID id, user_id, message, type, created_at); add `NotificationRepository` with `findByUserIdOrderByCreatedAtDesc(UUID userId)`
  - [ ] 7.3 Copy `JwtFilter`, `JwtConfig`, `JwtUtil` from auth-service; configure `SecurityConfig` to permit `POST /api/notifications/internal` without auth and require authentication for `GET /api/notifications`
  - [ ] 7.4 Create `NotificationService` with `createNotification(userId, message, type)` that persists the record and logs a simulated email/SMS line at INFO level (e.g. `[EMAIL] To: {userId} | {type} | {message}`)
  - [ ] 7.5 Create `NotificationController` mapping `GET /api/notifications` (returns records for authenticated user) and `POST /api/notifications/internal` (accepts `InternalNotificationRequest` DTO with userId, message, type)
  - [ ] 7.6 Create `GlobalExceptionHandler` and `application.yml`
  - [ ]* 7.7 Write property test for notification creation and retrieval (Property 14)
    - **Property 14: Notification is created for every triggering event**
    - For any claim creation, claim status change to APPROVED/CANCELLED, or food post expiry, a notification record exists for the correct target user with a non-empty message
    - Tag: `// Feature: food-waste-reduction-platform, Property 14: Notification is created for every triggering event`
    - **Validates: Requirements 6.1, 6.2, 6.3**
  - [ ]* 7.8 Write property test for notification retrieval scoping and ordering (Property 15)
    - **Property 15: Notification retrieval is scoped and ordered**
    - For any authenticated user, GET /api/notifications returns only that user's records ordered by created_at DESC
    - Tag: `// Feature: food-waste-reduction-platform, Property 15: Notification retrieval is scoped and ordered`
    - **Validates: Requirements 6.4**

- [ ] 8. claim-service
  - [ ] 8.1 Generate Maven project structure under `claim-service/` with `pom.xml`; same core dependencies as auth-service plus `jqwik`
  - [ ] 8.2 Create `Claim` JPA entity mapping the `claims` table (UUID id, food_post_id, ngo_id, status, claimed_at); add `ClaimRepository` with queries: `findByNgoId(UUID)` and `findByFoodPostRestaurantId(UUID)` (join to food_posts)
  - [ ] 8.3 Copy `JwtFilter`, `JwtConfig`, `JwtUtil` from auth-service; configure `SecurityConfig` to require NGO role for `POST /api/claims` and NGO or RESTAURANT role for `GET` and `PUT /api/claims/**`
  - [ ] 8.4 Create `ClaimService` implementing the state machine: validate transition against the allowed matrix (PENDING→APPROVED/CANCELLED, APPROVED→PICKED_UP/CANCELLED); throw `InvalidStateTransitionException` for illegal transitions; on APPROVED call `PUT /api/foods/{id}/status` with `{"status":"CLAIMED"}` via RestTemplate; on CANCELLED-from-APPROVED call same endpoint with `{"status":"AVAILABLE"}`; on all transitions call `POST /api/notifications/internal`; food-service call failures roll back the claim transition; notification-service call failures are non-blocking (catch + log ERROR)
  - [ ] 8.5 Create `ClaimController` mapping `POST /api/claims`, `GET /api/claims`, `PUT /api/claims/{id}`; extract userId and role from `SecurityContextHolder` to scope list queries
  - [ ] 8.6 Create `RestTemplateConfig`, `GlobalExceptionHandler` (include `InvalidStateTransitionException` → 422, `ResourceConflictException` → 409), and `application.yml` reading `FOOD_SERVICE_URL` and `NOTIFICATION_SERVICE_URL`
  - [ ]* 8.7 Write property test for claim creation status (Property 10)
    - **Property 10: Claim creation sets PENDING status**
    - For any NGO and AVAILABLE food post, POST /api/claims returns 201 with status PENDING; for CLAIMED or EXPIRED post, returns 409
    - Tag: `// Feature: food-waste-reduction-platform, Property 10: Claim creation sets PENDING status`
    - **Validates: Requirements 5.1, 5.2**
  - [ ]* 8.8 Write property test for claim state machine transitions (Property 11)
    - **Property 11: Claim state machine transitions are valid**
    - For any claim, only the four permitted transitions succeed; all others return 422 and status is unchanged
    - Tag: `// Feature: food-waste-reduction-platform, Property 11: Claim state machine transitions are valid`
    - **Validates: Requirements 5.3, 5.5, 5.6**
  - [ ]* 8.9 Write property test for claim approval/cancellation food post status round-trip (Property 12)
    - **Property 12: Claim approval/cancellation round-trip on food post status**
    - For any PENDING claim that is approved, food post status becomes CLAIMED; if that APPROVED claim is cancelled, food post status is restored to AVAILABLE
    - Tag: `// Feature: food-waste-reduction-platform, Property 12: Claim approval/cancellation round-trip on food post status`
    - **Validates: Requirements 5.3, 5.4**
  - [ ]* 8.10 Write property test for claim list scoping (Property 13)
    - **Property 13: Claim list is scoped to the requesting user**
    - For any NGO, GET /api/claims returns only claims where ngo_id matches; for any RESTAURANT, returns only claims for their food posts
    - Tag: `// Feature: food-waste-reduction-platform, Property 13: Claim list is scoped to the requesting user`
    - **Validates: Requirements 5.7, 5.8**

- [ ] 9. Checkpoint — backend services
  - Ensure all claim-service and notification-service tests pass. Ask the user if questions arise.

- [ ] 10. Frontend — project setup and core infrastructure
  - [ ] 10.1 Scaffold a Vite + React + TypeScript project under `frontend/` using `npm create vite@latest`; install `tailwindcss`, `postcss`, `autoprefixer`, `axios`, `react-router-dom`, `react-hot-toast`, `fast-check` (dev); initialise Tailwind with `npx tailwindcss init -p` and configure `content` paths
  - [ ] 10.2 Create `src/services/axiosInstance.ts` with base URL from `VITE_API_BASE_URL` env var, a request interceptor that reads the JWT from `localStorage` and attaches `Authorization: Bearer <token>`, and a response interceptor that triggers logout on 401
  - [ ] 10.3 Create `src/context/AuthContext.tsx` providing `user` (decoded JWT payload: id, email, role), `token`, `login(token)` (store in localStorage, decode, set state), and `logout()` (remove from localStorage, clear state, redirect to `/`)
  - [ ] 10.4 Create `src/components/ProtectedRoute.tsx` that redirects unauthenticated users to `/login`; create `src/components/RoleRoute.tsx` that accepts an `allowedRoles` prop and redirects users with non-matching roles to their role-appropriate dashboard
  - [ ] 10.5 Create `src/services/authService.ts`, `src/services/foodService.ts`, `src/services/claimService.ts`, and `src/services/notificationService.ts` wrapping all API calls via `axiosInstance`; each function returns typed response data and lets errors propagate to callers
  - [ ] 10.6 Create `src/App.tsx` with `react-router-dom` `BrowserRouter` and all routes: `/` (Home), `/login`, `/register`, `/restaurant/dashboard`, `/ngo/dashboard`, `/foods` (Food Listing), `/foods/:id` (Food Detail), `/claims` (Claim Management), `/admin` (Admin Dashboard); wrap role-specific routes with `ProtectedRoute` and `RoleRoute`; mount `<Toaster />` from `react-hot-toast` at root

- [ ] 11. Frontend — pages
  - [ ] 11.1 Create `src/pages/Home.tsx`: landing page with platform description, links to Login and Register; fully responsive using Tailwind utility classes (min-width 320px)
  - [ ] 11.2 Create `src/pages/Login.tsx`: form with email and password fields; on submit call `authService.login`, store token via `AuthContext.login`, redirect to role-appropriate dashboard; on error display toast with error message
  - [ ] 11.3 Create `src/pages/Register.tsx`: form with name, email, password, role (select: RESTAURANT/NGO), city; on submit call `authService.register`; on success redirect to login with success toast; on error display error toast
  - [ ] 11.4 Create `src/pages/RestaurantDashboard.tsx`: list the authenticated restaurant's food posts fetched from `GET /api/foods` (filtered client-side by restaurantId); include a "Create Post" button opening a modal/form; each post card shows title, status, expiry, and action buttons for Edit and Delete; on delete call `foodService.deletePost` and show success/error toast; on create/edit submit call `foodService.createPost` / `foodService.updatePost` and refresh list
  - [ ] 11.5 Create `src/pages/NgoDashboard.tsx`: show the NGO's active claims fetched from `GET /api/claims`; each claim card shows food post title, current status, and a "Mark Picked Up" button (visible when status is APPROVED); on action call `claimService.updateClaim` and show toast
  - [ ] 11.6 Create `src/pages/FoodListing.tsx`: fetch `GET /api/foods` with pagination; render search/filter controls for city, food_type, min_quantity that call `GET /api/foods/search`; each food card links to Food Detail; NGO users see a "Claim" button that calls `claimService.createClaim` and shows toast
  - [ ] 11.7 Create `src/pages/FoodDetail.tsx`: fetch `GET /api/foods/:id`; display all food post fields including image; NGO users see a "Claim" button; RESTAURANT owner sees Edit and Delete buttons
  - [ ] 11.8 Create `src/pages/ClaimManagement.tsx`: fetch `GET /api/claims`; RESTAURANT users see incoming claims with Approve and Cancel buttons; NGO users see their claims with status badges; all actions call `claimService.updateClaim` and show toast
  - [ ] 11.9 Create `src/pages/AdminDashboard.tsx`: fetch `GET /api/admin/users` (paginated); display aggregate counts (total users, posts, claims, notifications) fetched from respective services; each user row has a "Deactivate" button calling `DELETE /api/admin/users/{id}`; show success/error toast on each action
  - [ ]* 11.10 Write fast-check property tests for ProtectedRoute and RoleRoute (Property 18)
    - **Property 18: Frontend route guards enforce authentication and role**
    - For any protected route without a valid JWT in localStorage, assert redirect to /login; for any role-restricted route with wrong role, assert redirect away from protected content
    - Use React Testing Library + fast-check; run 100 iterations
    - Tag: `// Feature: food-waste-reduction-platform, Property 18: Frontend route guards enforce authentication and role`
    - **Validates: Requirements 8.2, 8.3**
  - [ ]* 11.11 Write fast-check property test for JWT localStorage round-trip (Property 19)
    - **Property 19: JWT localStorage round-trip**
    - For any successful login, JWT is in localStorage and attached as Bearer on subsequent requests; after logout, localStorage has no JWT and user is on home page
    - Tag: `// Feature: food-waste-reduction-platform, Property 19: JWT localStorage round-trip`
    - **Validates: Requirements 8.6, 8.7**

- [ ] 12. Checkpoint — frontend
  - Ensure all frontend tests pass (`npm test -- --run`). Ask the user if questions arise.

- [ ] 13. Dockerfiles
  - [ ] 13.1 Create `auth-service/Dockerfile` as a multi-stage build: stage 1 uses `maven:3.9-eclipse-temurin-17` to run `mvn clean package -DskipTests`; stage 2 uses `eclipse-temurin:17-jre-alpine` copying the fat JAR and setting `ENTRYPOINT ["java","-jar","app.jar"]`
  - [ ] 13.2 Create identical multi-stage Dockerfiles for `food-service/Dockerfile`, `claim-service/Dockerfile`, and `notification-service/Dockerfile` following the same pattern as 13.1
  - [ ] 13.3 Create `frontend/Dockerfile` as a multi-stage build: stage 1 uses `node:20-alpine` to run `npm ci && npm run build`; stage 2 uses `nginx:alpine` copying the `dist/` output to `/usr/share/nginx/html` and exposing port 80; include a minimal `nginx.conf` that routes all requests to `index.html` for SPA routing
  - _Requirements: 10.1_

- [ ] 14. docker-compose.yml
  - Create `docker-compose.yml` at the project root defining:
    - `postgres` service using `postgres:15-alpine`, named volume `postgres_data` mounted to `/var/lib/postgresql/data`, `db/init.sql` mounted to `/docker-entrypoint-initdb.d/`, healthcheck using `pg_isready -U ${POSTGRES_USER}`
    - `auth-service`, `food-service`, `claim-service`, `notification-service` services each with `build: ./{service}`, `depends_on: postgres: condition: service_healthy`, all environment variables from the design's env var table passed via `environment:` block
    - `frontend` service with `build: ./frontend`, `depends_on` on all four Spring Boot services, port `3000:80`
    - A single `food-network` bridge network attached to all services
    - All sensitive values (DB password, JWT secret) referenced as `${VAR}` so they can be supplied via a `.env` file
  - _Requirements: 10.2, 10.3, 10.4, 10.5, 10.6_

- [ ] 15. GitHub Actions CI workflow
  - Create `.github/workflows/ci.yml` with:
    - `on: push` and `pull_request` targeting `main`
    - Four parallel jobs `test-auth-service`, `test-food-service`, `test-claim-service`, `test-notification-service` each using `actions/checkout@v3`, `actions/setup-java@v3` (java-version: 17, distribution: temurin), and `run: cd {service} && mvn clean test`
    - A `build-and-push` job with `needs:` all four test jobs; uses `docker/login-action` with `registry: ghcr.io` and `secrets.GITHUB_TOKEN`; uses `docker/build-push-action` for each of the five services tagging `ghcr.io/${{ github.repository_owner }}/{service}:latest` and `:{github.sha}`
    - A `validate-compose` job with `needs: build-and-push` running `docker-compose config`
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

- [ ] 16. Jenkinsfile
  - Create `Jenkinsfile` at the project root with a declarative pipeline containing five stages:
    - `Pull Images`: `sh 'docker-compose pull'`
    - `Stop Containers`: `sh 'docker-compose down --remove-orphans'`
    - `Deploy`: `sh 'docker-compose up -d'`
    - `Verify`: shell script that runs `docker ps --filter status=running --format "{{.Names}}"` and fails the build if any of the six expected container names is absent
    - `Cleanup`: `sh 'docker image prune -f'`
  - No build or test steps in this file
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

- [ ] 17. README.md
  - Create `README.md` at the project root covering: project overview, architecture diagram (ASCII), prerequisites (Java 17, Maven, Node 20, Docker, Docker Compose), local setup instructions (`cp .env.example .env`, `docker-compose up --build`), service port table, environment variable reference table, CI/CD pipeline description, and Git remote URL
  - _Requirements: 10.2, 11.1, 12.1_

- [ ] 18. Final checkpoint — full platform
  - Ensure all backend service tests pass and the frontend test suite passes. Ask the user if questions arise.

- [ ] 19. Git commit and push
  - Stage all files: `git add .`
  - Create initial commit: `git commit -m "feat: initial Food Waste Reduction Platform implementation"`
  - Push to remote: `git push -u origin main`
  - _Requirements: 11.1_

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Property tests use jqwik (Java services) and fast-check (React frontend), each running ≥ 100 iterations
- All four Spring Boot services share an identical `JwtFilter` / `JwtUtil` / `JwtConfig` — implement once in auth-service and copy to the others
- Notification-service call failures are non-blocking; food-service call failures from claim-service are blocking and must roll back the claim transition
- All sensitive configuration (DB password, JWT secret) must be supplied via environment variables — never hardcoded
