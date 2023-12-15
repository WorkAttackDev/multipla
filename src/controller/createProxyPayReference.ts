import { AxiosError } from "axios";
import { Request, Response } from "express";
import { z } from "zod";
import createProxyPayReferenceService from "../services/createProxyPayReferenceService";
import { verifySignature } from "../utils";

export const createProxyPayReference = async (req: Request, res: Response) => {
  if (Object.keys(req.body).length === 0)
    return res.status(200).json({ message: "no body was provided created" });

  const check = verifySignature({
    req,
    secret: process.env.SPLYNX_HOOK_SECRET!,
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

  if (!DataSchema.safeParse(req.body.data))
    return res
      .status(400)
      .json({ message: "no reference or id of the client" });

  const data: Data = req.body.data;

  console.log({ reques_body: data });

  try {
    await createProxyPayReferenceService(data.attributes);

    return res.status(200).json({ message: "reference created" });
  } catch (e) {
    const error = e as AxiosError;
    console.log({ create_reference_error: error });
    return res
      .status(500)
      .json({ message: "error creating the reference on proxypay" });
  }
};
