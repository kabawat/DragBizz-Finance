# 💳 DragBizz Finance Service

The **DragBizz Finance Service** creates payment orders, verifies gateway transactions, and handles payment webhooks. DragBizz-Core owns the package catalog and subscriptions; Finance reads package pricing from Core and notifies Core after a payment succeeds.

---

## ✨ Key Features

- **Payment Processing:** Create and verify orders with supported payment gateways.
- **Core Integration:** Requests package data and reports successful payments to Core over gRPC.
- **Payment Webhooks:** Process signed provider callbacks.
- **Secure Authentication:** Uses JWKS (JSON Web Key Sets) from the Auth service for robust JWT verification.
- **Webhooks:** Automated processing of payment provider callbacks.
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
dragbizz-finance/
├── src/
│   ├── controllers/    # Payment and billing endpoints
│   ├── models/         # Payment and audit schemas
│   ├── services/       # Payment, gateway, and Core client logic
│   └── utils/          # Shared utilities and helpers
├── proto/              # Core gRPC client definitions
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
