import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import type { Socket } from "net";
import path from "path";
import fs from "fs";
import { exec, type ExecException, type ExecOptions } from "node:child_process";
import { promisify } from "node:util";
import { WebhookHandlers } from './webhookHandlers';
import { TEMP_UPLOAD_DIR } from './constants';

// ─── Process-level error handlers ───────────────────────────────────────────
// Prevent the server from silently dying on unhandled errors.
process.on("uncaughtException", (err) => {
  console.error("[FATAL] Uncaught exception — server will keep running:", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("[FATAL] Unhandled promise rejection:", reason);
});

// ─── Connection tracking (for clean shutdown) ───────────────────────────────
// Without this, httpServer.close() waits forever for keep-alive / HMR sockets.
const openConnections = new Set<Socket>();

// ─── Temp-upload cleanup (prevent disk fill) ────────────────────────────────
function cleanupTempUploads() {
  try {
    if (!fs.existsSync(TEMP_UPLOAD_DIR)) return;
    const MAX_AGE_MS = 2 * 60 * 60 * 1000; // 2 hours (allows time for large file analysis)
    const now = Date.now();
    for (const file of fs.readdirSync(TEMP_UPLOAD_DIR)) {
      try {
        const filePath = path.join(TEMP_UPLOAD_DIR, file);
        const stat = fs.statSync(filePath);
        if (now - stat.mtimeMs > MAX_AGE_MS) {
          fs.unlinkSync(filePath);
        }
      } catch { /* ignore per-file errors */ }
    }
  } catch { /* ignore */ }
}
// Clean on startup and every 30 minutes
cleanupTempUploads();
const cleanupInterval = setInterval(cleanupTempUploads, 30 * 60 * 1000);
cleanupInterval.unref(); // don't keep process alive

// ─── Memory monitoring (warn before OOM) ────────────────────────────────────
const HEAP_WARN_MB = 512;
const memoryCheckInterval = setInterval(() => {
  const used = process.memoryUsage();
  const heapMB = Math.round(used.heapUsed / 1024 / 1024);
  if (heapMB > HEAP_WARN_MB) {
    console.warn(`[MEMORY] Heap at ${heapMB}MB (>${HEAP_WARN_MB}MB threshold). ` +
      `RSS: ${Math.round(used.rss / 1024 / 1024)}MB`);
  }
}, 30_000);
memoryCheckInterval.unref();

// ─── Graceful shutdown (fixes port stuck in TIME_WAIT after nodemon restart) ─
let isShuttingDown = false;
function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`[SHUTDOWN] ${signal} received — closing server… (${openConnections.size} open connections)`);

  // Destroy all tracked sockets so close() doesn't wait for keep-alive / HMR
  for (const socket of Array.from(openConnections)) {
    socket.destroy();
  }
  openConnections.clear();

  httpServer.close(() => {
    console.log("[SHUTDOWN] HTTP server closed.");
    process.exit(0);
  });
  // Force-exit after 2s if close() still hangs (prevents nodemon from stalling)
  setTimeout(() => {
    console.log("[SHUTDOWN] Forced exit after timeout.");
    process.exit(1);
  }, 2000).unref();
}
// Handle all signals that nodemon / Windows may send
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
// Windows: nodemon sends 'message' with shutdown, and 'exit' event
process.on("message", (msg) => {
  if (msg === "shutdown") gracefulShutdown("shutdown-message");
});

/** Open the default browser to the app URL (dev only). Uses shell on Windows so "start" works. */
function openBrowser(url: string) {
  // Always log the URL so you can open manually if auto-open fails (e.g. in Cursor/VS Code terminal)
  console.log(`\n  >>> Open the app in your browser: ${url}\n`);

  const isWin = process.platform === "win32";
  const command = isWin
    ? `start "" "${url}"`           // "" = window title; quoted URL; requires shell (cmd.exe)
    : process.platform === "darwin"
      ? `open "${url}"`
      : `xdg-open "${url}"`;
  const opts: ExecOptions = isWin ? { shell: "cmd.exe" } : {};
  exec(command, opts, (err: ExecException | null) => {
    if (err && isWin) {
      // Fallback: PowerShell (works when cmd "start" fails or ComSpec is PowerShell)
      exec(`powershell -NoProfile -Command "Start-Process '${url}'"`, { shell: "powershell.exe" }, (err2: ExecException | null) => {
        if (err2) {
          log(`Could not auto-open browser. Open this URL manually: ${url}`);
        } else {
          log(`Browser opened (PowerShell): ${url}`);
        }
      });
    } else if (err) {
      log(`Could not auto-open browser. Open this URL manually: ${url}`);
    } else {
      log(`Browser opened: ${url}`);
    }
  });
}

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

// ─── Express app & HTTP server ──────────────────────────────────────────────
const app = express();
const httpServer = createServer(app);

// ─── HTTP server hardening ──────────────────────────────────────────────────
// Prevent stale connections from piling up (common crash cause on Windows)
httpServer.keepAliveTimeout = 65_000;   // slightly > typical proxy 60s
httpServer.headersTimeout = 70_000;     // must be > keepAliveTimeout
httpServer.requestTimeout = 10 * 60_000; // 10 min max per request (large file upload + chunked AI analysis)
httpServer.maxHeadersCount = 100;

// Track connections so shutdown can destroy them (prevents port-stuck)
httpServer.on("connection", (socket: Socket) => {
  openConnections.add(socket);
  socket.once("close", () => openConnections.delete(socket));
});

// Permanent error handler — without this, post-startup errors (ECONNRESET,
// EPIPE, etc.) are unhandled and can crash or cause silent weirdness
httpServer.on("error", (err: any) => {
  if (err?.code === "EADDRINUSE") return; // handled in startListening
  console.error("[HTTP] Server error:", err?.message || err);
});

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// ─── Startup state (shared across the boot sequence) ────────────────────────
const port = Number(process.env.PORT) || 3000;
// Bind to 0.0.0.0 so browser can connect via localhost or 127.0.0.1 (fixes connection refused on some Windows setups)
const host = process.env.HOST || "0.0.0.0";
const bootState = { routesReady: false, viteReady: false, bootError: null as string | null };

// ─── CORS: allow browser requests from production and dev origins ─────────────
const allowedOrigins = [
  // Production
  "https://vaclaimnavigator.com",
  "https://www.vaclaimnavigator.com",
  // Vercel preview/deploy URLs
  ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
  // Dev
  `http://localhost:${port}`,
  `http://127.0.0.1:${port}`,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (
    allowedOrigins.includes(origin) ||
    origin.endsWith(".vercel.app") ||
    origin.endsWith(".vaclaimnavigator.com") ||
    origin.startsWith("http://localhost:") ||
    origin.startsWith("http://127.0.0.1:")
  )) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  next();
});

// ─── Static assets ──────────────────────────────────────────────────────────
app.use('/attached_assets', express.static(path.join(process.cwd(), 'attached_assets')));

// ─── Stripe webhook (MUST be before express.json()) ─────────────────────────
app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'];

    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature' });
    }

    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;

      if (!Buffer.isBuffer(req.body)) {
        console.error('STRIPE WEBHOOK ERROR: req.body is not a Buffer');
        return res.status(500).json({ error: 'Webhook processing error' });
      }

      await WebhookHandlers.processWebhook(req.body as Buffer, sig);

      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('Webhook error:', error.message);
      res.status(400).json({ error: 'Webhook processing error' });
    }
  }
);

// ─── File upload: OPTIONS preflight (CORS) ──────────────────────────────────
app.options('/api/storage/upload/*', (_req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.status(204).end();
});

// ─── File upload endpoint (MUST be before express.json()) ───────────────────
// Accepts uploads with or without auth — Evidence for Claims always works.
app.put(
  '/api/storage/upload/*',
  async (req, res) => {
    // CORS headers so uploads work from any origin
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    try {
      const authHeader = req.headers.authorization;
      const hasAuth = !!(authHeader && authHeader.startsWith('Bearer '));
      const accessToken = hasAuth ? authHeader!.substring(7) : null;

      // Robust wildcard param capture — works across Express 4 & 5
      const storagePath =
        (req.params as any)[0] ||
        (req.params as Record<string, string>)["0"] ||
        req.url.replace(/^\/api\/storage\/upload\//, '');
      console.log('[FILE UPLOAD] Route hit:', req.method, req.url, 'storagePath:', storagePath);

      if (!storagePath) {
        console.error('[FILE UPLOAD] Missing storage path. params:', req.params, 'url:', req.url);
        return res.status(400).json({ error: 'Missing storage path' });
      }

      const contentType = req.headers['content-type'] || 'application/octet-stream';

      // Guardrail: ensure temp directory exists before every write
      if (!fs.existsSync(TEMP_UPLOAD_DIR)) {
        fs.mkdirSync(TEMP_UPLOAD_DIR, { recursive: true });
      }

      const tempFileName = `${Date.now()}-${storagePath.replace(/\//g, '_')}`;
      const serverFilePath = path.join(TEMP_UPLOAD_DIR, tempFileName);

      // Stream request body to disk with abort handling
      await new Promise<void>((resolve, reject) => {
        const writeStream = fs.createWriteStream(serverFilePath);
        let settled = false;

        const cleanup = (err: Error) => {
          if (settled) return;
          settled = true;
          writeStream.destroy();
          try { if (fs.existsSync(serverFilePath)) fs.unlinkSync(serverFilePath); } catch {}
          reject(err);
        };

        writeStream.on('finish', () => {
          if (!settled) { settled = true; resolve(); }
        });
        writeStream.on('error', (err) => {
          console.error('[FILE UPLOAD] Write error:', err.message);
          cleanup(err);
        });
        req.on('error', (err) => {
          console.error('[FILE UPLOAD] Request stream error:', err.message);
          cleanup(err);
        });
        req.on('aborted', () => {
          console.warn('[FILE UPLOAD] Client aborted upload');
          cleanup(new Error('Upload aborted by client'));
        });

        req.pipe(writeStream);
      });

      const fileSize = fs.statSync(serverFilePath).size;
      if (fileSize === 0) {
        try { fs.unlinkSync(serverFilePath); } catch {}
        return res.status(400).json({ error: 'No file data received' });
      }

      console.log(`[FILE UPLOAD] Saved ${(fileSize / (1024 * 1024)).toFixed(1)}MB to ${tempFileName}`);

      let uploadResult: any;
      if (accessToken) {
        try {
          const fileBuffer = await fs.promises.readFile(serverFilePath);
          const blob = new Blob([fileBuffer], { type: contentType });
          const { getAuthenticatedClient } = await import('./insforge');
          const client = getAuthenticatedClient(accessToken);
          const result = await client.storage.from('uploads').upload(storagePath, blob);
          if (result.error) {
            if (result.error.message?.includes('not found') || result.error.statusCode === 404) {
              console.log('[FILE UPLOAD] Bucket may not exist, attempting with default client...');
              const { insforge: defaultClient } = await import('./insforge');
              const retryResult = await defaultClient.storage.from('uploads').upload(storagePath, blob);
              if (retryResult.error) {
                throw new Error(retryResult.error.message || 'Upload failed after retry');
              }
              uploadResult = retryResult.data;
            } else {
              throw new Error(result.error.message || 'Upload failed');
            }
          } else {
            uploadResult = result.data;
          }
        } catch (sdkErr: any) {
          console.warn('[FILE UPLOAD] Insforge storage unavailable, using local file:', sdkErr.message);
        }
      }
      // When no auth: file is in temp; serverFilePath used for AI analysis. Evidence persists in client state.

      res.json({
        success: true,
        url: uploadResult?.url,
        key: uploadResult?.key,
        objectPath: `/objects/${storagePath}`,
        serverFilePath,
      });
    } catch (error: any) {
      console.error('[FILE UPLOAD] Error:', error.message, error.stack);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message || 'Upload failed' });
      }
    }
  }
);

// ─── JSON middleware (after webhook & upload) ────────────────────────────────
// IMPORTANT: 500mb was causing OOM crashes. 50mb is enough for base64 evidence.
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
    limit: '50mb',
  }),
);
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// ─── Request timeout guard ──────────────────────────────────────────────────
// If a request handler hangs (e.g. Insforge API down), don't let it sit forever.
app.use((req, res, next) => {
  // Skip for uploads and streaming — they need more time
  if (req.path.startsWith("/api/storage/upload") || req.path.startsWith("/api/ai/")) {
    return next();
  }
  const TIMEOUT_MS = 30_000; // 30 seconds for normal API
  const timer = setTimeout(() => {
    if (!res.headersSent) {
      console.warn(`[TIMEOUT] ${req.method} ${req.path} exceeded ${TIMEOUT_MS}ms`);
      res.status(504).json({ message: "Request timed out" });
    }
  }, TIMEOUT_MS);
  res.on("finish", () => clearTimeout(timer));
  res.on("close", () => clearTimeout(timer));
  next();
});

// ─── Request logger ─────────────────────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  const reqPath = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (reqPath.startsWith("/api")) {
      let logLine = `${req.method} ${reqPath} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      log(logLine);
    }
  });

  next();
});

// ─── Health check (no auth; used by loading page and tools) ───────────────────
app.get("/api/health", (_req, res) => {
  res.json({
    ok: !bootState.bootError,
    routesReady: bootState.routesReady,
    viteReady: bootState.viteReady,
    bootError: bootState.bootError ?? undefined,
  });
});

// ─── Loading / error page middleware (dev only, shown while routes & Vite compile) ─
if (process.env.NODE_ENV !== "production") {
  const appUrl = `http://localhost:${port}`;

  const loadingHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Loading…</title>
    <meta http-equiv="refresh" content="15">
    <style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;
    font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0}
    .spinner{width:40px;height:40px;border:4px solid #334155;border-top:4px solid #3b82f6;
    border-radius:50%;animation:spin 1s linear infinite;margin-right:16px}
    @keyframes spin{to{transform:rotate(360deg)}}
    .main{display:flex;align-items:center}
    .status{margin-top:8px;font-size:14px;color:#94a3b8}
    .url-bar{margin-top:24px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:center}
    .url-bar input{min-width:280px;padding:8px 12px;border:1px solid #475569;border-radius:6px;background:#1e293b;color:#e2e8f0;font-size:14px}
    .url-bar button{padding:8px 14px;border-radius:6px;border:none;background:#3b82f6;color:#fff;cursor:pointer;font-size:14px}
    .url-bar button:hover{background:#2563eb}
    .url-bar button.copy{background:#475569}
    .url-bar button.copy:hover{background:#64748b}
    .tip{margin-top:16px;font-size:12px;color:#64748b;max-width:420px;text-align:center}</style></head>
    <body><div class="main"><div class="spinner"></div><div><h2>Starting up…</h2><p>The app is compiling. This page will reload automatically.</p><p class="status" id="status"></p></div></div>
    <p class="tip" id="tip">If the app does not load after a minute, check the terminal for errors.</p>
    <div class="url-bar"><input type="text" id="app-url" value="${appUrl}" readonly />
    <button type="button" onclick="navigator.clipboard.writeText(document.getElementById('app-url').value);this.textContent='Copied!'">Copy URL</button>
    <button type="button" onclick="window.location.reload()">Retry</button></div>
    <script>
      (function poll(){
        fetch('/api/health').then(function(r){ return r.json(); }).then(function(d){
          var s=document.getElementById('status');
          if(d.bootError){ s.textContent='Error: '+d.bootError; s.style.color='#f87171'; return; }
          if(d.viteReady){ s.textContent='Ready — reloading…'; window.location.reload(); return; }
          if(d.routesReady){ s.textContent='Vite compiling…'; }
          else{ s.textContent='Registering routes…'; }
          setTimeout(poll, 1500);
        }).catch(function(){ document.getElementById('status').textContent='Connecting…'; setTimeout(poll, 2000); });
      })();
    </script></body></html>`;

  const errorHtml = (msg: string) => `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Startup Error</title>
    <meta http-equiv="refresh" content="5">
    <style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;
    font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0}
    .box{max-width:600px;padding:32px;border:2px solid #ef4444;border-radius:12px;background:#1e1e2e}
    h2{color:#ef4444;margin-top:0}pre{white-space:pre-wrap;color:#fca5a5;font-size:13px}
    .tip{margin-top:16px;font-size:13px;color:#94a3b8}</style></head>
    <body><div class="box"><h2>Server Startup Error</h2><p>The server hit an error while loading. It will auto-retry. Check the terminal for details.</p>
    <pre>${msg.replace(/</g, "&lt;")}</pre>
    <p class="tip">Fix the error in the terminal, then refresh.</p></div></body></html>`;

  // This middleware runs for EVERY non-API request. It gates traffic until routes + Vite are ready.
  app.use((req, res, next) => {
    // Always let API requests through (health is registered above; other /api/* 404 until routes load)
    if (req.path.startsWith("/api/")) return next();
    // If there's a startup error, show a red error page that auto-retries
    if (bootState.bootError) {
      return res.status(503).set("Content-Type", "text/html").end(errorHtml(bootState.bootError));
    }
    // If Vite isn't ready yet, show the loading spinner
    if (!bootState.viteReady) {
      return res.status(200).set("Content-Type", "text/html").end(loadingHtml);
    }
    next();
  });
}

// ─── Global error handler ───────────────────────────────────────────────────
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  console.error(`[ERROR] ${status}: ${message}`, err.stack ? `\n${err.stack}` : '');
  if (!res.headersSent) {
    res.status(status).json({ message });
  }
});

// ─── Listen FIRST, then register routes & Vite (the core fix) ───────────────
// Previous architecture: await registerRoutes() → listen(). If registerRoutes
// threw (import error, SDK crash, network glitch), listen() was never called,
// the port never opened, and the browser got ERR_CONNECTION_REFUSED.
// New architecture: listen() runs UNCONDITIONALLY first. Routes and Vite are
// registered afterward with full error handling. The loading/error page
// middleware ensures the browser always gets a response.

const execAsync = promisify(exec);

function startListening(attemptNum = 1) {
  const MAX_ATTEMPTS = 8;
  const RETRY_DELAY_MS = 1000;

  const errorHandler = async (err: any) => {
    if (err?.code === "EADDRINUSE" && attemptNum < MAX_ATTEMPTS) {
      console.warn(`[STARTUP] Port ${port} in use (attempt ${attemptNum}/${MAX_ATTEMPTS}). Retrying…`);
      let delayMs = RETRY_DELAY_MS;
      // On Windows (and retry 3+), explicitly kill the port and wait for it before retrying
      if (attemptNum >= 2 && process.platform === "win32") {
        try {
          await execAsync(`npx kill-port ${port}`, { timeout: 8000 });
          console.warn("[STARTUP] Ran kill-port; waiting 2s for port to release…");
          delayMs = 2000;
        } catch (_) {
          /* kill-port may fail if nothing is on the port; still retry */
        }
      }
      setTimeout(() => startListening(attemptNum + 1), delayMs);
    } else if (err?.code === "EADDRINUSE") {
      console.error(`[STARTUP] Port ${port} still in use after ${MAX_ATTEMPTS} attempts. Run: npx kill-port ${port}`);
      process.exit(1);
    } else {
      console.error("[STARTUP] Server listen error:", err);
    }
  };

  httpServer.once("error", errorHandler);

  httpServer.listen(port, host, () => {
    // Remove the one-shot error handler now that we're listening
    httpServer.removeListener("error", errorHandler);
    console.log(`[server] listening on http://${host}:${port}`);
  });
    // In production (Render), localhost is not the public URL.
// Log bind info, and only use localhost for dev conveniences.
log(`listening on ${host}:${port}`);

if (process.env.NODE_ENV !== "production") {
  const url = `http://localhost:${port}`;
  log(`dev: serving on ${url}`);
  setTimeout(() => openBrowser(url), 2000);
}

  // Now register routes (async, with error handling)
  bootRoutes();
}    

async function bootRoutes() {
  // Phase 1: Register API routes
  try {
    await registerRoutes(httpServer, app);
    bootState.routesReady = true;
    log("API routes registered");
  } catch (err: any) {
    const msg = err?.message || String(err);
    console.error("[STARTUP] Failed to register routes:", msg);
    bootState.bootError = `Route registration failed: ${msg}`;
    // Server stays up — the error page middleware will show the problem to the browser
    // and auto-retry (meta refresh). When nodemon restarts, it'll try again.
    return;
  }

  // Phase 2: Set up Vite or static serving
  if (process.env.NODE_ENV === "production") {
    try {
      serveStatic(app);
      bootState.viteReady = true;
    } catch (err: any) {
      console.error("[STARTUP] Failed to serve static files:", err?.message || err);
      bootState.bootError = `Static file serving failed: ${err?.message}`;
    }
  } else {
    try {
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
      bootState.viteReady = true;
      log("Vite dev server ready — app is live");
    } catch (err: any) {
      console.error("[Vite] Setup failed:", err?.message || err);
      bootState.bootError = `Vite setup failed: ${err?.message}. Check terminal and fix the error; the page will auto-retry.`;
    }
  }
}

// ─── GO! ────────────────────────────────────────────────────────────────────
startListening();
