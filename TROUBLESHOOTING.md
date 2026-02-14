# Troubleshooting: Browser Not Connecting / App Won't Load

This guide explains why the browser may fail to connect or the app may crash, and how to prevent it from recurring.

---

## Why it keeps happening

The app runs as a **single dev server** (Express on port 5000 with Vite embedded). Connection or startup failures usually come from one of these:

| Cause | What you see | Why it recurs |
|-------|----------------|----------------|
| **Port 5000 in use** | `ERR_CONNECTION_REFUSED` or "This site can't be reached" | Another process (or a previous run) is still holding the port. After a crash or force-quit, the port can stay in use (e.g. TIME_WAIT on Windows). |
| **Server startup error** | Red "Server Startup Error" page with a message | Routes or Vite failed to load (e.g. missing `.env`, DB/Insforge error). The page auto-refreshes every 5s but the error stays until the cause is fixed. |
| **Stuck on "Starting up…"** | Blue loading page that never becomes the app | Vite is taking a long time to compile or failed silently. The loading page now polls `/api/health` and shows "Registering routes…" / "Vite compiling…" or an error. |
| **White/blank page after load** | App loads then goes blank | A React component threw an error. There is now an **Error Boundary**: you should see "Something went wrong" and a **Reload page** button instead of a white screen. |
| **HMR (hot reload) disconnect** | App works until you save a file, then freezes or breaks | Vite’s WebSocket for hot reload failed (common on some Windows/firewall setups). The dev server is configured so HMR uses the same port (5000) to reduce this. |

---

## What to do when the browser won’t connect

1. **Check the terminal**  
   Look for:
   - `[STARTUP] Port 5000 in use` → do step 2.
   - `[STARTUP] Failed to register routes:` or `[Vite] Setup failed:` → fix the reported error (e.g. `.env`, network, Insforge).

2. **Free port 5000 and restart**  
   ```bash
   npx kill-port 5000
   npm run dev
   ```  
   `npm run dev` already runs `kill-port 5000` before starting (`predev`), but if the process didn’t exit cleanly, run `npx kill-port 5000` yourself once, then `npm run dev`.

3. **Use the loading page**  
   - If you see "Starting up…", wait a bit. The page polls `/api/health` every 1.5s and auto-refreshes every 15s as fallback.  
   - If you see "Error: …", read the message and fix the issue in the terminal or env.  
   - Use **Retry** or **Open in browser** as needed.

4. **If the app loads then goes blank**  
   You should see **"Something went wrong"** and a **Reload page** button. Open the browser console (F12 → Console) to see the error, fix the code, and reload.

5. **If hot reload keeps disconnecting**  
   - Try a full refresh (F5 or Reload).  
   - Ensure nothing is blocking WebSockets (corporate proxy/firewall).  
   - As a last resort you can disable HMR in `server/vite.ts` by setting `hmr: false` (you’ll need to refresh manually after code changes).

---

## How we reduce crashes and "not connecting"

- **Listen before loading heavy stuff**  
  The server **binds to port 5000 first**, then loads routes and Vite. So the browser can connect and get a response (loading or error page) even when route registration or Vite is slow or failing.

- **Health check**  
  `GET /api/health` returns `{ ok, routesReady, viteReady, bootError }`. The loading page uses this to show the right message and to reload when the app is ready.

- **Error page with retry**  
  If startup fails, you see a red error page with the message and a tip to run `npx kill-port 5000` then `npm run dev`. The page auto-refreshes every 5 seconds.

- **React Error Boundary**  
  Uncaught errors in the UI no longer leave a blank screen; they show a "Something went wrong" screen with a Reload button.

- **Port conflict handling**  
  If port 5000 is in use, the server retries up to 5 times (with delay). If it still can’t bind, it exits with a clear message to run `npx kill-port 5000`.

- **HMR on same port**  
  Vite’s HMR is configured to use the same port as the app (5000) so the browser doesn’t have to connect to a second port, which helps on Windows and locked-down networks.

---

## Quick checklist

- [ ] Terminal shows `serving on http://localhost:5000` and no red errors.
- [ ] `.env` exists and has required keys (e.g. Insforge, Stripe if used).
- [ ] Run `npx kill-port 5000` if the port was stuck, then `npm run dev`.
- [ ] Use the URL the server prints (e.g. `http://localhost:5000`), not a different port.
- [ ] If you see "Something went wrong", check the browser console and fix the reported error, then Reload.
