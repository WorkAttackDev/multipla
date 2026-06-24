import { createHttpClient } from "./httpClient";
import { env } from "./env";

export const proxyPay = createHttpClient(env.PROXY_PAY_URL, {
  Authorization: `Token ${env.PROXY_PAY_API_KEY}`,
  Accept: "application/vnd.proxypay.v2+json",
  "Content-Type": "application/json",
});
