# ⚡ OutageLab — Interactive Production Incident Simulator

**OutageLab** is a gamified, hands-on production incident simulator designed for Site Reliability Engineers (SREs), DevOps practitioners, and software engineers. Players assume the role of an on-call engineer tasked with diagnosing, troubleshooting, and recovering a multi-tier microservices online store experiencing real-time failures.

---

## 🚀 Key Features

- **6 Connected Microservices**:
  - `API Gateway` — Ingress routing, latency monitoring, circuit breakers.
  - `Authentication Service` — JWT token generation & user session management.
  - `Product Service` — Catalog browsing & inventory queries.
  - `Inventory Service` — Stock availability & reservations.
  - `Payment Service` — Checkout transaction processing.
  - `Database` — Shared persistence cluster with connection pool limits.

- **Deterministic Simulation Engine**:
  - Realistic failure scenarios with cascading degradations.
  - Action-driven recovery mechanisms (Rollback, Restart, Scale, Pool Reset, Isolation).
  - Scoring model factoring in Mean Time to Resolution (MTTR), penalty deduction for ineffective actions, and recovery verification.

- **Real-Time War Room HUD**:
  - **Topology Matrix**: Live status indicators (`healthy`, `degraded`, `failing`), latency p95, error rates %, and throughput.
  - **Telemetry Dashboard**: High-fidelity metric charts powered by Recharts with rolling 5-minute time series.
  - **Diagnostic Terminal**: Searchable, filterable log stream with severity badges (`CRITICAL`, `ERROR`, `WARN`, `INFO`).
  - **Runbook Remediation Center**: Interactive mitigation actions with instant feedback and audit logs.
  - **SRE Field Guide**: In-dashboard architectural hints and triaging workflows.

- **Automated Postmortem Reports**:
  - Incident executive summary.
  - Root Cause Analysis (RCA).
  - Remediation verification breakdown.
  - Key architectural lessons learned.
  - Operator rating grades (S / A / B / C / F).
  - One-click Markdown export.

---

## 🛠️ Architecture & Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, React Router 6, Recharts, Lucide Icons, Custom Ops CSS System |
| **Backend** | Node.js, Express, REST APIs, Deterministic Simulation Engine |
| **Database** | MongoDB Atlas / MongoDB 6+ (Mongoose ODM) |
| **Testing** | Jest, Supertest, E2E browser automation |

---

## 🏃 Getting Started

### 1. Prerequisites
- **Node.js** (v18 or higher)
- **npm** (v9 or higher)
- **MongoDB** (A local MongoDB instance or a free MongoDB Atlas cluster URI)

---

### 2. Installation

Clone the repository and install dependencies for both services:

```bash
# Clone the repository
git clone https://github.com/your-username/outagelab.git
cd outagelab

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Return to root directory
cd ..
```

---

### 3. Environment Configuration

Create a `.env` file in the `backend/` directory using the provided template:

```bash
cp backend/.env.example backend/.env
```

#### Required Environment Variable Names

##### Backend (`backend/.env`):
| Variable Name | Description | Example / Default |
|---|---|---|
| `PORT` | Backend server port | `5000` |
| `MONGODB_URI` | MongoDB connection string (Atlas or local) | `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/outagelab?retryWrites=true&w=majority` |
| `JWT_SECRET` | Secret key used for signing session JWTs | *A long, randomly generated secret string* |
| `NODE_ENV` | Application runtime environment | `development` |
| `FRONTEND_URL` | Allowed origin for CORS | `http://localhost:5173` |

> ⚠️ **Security Notice:** Never commit actual `.env` files or credentials to Git. Both `backend/.env` and `frontend/.env` are ignored by `.gitignore`.

##### Frontend (`frontend/.env`, Optional):
| Variable Name | Description | Default |
|---|---|---|
| `VITE_API_URL` | Base URL of backend API in production | `http://localhost:5000` (defaults to `/api` proxy in dev) |

---

### 4. Database Seeding

Populate the database with the built-in incident scenario definitions and learning objectives:

```bash
# From repository root
npm run seed

# Or directly from backend
cd backend && npm run seed
```

---

### 5. Running the Application

Open two terminal sessions (or run using root workspace scripts):

#### Terminal 1 — Backend API
```bash
npm run dev:backend
# API will start on http://localhost:5000
```

#### Terminal 2 — Frontend Operations Console
```bash
npm run dev:frontend
# Console will be accessible at http://localhost:5173
```

---

### 6. Running Tests & Building

#### Run Backend API Tests:
```bash
cd backend
npm test
```

#### Build Frontend Production Bundle:
```bash
cd frontend
npm run build
```

---

## 🌐 Production Deployment Guide

OutageLab is architected for seamless multi-cloud zero-cost tier deployment:
- **Backend API**: [Render](https://render.com) (Web Service)
- **Frontend SPA**: [Vercel](https://vercel.com) (Static / SPA)
- **Database**: [MongoDB Atlas](https://www.mongodb.com/atlas) (M0 Free Tier)

### 1. MongoDB Atlas Setup
1. Create a free M0 cluster in your preferred region.
2. In **Database Access**, create a database user with `readWrite` permissions on the `outagelab` database.
3. In **Network Access**, click **Add IP Address** and add `0.0.0.0/0` (Allow access from anywhere). This is required because Render spins up services with dynamic outbound IPs.
4. Obtain the connection string in the format:
   `mongodb+srv://<username>:<password>@<cluster>.mongodb.net/outagelab?retryWrites=true&w=majority`

### 2. Backend Deployment (Render)
1. Sign in to [Render](https://dashboard.render.com/) and click **New +** -> **Web Service**.
2. Connect your GitHub repository (`Atharva2710/OutageLab`).
3. Configure service settings:
   - **Name**: `outagelab-backend`
   - **Region**: Choose the region closest to your MongoDB Atlas cluster.
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Set Environment Variables:
   - `NODE_ENV`: `production`
   - `PORT`: `5000` (or leave default, Render injects `PORT`)
   - `MONGODB_URI`: `<Your MongoDB Atlas connection string>`
   - `JWT_SECRET`: `<A cryptographically secure random 64-character secret string>`
   - `FRONTEND_URL`: Leave empty initially or set to your planned Vercel URL (e.g., `https://outagelab.vercel.app`). Update this once Vercel finishes deploying.
5. In **Advanced Settings**, configure Health Check Path:
   - **Health Check Path**: `/api/health`
6. Click **Create Web Service**. Note the assigned URL (e.g., `https://outagelab-backend.onrender.com`).

### 3. Database Seeding (Post-Deploy)
To seed initial scenarios into MongoDB Atlas:
- Safely run the seed script locally once pointing to Atlas:
  ```bash
  cd backend && npm run seed
  ```
  *(The seed script is idempotent; it upserts scenarios by `scenarioId` and does NOT drop collections or delete user runs).*

### 4. Frontend Deployment (Vercel)
1. Sign in to [Vercel](https://vercel.com/) and click **Add New...** -> **Project**.
2. Import the GitHub repository (`Atharva2710/OutageLab`).
3. Configure project settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click Edit and select `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Set Environment Variables:
   - `VITE_API_URL`: `https://your-backend-name.onrender.com` (Backend URL from Render without trailing slash)
5. Click **Deploy**. Note the assigned Vercel URL (e.g., `https://outagelab.vercel.app`).

### 5. Final CORS Handshake
1. Return to the Render dashboard for `outagelab-backend`.
2. Update the `FRONTEND_URL` environment variable to the exact Vercel URL (e.g., `https://outagelab.vercel.app`).
3. Trigger a redeploy (or wait for automatic restart) so CORS and authentication cookies are accepted.

---

## 🎮 Incident Scenarios Catalog

1. **Bad Deployment (`SEV-3` · Moderate Incident)**:
   - *Symptom:* `product-service` (v2.3.1) crash-loops with an unhandled `NullReferenceException`, triggering circuit breakers on the API Gateway.
   - *Resolution:* Roll back deployment to stable version `v2.3.0`.

2. **Database Connection Pool Exhaustion (`SEV-2` · High Severity)**:
   - *Symptom:* A configuration drift disabled connection timeouts, causing a pool leak that exhausted all 500 handles.
   - *Resolution:* Reset database pool and patch connection timeout parameters.

3. **Traffic Surge Flash Sale (`SEV-1` · Critical Outage)**:
   - *Symptom:* An unannounced flash sale drove an 8x traffic spike, saturating queues and dropping ingress packets.
   - *Resolution:* Horizontally scale out service capacity across all replicas to absorb demand.

---

## 📄 License

MIT License. Designed and built for engineering portfolio demonstration and SRE on-call training.
