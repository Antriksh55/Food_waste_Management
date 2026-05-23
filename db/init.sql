-- Food Waste Reduction Platform — Database Initialisation
-- This runs on first postgres startup to ensure schema exists

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) NOT NULL,
    email       VARCHAR(255) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    role        VARCHAR(20)  NOT NULL CHECK (role IN ('RESTAURANT','NGO','ADMIN')),
    city        VARCHAR(100) NOT NULL,
    active      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS food_posts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id   UUID         NOT NULL REFERENCES users(id),
    title           VARCHAR(255) NOT NULL,
    food_type       VARCHAR(100) NOT NULL,
    quantity        INTEGER      NOT NULL CHECK (quantity > 0),
    expiry_time     TIMESTAMP    NOT NULL,
    pickup_address  VARCHAR(500) NOT NULL,
    image_url       VARCHAR(500),
    contact_details VARCHAR(255),
    status          VARCHAR(20)  NOT NULL DEFAULT 'AVAILABLE'
                        CHECK (status IN ('AVAILABLE','CLAIMED','EXPIRED')),
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS claims (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    food_post_id UUID        NOT NULL REFERENCES food_posts(id),
    ngo_id       UUID        NOT NULL REFERENCES users(id),
    status       VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                     CHECK (status IN ('PENDING','APPROVED','PICKED_UP','CANCELLED')),
    claimed_at   TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID         NOT NULL REFERENCES users(id),
    message    TEXT         NOT NULL,
    type       VARCHAR(50)  NOT NULL,
    created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);
