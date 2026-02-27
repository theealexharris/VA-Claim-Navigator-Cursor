import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "node:url";

const serverDir =
  typeof import.meta.dirname !== "undefined"
    ? import.meta.dirname
    : path.dirname(fileURLToPath(import.meta.url));

export function serveStatic(app: any) {
  const distPath = path.resolve(process.cwd(), "dist");
  const clientPath = path.join(distPath, "public");
  const indexHtml = path.join(clientPath, "index.html");

  if (!fs.existsSync(indexHtml)) {
    throw new Error(`Vite build not found at ${indexHtml}`);
  }

  console.log("[prod] serving frontend from:", clientPath);

  app.use(express.static(clientPath));

  app.get("*", (req: any, res: any, next: any) => {
    if (req.path?.startsWith("/api")) return next();
    res.sendFile(indexHtml);
  });
}
