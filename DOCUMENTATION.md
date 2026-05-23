# Food Waste Reduction Platform — Complete Technical Documentation

> How every tool works, why it exists, where it runs, and how everything connects.

---

## Table of Contents

1. [Big Picture — How Everything Connects](#1-big-picture)
2. [Java & Spring Boot — The Backend Engine](#2-java--spring-boot)
3. [Maven — The Java Build Tool](#3-maven)
4. [PostgreSQL — The Database](#4-postgresql)
5. [React.js — The Frontend](#5-reactjs--the-frontend)
6. [Docker — Containerisation](#6-docker)
7. [Docker Compose — Multi-Container Orchestration](#7-docker-compose)
8. [GitHub Actions — Continuous Integration (CI)](#8-github-actions--ci)
9. [Jenkins — Continuous Deployment (CD)](#9-jenkins--cd)
10. [JWT Authentication — Security Layer](#10-jwt-authentication)
11. [Nginx — The Web Server for React](#11-nginx)
12. [The Full Developer Workflow](#12-the-full-developer-workflow)
13. [Dependency Map — Who Needs Whom](#13-dependency-map)
14. [Ports & URLs Reference](#14-ports--urls-reference)

---

## 1. Big Picture

Before diving into individual tools, understand the full picture of what runs and how it connects.

```
DEVELOPER
    │
    │  git push
    ▼
GITHUB REPOSITORY  ──────────────────────────────────────────────────────────┐
    │                                                                         │
    │  triggers automatically                                                 │
    ▼                                                                         │
GITHUB ACTIONS (CI)                                                           │
    │  1. Runs unit tests for all 4 Java services                             │
    │  2. Builds Docker images                                                │
    │  3. Pushes images to GHCR (GitHub Container Registry)                  │
    │                                                                         │
    │  notifies Jenkins (webhook or polling)                                  │
    ▼                                                                         │
JENKINS (CD)                                                                  │
    │  1. Pulls latest Docker images from GHCR                               │
    │  2. Stops old containers                                                │
    │  3. Starts new containers via docker-compose                            │
    │  4. Verifies all 6 containers are running                               │
    │                                                                         │
    ▼                                                                         │
DOCKER COMPOSE (on the server)                                                │
    │                                                                         │
    ├── foodwaste-postgres    (PostgreSQL database)      :5432                │
    ├── foodwaste-auth        (Spring Boot auth-service) :8081                │
    ├── foodwaste-food        (Spring Boot food-service) :8082                │
    ├── foodwaste-claim       (Spring Boot claim-service):8083                │
    ├── foodwaste-notification(Spring Boot notif-service):8084                │
    └── foodwaste-frontend    (React app via Nginx)      :3000 ◄── BROWSER   │
                                                                              │
    All containers talk to each other on: food-network (Docker bridge)       │
    All Spring Boot services talk to: postgres:5432                          │
                                                                              │
GITHUB REPO ◄─────────────────────────────────────────────────────────────────┘
```

**In plain English:**
- You write code and push to GitHub
- GitHub Actions automatically tests and packages it into Docker images
- Jenkins automatically deploys those images to the server
- Docker Compose keeps all 6 services running together
- Users open a browser and hit port 3000 — they see the React app
- React calls the Java APIs on ports 8081–8084
- Java services read/write data to PostgreSQL on port 5432

---

## 2. Java & Spring Boot

### What is Java?

Java is a programming language. Code you write in Java is compiled into **bytecode** (`.class` files), which runs on the **JVM (Java Virtual Machine)**. The JVM is what actually executes your program — it translates bytecode into machine instructions for whatever OS it's running on (Windows, Linux, Mac).

```
Your Java Code (.java)
        │
        │  javac (compiler)
        ▼
   Bytecode (.class)
        │
        │  JVM interprets/executes
        ▼
   Running Program
```

**Why Java here?** Java is strongly typed, has a massive ecosystem, and Spring Boot makes building REST APIs extremely fast.

---

### What is Spring Boot?

Spring Boot is a framework built on top of Java that gives you:

| Feature | What it does |
|---|---|
| Embedded Tomcat | A web server built into your JAR — no separate server install needed |
| Spring MVC | Maps HTTP requests to Java methods (`@GetMapping`, `@PostMapping`) |
| Spring Data JPA | Talks to the database using Java objects instead of raw SQL |
| Spring Security | Handles authentication, JWT validation, role-based access |
| Spring Validation | Validates request bodies automatically (`@Valid`, `@NotBlank`) |

**How a request flows through Spring Boot:**

```
HTTP Request (e.g. POST /api/auth/login)
        │
        ▼
   Tomcat (embedded web server) — receives the HTTP request
        │
        ▼
   Spring Security Filter Chain
        │  JwtFilter checks Authorization header
        │  If valid JWT → sets user in SecurityContext
        │  If no JWT on public endpoint → passes through
        ▼
   DispatcherServlet — routes to the right Controller
        │
        ▼
   @RestController (e.g. AuthController)
        │  @PostMapping("/api/auth/login")
        ▼
   @Service (e.g. AuthService)
        │  Business logic: verify password, generate JWT
        ▼
   @Repository (e.g. UserRepository)
        │  Spring Data JPA generates SQL automatically
        ▼
   PostgreSQL Database
        │
        ▼  (result travels back up the chain)
   JSON Response sent to client
```

---

### The 4 Microservices

Each service is a **completely independent Spring Boot application** with its own:
- `pom.xml` (dependencies)
- `Dockerfile` (how to build its container)
- `application.yml` (configuration)
- Database tables it owns

| Service | Port | Responsibility |
|---|---|---|
| auth-service | 8081 | Register users, login, issue JWT tokens, admin user management |
| food-service | 8082 | Create/edit/delete food posts, search, expiry scheduler |
| claim-service | 8083 | Claim lifecycle: PENDING → APPROVED → PICKED_UP / CANCELLED |
| notification-service | 8084 | Store and serve notifications, log simulated emails |

**Why split into 4 services?**
Each service can be scaled, deployed, and updated independently. If food-service crashes, auth still works. This is **Microservices Architecture**.

---

### How Java Runs in a Browser (It Doesn't — Here's What Actually Happens)

Java does NOT run in the browser. Here is the actual flow:

```
Browser (Chrome/Firefox)
    │
    │  User opens http://localhost:3000
    ▼
React App (JavaScript) — runs entirely in the browser
    │
    │  User clicks "Login" → React sends HTTP request
    │  fetch("http://localhost:8081/api/auth/login", { method: "POST", body: {...} })
    ▼
Java Spring Boot (auth-service) — runs on the SERVER
    │  Receives HTTP request
    │  Checks credentials
    │  Returns JSON: { "token": "eyJ..." }
    ▼
React App receives JSON response
    │  Stores JWT in localStorage
    │  Updates UI
    ▼
User sees "Logged in" on screen
```

**The browser only ever sees JSON.** Java produces JSON. React consumes JSON and renders HTML/CSS that the user sees.

---

## 3. Maven

### What is Maven?

Maven is a **build tool** for Java. It does three things:

1. **Dependency management** — downloads libraries your code needs (Spring Boot, JWT, PostgreSQL driver) from the internet (Maven Central repository) and caches them
2. **Build** — compiles your `.java` files into `.class` files, then packages everything into a single `.jar` file
3. **Test** — runs your unit tests

### The pom.xml File

Every Java service has a `pom.xml`. This is Maven's configuration file. Example from auth-service:

```xml
<parent>
    <!-- Inherits Spring Boot 3.2.0 defaults — versions, plugins, etc. -->
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.2.0</version>
</parent>

<dependencies>
    <!-- Spring Boot web server + REST API support -->
    <dependency>spring-boot-starter-web</dependency>

    <!-- Spring Boot + Hibernate ORM for database access -->
    <dependency>spring-boot-starter-data-jpa</dependency>

    <!-- JWT library for token generation and validation -->
    <dependency>jjwt-api version 0.11.5</dependency>

    <!-- PostgreSQL JDBC driver — lets Java talk to PostgreSQL -->
    <dependency>postgresql</dependency>

    <!-- Lombok — generates getters/setters/constructors automatically -->
    <dependency>lombok</dependency>
</dependencies>
```

### Key Maven Commands

```bash
mvn clean install       # Delete old build, compile, test, package into JAR
mvn clean test          # Compile and run tests only (used in CI)
mvn clean package -DskipTests  # Build JAR without running tests (used in Dockerfile)
```

### Where Maven Runs

| Location | When | Command |
|---|---|---|
| Inside Docker build | When building the image | `mvn clean package -DskipTests` |
| GitHub Actions | On every push to main | `mvn clean test` |
| Your local machine | During development | `mvn clean install` |

### The JAR File

After `mvn clean package`, Maven produces:
```
auth-service/target/auth-service-1.0.0.jar
```

This is a **fat JAR** — a single file containing:
- Your compiled code
- All dependencies (Spring Boot, JWT library, etc.)
- An embedded Tomcat web server

You run it with: `java -jar auth-service-1.0.0.jar`

That one command starts the entire web server. No separate Tomcat installation needed.

---

## 4. PostgreSQL

### What is PostgreSQL?

PostgreSQL is a **relational database**. It stores data in tables with rows and columns, enforces relationships between tables (foreign keys), and lets you query data with SQL.

### Why PostgreSQL Here?

- Free and open source
- Supports UUID primary keys natively (`gen_random_uuid()`)
- Handles concurrent connections from multiple services
- The official `postgres:15-alpine` Docker image is small and production-ready

### The Database Schema

All 4 Spring Boot services share **one PostgreSQL instance** but each owns its own tables:

```sql
-- auth-service owns this table
users (
    id          UUID PRIMARY KEY,   -- unique identifier
    name        VARCHAR(255),
    email       VARCHAR(255) UNIQUE, -- no duplicate emails
    password    VARCHAR(255),        -- BCrypt hashed, never plaintext
    role        VARCHAR(20),         -- RESTAURANT | NGO | ADMIN
    city        VARCHAR(100),
    active      BOOLEAN DEFAULT TRUE, -- false = blocked user
    created_at  TIMESTAMP
)

-- food-service owns this table
food_posts (
    id              UUID PRIMARY KEY,
    restaurant_id   UUID REFERENCES users(id),  -- foreign key
    title           VARCHAR(255),
    food_type       VARCHAR(100),
    quantity        INTEGER CHECK (quantity > 0),
    expiry_time     TIMESTAMP,
    pickup_address  VARCHAR(500),
    status          VARCHAR(20),  -- AVAILABLE | CLAIMED | EXPIRED
    claimed_by_name VARCHAR(255), -- set when a claim is approved
    created_at      TIMESTAMP
)

-- claim-service owns this table
claims (
    id           UUID PRIMARY KEY,
    food_post_id UUID REFERENCES food_posts(id),
    ngo_id       UUID REFERENCES users(id),
    status       VARCHAR(20),  -- PENDING | APPROVED | PICKED_UP | CANCELLED
    ngo_name     VARCHAR(255),
    claimed_at   TIMESTAMP
)

-- notification-service owns this table
notifications (
    id         UUID PRIMARY KEY,
    user_id    UUID REFERENCES users(id),
    message    TEXT,
    type       VARCHAR(50),  -- CLAIM_PENDING | CLAIM_APPROVED | FOOD_EXPIRED
    created_at TIMESTAMP
)
```

### How Spring Boot Talks to PostgreSQL

Spring Boot uses **JPA (Java Persistence API)** with **Hibernate** as the implementation.

```
Java Object (User.java entity)
        │
        │  Hibernate translates to SQL automatically
        ▼
SQL: INSERT INTO users (id, name, email...) VALUES (...)
        │
        │  PostgreSQL JDBC Driver sends over TCP
        ▼
PostgreSQL database (running in Docker on port 5432)
```

The connection string in `application.yml`:
```yaml
spring:
  datasource:
    url: jdbc:postgresql://postgres:5432/foodwaste
    # "postgres" is the Docker service name — Docker DNS resolves it
    # 5432 is PostgreSQL's default port
    # "foodwaste" is the database name
```

### How the Schema Gets Created

1. `db/init.sql` runs automatically when the PostgreSQL container starts for the first time (mounted to `/docker-entrypoint-initdb.d/`)
2. Hibernate's `ddl-auto: update` also creates/updates tables based on your Java entity classes

---

## 5. React.js — The Frontend

### What is React?

React is a JavaScript library for building user interfaces. It runs **entirely in the browser** — the server just sends an HTML file and a JavaScript bundle, and React takes over from there.

### The Tech Stack Inside the Frontend

| Tool | Role |
|---|---|
| React 18 | UI component library |
| React Router v6 | Client-side routing (`/login`, `/foods`, `/admin`) |
| Axios | HTTP client — makes API calls to the Java services |
| Tailwind CSS | Utility-first CSS framework for styling |
| Vite | Build tool — bundles all JS/CSS into optimised static files |
| react-hot-toast | Toast notification popups |

### How React Gets to the Browser

**Development (local machine):**
```
npm run dev
    │
    ▼
Vite dev server (port 3000)
    │  Serves React app with hot reload
    │  Proxies /api calls to localhost:8081
    ▼
Browser
```

**Production (Docker):**
```
npm run build
    │
    ▼
dist/ folder (static HTML + JS + CSS files)
    │
    ▼
Nginx serves these static files on port 80
    │
    ▼
Docker maps port 3000 → container port 80
    │
    ▼
Browser opens http://localhost:3000
```

### How React Calls the Java APIs

```javascript
// src/services/axiosInstance.js
const axiosInstance = axios.create({
  baseURL: '',
})

// Before every request: attach JWT token from localStorage
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// If server returns 401: auto-logout
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
```

### Protected Routes

React uses route guards to prevent unauthorised access:

```
User visits /restaurant/dashboard
        │
        ▼
ProtectedRoute checks: is there a valid JWT in localStorage?
        │
        ├── NO  → redirect to /login
        │
        └── YES ▼
            RoleRoute checks: does user.role === 'RESTAURANT'?
                │
                ├── NO  → redirect to their own dashboard
                │
                └── YES → render RestaurantDashboard component
```

### JWT Storage in the Browser

```
Login success → server returns { token: "eyJ..." }
        │
        ▼
localStorage.setItem('token', 'eyJ...')
        │
        ▼
AuthContext decodes the JWT payload:
  { sub: "uuid", email: "user@test.com", role: "RESTAURANT" }
        │
        ▼
user.id, user.email, user.role available everywhere in the app
```

---

## 6. Docker

### What is Docker?

Docker is a tool that packages an application and **everything it needs to run** (OS libraries, runtime, config) into a single unit called a **container**.

Without Docker:
```
Developer A: "It works on my machine"
Developer B: "It crashes on mine"
Server:      "What is a JVM?"
```

With Docker:
```
Everyone runs the exact same container image.
Same OS, same Java version, same dependencies. Always.
```

### Key Concepts

| Concept | Analogy | In This Project |
|---|---|---|
| Image | A recipe / blueprint | `devopsproject-auth-service` image |
| Container | A running instance of an image | `foodwaste-auth` container |
| Dockerfile | Instructions to build an image | `auth-service/Dockerfile` |
| Registry | A warehouse of images | GHCR (GitHub Container Registry) |
| Volume | Persistent storage | `postgres_data` volume |
| Network | Private LAN for containers | `food-network` |

### The Multi-Stage Dockerfile (Spring Boot)

```dockerfile
# ── STAGE 1: BUILD ──────────────────────────────────────────
FROM maven:3.9-eclipse-temurin-17 AS build
# Uses a large image that has Maven + Java 17 JDK
# Only needed to compile the code

WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B
# Downloads all Maven dependencies first (cached layer)
# If pom.xml doesn't change, Docker reuses this cached layer

COPY src ./src
RUN mvn clean package -DskipTests -B
# Compiles Java code → produces target/auth-service-1.0.0.jar

# ── STAGE 2: RUNTIME ────────────────────────────────────────
FROM eclipse-temurin:17-jre-alpine
# Much smaller image — only has Java Runtime (JRE), not the full JDK
# No Maven, no build tools — just what's needed to RUN the app

WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
# Copies ONLY the JAR from Stage 1 — discards all build tools

EXPOSE 8081
ENTRYPOINT ["java", "-jar", "app.jar"]
# This is the command that runs when the container starts
```

**Why two stages?**
- Stage 1 image: ~700MB (Maven + JDK)
- Stage 2 image: ~180MB (JRE only)
- Final image is small and has no build tools (more secure)

### The Multi-Stage Dockerfile (React/Frontend)

```dockerfile
# ── STAGE 1: BUILD ──────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install          # Downloads all npm packages
COPY . .
RUN npm run build        # Vite compiles React → static files in dist/

# ── STAGE 2: SERVE ──────────────────────────────────────────
FROM nginx:alpine
# Tiny Nginx web server — just serves static files

COPY --from=build /app/dist /usr/share/nginx/html
# Copies the compiled React app into Nginx's web root

COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Why Nginx for React?**
React builds into plain HTML/JS/CSS files. Nginx serves them over HTTP. It also handles the SPA routing trick — all URLs return `index.html` so React Router can handle them client-side.

### Docker Commands Used in This Project

```bash
# Build all images and start all containers
docker compose up --build

# Start containers in background (detached)
docker compose up -d

# Stop all containers
docker compose down

# See running containers
docker compose ps

# See logs of a specific service
docker logs foodwaste-auth

# Rebuild only one service
docker compose build food-service
docker compose up -d --no-deps food-service

# Remove unused images (cleanup)
docker image prune -f
```

---

## 7. Docker Compose

### What is Docker Compose?

Docker Compose is a tool that lets you define and run **multiple containers together** using a single `docker-compose.yml` file. Instead of running 6 separate `docker run` commands with all their flags, you write one file and run `docker compose up`.

### The docker-compose.yml Explained Line by Line

```yaml
services:

  # ── PostgreSQL Database ──────────────────────────────────
  postgres:
    image: postgres:15-alpine        # Use official PostgreSQL 15 image
    container_name: foodwaste-postgres
    environment:
      POSTGRES_DB: foodwaste         # Create a database named "foodwaste"
      POSTGRES_USER: postgres        # Database username
      POSTGRES_PASSWORD: postgres    # Database password
    ports:
      - "5432:5432"                  # host:container — expose to your machine
    volumes:
      - postgres_data:/var/lib/postgresql/data  # Persist data across restarts
      - ./db/init.sql:/docker-entrypoint-initdb.d/init.sql  # Run on first start
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s   # Check every 10 seconds
      timeout: 5s     # Fail if no response in 5 seconds
      retries: 5      # Try 5 times before marking unhealthy
    networks:
      - food-network

  # ── Auth Service ─────────────────────────────────────────
  auth-service:
    build: ./auth-service            # Build image from ./auth-service/Dockerfile
    container_name: foodwaste-auth
    ports:
      - "8081:8081"
    environment:
      # "postgres" here is the SERVICE NAME above — Docker DNS resolves it
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/foodwaste
      JWT_SECRET: mySecretKey...
    depends_on:
      postgres:
        condition: service_healthy   # Wait until postgres passes healthcheck
    networks:
      - food-network
    restart: on-failure              # Auto-restart if the container crashes

  # ── Claim Service ────────────────────────────────────────
  claim-service:
    build: ./claim-service
    environment:
      FOOD_SERVICE_URL: http://food-service:8082
      # "food-service" is the service name — Docker DNS resolves it
      # claim-service calls food-service over the internal network
      NOTIFICATION_SERVICE_URL: http://notification-service:8084
    depends_on:
      postgres:
        condition: service_healthy

  # ── Frontend ─────────────────────────────────────────────
  frontend:
    build: ./frontend
    ports:
      - "3000:80"    # Browser hits port 3000 → Nginx inside container on port 80
    depends_on:
      - auth-service
      - food-service
      - claim-service
      - notification-service

volumes:
  postgres_data:    # Named volume — data survives container restarts

networks:
  food-network:
    driver: bridge  # All containers on this network can talk to each other by name
```

### Service Startup Order

```
postgres (starts first, healthcheck must pass)
    │
    ├── auth-service (waits for postgres healthy)
    ├── food-service (waits for postgres healthy)
    ├── claim-service (waits for postgres healthy)
    └── notification-service (waits for postgres healthy)
                │
                └── frontend (waits for all 4 services to start)
```

### Docker Networking — How Services Find Each Other

Inside the `food-network`, every container is reachable by its **service name** as a hostname:

```
claim-service wants to call food-service:
  URL: http://food-service:8082/api/foods/123
  Docker DNS resolves "food-service" → container's internal IP
  No need to know the actual IP address
```

This only works inside Docker. From your browser (outside Docker), you use `localhost:8082`.

---

## 8. GitHub Actions — CI

### What is CI (Continuous Integration)?

CI means: every time a developer pushes code, an automated system immediately:
1. Checks out the code
2. Runs all tests
3. Builds the application
4. Reports pass or fail

This catches bugs before they reach production.

### Where GitHub Actions Runs

GitHub Actions runs on **GitHub's servers** (called "runners"). When you push to the `main` branch, GitHub spins up a fresh Ubuntu virtual machine, runs your workflow, and shuts it down.

You never manage these servers. GitHub handles it.

### The CI Workflow File: `.github/workflows/ci.yml`

```yaml
name: CI Pipeline

on:
  push:
    branches: [main]        # Trigger on every push to main
  pull_request:
    branches: [main]        # Also trigger on pull requests to main

jobs:
  # ── 4 test jobs run IN PARALLEL ──────────────────────────
  test-auth-service:
    runs-on: ubuntu-latest  # Fresh Ubuntu VM from GitHub
    steps:
      - uses: actions/checkout@v3       # Download the repo code
      - uses: actions/setup-java@v3     # Install Java 17 (Temurin distribution)
        with:
          java-version: '17'
          distribution: 'temurin'
          cache: maven                  # Cache Maven dependencies between runs
      - name: Test auth-service
        run: cd auth-service && mvn clean test -B
        # -B = batch mode (no interactive prompts)

  test-food-service:    # Same pattern, runs in parallel
  test-claim-service:   # Same pattern, runs in parallel
  test-notification-service:  # Same pattern, runs in parallel

  # ── Build & Push (runs AFTER all tests pass) ─────────────
  build-and-push:
    runs-on: ubuntu-latest
    needs: [test-auth-service, test-food-service, test-claim-service, test-notification-service]
    # "needs" = only run this job if ALL listed jobs succeeded

    permissions:
      packages: write   # Permission to push to GHCR

    steps:
      - uses: actions/checkout@v3

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}         # Your GitHub username
          password: ${{ secrets.GITHUB_TOKEN }} # Auto-provided by GitHub

      - name: Build and push auth-service
        uses: docker/build-push-action@v5
        with:
          context: ./auth-service    # Build from this directory's Dockerfile
          push: true
          tags: |
            ghcr.io/antriksh55/foodwaste-auth-service:latest
            ghcr.io/antriksh55/foodwaste-auth-service:abc1234  # commit SHA tag

  # ── Validate Compose (runs after images are pushed) ──────
  validate-compose:
    needs: build-and-push
    steps:
      - run: docker compose config   # Validates docker-compose.yml syntax
```

### What GHCR Is

GHCR = **GitHub Container Registry**. It's a place to store Docker images, hosted by GitHub.

```
GitHub Actions builds image → pushes to ghcr.io/antriksh55/foodwaste-auth-service:latest
                                                    │
Jenkins (on your server) pulls from ───────────────┘
```

Images are tagged with:
- `:latest` — always the most recent build
- `:abc1234` — the exact git commit SHA — lets you roll back to any version

### CI Pipeline Flow Visualised

```
git push to main
        │
        ▼
GitHub Actions triggered
        │
        ├── test-auth-service ──────────────────────────────┐
        ├── test-food-service ──────────────────────────────┤ (parallel)
        ├── test-claim-service ─────────────────────────────┤
        └── test-notification-service ──────────────────────┘
                                                            │
                                              All 4 passed? │
                                                            ▼
                                              build-and-push
                                              (builds 5 Docker images,
                                               pushes to GHCR)
                                                            │
                                                            ▼
                                              validate-compose
                                              (checks docker-compose.yml)
                                                            │
                                                            ▼
                                              CI COMPLETE ✓
```

---

## 9. Jenkins — CD

### What is CD (Continuous Deployment)?

CD means: after CI builds and tests the code, an automated system **deploys it to the server** without manual steps.

CI = "Is the code good?"
CD = "Put the good code on the server."

### What is Jenkins?

Jenkins is an open-source automation server. You install it on your own server (or VM). It watches for triggers (like a webhook from GitHub) and runs pipelines defined in a `Jenkinsfile`.

**Key difference from GitHub Actions:**
- GitHub Actions runs on GitHub's cloud servers
- Jenkins runs on **your own server** — you control it completely

### The Jenkinsfile Explained

```groovy
pipeline {
    agent any   // Run on any available Jenkins agent (worker)

    environment {
        COMPOSE_FILE = 'docker-compose.yml'
        REGISTRY = 'ghcr.io'
    }

    stages {

        // ── Stage 1: Pull Images ──────────────────────────
        stage('Pull Images') {
            steps {
                sh 'docker compose pull'
                // Downloads the latest images from GHCR
                // These are the images GitHub Actions just built and pushed
            }
        }

        // ── Stage 2: Stop Old Containers ─────────────────
        stage('Stop Containers') {
            steps {
                sh 'docker compose down --remove-orphans'
                // Gracefully stops all running containers
                // --remove-orphans removes containers not in compose file
            }
        }

        // ── Stage 3: Start New Containers ────────────────
        stage('Deploy') {
            steps {
                sh 'docker compose up -d'
                // Starts all containers in background (-d = detached)
                // Uses the newly pulled images
            }
        }

        // ── Stage 4: Verify Everything is Running ────────
        stage('Verify') {
            steps {
                script {
                    sleep(time: 30, unit: 'SECONDS')
                    // Wait 30 seconds for Spring Boot to fully start

                    def expectedContainers = [
                        'foodwaste-postgres',
                        'foodwaste-auth',
                        'foodwaste-food',
                        'foodwaste-claim',
                        'foodwaste-notification',
                        'foodwaste-frontend'
                    ]

                    def runningContainers = sh(
                        script: 'docker ps --filter status=running --format "{{.Names}}"',
                        returnStdout: true
                    ).trim()

                    expectedContainers.each { container ->
                        if (!runningContainers.contains(container)) {
                            error "Container ${container} is not running!"
                            // Fails the pipeline — sends alert
                        }
                    }
                }
            }
        }

        // ── Stage 5: Cleanup ─────────────────────────────
        stage('Cleanup') {
            steps {
                sh 'docker image prune -f'
                // Removes old/unused Docker images to free disk space
            }
        }
    }

    post {
        success { echo 'Deployment completed successfully!' }
        failure { echo 'Deployment failed! Check logs above.' }
    }
}
```

### Jenkins Setup Requirements

To use Jenkins for this project, you need:

1. **A server** (Linux VM, cloud instance, or local machine)
2. **Jenkins installed** on that server
3. **Docker installed** on that server (Jenkins runs `docker compose` commands)
4. **Jenkins plugins:** Git, Pipeline, Docker Pipeline
5. **Credentials configured:** GHCR username + token (to pull private images)
6. **Webhook or polling:** GitHub notifies Jenkins when CI completes

### CI/CD Together — The Full Flow

```
Developer pushes code to GitHub
        │
        ▼
GitHub Actions (CI) — runs on GitHub's servers
  ✓ Tests pass
  ✓ Docker images built
  ✓ Images pushed to GHCR
        │
        │  GitHub sends webhook to Jenkins
        ▼
Jenkins (CD) — runs on YOUR server
  1. docker compose pull   ← downloads new images from GHCR
  2. docker compose down   ← stops old containers
  3. docker compose up -d  ← starts new containers
  4. Verify all 6 running  ← health check
  5. docker image prune    ← cleanup
        │
        ▼
Application is live with the new code
```

---

## 10. JWT Authentication

### What is JWT?

JWT = **JSON Web Token**. It's a way to prove who you are without the server needing to store session data.

### Structure of a JWT

```
eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1dWlkLTEyMyIsImVtYWlsIjoiYUBiLmNvbSIsInJvbGUiOiJOR08ifQ.signature
│                   │ │                                                                          │ │         │
└── Header (Base64) ┘ └── Payload (Base64)                                                      ┘ └─ Signature ┘
```

Decoded payload:
```json
{
  "sub": "acee52b3-251b-4b19-8456-901310f4671e",  // user ID
  "email": "rest@test.com",
  "role": "RESTAURANT",
  "iat": 1716470400,   // issued at (Unix timestamp)
  "exp": 1716556800    // expires at (24 hours later)
}
```

### How JWT Works in This Project

```
1. LOGIN
   Browser → POST /api/auth/login { email, password }
   auth-service → verifies password with BCrypt
   auth-service → generates JWT signed with JWT_SECRET
   auth-service → returns { token: "eyJ..." }
   Browser → stores token in localStorage

2. AUTHENTICATED REQUEST
   Browser → GET /api/foods/my
             Authorization: Bearer eyJ...
   food-service → JwtFilter extracts token
   food-service → validates signature using JWT_SECRET
   food-service → reads userId and role from payload
   food-service → allows or denies the request

3. STATELESS — NO SESSION STORAGE
   The server does NOT store the token anywhere
   Every request is self-contained — the token carries all needed info
   Any service can validate the token independently (they all share JWT_SECRET)
```

### BCrypt Password Hashing

Passwords are NEVER stored as plaintext:

```
Registration:
  User sends: "mypassword123"
  BCrypt hashes it: "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"
  Database stores: the hash only

Login:
  User sends: "mypassword123"
  BCrypt.matches("mypassword123", storedHash) → true/false
  BCrypt is one-way — you cannot reverse the hash to get the password
```

### Role-Based Access Control

Each endpoint is protected by role:

```
POST /api/auth/register    → Public (no token needed)
POST /api/auth/login       → Public (no token needed)
POST /api/foods            → RESTAURANT role only
POST /api/claims           → NGO role only
GET  /api/admin/users      → ADMIN role only
GET  /api/foods            → Public (anyone can browse)
GET  /api/foods/my         → Any authenticated user
PUT  /api/claims/{id}      → NGO or RESTAURANT
```

If you send a RESTAURANT token to `POST /api/claims`, you get HTTP 403 Forbidden.

---

## 11. Nginx

### What is Nginx?

Nginx is a high-performance web server. In this project it serves the compiled React app.

### Why Nginx Instead of Just Node.js?

After `npm run build`, React is just static files (HTML, JS, CSS). You don't need Node.js to serve static files — Nginx is much faster and uses far less memory.

### The nginx.conf

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;   # Where the React build files are
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
        # This is the SPA trick:
        # If someone visits /restaurant/dashboard directly,
        # Nginx can't find that file — it returns index.html instead
        # React Router then handles the /restaurant/dashboard route
    }

    gzip on;   # Compress files before sending — faster page loads
}
```

### The SPA Routing Problem

Without the `try_files` trick:
```
User visits http://localhost:3000/foods/123
Nginx looks for a file at /usr/share/nginx/html/foods/123
File doesn't exist → 404 error
```

With `try_files $uri $uri/ /index.html`:
```
User visits http://localhost:3000/foods/123
Nginx can't find the file → serves index.html
React loads → React Router reads the URL → renders FoodDetail page
```

---

## 12. The Full Developer Workflow

### Day-to-Day Development

```
1. Make a code change (e.g. fix a bug in claim-service)

2. Test locally:
   cd claim-service
   mvn clean test

3. Run the full stack locally:
   docker compose up --build

4. Verify at http://localhost:3000

5. Commit and push:
   git add .
   git commit -m "fix: claim state machine validation"
   git push origin main

6. GitHub Actions automatically:
   - Runs all 4 test suites in parallel (~2 min)
   - Builds 5 Docker images (~5 min)
   - Pushes to GHCR
   - Validates docker-compose.yml

7. Jenkins automatically:
   - Pulls new images from GHCR
   - Restarts containers with new code
   - Verifies all 6 containers running
   - Cleans up old images

8. Application is live with your fix
```

### What Happens When a User Claims Food

```
NGO User (Browser)
    │  clicks "Claim" button
    │
    ▼
React (FoodListing.jsx)
    │  POST http://localhost:8083/api/claims
    │  Body: { foodPostId: "uuid", ngoName: "Green NGO" }
    │  Header: Authorization: Bearer eyJ...
    │
    ▼
claim-service (Spring Boot, port 8083)
    │  JwtFilter validates JWT → extracts ngoId, role=NGO
    │  ClaimService.createClaim()
    │    → calls food-service: GET /api/foods/{id} → checks status=AVAILABLE
    │    → saves Claim { status: PENDING, ngoId, ngoName }
    │    → calls notification-service: POST /api/notifications/internal
    │         { userId: restaurantId, message: "New claim...", type: CLAIM_PENDING }
    │  Returns: { id: "claim-uuid", status: "PENDING" }
    │
    ▼
React shows: "⏳ Pending" orange button

Restaurant User (Browser)
    │  sees claim in dashboard → clicks "Approve"
    │
    ▼
React (RestaurantDashboard.jsx)
    │  PUT http://localhost:8083/api/claims/{id}
    │  Body: { status: "APPROVED" }
    │
    ▼
claim-service
    │  validates PENDING → APPROVED transition (RESTAURANT role ✓)
    │  saves Claim { status: APPROVED }
    │  calls food-service: PUT /api/foods/{id}/status
    │       { status: "CLAIMED", claimedByName: "Green NGO" }
    │  calls notification-service: notify NGO "Your claim approved"
    │
    ▼
food-service updates food_post.status = CLAIMED, claimed_by_name = "Green NGO"

NGO refreshes FoodListing
    │  food.status = CLAIMED
    │  food.claimedByName = "Green NGO"
    ▼
React shows: ⬜ Gray "Claimed" button + "🤝 Claimed by Green NGO" banner
```

---

## 13. Dependency Map

### Who Depends on Whom

```
                    ┌─────────────────────────────────────────┐
                    │           food-network                   │
                    │                                          │
  Browser ──────►  frontend (Nginx)                           │
                    │  calls all 4 services via HTTP           │
                    │                                          │
                    ├── auth-service ──────────────────────────┤
                    │     depends on: postgres                 │
                    │                                          │
                    ├── food-service ──────────────────────────┤
                    │     depends on: postgres                 │
                    │     calls: notification-service          │
                    │                                          │
                    ├── claim-service ─────────────────────────┤
                    │     depends on: postgres                 │
                    │     calls: food-service                  │
                    │     calls: notification-service          │
                    │                                          │
                    ├── notification-service ──────────────────┤
                    │     depends on: postgres                 │
                    │     called by: food-service              │
                    │     called by: claim-service             │
                    │                                          │
                    └── postgres ──────────────────────────────┘
                          no dependencies (starts first)
```

### Technology Dependency Chain

```
React (browser)
  └── needs: Nginx to serve it
        └── needs: Docker to containerise it
              └── needs: Docker Compose to orchestrate it

Spring Boot (Java)
  └── needs: JVM (Java 17) to run
        └── needs: Maven to build the JAR
              └── needs: Docker to containerise it
                    └── needs: PostgreSQL to store data
                          └── needs: Docker volume to persist data

CI/CD
  └── GitHub Actions needs: GitHub repository + Docker Hub/GHCR
  └── Jenkins needs: Docker installed on the server
        └── needs: docker-compose.yml to deploy
```

---

## 14. Ports & URLs Reference

### When Running Locally (docker compose up)

| Service | URL | What You Can Do |
|---|---|---|
| Frontend | http://localhost:3000 | Open the web app in browser |
| auth-service | http://localhost:8081 | POST /api/auth/register, /login |
| food-service | http://localhost:8082 | GET /api/foods, POST /api/foods |
| claim-service | http://localhost:8083 | POST /api/claims, PUT /api/claims/{id} |
| notification-service | http://localhost:8084 | GET /api/notifications |
| PostgreSQL | localhost:5432 | Connect with any DB client (pgAdmin, DBeaver) |

### Environment Variables Reference

| Variable | Used By | Purpose |
|---|---|---|
| `POSTGRES_DB` | postgres, all Spring Boot | Database name |
| `POSTGRES_USER` | postgres, all Spring Boot | DB username |
| `POSTGRES_PASSWORD` | postgres, all Spring Boot | DB password |
| `JWT_SECRET` | all Spring Boot services | Signs and validates JWT tokens |
| `JWT_EXPIRATION` | auth-service | Token lifetime in milliseconds (86400000 = 24h) |
| `FOOD_SERVICE_URL` | claim-service | `http://food-service:8082` |
| `NOTIFICATION_SERVICE_URL` | food-service, claim-service | `http://notification-service:8084` |
| `SPRING_DATASOURCE_URL` | all Spring Boot | JDBC connection string |

### Quick Start Commands

```bash
# Clone and run
git clone https://github.com/Antriksh55/Food_waste_Management.git
cd Food_waste_Management
cp .env.example .env
docker compose up --build

# Stop everything
docker compose down

# Stop and delete all data (fresh start)
docker compose down -v

# View logs
docker logs foodwaste-auth -f
docker logs foodwaste-food -f

# Connect to database
docker exec -it foodwaste-postgres psql -U postgres -d foodwaste
```

---

*This documentation covers every tool in the Food Waste Reduction Platform stack — how each one works, why it was chosen, where it runs, and how they all connect together.*
