import Axios from "axios";

const proxyPaySandboxApi = "https://api.sandbox.proxypay.co.ao";
const proxyPayProductionApi = "https://api.proxypay.co.ao";

const baseHeaders = {
  Authorization: `Token jnmkdkl64j9sq7qcnrv1isrusnln2ddp`,
  Accept: "application/vnd.proxypay.v2+json",
  "Content-Type": "application/json",
};

export const AxiosProxyPayInstance = Axios.create({
  baseURL: proxyPaySandboxApi,
  headers: baseHeaders,
});
