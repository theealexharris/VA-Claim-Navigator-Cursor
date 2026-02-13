import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import path from "path";
import fs from "fs";
import { exec, type ExecException, type ExecOptions } from "node:child_process";
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

// ─── Graceful shutdown (fixes port stuck in TIME_WAIT after nodemon restart) ─
let isShuttingDown = false;
function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`[SHUTDOWN] ${signal} received — closing server…`);
  httpServer.close(() => {
    console.log("[SHUTDOWN] HTTP server closed.");
    process.exit(0);
  });
  // Force-exit after 3 s if close() hangs (prevents nodemon from stalling)
  setTimeout(() => {
    console.log("[SHUTDOWN] Forced exit after timeout.");
    process.exit(1);
  }, 3000).unref();
}
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

/** Open the default browser to the app URL (dev only). Uses shell on Windows so "start" works. */
function openBrowser(url: string) {
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
          log(`Could not auto-open browser: ${(err as Error).message}. Open manually: ${url}`);
        } else {
          log(`Browser opened (PowerShell): ${url}`);
        }
      });
    } else if (err) {
      log(`Could not auto-open browser: ${(err as Error).message}. Open manually: ${url}`);
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

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// ─── Startup state (shared across the boot sequence) ────────────────────────
const port = parseInt(process.env.PORT || "5000", 10);
const host = "0.0.0.0";
const bootState = { routesReady: false, viteReady: false, bootError: null as string | null };

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

// ─── File upload endpoint (MUST be before express.json()) ───────────────────
app.put(
  '/api/storage/upload/*',
  async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const accessToken = authHeader.substring(7);

      const storagePath = (req.params as Record<string, string>)["0"];
      if (!storagePath) {
        return res.status(400).json({ error: 'Missing storage path' });
      }

      const contentType = req.headers['content-type'] || 'application/octet-stream';

      const tempFileName = `${Date.now()}-${storagePath.replace(/\//g, '_')}`;
      const serverFilePath = path.join(TEMP_UPLOAD_DIR, tempFileName);

      await new Promise<void>((resolve, reject) => {
        const writeStream = fs.createWriteStream(serverFilePath);
        req.pipe(writeStream);
        writeStream.on('finish', resolve);
        writeStream.on('error', (err) => {
          console.error('[FILE UPLOAD] Write error:', err.message);
          reject(err);
        });
        req.on('error', (err) => {
          console.error('[FILE UPLOAD] Request error:', err.message);
          writeStream.destroy();
          reject(err);
        });
      });

      const fileSize = fs.statSync(serverFilePath).size;
      if (fileSize === 0) {
        try { fs.unlinkSync(serverFilePath); } catch {}
        return res.status(400).json({ error: 'No file data received' });
      }

      console.log(`[FILE UPLOAD] Saved ${(fileSize / (1024 * 1024)).toFixed(1)}MB to ${tempFileName}`);

      let uploadResult: any;
      try {
        const fileBuffer = fs.readFileSync(serverFilePath);
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

      res.json({
        success: true,
        url: uploadResult?.url,
        key: uploadResult?.key,
        objectPath: `/objects/${storagePath}`,
        serverFilePath,
      });
    } catch (error: any) {
      console.error('[FILE UPLOAD] Error:', error.message);
      res.status(500).json({ error: error.message || 'Upload failed' });
    }
  }
);

// ─── JSON middleware (after webhook & upload) ────────────────────────────────
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
    limit: '500mb',
  }),
);
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

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

// ─── Loading / error page middleware (dev only, shown while routes & Vite compile) ─
if (process.env.NODE_ENV !== "production") {
  const appUrl = `http://localhost:${port}`;

  const loadingHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Loading…</title>
    <meta http-equiv="refresh" content="2">
    <style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;
    font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0}
    .spinner{width:40px;height:40px;border:4px solid #334155;border-top:4px solid #3b82f6;
    border-radius:50%;animation:spin 1s linear infinite;margin-right:16px}
    @keyframes spin{to{transform:rotate(360deg)}}
    .main{display:flex;align-items:center}
    .url-bar{margin-top:24px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:center}
    .url-bar input{min-width:280px;padding:8px 12px;border:1px solid #475569;border-radius:6px;background:#1e293b;color:#e2e8f0;font-size:14px}
    .url-bar button{padding:8px 14px;border-radius:6px;border:none;background:#3b82f6;color:#fff;cursor:pointer;font-size:14px}
    .url-bar button:hover{background:#2563eb}
    .url-bar button.copy{background:#475569}
    .url-bar button.copy:hover{background:#64748b}</style></head>
    <body><div class="main"><div class="spinner"></div><div><h2>Starting up…</h2><p>The app is compiling. This page will reload automatically.</p></div></div>
    <div class="url-bar"><input type="text" id="app-url" value="${appUrl}" readonly />
    <button type="button" onclick="navigator.clipboard.writeText(document.getElementById('app-url').value);this.textContent='Copied!'">Copy URL</button>
    <button type="button" onclick="window.open(document.getElementById('app-url').value)">Open in browser</button></div></body></html>`;

  const errorHtml = (msg: string) => `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Startup Error</title>
    <meta http-equiv="refresh" content="5">
    <style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;
    font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0}
    .box{max-width:600px;padding:32px;border:2px solid #ef4444;border-radius:12px;background:#1e1e2e}
    h2{color:#ef4444;margin-top:0}pre{white-space:pre-wrap;color:#fca5a5;font-size:13px}</style></head>
    <body><div class="box"><h2>Server Startup Error</h2><p>The server hit an error while loading. It will auto-retry. Check the terminal for details.</p>
    <pre>${msg}</pre></div></body></html>`;

  // This middleware runs for EVERY non-API request. It gates traffic until routes + Vite are ready.
  app.use((req, res, next) => {
    // Always let API requests through (they'll 404 naturally if routes aren't registered yet)
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

function startListening(attemptNum = 1) {
  const MAX_ATTEMPTS = 5;
  const RETRY_DELAY_MS = 1500;

  httpServer.once("error", (err: any) => {
    if (err?.code === "EADDRINUSE" && attemptNum < MAX_ATTEMPTS) {
      console.warn(`[STARTUP] Port ${port} in use (attempt ${attemptNum}/${MAX_ATTEMPTS}). Retrying in ${RETRY_DELAY_MS}ms…`);
      setTimeout(() => startListening(attemptNum + 1), RETRY_DELAY_MS);
    } else if (err?.code === "EADDRINUSE") {
      console.error(`[STARTUP] Port ${port} still in use after ${MAX_ATTEMPTS} attempts. Run: npx kill-port ${port}`);
      process.exit(1);
    } else {
      console.error("[STARTUP] Server error:", err);
    }
  });

  httpServer.listen(port, host, () => {
    const url = `http://localhost:${port}`;
    log(`serving on ${url}`);

    // Browser auto-open (dev only): 2s delay so port is fully bound (helps on Windows)
    if (process.env.NODE_ENV !== "production") {
      setTimeout(() => openBrowser(url), 2000);
    }

    // Now register routes (async, with error handling)
    bootRoutes();
  });
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
