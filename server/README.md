# Server (Express API)

Backend for the shoe e-commerce app: **Express 5**, **MongoDB (Mongoose)**, **Socket.IO**, file uploads, payments, email, and optional integration with the RL recommendation service.

## Prerequisites

- **Node.js** 18+ (20 LTS recommended)
- **npm**
- **MongoDB** reachable at the connection string you put in `CONNECT_DB` (local example: `mongodb://localhost:27017/shoe`)

Install and start MongoDB before starting the API, or the app will fail to connect to the database.

## Environment variables

Create `server/.env` in this folder. Do **not** commit real secrets to git.

### Required for a minimal local run

| Variable        | Description                                                                                                                  | Example                          |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `CONNECT_DB`    | MongoDB connection URI                                                                                                       | `mongodb://localhost:27017/shoe` |
| `URL_CLIENT`    | Frontend origin (used for **CORS** and **Socket.IO**). Must match the URL you open in the browser.                           | `http://localhost:5173`          |
| `SECRET_CRYPTO` | Secret for JWT and AES helpers; **must match** `VITE_SECRET_CRYPTO` in `client/.env` if the client uses the same crypto flow | A long random string             |

### Optional / feature-specific

| Variable         | Description                                                           |
| ---------------- | --------------------------------------------------------------------- |
| `GROQ_API_KEY`   | Groq API for chatbot features (`src/utils/chatbot.js`)                |
| `EMAIL_USER`     | Gmail (or SMTP user) for sending mail                                 |
| `CLIENT_ID`      | Google OAuth client ID (email flows)                                  |
| `CLIENT_SECRET`  | Google OAuth client secret                                            |
| `REDIRECT_URI`   | OAuth redirect URI                                                    |
| `REFRESH_TOKEN`  | OAuth refresh token for sending mail via Gmail API                    |
| `RL_SERVICE_URL` | RL recommendation service (default if unset: `http://localhost:5001`) |
| `NODE_ENV`       | Set to `production` in production deployments                         |

Payment, Cloudinary, and other providers may need extra variables depending on which features you use—check the relevant controllers and services if something fails at runtime.

## Install dependencies

From this directory:

```bash
cd server
npm install
```

## Run the API (development)

Uses **nodemon** to restart on file changes:

```bash
npm run dev
```

The HTTP server listens on **port 3000** (see `src/server.js`). You should see a log like:

```text
Example app listening on port 3000
MongoDB connected
```

### Production-style run (no nodemon)

There is no `start` script in `package.json` by default. For production you typically use:

```bash
node src/server.js
```

(or add a `"start": "node src/server.js"` script). Ensure `NODE_ENV=production` and a process manager (PM2, systemd, etc.) as needed.

## API + client together from repo root

From the repository root:

```bash
npm install
npm start
```

This runs **server** and **client** in parallel.

## Ports and URLs (local dev)

| Service     | Default URL             |
| ----------- | ----------------------- |
| This API    | `http://localhost:3000` |
| Vite client | `http://localhost:5173` |

Point the client’s `VITE_API_URL` at `http://localhost:3000`. Set `URL_CLIENT` to the exact frontend origin (including port).

## Socket.IO

Realtime features use the same HTTP server as Express. The Socket.IO server allows the origin from `URL_CLIENT`. If realtime fails, verify `URL_CLIENT` matches how you open the site.

## Optional: RL recommendation service

Some admin/recommendation features call the Python **rl-service** (`../rl-service`). Set `RL_SERVICE_URL` if it runs on a non-default host or port. If you do not run that service, only those features will be affected; the rest of the API can still run.

## Troubleshooting

1. **`Failed to connect to MongoDB`** — Start MongoDB, check `CONNECT_DB`, firewall, and that the database name/URI is correct.
2. **CORS errors from the browser** — `URL_CLIENT` must exactly equal the frontend origin (e.g. `http://127.0.0.1:5173` vs `http://localhost:5173` are different origins).
3. **Auth / crypto mismatches** — Align `SECRET_CRYPTO` (server) with `VITE_SECRET_CRYPTO` (client) where those flows are shared.
4. **Port 3000 in use** — Change `port` in `src/server.js` or free the port; then update `VITE_API_URL` in the client accordingly.

## Project layout (high level)

- `src/server.js` — App entry, HTTP server, CORS, routes wiring
- `src/config/` — Database connection
- `src/routes/` — Route definitions
- `src/controller/`, `src/services/` — Business logic
- `src/socket.js` — Socket.IO setup
