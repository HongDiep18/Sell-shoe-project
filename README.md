# Sell Shoe — Full-stack e-commerce

Monorepo for a shoe retail platform: **React** storefront and admin UI, **Node.js** API with **MongoDB**, optional **reinforcement-learning** microservice for product recommendations, and sample **database** JSON you can import for local development.

### Contributors

- Nguyễn Thị Hồng Điệp (Sophia Nguyen)
- HongDiep09

---

## What’s in this repo

| Path                         | Role                                                                                                            |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------- |
| [`client/`](client/)         | SPA: React 18, Vite, Tailwind, Ant Design — catalog, cart, checkout, blog, admin dashboards                     |
| [`server/`](server/)         | REST API: Express, Mongoose, Socket.IO, auth, payments, uploads, email, chatbot hooks                           |
| [`rl-service/`](rl-service/) | Optional Node + TensorFlow.js service (PPO) for ML recommendations; consumed by the API for some admin features |
| [`database/`](database/)     | Example `shoe.categories.json` / `shoe.products.json` for seeding MongoDB                                       |

Detailed setup for the web app lives in **[`client/README.md`](client/README.md)** and **[`server/README.md`](server/README.md)**. The RL stack is documented in **[`rl-service/README.md`](rl-service/README.md)**.

---

## Tech stack (overview)

- **Frontend:** React, Vite, React Router, Axios, Socket.IO client, Google OAuth, charts & rich text as needed
- **Backend:** Express 5, MongoDB (Mongoose), JWT/cookies, Cloudinary-friendly uploads, VNPay, Nodemailer, Groq (chatbot)
- **Realtime:** Socket.IO (aligned with `URL_CLIENT` on the server)
- **Optional ML:** `rl-service` — Express API + TF.js; default URL `http://localhost:5001` unless `RL_SERVICE_URL` overrides it on the server

---

## Prerequisites

- **Node.js** 18+ (20 LTS recommended) and **npm**
- **MongoDB** running and reachable (local URI example: `mongodb://localhost:27017/shoe`)
- For **Google login** and **email**: configure OAuth and SMTP-related variables (see server/client READMEs)
- For **recommendations UI**: run **`rl-service`** and point the server at it via `RL_SERVICE_URL`

---

## Quick start (frontend + backend)

From the **repository root**:

```bash
npm install
npm start
```

This uses **concurrently** to run:

1. **`server`** — `cd server && npm install && npm run dev` (API on **port 3000**)
2. **`client`** — `cd client && npm install && npm run dev` (Vite on **port 5173** by default)

Then open the URL Vite prints (typically **http://localhost:5173**).

### Configure environment first

- **`server/.env`** — at minimum: `CONNECT_DB`, `URL_CLIENT` (must match the browser origin, e.g. `http://localhost:5173`), `SECRET_CRYPTO`
- **`client/.env`** — at minimum: `VITE_API_URL=http://localhost:3000`, and **`VITE_SECRET_CRYPTO`** must match **`SECRET_CRYPTO`** where those flows are shared

Full variable lists and troubleshooting: [`server/README.md`](server/README.md), [`client/README.md`](client/README.md).

### Run services separately (optional)

```bash
# Terminal 1 — API
cd server && npm install && npm run dev

# Terminal 2 — UI
cd client && npm install && npm run dev
```

### Optional: RL service

```bash
cd rl-service
npm install
# configure rl-service/.env per rl-service/README.md
npm start   # or npm run dev
```

Ensure the main API’s `RL_SERVICE_URL` matches where `rl-service` listens.

---

## Default ports (local dev)

| Service           | Port     | Notes                                         |
| ----------------- | -------- | --------------------------------------------- |
| API (`server`)    | **3000** | `src/server.js`                               |
| Web (`client`)    | **5173** | Vite default; use that origin in `URL_CLIENT` |
| RL (`rl-service`) | **5001** | Default in code unless changed                |

---

## Optional: seed sample data

The [`database/`](database/) folder contains JSON you can import into MongoDB (collection names should match your app’s models). Example with `mongoimport` (adjust DB name and collection names to your schema):

```bash
mongoimport --uri="mongodb://localhost:27017/shoe" --collection=categories --file=database/shoe.categories.json --jsonArray
mongoimport --uri="mongodb://localhost:27017/shoe" --collection=products --file=database/shoe.products.json --jsonArray
```

If your collections use different names, change `--collection` accordingly.

---

## Repository scripts (root `package.json`)

| Script           | Behavior                                                 |
| ---------------- | -------------------------------------------------------- |
| `npm start`      | Runs **client** and **server** dev processes in parallel |
| `npm run server` | Server only (install + `npm run dev` in `server/`)       |
| `npm run client` | Client only (install + `npm run dev` in `client/`)       |

---

## Documentation map

- [Client — install, env, scripts](client/README.md)
- [Server — MongoDB, env, API dev, CORS, Socket.IO](server/README.md)
- [RL service — training, API, architecture](rl-service/README.md)

---

## License

Refer to per-package `license` fields in each `package.json` if you need SPDX details for distribution.
