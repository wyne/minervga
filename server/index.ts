import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { getConfig } from "@shared/config";
import { nanoid } from "nanoid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Force development mode for local development
process.env.NODE_ENV = process.env.NODE_ENV || "development";
const NODE_ENV = process.env.NODE_ENV;
app.set("env", NODE_ENV);
log(`Server environment mode: ${app.get("env")}`);

const config = getConfig(NODE_ENV as 'development' | 'production');
log(`Config loaded: ${config.isDevMode ? 'development' : 'production'} mode`);

// Development mode middleware to set correct MIME types
if (config.isDevMode) {
  app.use((req, res, next) => {
    if (req.url.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (req.url.endsWith('.ts') || req.url.endsWith('.tsx')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
    next();
  });
}

// Request logging middleware
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

  // Development mode - use Vite's dev server
  if (config.isDevMode) {
    log("Initializing Vite development server...");
    await setupVite(app, server);
    log("Vite development server initialized successfully");
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
    log(`Server started on port ${config.port} in ${app.get("env")} mode`);
  });
})();