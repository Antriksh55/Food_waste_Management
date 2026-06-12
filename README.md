# 🌱 Food Waste Reduction Platform

A production-ready full-stack microservices web application that connects food donors (restaurants, bakeries, grocery stores) with recipients (NGOs, volunteers, individuals in need).

## Architecture

```
Browser
  │
  └── Frontend (React + Nginx) :3000
        │
        ├── auth-service        :8081  (JWT auth, user management)
        ├── food-service        :8082  (food posts, search, expiry)
        ├── claim-service       :8083  (claim lifecycle state machine)
        └── notification-service:8084  (notifications, log simulation)
              │
              └── PostgreSQL    :5432  (shared database)
```

All services run on an internal Docker network (`food-network`).

## Tech Stack

| Layer       | Technology                              |
|-------------|------------------------------------------|
| Frontend    | React 18, Vite, Tailwind CSS, Axios      |
| Backend     | Java 17, Spring Boot 3.2, Spring Security|
| Auth        | JWT (jjwt 0.11.5), BCrypt               |
| Database    | PostgreSQL 15                            |
| DevOps      | Docker, Docker Compose                   |
| CI          | GitHub Actions                           |
| CD          | Jenkins                                  |

## Quick Start

### Prerequisites
- Docker Desktop
- Docker Compose v2

### Run with Docker Compose

```bash
# Clone the repository
git clone https://github.com/Antriksh55/Food_waste_Management.git
cd Food_waste_Management

# Copy environment file
cp .env.example .env

# Build and start all services
docker-compose up --build
```

Services will be available at:
- Frontend: http://localhost:3000
- Auth Service: http://localhost:8081
- Food Service: http://localhost:8082
- Claim Service: http://localhost:8083
- Notification Service: http://localhost:8084

## User Roles

| Role       | Capabilities                                              |
|------------|-----------------------------------------------------------|
| RESTAURANT | Create/manage food posts, approve/cancel claims           |
| NGO        | Browse food, claim donations, confirm pickups             |
| ADMIN      | View all users, deactivate accounts                       |

## API Reference

### Auth Service (port 8081)
| Method | Endpoint                  | Auth    | Description           |
|--------|---------------------------|---------|-----------------------|
| POST   | /api/auth/register        | Public  | Register new user     |
| POST   | /api/auth/login           | Public  | Login, returns JWT    |
| GET    | /api/admin/users          | ADMIN   | List all users        |
| DELETE | /api/admin/users/{id}     | ADMIN   | Deactivate user       |

### Food Service (port 8082)
| Method | Endpoint                  | Auth       | Description           |
|--------|---------------------------|------------|-----------------------|
| GET    | /api/foods                | Public     | List available food   |
| GET    | /api/foods/search         | Public     | Search with filters   |
| GET    | /api/foods/{id}           | Public     | Get food post         |
| POST   | /api/foods                | RESTAURANT | Create food post      |
| PUT    | /api/foods/{id}           | RESTAURANT | Update food post      |
| DELETE | /api/foods/{id}           | RESTAURANT | Delete food post      |

### Claim Service (port 8083)
| Method | Endpoint                  | Auth           | Description           |
|--------|---------------------------|----------------|-----------------------|
| POST   | /api/claims               | NGO            | Create claim          |
| GET    | /api/claims               | NGO/RESTAURANT | List claims           |
| PUT    | /api/claims/{id}          | NGO/RESTAURANT | Update claim status   |

### Notification Service (port 8084)
| Method | Endpoint                        | Auth      | Description              |
|--------|---------------------------------|-----------|--------------------------|
| GET    | /api/notifications              | Any auth  | Get user notifications   |
| POST   | /api/notifications/internal     | Internal  | Create notification      |

## Claim State Machine

```
PENDING → APPROVED   (RESTAURANT)
PENDING → CANCELLED  (RESTAURANT or NGO)
APPROVED → PICKED_UP (NGO)
APPROVED → CANCELLED (RESTAURANT or NGO)
```

## Environment Variables

| Variable                  | Default                                          | Description              |
|---------------------------|--------------------------------------------------|--------------------------|
| POSTGRES_DB               | foodwaste                                        | Database name            |
| POSTGRES_USER             | postgres                                         | Database user            |
| POSTGRES_PASSWORD         | postgres                                         | Database password        |
| JWT_SECRET                | mySecretKeyForFoodWastePlatformThatIsLongEnough  | JWT signing secret       |
| JWT_EXPIRATION            | 86400000                                         | Token TTL (ms)           |

## CI/CD Pipeline

### GitHub Actions (CI)
File: `.github/workflows/ci.yml`

1. Runs `mvn clean test` for all 4 Spring Boot services in parallel
2. Builds and pushes Docker images to GHCR on success
3. Validates `docker-compose.yml`

Trigger: push and pull_request to `main`

### Jenkins (CD)
File: `Jenkinsfile`

Stages:
1. **Pull Images** — `docker compose pull`
2. **Stop Containers** — `docker compose down`
3. **Deploy** — `docker compose up -d`
4. **Verify** — checks all 6 containers are running
5. **Cleanup** — `docker image prune -f`

## Database Schema

```sql
users        (id, name, email, password, role, city, active, created_at)
food_posts   (id, restaurant_id, title, food_type, quantity, expiry_time,
              pickup_address, image_url, contact_details, status, created_at)
claims       (id, food_post_id, ngo_id, status, claimed_at)
notifications(id, user_id, message, type, created_at)
```

## Project Structure

```
food-waste-platform/
├── auth-service/          # Spring Boot — JWT auth, user management
├── food-service/          # Spring Boot — food posts, search, expiry scheduler
├── claim-service/         # Spring Boot — claim state machine
├── notification-service/  # Spring Boot — notifications
├── frontend/              # React + Tailwind CSS SPA
├── db/
│   └── init.sql           # PostgreSQL schema
├── docker-compose.yml
├── Jenkinsfile
├── .env.example
└── .github/
    └── workflows/
        └── ci.yml
```

## Screenshots

> Add screenshots of the running application here.

- Home page
- Food listing with search filters
- Restaurant dashboard
- NGO dashboard
- Admin dashboard

<!-- CI demo trigger -->

<!-- CI trigger 2026-06-12 09:57 -->
