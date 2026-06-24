//@ts-expect-error
import SplynxApi from "splynx-nodejs-api";
import { env, isProduction } from "./utils";

const SPLYNX_HOST =
  env.SPLYNX_HOST ??
  (isProduction ? "https://splynx.izinet.ao/" : "https://demo.splynx.com/");

const LOGIN = env.SPLYNX_USER;
const PASSWORD = env.SPLYNX_PASSWORD;

const splynxApi = new SplynxApi(SPLYNX_HOST);

export type SplynxPaymentResponse = {
  response: { id: number };
  statusCode: number;
};

export type SplynxCustomer = {
  id: string;
  login: string;
  name?: string;
  billing_type?: string;
  [key: string]: unknown;
};

export type SplynxApiClient = {
  version: string;
  login: (
    type: string,
    credentials: { login: string; password: string },
  ) => Promise<void>;
  get: (path: string) => Promise<{ response: unknown; statusCode: number }>;
  post: (
    path: string,
    params: Record<string, unknown>,
  ) => Promise<SplynxPaymentResponse>;
};

export const getSplynxApi = async (): Promise<SplynxApiClient> => {
  splynxApi.version = SplynxApi.API_VERSION_2_0;

  await splynxApi.login(SplynxApi.LOGIN_TYPE_ADMIN, {
    login: LOGIN,
    password: PASSWORD,
  });

  return splynxApi as unknown as SplynxApiClient;
};
