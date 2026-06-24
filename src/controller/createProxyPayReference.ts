import { Request, Response } from "express";
import { z } from "zod";
import { HttpError } from "../config/httpClient";
import { env } from "../config/utils";
import createProxyPayReferenceService from "../services/createProxyPayReferenceService";
import {
  generateCorrelationId,
  logger,
  redact,
  verifySignature,
} from "../utils";

export const createProxyPayReference = async (req: Request, res: Response) => {
  const correlationId = req.correlationId ?? generateCorrelationId();
  const log = logger.child({ correlation_id: correlationId });

  if (Object.keys(req.body).length === 0)
    return res.status(200).json({ message: "no body was provided created" });

  const check = verifySignature({
    req,
    secret: env.SPLYNX_HOOK_SECRET,
    signatureHeaderKey: "x-splynx-signature",
    algorithm: "sha1",
  });

  if (check.status !== 200)
    return res
      .status(check.status)
      .json({ message: check.message, entity: "Splynx" });

  const DataSchema = z.object({
    attributes: z.object({
      login: z.string().min(9).max(9),
      id: z.string(),
    }),
  });

  type Data = z.infer<typeof DataSchema>;

  const parsed = DataSchema.safeParse(req.body.data);

  if (!parsed.success)
    return res
      .status(400)
      .json({ message: "no reference or id of the client" });

  const data: Data = parsed.data;

  log.info("splynx callback received", { request_body: redact(data) });

  try {
    await createProxyPayReferenceService(data.attributes);

    return res.status(200).json({ message: "reference created" });
  } catch (e) {
    const error = e instanceof HttpError ? e : (e as Error);
    log.error("error creating the reference on proxypay", {
      create_reference_error:
        error instanceof HttpError ? error.body : error.message,
    });
    return res
      .status(error instanceof HttpError ? error.status : 500)
      .json({ message: "error creating the reference on proxypay" });
  }
};
