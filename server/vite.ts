import { type Express, type NextFunction, type Response } from "express";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import { fileURLToPath } from "node:url";
import viteConfig from "../vite.config";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

// Resolve server directory (works on Node < 20.11 where import.meta.dirname may be undefined)
const serverDir =
  typeof import.meta.dirname !== "undefined"
    ? import.meta.dirname
    : path.dirname(fileURLToPath(import.meta.url));
const clientIndexPath = path.resolve(serverDir, "..", "client", "index.html");

export async function setupVite(server: Server, app: Express) {
  const port = parseInt(process.env.PORT || "5000", 10);
  const serverOptions = {
    middlewareMode: true,
    hmr: {
      server,
      path: "/vite-hmr",
      clientPort: port,
    },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        // Don't let Vite HMR / transform errors crash the server
        if (msg.includes("WebSocket") || msg.includes("HMR")) {
          console.warn("[Vite HMR]", msg);
          return;
        }
        viteLogger.error(msg, options);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);

  /** Serves the main SPA index.html (used for / and all non-API routes). */
  async function serveIndexHtml(url: string, res: Response, next: NextFunction) {
    try {
      let template = await fs.promises.readFile(clientIndexPath, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      if (!res.headersSent) {
        res.status(200).set({ "Content-Type": "text/html" }).end(page);
      }
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      if (!res.headersSent) {
        const msg = (e as Error).message ?? "Unknown error";
        res.status(500).set("Content-Type", "text/html").end(
          `<!DOCTYPE html><html><head><title>Error</title></head><body><h1>Server Error</h1><p>${msg}</p></body></html>`
        );
      } else {
        next(e);
      }
    }
  }

  // Explicit root routes so the main page always loads (avoids wildcard ordering issues)
  app.get("/", (req, res, next) => serveIndexHtml(req.originalUrl, res, next));
  app.get("/index.html", (req, res, next) => serveIndexHtml(req.originalUrl, res, next));

  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    if (url.startsWith("/api/")) {
      if (!res.headersSent) {
        res.status(404).json({ message: "API route not found" });
      }
      return;
    }

    await serveIndexHtml(url, res, next);
  });
}
