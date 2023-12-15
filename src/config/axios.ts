import Axios from "axios";
import { isProduction } from "./utils";

const PROXY_PAY_API_KEY = isProduction
  ? process.env.PROXY_PAY_API_KEY
  : "jnmkdkl64j9sq7qcnrv1isrusnln2ddp";

const PROXY_PAY_URL = isProduction
  ? process.env.PROXY_PAY_URL
  : "https://api.sandbox.proxypay.co.ao";

export const AxiosProxyPayInstance = Axios.create({
  baseURL: PROXY_PAY_URL,
  headers: {
    Authorization: `Token ${PROXY_PAY_API_KEY}`,
    Accept: "application/vnd.proxypay.v2+json",
    "Content-Type": "application/json",
  },
});
