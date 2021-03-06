// @ts-nocheck
import SplynxApi from "splynx-nodejs-api";
import { isProduction } from "./utils";

const SPLYNX_HOST = isProduction
  ? "http://169.239.132.108/"
  : "https://demo.splynx.com/";

// export const API_KEY = "28a38377afc59b2018f00e95b1c98f4b";
// export const API_SECRET = "9d2363075e714cfc9c59296bee7c0878";

const LOGIN = isProduction ? process.env.SPLYNX_USER : "admin";
const PASSWORD = isProduction ? process.env.SPLYNX_PASSWORD : "admin";

const splynxApi = new SplynxApi(SPLYNX_HOST);

// splynxApi.debug = true;

export const getSplynxApi = async () => {
  splynxApi.version = SplynxApi.API_VERSION_2_0;

  await splynxApi.login(SplynxApi.LOGIN_TYPE_ADMIN, {
    login: LOGIN,
    password: PASSWORD,
  });

  return splynxApi;
};
