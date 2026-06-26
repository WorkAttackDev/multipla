import { getSplynxApi } from "../src/config/app";
import { knex } from "../src/config/db";
import { proxyPay } from "../src/config/proxyPay";
import { tablesName } from "../src/config/db/utils";
import createPaymentRepository from "../src/repositories/payments/createPaymentRepository";
import updatePaymentStatusRepository from "../src/repositories/payments/updatePaymentStatusRepository";
import createFailedPaymentRepository from "../src/repositories/payments/createFailedPaymentRepository";
import { formatErrorMessage, formatTodayDate, logger } from "../src/utils";

const log = logger.child({ correlation_id: "reconciliation" });

const MAX_RETRIES = 3;

interface ReconciliationResult {
  reprocessed: number;
  failed: number;
  skipped: number;
  errors: { paymentId: string; error: string }[];
  retry_exhausted: number;
}

async function reconcile() {
  log.info("starting reconciliation");

  const result: ReconciliationResult = { reprocessed: 0, failed: 0, skipped: 0, errors: [], retry_exhausted: 0 };

  try {
    const pendingPayments = await proxyPay<any[]>("/payments");
    log.info(`found ${pendingPayments.length} pending payments in ProxyPay`);

    for (const payment of pendingPayments) {
      const paymentId = payment.id.toString();
      let localPayment = await knex(tablesName.payments)
        .where("payment_id", paymentId)
        .first();

      if (!localPayment) {
        await createPaymentRepository({ knex, paymentId, status: "pending" });
        localPayment = await knex(tablesName.payments)
          .where("payment_id", paymentId)
          .first();

        if (!localPayment) {
          result.errors.push({ paymentId, error: "failed to create local payment record" });
          result.failed++;
          continue;
        }
      }

      if (localPayment.status === "completed") {
        log.warn(`payment ${paymentId} is completed in DB but still pending in ProxyPay — deleting`);
        try {
          await proxyPay(`/payments/${paymentId}`, { method: "DELETE" });
          log.info("reconciliation: proxyPay payment deleted", { payment_id: paymentId });
        } catch (error) {
          log.error("reconciliation: failed to delete payment from ProxyPay", {
            payment_id: paymentId,
            error: formatErrorMessage(error),
          });
        }
        result.reprocessed++;
        continue;
      }

      const failedRecord = await knex(tablesName.failed_payments)
        .where("payment_id", paymentId)
        .first();

      if (failedRecord && failedRecord.retry_count >= MAX_RETRIES) {
        log.warn(`payment ${paymentId} exceeded max retries (${MAX_RETRIES}), skipping`);
        result.retry_exhausted++;
        continue;
      }

      try {
        const api = await getSplynxApi();
        const customerId = payment.custom_fields?.user_id;

        if (!customerId || isNaN(Number(customerId))) {
          await updatePaymentStatusRepository({ knex, paymentId, status: "failed" });
          await createFailedPaymentRepository({
            knex,
            paymentId,
            customerId: customerId || "unknown",
            errorMessage: "Reconciliation: Invalid customer ID",
          });
          result.failed++;
          continue;
        }

        const date = formatTodayDate();
        const postParams = {
          customer_id: customerId,
          payment_type: "2",
          date,
          receipt_number: paymentId,
          amount: payment.amount,
          field_1: "",
          field_2: "",
          field_3: "",
          field_4: "",
          field_5: "",
        };

        try {
          const existingResponse = await api.get(
            `admin/finance/payments?main_attributes[receipt_number]=${paymentId}`,
          );
          const existingList = existingResponse.response as { id: number }[];
          if (existingList.length > 0) {
            log.info("reconciliation: payment already exists in Splynx — marking completed", {
              payment_id: paymentId,
              splynx_payment_id: existingList[0].id,
            });
            await updatePaymentStatusRepository({ knex, paymentId, status: "completed" });
            try {
              await proxyPay(`/payments/${paymentId}`, { method: "DELETE" });
            } catch (proxyError) {
              log.error("reconciliation: failed to delete payment from ProxyPay after Splynx recovery", {
                payment_id: paymentId,
                error: formatErrorMessage(proxyError),
              });
            }
            result.reprocessed++;
            continue;
          }
        } catch (checkError) {
          log.warn("reconciliation: failed to check Splynx for existing payment, proceeding with POST", {
            payment_id: paymentId,
            error: formatErrorMessage(checkError),
          });
        }

        const data = await api.post("admin/finance/payments", postParams);

        log.info("reconciliation: splynx payment created", {
          payment_id: paymentId,
          splynx_payment_id: data.response.id,
        });

        await updatePaymentStatusRepository({ knex, paymentId, status: "completed" });
        try {
          await proxyPay(`/payments/${paymentId}`, { method: "DELETE" });
          log.info("reconciliation: proxyPay payment deleted", { payment_id: paymentId });
        } catch (error) {
          log.error("reconciliation: failed to delete payment from ProxyPay after Splynx creation", {
            payment_id: paymentId,
            error: formatErrorMessage(error),
          });
        }
        result.reprocessed++;
      } catch (error) {
        const errorMessage = formatErrorMessage(error);

        try {
          await updatePaymentStatusRepository({ knex, paymentId, status: "failed" });
          await createFailedPaymentRepository({
            knex,
            paymentId,
            customerId: payment.custom_fields?.user_id || "unknown",
            errorMessage: `Reconciliation: ${errorMessage}`,
          });
        } catch (dbError) {
          log.error("failed to record reconciliation failure", {
            payment_id: paymentId,
            error: dbError instanceof Error ? dbError.message : dbError,
          });
        }

        result.errors.push({ paymentId, error: errorMessage });
        result.failed++;
      }
    }

    log.info("reconciliation complete", { result });
  } catch (error) {
    log.error("reconciliation failed", {
      error: error instanceof Error ? error.message : error,
    });
  } finally {
    await knex.destroy();
  }

  console.log(JSON.stringify({ level: "info", message: "reconciliation result", result }, null, 2));
}

reconcile();
