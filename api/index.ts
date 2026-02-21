/**
 * Vercel Serverless API Handler
 *
 * This file wraps the Express server as a Vercel serverless function.
 * All /api/* and /objects/* routes are routed here by vercel.json rewrites.
 * The frontend (React SPA) is served as static files by Vercel's CDN.
 */
import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";

// ─── Express app for Vercel serverless ──────────────────────────────────────
const app = express();

// ─── CORS: allow production, preview, and dev origins ───────────────────────
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (
    origin === "https://vaclaimnavigator.com" ||
    origin === "https://www.vaclaimnavigator.com" ||
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

// ─── Stripe webhook (MUST be before express.json()) ─────────────────────────
app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    try {
      const signature = req.headers['stripe-signature'];
      if (!signature) {
        return res.status(400).json({ error: 'Missing stripe-signature' });
      }
      const sig = Array.isArray(signature) ? signature[0] : signature;
      if (!Buffer.isBuffer(req.body)) {
        return res.status(500).json({ error: 'Webhook processing error' });
      }
      const { WebhookHandlers } = await import('../server/webhookHandlers');
      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('Webhook error:', error.message);
      res.status(400).json({ error: 'Webhook processing error' });
    }
  }
);

// ─── JSON middleware (after webhook) ─────────────────────────────────────────
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// ─── Health check ───────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, runtime: "vercel", routesReady: true });
});

// ─── Lazy route registration (runs once per cold start) ─────────────────────
let routesRegistered = false;
let registrationPromise: Promise<void> | null = null;

function ensureRoutes(): Promise<void> {
  if (routesRegistered) return Promise.resolve();
  if (registrationPromise) return registrationPromise;

  registrationPromise = (async () => {
    try {
      const { registerRoutes } = await import("../server/routes");
      const httpServer = createServer(app);
      await registerRoutes(httpServer, app);
      routesRegistered = true;
      console.log("[VERCEL] API routes registered successfully");
    } catch (err: any) {
      console.error("[VERCEL] Failed to register routes:", err?.message);
      registrationPromise = null; // Allow retry on next invocation
      throw err;
    }
  })();

  return registrationPromise;
}

// Eagerly register routes on cold start
ensureRoutes().catch(() => {});

// ─── Catch-all middleware: ensure routes exist before handling ───────────────
app.use(async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ensureRoutes();
    next();
  } catch (err: any) {
    if (!res.headersSent) {
      res.status(503).json({
        message: "API is starting up. Please try again in a moment.",
      });
    }
  }
});

// ─── Global error handler ───────────────────────────────────────────────────
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  console.error(`[ERROR] ${status}: ${message}`);
  if (!res.headersSent) {
    res.status(status).json({ message });
  }
});

// ─── Export for Vercel @vercel/node runtime ──────────────────────────────────
export default app;
