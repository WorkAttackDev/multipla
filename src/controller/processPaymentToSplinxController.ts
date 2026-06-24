import { Request, Response } from "express";
import { getSplynxApi } from "../config/app";
import { knex } from "../config/db";
import { HttpError } from "../config/httpClient";
import { proxyPay } from "../config/proxyPay";
import ProxyPayPaymentPayload from "../models/ProxyPayPaymentPayload";
import createPaymentRepository from "../repositories/payments/createPaymentRepository";
import updatePaymentStatusRepository from "../repositories/payments/updatePaymentStatusRepository";
import createFailedPaymentRepository from "../repositories/payments/createFailedPaymentRepository";
import getPaymentRepository from "../repositories/payments/getPaymentRepository";
import { formatTodayDate, generateCorrelationId, logger } from "../utils";

export const processPaymentToSplinxController = async (
  req: Request,
  res: Response,
) => {
  const correlationId = req.correlationId ?? generateCorrelationId();
  const log = logger.child({ correlation_id: correlationId });

  if (!req.body)
    return res.status(400).json({ message: "no request was provided body" });

  const paymentPayload: ProxyPayPaymentPayload = req.body;
  const paymentId = paymentPayload.id.toString();

  const existingPayment = await getPaymentRepository(paymentId);

  if (existingPayment?.status === "completed")
    return res.status(200).json({ message: "payment already exists" });

  try {
    await createPaymentRepository({ knex, paymentId, status: "pending" });

    const checkAgain = await getPaymentRepository(paymentId);
    if (checkAgain && checkAgain.status !== "pending") {
      return res.status(200).json({ message: "payment already exists" });
    }

    const api = await getSplynxApi();
    const date = formatTodayDate();

    const customerId = paymentPayload.custom_fields.user_id;

    if (!customerId || isNaN(Number(customerId))) {
      await updatePaymentStatusRepository({ knex, paymentId, status: "failed" });
      await createFailedPaymentRepository({
        knex,
        paymentId,
        customerId: customerId || "unknown",
        errorMessage: "Invalid customer ID",
      });
      throw new HttpError(422, {
        field: "customer_id",
        message: "Invalid customer ID",
      });
    }

    const postParams = {
      customer_id: customerId,
      payment_type: "2",
      date,
      receipt_number: paymentId,
      amount: paymentPayload.amount,
      field_1: "",
      field_2: "",
      field_3: "",
      field_4: "",
      field_5: "",
    };

    const data = await api.post("admin/finance/payments", postParams);

    log.info("splynx payment created", {
      payment_id: paymentPayload.id,
      splynx_payment_id: data.response.id,
    });

    await updatePaymentStatusRepository({ knex, paymentId, status: "completed" });
    await proxyPay(`/payments/${paymentId}`, { method: "DELETE" });

    return res.json({
      message: "success",
      paymentId,
    });
  } catch (error) {
    if (error instanceof HttpError && error.status === 422) {
      return res.status(422).json({
        message: "error processing payment",
        paymentId,
      });
    }

    try {
      await updatePaymentStatusRepository({ knex, paymentId, status: "failed" });
      await createFailedPaymentRepository({
        knex,
        paymentId,
        customerId: paymentPayload.custom_fields.user_id || "unknown",
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    } catch (dbError) {
      log.error("failed to record payment failure", {
        error: dbError instanceof Error ? dbError.message : dbError,
      });
    }

    log.error("error processing payment to splinx", {
      error: error instanceof HttpError ? error.body : (error as Error).message,
    });

    return res.status(error instanceof HttpError ? error.status : 500).json({
      message: "error processing payment",
      paymentId,
    });
  }
};
