# Pharmacy Management System — Frontend (port 2196)

React 19 + Vite + Tailwind. All data comes from the backend API (port 2195) — there is no demo data.

## Build
```
npm install
npm run build          # → dist/
```

## Deploy on IIS (what you use now)
1. Copy **everything inside `dist/`** (including `web.config`) to the IIS site folder bound to port 2196.
2. The IIS **URL Rewrite** module must be installed (free from Microsoft). `web.config` sends every page route
   (e.g. /dashboard) to index.html — this is what fixes "404 - File or directory not found" on refresh.
3. The app calls the API at `http://<same server>:2195/api`, so port 2195 must be open. No reverse proxy needed.

## Run without IIS
```
npm run preview        # serves dist/ on port 2196
npm run dev            # development with hot reload on port 2196
```

## Settings (`.env`, used at build time)
- `VITE_API_PORT=2195` → API on the same host as the page, this port (default).
- `VITE_API_URL=http://4.16.235.111:2195/api` → a fixed API URL instead (optional).

## Browser console debugging
Open DevTools → Console. Every API call is logged as `[API] METHOD url → status (ms)`; click it for the request body
and the response. Errors are red. Type `pharmaDebug.last()` for a table of the last 50 calls.
Turn logs off: `localStorage.setItem('pharma_debug','0')` and reload (errors are always shown).

## Login
First login: **admin / admin123** (created by the backend database setup). Manage users, roles and page permissions in
**System → Admin**.
