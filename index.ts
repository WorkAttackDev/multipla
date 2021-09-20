require("dotenv").config();

import express, { Request, Response, NextFunction } from "express";
import http from "http";
import { verifySignature } from "./src/utils";
import { Buffer } from "buffer";
import { createProxyPayReference } from "./src/controller/createProxyPayReference";
import { createSplynxPayment } from "./src/controller/createSplynxPayment";

declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}

const app = express();

const port = process.env.PORT || 3001;

app.use(
  express.json({
    verify: (req: http.IncomingMessage & { rawBody?: any }, res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.get("/", async (req: Request, res: Response) => {
  res.json({
    message: "Multipla API",
    env: process.env.NODE_ENV,
  });
});

app.post("/splynxcallback", async (req: Request, res: Response) => {
  await createProxyPayReference(req, res);
});

app.post("/proxypaycallback", async (req: Request, res: Response) => {
  try {
    const check = verifySignature({
      req,
      secret: process.env.PROXY_PAY_API_KEY!,
      signatureHeaderKey: "x-signature",
    });

    if (check.status !== 200)
      return res
        .status(check.status)
        .json({ message: check.message, entity: "Proxypay" });

    await createSplynxPayment(req, res);
  } catch (error) {
    console.log(error);
    res
      .status(400)
      .json({ message: "error validating the proxypay callback request" });
  }
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something broke!" });
});

app.listen(port, function () {
  console.log(`App is listening on port ${port} !`);
});
