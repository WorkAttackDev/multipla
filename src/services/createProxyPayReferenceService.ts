import { AxiosProxyPayInstance } from "../config/axios";
import { isProduction } from "../config/utils";

const createProxyPayReferenceService = async (data: {
  login: string;
  id: string;
}) => {
  await AxiosProxyPayInstance.put(`/references/${data.login}`, {
    custom_fields: {
      callback_url: `${
        isProduction
          ? process.env.API_URL || "http://api.izinet.ao:81"
          : "https://3a25-129-122-161-9.ngrok.io"
      }/proxypaycallback`,
      user_id: data.id,
    },
  });
};

export default createProxyPayReferenceService;
