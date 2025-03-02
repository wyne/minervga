import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { execSync } from "child_process";
import path, { dirname } from "path";
import fs from "fs";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Explicitly set environment mode
app.set("env", process.env.NODE_ENV || "development");
log(`Server running in ${app.get("env")} mode`);

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
  // In production mode, ensure the build files are copied to the correct location
  if (app.get("env") === "production") {
    try {
      const serverPublicDir = path.join(__dirname, 'public');
      log(`Server public directory path: ${serverPublicDir}`);

      // Create server/public if it doesn't exist
      if (!fs.existsSync(serverPublicDir)) {
        log('Creating server/public directory');
        fs.mkdirSync(serverPublicDir, { recursive: true });
      }

      // Copy files from dist/public to server/public
      const distPublicDir = path.join(__dirname, '..', 'dist', 'public');
      if (fs.existsSync(distPublicDir)) {
        log(`Found dist/public directory at: ${distPublicDir}`);
        const files = fs.readdirSync(distPublicDir);
        files.forEach(file => {
          const srcPath = path.join(distPublicDir, file);
          const destPath = path.join(serverPublicDir, file);
          if (fs.statSync(srcPath).isDirectory()) {
            fs.cpSync(srcPath, destPath, { recursive: true });
          } else {
            fs.copyFileSync(srcPath, destPath);
          }
        });
        log(`Copied build files to server/public directory. Files: ${files.join(', ')}`);
      } else {
        log(`Warning: dist/public directory not found at ${distPublicDir}`);
      }
    } catch (err) {
      log('Error copying build files: ' + err);
    }
  }

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
    // Log more information about the public directory in production
    const publicPath = path.resolve(__dirname, "public");
    log(`Looking for public directory at: ${publicPath}`);
    if (fs.existsSync(publicPath)) {
      log(`Public directory exists at: ${publicPath}`);
      const files = fs.readdirSync(publicPath);
      log(`Files in public directory: ${files.join(', ')}`);
    } else {
      log(`Public directory not found at: ${publicPath}`);
    }
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();