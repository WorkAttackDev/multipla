import { timingSafeEqual } from "crypto";
import { Request, Response, NextFunction } from "express";
import { env } from "./utils";

const ROUTE_PASS = env.API_ROUTE_PASS;

export const checkRoutePass = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const pass = req.headers["x-api-pass"];

  if (typeof pass !== "string" || !ROUTE_PASS) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const passBuf = Buffer.from(pass, "utf8");
  const routePassBuf = Buffer.from(ROUTE_PASS, "utf8");

  if (passBuf.length !== routePassBuf.length) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    if (!timingSafeEqual(passBuf, routePassBuf)) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
  } catch {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  next();
};
