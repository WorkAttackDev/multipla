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
import { formatErrorMessage, formatTodayDate, generateCorrelationId, logger } from "../utils";

export const processPaymentsToSplinxController = async (
  req: Request,
  res: Response,
) => {
  const correlationId = req.correlationId ?? generateCorrelationId();
  const log = logger.child({ correlation_id: correlationId });

  try {
    const payments = await proxyPay<ProxyPayPaymentPayload[]>("/payments");

    const paymentsOnHold: ProxyPayPaymentPayload[] = [];

    for (const paymentPayload of payments) {
      const paymentId = paymentPayload.id.toString();
      const existingPayment = await getPaymentRepository(paymentId);
      if (!existingPayment || existingPayment.status !== "completed") {
        paymentsOnHold.push(paymentPayload);
      }
    }

    if (paymentsOnHold.length === 0) {
      return res.json({ message: "payments already exists" });
    }

    const api = await getSplynxApi();
    const date = formatTodayDate();

    const succeeded: string[] = [];
    const failed: { id: number; userId: string; error: unknown }[] = [];

    for (const paymentPayload of paymentsOnHold) {
      const paymentId = paymentPayload.id.toString();
      try {
        await createPaymentRepository({ knex, paymentId, status: "pending" });

        const checkAgain = await getPaymentRepository(paymentId);
        if (checkAgain && checkAgain.status !== "pending") {
          if (checkAgain.status === "completed") {
            succeeded.push(paymentId);
            await proxyPay(`/payments/${paymentId}`, { method: "DELETE" }).catch(() => {});
          }
          continue;
        }

        const customerId = paymentPayload.custom_fields.user_id;

        if (!customerId || isNaN(Number(customerId))) {
          await updatePaymentStatusRepository({
            knex,
            paymentId,
            status: "failed",
          });
          await createFailedPaymentRepository({
            knex,
            paymentId,
            customerId: customerId || "unknown",
            errorMessage: "Invalid customer ID",
          });
          failed.push({
            id: paymentPayload.id,
            userId: customerId,
            error: "Invalid customer ID",
          });
          continue;
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

        await updatePaymentStatusRepository({
          knex,
          paymentId,
          status: "completed",
        });

        // Acknowledge the payment in ProxyPay
        await proxyPay(`/payments/${paymentId}`, { method: "DELETE" });

        succeeded.push(paymentId);
      } catch (error) {
        try {
          await updatePaymentStatusRepository({
            knex,
            paymentId,
            status: "failed",
          });
          await createFailedPaymentRepository({
            knex,
            paymentId,
            customerId: paymentPayload.custom_fields.user_id || "unknown",
            errorMessage:
              formatErrorMessage(error),
          });
        } catch (dbError) {
          log.error("failed to record payment failure", {
            payment_id: paymentPayload.id,
            error: dbError instanceof Error ? dbError.message : dbError,
          });
        }

        failed.push({
          id: paymentPayload.id,
          userId: paymentPayload.custom_fields.user_id,
          error:
            error instanceof HttpError ? error.body : (error as Error).message,
        });
      }
    }

    return res.json({ message: "done", succeeded, failed });
  } catch (error) {
    log.error("error processing multiples payments to splinx", {
      error: error instanceof Error ? error.message : error,
    });
    if (error instanceof HttpError) {
      return res
        .status(error.status)
        .json({ message: "error processing payments" });
    }
    return res
      .status(500)
      .json({ message: "error processing multiples payments to splinx" });
  }
};
