import { isProduction } from "./utils";

const ROUTE_PASS = isProduction ? process.env.API_ROUTE_PASS : "123456";

export const checkRoutePass = (req: any, res: any, next: any) => {
  if (!ROUTE_PASS) {
    return res.status(404).json({
      message: "Route pass not found",
    });
  }

  const pass = req.query.pass || "";

  if (pass !== ROUTE_PASS) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }
  next();
};
