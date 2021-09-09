import express, { Request, Response, NextFunction } from "express";
import { createProxyPayReference, createSplynxPayment } from "./src/controller";

import dotenv from "dotenv";

dotenv.config();

const app = express();

const port = 3001;

app.use(express.json());

app.get("/", async (req: Request, res: Response) => {
  res.json({ message: "Hello world" });
});

app.post("/splynxcallback", async (req: Request, res: Response) => {
  await createProxyPayReference(req, res);
});

app.post("/proxypaycallback", async (req: Request, res: Response) => {
  console.log(req.body);
  await createSplynxPayment(req, res);
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something broke!" });
});

app.listen(port, function () {
  console.log(`App is listening on port ${port} !`);
});
