import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path, { dirname } from "path";
import fs from "fs";
import { getConfig } from "@shared/config";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Explicitly set environment mode
const NODE_ENV = process.env.NODE_ENV || "development";
app.set("env", NODE_ENV);
log(`Server running in ${app.get("env")} mode`);

const config = getConfig(NODE_ENV as 'development' | 'production');

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    // Production mode - serve static files
    const publicPath = path.resolve(__dirname, "public");
    log(`Looking for public directory at: ${publicPath}`);

    if (fs.existsSync(publicPath)) {
      log(`Public directory exists at: ${publicPath}`);
      const files = fs.readdirSync(publicPath);
      log(`Files in public directory: ${files.join(', ')}`);

      // Serve static files from server/public
      app.use(express.static(publicPath));

      // Always return index.html for any non-file route to support client-side routing
      app.use("*", (_req, res) => {
        res.sendFile(path.join(publicPath, "index.html"));
      });
    } else {
      log(`Public directory not found at: ${publicPath}`);
      throw new Error("Could not find public directory");
    }
  }

  server.listen({
    port: config.port,
    host: config.host,
    reusePort: true,
  }, () => {
    log(`serving on port ${config.port}`);
  });
})();