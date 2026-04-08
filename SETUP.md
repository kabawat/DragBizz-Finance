# 🛠️ Setup Instructions - DragBizz Subscription Service

This document provides instructions to set up and run the DragBizz Subscription Service.

---

## 📦 Prerequisites

- **Node.js** (v18+)
- **Docker** & **Docker Compose**
- **Yarn** package manager

---

## ⚙️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd dragbizz-subscription
   ```

2. **Install dependencies**
   ```bash
   yarn install
   ```

3. **Configure Environment Variables**
   Copy the example environment file and update the values.
   ```bash
   cp env.example .env
   ```

---

## 🚀 Running the Application

### Using Docker (Recommended)
```bash
# Start the development environment
yarn dev:start

# View logs
yarn dev:logs

# Stop services
yarn dev:stop
```

### Running Locally
If you have MongoDB and Redis accessible:
1. **Dev mode:** `yarn dev`
2. **Prod mode:** `yarn start`

---

## 🌱 Seeding Data
To seed initial packages or test plans:
```bash
yarn dev:package
```

---

## 📊 Logging & Debugging
- **All Services Logs:** `yarn dev:logs`
- **App Only Logs:** `yarn dev:log`
- **Health Check:** `yarn health:check` (Available at http://localhost:4002/health)

---

## 🔧 Troubleshooting
- **Port Conflict:** The service runs on port **4002** by default. Ensure it's available.
- **JWT Verification:** This service uses JWKS from the Auth service. Ensure the Auth service is running and accessible.
- **Docker Cleanup:** Run `yarn dev:clean` to remove volumes and start fresh.

---

## 🌐 Endpoints
- **Service:** http://localhost:4002
- **Documentation:** http://localhost:4002/docs
- **Health:** http://localhost:4002/health
