import crypto, { randomUUID } from "crypto";
import { Request } from "express";
import { Buffer } from "buffer";

declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
      correlationId?: string;
    }
  }
}

export const getHash = (
  data: string | Buffer,
  secret: string,
  algorithm = "sha256",
) => {
  const hmac = crypto.createHmac(algorithm, secret);
  hmac.update(data);
  return hmac.digest("hex");
};

export const formatTodayDate = () => {
  const d = new Date();
  let month = "" + (d.getMonth() + 1);
  let day = "" + d.getDate();
  const year = d.getFullYear();

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

export const SENSITIVE_FIELDS = [
  "password",
  "phone",
  "email",
  "billing_email",
  "name",
  "numero_de_identificacao_fiscal",
  "telefone_alteranativo",
  "tel_alteranativo",
  "street_1",
  "street_2",
  "gps",
] as const;

export const redact = (value: unknown): unknown => {
  if (value === null || value === undefined) return value;

  if (typeof value === "string") return value;

  if (Array.isArray(value)) {
    return value.map(redact);
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(record)) {
      const sensitive = SENSITIVE_FIELDS.some(
        (field) => field.toLowerCase() === key.toLowerCase(),
      );
      if (sensitive) {
        result[key] = "***";
      } else {
        result[key] = redact(record[key]);
      }
    }
    return result;
  }

  return value;
};

type LogLevel = "info" | "error" | "warn";

export const logger = {
  child: (bindings: Record<string, unknown>) => {
    return {
      info: (msg: string, extra?: Record<string, unknown>) =>
        logger.info(msg, { ...bindings, ...extra }),
      error: (msg: string, extra?: Record<string, unknown>) =>
        logger.error(msg, { ...bindings, ...extra }),
      warn: (msg: string, extra?: Record<string, unknown>) =>
        logger.warn(msg, { ...bindings, ...extra }),
    };
  },
  info: (msg: string, extra?: Record<string, unknown>) =>
    log("info", msg, extra),
  error: (msg: string, extra?: Record<string, unknown>) =>
    log("error", msg, extra),
  warn: (msg: string, extra?: Record<string, unknown>) =>
    log("warn", msg, extra),
};

const log = (level: LogLevel, msg: string, extra?: Record<string, unknown>) => {
  const entry = {
    level,
    time: new Date().toISOString(),
    msg,
    correlation_id: extra?.correlation_id ?? generateCorrelationId(),
    ...extra,
  };

  if (level === "error") {
    console.error(JSON.stringify(entry));
  } else if (level === "warn") {
    console.warn(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
};

export const generateCorrelationId = () => randomUUID();

export const formatErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null) {
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
  return String(error);
};
