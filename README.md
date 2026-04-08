# 💳 DragBizz Subscription Service

The **DragBizz Subscription Service** is a dedicated microservice responsible for managing membership plans, user subscriptions, checkout processes, and payment webhooks for the DragBizz platform.

---

## ✨ Key Features

- **Plan Management:** Define and manage various subscription plans (e.g., Free, Pro, Enterprise).
- **Subscription Lifecycle:** Handle user subscription creation, upgrades, and renewals.
- **Checkout Integration:** Integrated with payment gateways (e.g., Razorpay) for secure transactions.
- **Secure Authentication:** Uses JWKS (JSON Web Key Sets) from the Auth service for robust JWT verification.
- **Webhooks:** Automated processing of payment and subscription events via webhooks.
- **Health Monitoring:** Built-in health check endpoints for microservices orchestration.

---

## 🛠️ Tech Stack

- **Backend:** Node.js (Express.js)
- **Database:** MongoDB (Mongoose ODM)
- **Payment Gateway:** Razorpay
- **Security:** Jose (JWT/JWKS)
- **Communication:** gRPC & REST
- **Documentation:** Swagger (OpenAPI)
- **Containerization:** Docker & Docker Compose

---

## 📁 Project Structure

```text
dragbizz-subscription/
├── src/
│   ├── api/            # REST and gRPC interfaces
│   ├── controllers/    # Business logic handlers
│   ├── models/         # Database schemas
│   ├── services/       # Core domain services
│   └── utils/          # Shared utilities and helpers
├── proto/              # gRPC Protobuf definitions
└── docker-compose.*.yml # Orchestration configs
```

---

## 🚀 Getting Started

To set up the project locally, please refer to the detailed setup guide:

👉 **[SETUP.MD](./SETUP.md)**

---

## 📄 License

MIT License - see LICENSE file for details.

---

**Powered by DragBizz** 🚀 | **Secure Payments** 💳 | **Scalable** ⚡
