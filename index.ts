require("dotenv").config();

import express, { Request, Response, NextFunction } from "express";
import http from "http";
import { env } from "./src/config/utils";
import { createProxyPayReference } from "./src/controller/createProxyPayReference";
import { processPaymentToSplinxController } from "./src/controller/processPaymentToSplinxController";
import { processPaymentsToSplinxController } from "./src/controller/processPaymentsToSplinxController";
import { updateReferencesController } from "./src/controller/updateReferencesController";
import { knex } from "./src/config/db";
import { checkRoutePass } from "./src/config/routePass";
import { generateCorrelationId, logger, verifySignature } from "./src/utils";

const app = express();

const port = env.PORT;

app.use(
  express.json({
    limit: "1mb",
    verify: (req: http.IncomingMessage & { rawBody?: any }, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use((req: Request, res: Response, next: NextFunction) => {
  req.correlationId = generateCorrelationId();
  res.setHeader("x-correlation-id", req.correlationId);
  next();
});

app.get("/", async (_req: Request, res: Response) => {
  try {
    await knex.raw("SELECT 1");
    res.json({
      message: "Izinet payment process API",
      env: env.NODE_ENV,
      db: "connected",
    });
  } catch {
    res.status(503).json({
      message: "Izinet payment process API",
      env: env.NODE_ENV,
      db: "disconnected",
    });
  }
});

app.get(
  "/update-references",
  checkRoutePass,
  async (req: Request, res: Response) => {
    await updateReferencesController(req, res);
  },
);

app.get(
  "/process-payments",
  checkRoutePass,
  async (req: Request, res: Response) => {
    await processPaymentsToSplinxController(req, res);
  },
);

app.post(
  "/splynxcallback",
  rateLimitMiddleware,
  async (req: Request, res: Response) => {
    await createProxyPayReference(req, res);
  },
);

app.post(
  "/proxypaycallback",
  rateLimitMiddleware,
  async (req: Request, res: Response) => {
    try {
      const check = verifySignature({
        req,
        secret: env.PROXY_PAY_API_KEY,
        signatureHeaderKey: "x-signature",
      });

      if (check.status !== 200) {
        res
          .status(check.status)
          .json({ message: check.message, entity: "Proxypay" });
        return;
      }

      await processPaymentToSplinxController(req, res);
    } catch (error) {
      logger.error("error validating the proxypay callback request", {
        correlation_id: req.correlationId,
        error: error instanceof Error ? error.message : error,
      });
      res
        .status(400)
        .json({ message: "error validating the proxypay callback request" });
    }
  },
);

app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  logger.error("unhandled error", {
    correlation_id: req.correlationId,
    error: err instanceof Error ? err.message : err,
  });

  if (err instanceof SyntaxError) {
    return res.status(400).json({ message: "Bad Request" });
  }

  return res.status(500).json({ message: "Something broke!" });
});

const server = app.listen(port, function () {
  logger.info(`App is listening on port ${port}`);
});

const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}, shutting down gracefully`);
  server.close(async () => {
    await knex.destroy();
    process.exit(0);
  });
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

const requestCounts = new Map<string, { count: number; resetTime: number }>();

function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const windowMs = 60_000;
  const maxRequests = 30;
  const key = req.ip ?? "unknown";
  const now = Date.now();
  const entry = requestCounts.get(key);

  if (!entry || now > entry.resetTime) {
    requestCounts.set(key, { count: 1, resetTime: now + windowMs });
    return next();
  }

  entry.count += 1;
  if (entry.count > maxRequests) {
    return res.status(429).json({ message: "Too many requests" });
  }

  next();
}
