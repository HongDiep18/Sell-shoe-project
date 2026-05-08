# Client (React + Vite)

Frontend for the shoe e-commerce app. Built with **React 18**, **Vite 7**, **Tailwind CSS**, and **Ant Design**.

## Prerequisites

- **Node.js** 18+ (20 LTS recommended)
- **npm** (comes with Node)
- **Backend API** running (see `../server/README.md`). Default dev URL: `http://localhost:3000`

## Environment variables

Create a `.env` file in this folder (`client/.env`). Vite only exposes variables prefixed with `VITE_`.

| Variable             | Description                                                                              | Example (local dev)             |
| -------------------- | ---------------------------------------------------------------------------------------- | ------------------------------- |
| `VITE_API_URL`       | Base URL of the Express API                                                              | `http://localhost:3000`         |
| `VITE_URL_IMAGE`     | Base URL for uploaded/static images (often same as API)                                  | `http://localhost:3000`         |
| `VITE_SECRET_CRYPTO` | Must match the server `SECRET_CRYPTO` for client-side crypto that pairs with the backend | Same string as in `server/.env` |
| `VITE_CLIENT_ID`     | Google OAuth Web client ID (for Google sign-in)                                          | From Google Cloud Console       |

**Important:** The URL you open in the browser (e.g. `http://localhost:5173`) must be allowed in Google OAuth settings if you use Google login. The server’s `URL_CLIENT` in `server/.env` should match that same origin for CORS and cookies.

## Install dependencies

From this directory:

```bash
cd client
npm install
```

## Run the development server

```bash
npm run dev
```

Vite runs with `--host`, so the app is reachable on your LAN (e.g. `http://192.168.x.x:5173`). The terminal prints the exact local and network URLs.

- Default dev port: **5173** (unless Vite picks another if 5173 is busy).

Keep this terminal open while developing. Hot reload is enabled.

## Other scripts

| Command           | Purpose                                            |
| ----------------- | -------------------------------------------------- |
| `npm run dev`     | Start dev server with HMR                          |
| `npm run build`   | Production build → `dist/`                         |
| `npm run preview` | Serve the production build locally (after `build`) |
| `npm run lint`    | Run ESLint                                         |

## Production build

```bash
npm run build
npm run preview
```

Deploy the contents of `dist/` behind any static host or reverse proxy. Set `VITE_API_URL` (and other `VITE_*` vars) at **build time** for the correct production API URL.

## How it connects to the backend

- REST calls use `VITE_API_URL`.
- Ensure the backend is up **before** testing features that need data or auth.
- If the browser shows CORS errors, check that `URL_CLIENT` in `server/.env` exactly matches the origin you use (scheme + host + port), e.g. `http://localhost:5173`.

## Troubleshooting

1. **API errors / network failed** — Confirm `npm run dev` is running in `server` and `VITE_API_URL` points to that server (default `http://localhost:3000`).
2. **CORS** — Align `URL_CLIENT` on the server with your real frontend URL.
3. **Google login** — Verify `VITE_CLIENT_ID` and authorized JavaScript origins in Google Cloud Console.
4. **Port already in use** — Stop the other process or let Vite choose the next free port and update `URL_CLIENT` on the server if you open the app on a different port.

## Run client + server together from repo root

From the repository root (`Sell-shoe-react`):

```bash
npm install
npm start
```

This starts both `server` and `client` via `concurrently` (each folder runs `npm install` then `npm run dev`).
