# Requirements Document

## Introduction

The Food Waste Reduction Platform is a full-stack microservices web application that connects food donors (restaurants, hotels, bakeries, grocery stores) with recipients (NGOs, volunteers, individuals in need). Donors upload surplus food listings; NGOs and users search, claim, and coordinate pickup of food before it expires. The platform includes role-based access control, a claim workflow, notifications, and an admin dashboard. It is deployed via Docker Compose with CI via GitHub Actions and CD via Jenkins.

## Glossary

- **Platform**: The Food Waste Reduction Platform web application as a whole.
- **Auth_Service**: The microservice responsible for user registration, login, and JWT token issuance (port 8081).
- **Food_Service**: The microservice responsible for managing food donation posts (port 8082).
- **Claim_Service**: The microservice responsible for managing food claim lifecycle (port 8083).
- **Notification_Service**: The microservice responsible for generating and storing notifications (port 8084).
- **Frontend**: The React.js single-page application served on port 3000.
- **API_Gateway**: An optional reverse-proxy entry point routing requests to downstream microservices.
- **Restaurant**: A user with the RESTAURANT role who creates food donation posts.
- **NGO**: A user with the NGO role who searches for and claims food donations.
- **Admin**: A user with the ADMIN role who manages users and oversees platform activity.
- **Food_Post**: A record created by a Restaurant describing surplus food available for donation.
- **Claim**: A record representing an NGO's request to collect a specific Food_Post.
- **JWT**: JSON Web Token used for stateless authentication.
- **BCrypt**: Password hashing algorithm used to store user credentials securely.
- **Docker_Compose**: The container orchestration tool used to run all services locally and in production.
- **CI_Pipeline**: The GitHub Actions workflow that builds, tests, and pushes Docker images.
- **CD_Pipeline**: The Jenkins pipeline that pulls images and deploys services via Docker Compose.

---

## Requirements

### Requirement 1: User Registration

**User Story:** As a visitor, I want to register an account with a role, so that I can access role-specific features of the platform.

#### Acceptance Criteria

1. WHEN a POST request is sent to `/api/auth/register` with a valid name, email, password, role, and city, THE Auth_Service SHALL create a new user record and return HTTP 201.
2. WHEN a registration request is received, THE Auth_Service SHALL hash the password using BCrypt before persisting it.
3. IF a registration request contains an email that already exists in the database, THEN THE Auth_Service SHALL return HTTP 409 with a descriptive error message.
4. IF a registration request is missing a required field (name, email, password, role, or city), THEN THE Auth_Service SHALL return HTTP 400 with a field-level validation error message.
5. THE Auth_Service SHALL accept only the role values RESTAURANT, NGO, and ADMIN during registration.

---

### Requirement 2: User Authentication

**User Story:** As a registered user, I want to log in with my credentials, so that I can receive a JWT token to access protected resources.

#### Acceptance Criteria

1. WHEN a POST request is sent to `/api/auth/login` with a valid email and password, THE Auth_Service SHALL return HTTP 200 with a signed JWT token.
2. THE Auth_Service SHALL sign JWT tokens using a secret key and include the user's id, email, and role as claims.
3. IF a login request contains an unrecognised email or an incorrect password, THEN THE Auth_Service SHALL return HTTP 401 with an error message.
4. WHILE a valid JWT token is present in the Authorization header, THE Auth_Service SHALL allow the request to proceed to the requested resource.
5. IF a request to a protected endpoint is made without a JWT token, THEN THE Auth_Service SHALL return HTTP 401.
6. IF a request to a protected endpoint is made with an expired or malformed JWT token, THEN THE Auth_Service SHALL return HTTP 401 with a descriptive error message.

---

### Requirement 3: Food Post Management (Restaurant)

**User Story:** As a Restaurant user, I want to create and manage food donation posts, so that I can offer surplus food to NGOs before it expires.

#### Acceptance Criteria

1. WHEN a POST request is sent to `/api/foods` with a valid JWT token belonging to a RESTAURANT role and a body containing title, food_type, quantity, expiry_time, pickup_address, image_url, and contact details, THE Food_Service SHALL create a new Food_Post with status AVAILABLE and return HTTP 201.
2. IF a food post creation request is missing a required field, THEN THE Food_Service SHALL return HTTP 400 with a field-level validation error.
3. WHEN a PUT request is sent to `/api/foods/{id}` by the owning Restaurant, THE Food_Service SHALL update the specified Food_Post fields and return HTTP 200.
4. IF a PUT request to `/api/foods/{id}` is made by a user who does not own the Food_Post, THEN THE Food_Service SHALL return HTTP 403.
5. WHEN a DELETE request is sent to `/api/foods/{id}` by the owning Restaurant, THE Food_Service SHALL remove the Food_Post and return HTTP 204.
6. WHEN a GET request is sent to `/api/foods/{id}`, THE Food_Service SHALL return the Food_Post details including current status.
7. WHILE a Food_Post has status CLAIMED, THE Food_Service SHALL reject further claim attempts on that Food_Post with HTTP 409.
8. WHEN the current time exceeds a Food_Post's expiry_time and the Food_Post status is AVAILABLE, THE Food_Service SHALL update the Food_Post status to EXPIRED.

---

### Requirement 4: Food Search and Browsing (NGO)

**User Story:** As an NGO user, I want to search and browse available food donations, so that I can find food relevant to my location and needs.

#### Acceptance Criteria

1. WHEN a GET request is sent to `/api/foods`, THE Food_Service SHALL return a paginated list of all Food_Posts with status AVAILABLE.
2. WHEN a GET request is sent to `/api/foods/search` with a `city` query parameter, THE Food_Service SHALL return only Food_Posts whose pickup_address contains the specified city value.
3. WHEN a GET request is sent to `/api/foods/search` with a `food_type` query parameter, THE Food_Service SHALL return only Food_Posts matching the specified food_type value.
4. WHEN a GET request is sent to `/api/foods/search` with a `min_quantity` query parameter, THE Food_Service SHALL return only Food_Posts whose quantity is greater than or equal to the specified value.
5. WHEN multiple search query parameters are provided simultaneously, THE Food_Service SHALL apply all filters conjunctively and return only Food_Posts matching all specified criteria.
6. IF no Food_Posts match the search criteria, THE Food_Service SHALL return HTTP 200 with an empty list.

---

### Requirement 5: Claim Workflow

**User Story:** As an NGO user, I want to claim a food donation and track its status, so that I can coordinate pickup with the restaurant.

#### Acceptance Criteria

1. WHEN a POST request is sent to `/api/claims` with a valid JWT token belonging to an NGO role and a valid food_post_id, THE Claim_Service SHALL create a new Claim with status PENDING and return HTTP 201.
2. IF a claim request references a Food_Post that does not have status AVAILABLE, THEN THE Claim_Service SHALL return HTTP 409 with a descriptive error message.
3. WHEN a Restaurant sends a PUT request to `/api/claims/{id}` with status APPROVED, THE Claim_Service SHALL update the Claim status to APPROVED and update the associated Food_Post status to CLAIMED.
4. WHEN a Restaurant sends a PUT request to `/api/claims/{id}` with status CANCELLED, THE Claim_Service SHALL update the Claim status to CANCELLED and restore the associated Food_Post status to AVAILABLE.
5. WHEN an NGO sends a PUT request to `/api/claims/{id}` with status PICKED_UP, THE Claim_Service SHALL update the Claim status to PICKED_UP.
6. IF a status transition is not permitted by the workflow (PENDING → APPROVED/CANCELLED, APPROVED → PICKED_UP/CANCELLED), THEN THE Claim_Service SHALL return HTTP 422 with a descriptive error message.
7. WHEN a GET request is sent to `/api/claims` with a valid NGO JWT token, THE Claim_Service SHALL return all Claims belonging to that NGO.
8. WHEN a GET request is sent to `/api/claims` with a valid RESTAURANT JWT token, THE Claim_Service SHALL return all Claims for Food_Posts owned by that Restaurant.

---

### Requirement 6: Notification Service

**User Story:** As a user, I want to receive notifications about claim events and food expiry, so that I can take timely action.

#### Acceptance Criteria

1. WHEN a Claim status changes to PENDING, THE Notification_Service SHALL create a notification record for the owning Restaurant with a message describing the new claim.
2. WHEN a Claim status changes to APPROVED or CANCELLED, THE Notification_Service SHALL create a notification record for the NGO that submitted the Claim.
3. WHEN a Food_Post status changes to EXPIRED, THE Notification_Service SHALL create a notification record for the owning Restaurant.
4. WHEN a GET request is sent to `/api/notifications` with a valid JWT token, THE Notification_Service SHALL return all notification records belonging to the authenticated user, ordered by created_at descending.
5. THE Notification_Service SHALL log a simulated email or SMS message to application logs for every notification record created.
6. WHERE RabbitMQ is configured, THE Notification_Service SHALL consume notification events from a message queue rather than receiving direct HTTP calls.

---

### Requirement 7: Admin Dashboard

**User Story:** As an Admin user, I want to manage users and food posts, so that I can maintain platform integrity and monitor activity.

#### Acceptance Criteria

1. WHEN a GET request is sent to `/api/admin/users` with a valid ADMIN JWT token, THE Auth_Service SHALL return a paginated list of all registered users.
2. WHEN a DELETE request is sent to `/api/admin/users/{id}` with a valid ADMIN JWT token, THE Auth_Service SHALL deactivate the specified user account and return HTTP 200.
3. IF a DELETE request to `/api/admin/users/{id}` is made with a non-ADMIN JWT token, THEN THE Auth_Service SHALL return HTTP 403.
4. WHEN an Admin accesses the Admin Dashboard page, THE Frontend SHALL display aggregate analytics including total users, total food posts, total claims, and total notifications.
5. WHEN an Admin sends a request to block a user, THE Auth_Service SHALL set the user's active status to false, preventing future logins for that user.
6. IF a blocked user attempts to log in, THEN THE Auth_Service SHALL return HTTP 403 with a message indicating the account is inactive.

---

### Requirement 8: Frontend Application

**User Story:** As any user, I want a responsive web interface, so that I can use the platform from desktop and mobile devices.

#### Acceptance Criteria

1. THE Frontend SHALL provide the following pages: Home, Login, Register, Restaurant Dashboard, NGO Dashboard, Food Listing, Food Detail, Claim Management, and Admin Dashboard.
2. THE Frontend SHALL implement protected routes that redirect unauthenticated users to the Login page.
3. THE Frontend SHALL implement role-based route guards that prevent users from accessing pages outside their assigned role.
4. WHEN an API call returns an error response, THE Frontend SHALL display a toast notification with the error message.
5. WHEN an API call succeeds for a create, update, or delete operation, THE Frontend SHALL display a toast notification confirming the action.
6. THE Frontend SHALL store the JWT token in browser localStorage and attach it as a Bearer token in the Authorization header of all authenticated API requests.
7. WHEN a user logs out, THE Frontend SHALL remove the JWT token from localStorage and redirect to the Home page.
8. THE Frontend SHALL render correctly on viewport widths from 320px to 1920px using responsive Tailwind CSS utility classes.

---

### Requirement 9: Database Schema

**User Story:** As a developer, I want a well-defined relational schema, so that all services share a consistent data model.

#### Acceptance Criteria

1. THE Platform SHALL maintain a `users` table with columns: id (UUID primary key), name, email (unique), password, role, city, active (boolean), created_at (timestamp).
2. THE Platform SHALL maintain a `food_posts` table with columns: id (UUID primary key), restaurant_id (foreign key → users.id), title, food_type, quantity (integer), expiry_time (timestamp), pickup_address, image_url, status (AVAILABLE/CLAIMED/EXPIRED), created_at (timestamp).
3. THE Platform SHALL maintain a `claims` table with columns: id (UUID primary key), food_post_id (foreign key → food_posts.id), ngo_id (foreign key → users.id), status (PENDING/APPROVED/PICKED_UP/CANCELLED), claimed_at (timestamp).
4. THE Platform SHALL maintain a `notifications` table with columns: id (UUID primary key), user_id (foreign key → users.id), message (text), type (varchar), created_at (timestamp).
5. THE Platform SHALL enforce referential integrity via foreign key constraints on all inter-table relationships.

---

### Requirement 10: Containerisation and Docker Compose

**User Story:** As a DevOps engineer, I want all services containerised and orchestrated via Docker Compose, so that the entire platform starts with a single command.

#### Acceptance Criteria

1. THE Platform SHALL provide a multi-stage Dockerfile for each of Auth_Service, Food_Service, Claim_Service, Notification_Service, and Frontend that produces an optimised production image.
2. THE Platform SHALL provide a `docker-compose.yml` at the project root that defines services for postgres, auth-service, food-service, claim-service, notification-service, and frontend.
3. WHEN `docker-compose up --build` is executed, THE Platform SHALL start all services in dependency order with postgres starting before any Spring Boot service.
4. THE docker-compose.yml SHALL define a persistent named volume for the postgres data directory.
5. THE docker-compose.yml SHALL define an internal Docker network connecting all services.
6. THE docker-compose.yml SHALL pass all service configuration (database URL, JWT secret, ports) via environment variables.
7. WHERE Redis is configured, THE docker-compose.yml SHALL include a redis service and the relevant Spring Boot services SHALL connect to it for caching.

---

### Requirement 11: CI Pipeline (GitHub Actions)

**User Story:** As a developer, I want automated CI on every push, so that build and test failures are caught before merging.

#### Acceptance Criteria

1. THE CI_Pipeline SHALL be defined in `.github/workflows/ci.yml` and trigger on push and pull_request events to the main branch.
2. WHEN the CI_Pipeline runs, THE CI_Pipeline SHALL check out the repository, set up Java 17, and run `mvn clean test` for each Spring Boot service.
3. WHEN all tests pass, THE CI_Pipeline SHALL build a Docker image for each service using the service's Dockerfile.
4. WHEN Docker images are built successfully, THE CI_Pipeline SHALL push the images to GHCR or Docker Hub using repository secrets for credentials.
5. THE CI_Pipeline SHALL validate the `docker-compose.yml` file using `docker-compose config`.
6. THE CI_Pipeline SHALL NOT perform any deployment steps.

---

### Requirement 12: CD Pipeline (Jenkins)

**User Story:** As a DevOps engineer, I want automated CD via Jenkins, so that approved images are deployed to the target environment without manual steps.

#### Acceptance Criteria

1. THE CD_Pipeline SHALL be defined in a `Jenkinsfile` at the project root and contain stages: Pull Images, Stop Containers, Deploy, Verify, and Cleanup.
2. WHEN the Pull Images stage runs, THE CD_Pipeline SHALL pull the latest Docker images from the container registry for all services.
3. WHEN the Deploy stage runs, THE CD_Pipeline SHALL execute `docker-compose up -d` to start all services.
4. WHEN the Verify stage runs, THE CD_Pipeline SHALL check that all containers are in a running state and fail the pipeline if any container is not running.
5. WHEN the Cleanup stage runs, THE CD_Pipeline SHALL remove unused Docker images to reclaim disk space.
6. THE CD_Pipeline SHALL NOT include any build or test steps.

---

### Requirement 13: Security

**User Story:** As a security-conscious developer, I want the platform to enforce authentication and authorisation consistently, so that users can only access resources permitted by their role.

#### Acceptance Criteria

1. THE Auth_Service SHALL apply Spring Security filters to all endpoints except `/api/auth/register` and `/api/auth/login`.
2. THE Food_Service SHALL permit GET requests to `/api/foods` and `/api/foods/search` without authentication.
3. THE Food_Service SHALL require a valid RESTAURANT JWT token for POST, PUT, and DELETE requests to `/api/foods`.
4. THE Claim_Service SHALL require a valid NGO JWT token for POST requests to `/api/claims`.
5. THE Auth_Service SHALL require a valid ADMIN JWT token for all requests to `/api/admin/**`.
6. IF a request is made to a role-restricted endpoint with a JWT token of an insufficient role, THEN THE Auth_Service SHALL return HTTP 403.
