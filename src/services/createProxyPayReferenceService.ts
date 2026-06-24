import { proxyPay } from "../config/proxyPay";
import { env } from "../config/utils";

const createProxyPayReferenceService = async (data: {
  login: string;
  id: string;
}) => {
  const callbackUrl = `${env.API_URL}/proxypaycallback`;

  await proxyPay(`/references/${data.login}`, {
    method: "PUT",
    body: {
      custom_fields: {
        callback_url: callbackUrl,
        user_id: data.id,
      },
    },
  });
};

export default createProxyPayReferenceService;
