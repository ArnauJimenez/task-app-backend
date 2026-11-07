# 🚀 Task Management API (Backend)

A robust and secure RESTful API for task management, built with **Node.js**, **TypeScript**, and **Express**. The system features JWT-based authentication, strict input data validation at the entry point, and persistence using a fully dockerized PostgreSQL database.

## 🛠️ Tech Stack

* **Runtime & Language:** Node.js, TypeScript (v5.4)
* **Web Framework:** Express.js
* **ORM:** Prisma v5 (PostgreSQL)
* **Infrastructure:** Docker & Docker Compose
* **Security & Validation:** JWT (JsonWebToken), Bcrypt, Zod, Helmet, CORS
* **Testing:** Vitest, Supertest

---

## 📐 Project Architecture

The backend follows a **Layered Architecture** pattern to ensure separation of concerns, high maintainability, and clean code principles:

* 📁 **Routes:** Defines the API endpoints and maps the corresponding security and validation middlewares.
* 📁 **Middlewares:** Intercepts incoming requests to handle JWT Authentication and the Zod data validation shield.
* 📁 **Controllers:** Handles the HTTP layer, processes client requests, and formats standard API responses.
* 📁 **Services:** Contains the core business logic, encapsulating database operations away from the controllers.
* 📁 **Schemas:** Defines Zod schemas for runtime type safety and strict request body validation.

---

## ⚡ Quick Start & Installation

### 1. Clone the Repository & Install Dependencies
```bash
git clone [https://github.com/your-username/your-repository.git](https://github.com/your-username/your-repository.git)
cd your-repository/backend
npm install

2. Environment Variables
Create a .env file in the root of the backend directory based on the provided .env.example template and populate it with your local credentials.

3. Spin Up Infrastructure (Docker & Database)
The project includes pre-configured automation scripts to launch the PostgreSQL database without requiring any local installation:

Bash
# Start the database container in detached mode
npm run docker:up

# Run Prisma migrations to initialize database tables
npm run prisma:migrate
4. Run the Application
Bash
# Start the development server with hot-reloading
npm run dev
🧰 Available Scripts
npm run dev: Starts the local development server with hot-reloading via ts-node-dev.

npm run docker:up / npm run docker:down: Manages the lifecycle of the Docker infrastructure.

npm run prisma:migrate: Applies outstanding database migrations using Prisma.

npm run prisma:studio: Launches a visual GUI at localhost:5555 to explore and manage database records.

npm run test: Executes the complete unit and integration test suite with Vitest.

## Real-time chat

The authenticated dashboard includes private direct messages, email-based user search, typing indicators, and a per-user TaskBot conversation. Messages are persisted in PostgreSQL and delivered through Socket.IO. Messages sent to TaskBot are also sent to Google Gemini.

1. Add `FRONTEND_URL`, `GEMINI_API_KEY`, and `GEMINI_MODEL` from `backend/src/.env.example` to the backend environment. Set `FRONTEND_URL` to the deployed frontend origin; the Gemini key is only needed to enable the bot.
2. Set `VITE_API_URL` in the frontend build environment to the backend's public origin.
3. Apply the Prisma schema to the PostgreSQL database with `npx prisma db push` from `backend`. The checked-in migration history was created for SQLite, while the current schema uses PostgreSQL; do not run `prisma migrate deploy` against PostgreSQL until that migration history has been baselined.
4. Run `npm run dev` in `backend` and `frontend` for local development. For deployment, run the backend as a persistent Node.js service (`npm run build`, then `npm start`); Vercel serverless functions do not provide the persistent Socket.IO server this feature requires.

The bot sends its conversation history to Google Gemini. Do not send sensitive information in that conversation.

## Backend logging

The Express API uses Pino and `pino-http` for structured request and application logs. In development and tests, logs are formatted with `pino-pretty`; in production they are emitted as JSON. Set `LOG_LEVEL` to override the default log level (`debug` outside production, `info` in production). Authorization, cookie, and set-cookie headers are redacted.

Set `SENTRY_DSN` to enable backend error reporting. The `/debug-sentry` test route is available outside production; set `SENTRY_DEBUG_ROUTE_ENABLED=true` only when intentionally testing error reporting in a protected production environment.

## GitHub Actions CI

The `CI` workflow runs on pushes and pull requests targeting `main` or `master`. Configure the repository secrets `DATABASE_URL` and `JWT_SECRET` before running it. `DATABASE_URL` must point to a dedicated, disposable CI database: CI synchronizes the Prisma schema and the E2E test creates a user there. Never use a production database URL.