import Axios from "axios";
import { isProduction } from "./utils";

const proxyPaySandboxApi = "https://api.sandbox.proxypay.co.ao";
const proxyPayProductionApi = "https://api.proxypay.co.ao";

const baseHeaders = {
  Authorization: `Token ${process.env.PROXY_PAY_API_KEY_SANDBOX}`,
  Accept: "application/vnd.proxypay.v2+json",
  "Content-Type": "application/json",
};

export const AxiosProxyPayInstance = Axios.create({
  baseURL: proxyPaySandboxApi, //isProduction ? proxyPayProductionApi : proxyPaySandboxApi,
  headers: baseHeaders,
});
