-- DROP TABLE IF EXISTS reservations;
-- DROP TABLE IF EXISTS tickets;

CREATE TABLE IF NOT EXISTS reservations
(
    id text NOT NULL,
    "email" text NOT NULL,
    "matchNumber" integer NOT NULL,
    "category" integer NOT NULL,
    "quantity" integer NOT NULL,
    "price" integer NOT NULL,
    CONSTRAINT reservations_pkey PRIMARY KEY (id)
)

CREATE TABLE IF NOT EXISTS tickets
(
    id text NOT NULL,
    "matchNumber" integer NOT NULL,
    "roundNumber" integer NOT NULL,
    "dateUtc" date NOT NULL,
    "location" text NOT NULL,
    "category_1_available" integer NOT NULL,
    "category_1_pending" integer NOT NULL,
    "category_1_price" integer NOT NULL,
    "category_2_available" integer NOT NULL,
    "category_2_pending" integer NOT NULL,
    "category_2_price" integer NOT NULL,
    "category_3_available" integer NOT NULL,
    "category_3_pending" integer NOT NULL,
    "category_3_price" integer NOT NULL,
    "homeTeam" text NOT NULL,
    "awayTeam" text NOT NULL,
    "group" text NOT NULL,
    CONSTRAINT tickets_pkey PRIMARY KEY (id)
)
