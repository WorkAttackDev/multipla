import Axios from "axios";
// require("dotenv").config();
// import { isProduction } from "./utils";

// const proxyPaySandboxApi = "https://api.sandbox.proxypay.co.ao";
// const proxyPayProductionApi = "https://api.proxypay.co.ao";

export const AxiosProxyPayInstance = Axios.create({
  baseURL: process.env.PROXY_PAY_URL,
  headers: {
    Authorization: `Token ${process.env.PROXY_PAY_API_KEY}`,
    Accept: "application/vnd.proxypay.v2+json",
    "Content-Type": "application/json",
  },
});
