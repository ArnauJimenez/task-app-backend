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