import crypto from "crypto";
import { Request, Response } from "express";

export const getHash = (
  data: string | Buffer,
  secret: string,
  algorithm = "sha256"
) => {
  var hmac = crypto.createHmac(algorithm, secret);
  hmac.update(data);
  return hmac.digest("hex");
};

export const formatTodayDate = () => {
  var d = new Date(),
    month = "" + (d.getMonth() + 1),
    day = "" + d.getDate(),
    year = d.getFullYear();

  if (month.length < 2) month = "0" + month;
  if (day.length < 2) day = "0" + day;

  return [year, month, day].join("-");
};

export const verifySignature = ({
  req,
  algorithm = "sha256",
  secret,
  signatureHeaderKey,
}: {
  req: Request;
  signatureHeaderKey: string;
  secret: string;
  algorithm?: string;
}) => {
  if (!req.rawBody)
    return {
      message: "no raw body was provided to validate signature",
      status: 401,
    };

  if (!secret)
    return {
      message: "no api key secret was provided to validate signature",
      status: 401,
    };

  const signature = getHash(req.rawBody, secret, algorithm);

  const requestSignature = req.headers[signatureHeaderKey];

  if (requestSignature !== signature)
    return { message: "invalid signature", status: 401 };

  return { status: 200 };
};
