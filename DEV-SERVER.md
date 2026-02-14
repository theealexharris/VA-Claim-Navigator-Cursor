# Development Server — Keep the Browser Working

This document explains how to run the VA Claim Navigator dev server and how to fix issues when the browser does not load.

## Run the server

From the project root:

```bash
npm run dev
```

In development, the server **automatically opens your default browser** to http://localhost:5000 about 1 second after it starts. If it doesn’t, open one of these manually:

- **http://127.0.0.1:5000**
- **http://localhost:5000**

The server binds to `0.0.0.0:5000` so both addresses work.

## Why "connection failed" kept happening

There were two bugs:

1. **Dev script exited without starting the server.** The old script chained `kill-port 5000 && nodemon ...` (and later `kill-port 5000 || echo. && nodemon ...`) in a single command. On Windows cmd.exe (npm's shell), the chain would exit after `kill-port` without ever starting `nodemon`. The fix uses npm's built-in `predev` lifecycle script — npm runs `predev` automatically before `dev`, so each command gets its own process and can't interfere with the other.

2. **Browser hung or "connection failed" during Vite startup.** The server used to wait for Vite to finish compiling (15–60+ seconds) before calling `listen()`, so nothing was accepting connections on port 5000 until then. The fix: the server now calls `listen()` **immediately** after registering API routes and the loading middleware; Vite is started **after** the server is already listening. Until Vite is ready, the loading page is served. So the browser can connect right away and never sees "connection failed."

## If the browser does not load

1. **Confirm the server is running**  
   You should see in the terminal:
   ```text
   serving on http://127.0.0.1:5000 and http://localhost:5000
   ```
   If this line never appears, the server failed to start.

2. **Try the other URL**  
   If `http://localhost:5000` fails, try `http://127.0.0.1:5000` (or the reverse). On some setups only one works.

3. **Check port 5000**  
   - Ensure nothing else is using port 5000 (e.g. another Node process or another app).  
   - On Windows: `netstat -ano | findstr :5000`  
   - Kill the process using 5000 if needed, then run `npm run dev` again.

4. **Node version**  
   Use Node **20.11+** (or 21.2+). Older versions can break path resolution and the dev server.  
   Check: `node -v`

5. **Windows**  
   Use `npm run dev` (no manual `NODE_ENV=...`). The project uses `cross-env` so the script works in PowerShell and CMD.

6. **Firewall / antivirus**  
   Temporarily allow Node (or your terminal) to listen on port 5000 if the browser still cannot connect.

## Fixes that keep the server and browser working

These are already applied in the codebase; they are listed here so they are not reverted:

- **`predev` script for port cleanup** (`package.json`)  
  `kill-port 5000` runs in a separate `predev` lifecycle script instead of being chained with `&&`/`||` in the `dev` script. This prevents Windows cmd.exe from aborting the entire script when `kill-port` exits non-zero.

- **Listen first, Vite second** (`server/index.ts`)  
  The server calls `listen()` right after registering routes and the loading middleware. Vite is started asynchronously in the listen callback. So port 5000 accepts connections within a second; the loading page is shown until Vite is ready. Do not revert to awaiting Vite before `listen()` or "connection failed" will return.
- **Loading page during Vite compilation** (`server/index.ts`)  
  Until `devState.viteReady` is true, non-API requests get a loading page that auto-refreshes. This prevents the browser from hanging on a blank page while Vite compiles.

- **No `process.exit(1)` in the Vite error logger** (`server/vite.ts`)  
  Vite errors are logged only. Exiting on every Vite error was shutting down the whole server and causing "connection refused."

- **`cross-env` for `NODE_ENV`** (`package.json` scripts)  
  `dev` and `start` use `cross-env` so `NODE_ENV` is set correctly on Windows as well as Unix.

- **Bind to `0.0.0.0`** (`server/index.ts`)  
  The server listens on `0.0.0.0:5000` so both `http://127.0.0.1:5000` and `http://localhost:5000` work and IPv6/localhost issues are avoided.

- **Explicit routes for the main page** (`server/vite.ts`)  
  `GET /` and `GET /index.html` are registered explicitly so the main page is always served regardless of middleware order.

- **Safe path resolution** (`server/vite.ts`, `server/static.ts`)  
  The server directory is resolved in a way that works on Node < 20.11 (using `fileURLToPath(import.meta.url)` when `import.meta.dirname` is not available) so the path to `client/index.html` (and in production, `public`) is always correct.

- **HTML error page on SPA serve failure** (`server/vite.ts`)  
  If loading or transforming `index.html` fails, the server responds with a simple HTML error page instead of JSON or closing the connection, so the user sees a clear error instead of a blank page.

Do not remove or weaken these behaviors if you want the browser to keep working reliably.
