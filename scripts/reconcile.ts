import { getSplynxApi } from "../src/config/app";
import { knex } from "../src/config/db";
import { proxyPay } from "../src/config/proxyPay";
import { tablesName } from "../src/config/db/utils";
import updatePaymentStatusRepository from "../src/repositories/payments/updatePaymentStatusRepository";
import createFailedPaymentRepository from "../src/repositories/payments/createFailedPaymentRepository";
import { formatTodayDate, logger } from "../src/utils";

const log = logger.child({ correlation_id: "reconciliation" });

interface ReconciliationResult {
  reprocessed: number;
  failed: number;
  skipped: number;
  errors: { paymentId: string; error: string }[];
}

async function reconcile() {
  log.info("starting reconciliation");

  const result: ReconciliationResult = { reprocessed: 0, failed: 0, skipped: 0, errors: [] };

  try {
    const pendingPayments = await proxyPay<any[]>("/payments");
    log.info(`found ${pendingPayments.length} pending payments in ProxyPay`);

    for (const payment of pendingPayments) {
      const paymentId = payment.id.toString();
      const localPayment = await knex(tablesName.payments)
        .where("payment_id", paymentId)
        .first();

      if (!localPayment) {
        result.skipped++;
        continue;
      }

      if (localPayment.status === "completed") {
        log.warn(`payment ${paymentId} is completed in DB but still pending in ProxyPay — deleting`);
        await proxyPay(`/payments/${paymentId}`, { method: "DELETE" });
        result.reprocessed++;
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

        const data = await api.post("admin/finance/payments", postParams);

        log.info("reconciliation: splynx payment created", {
          payment_id: paymentId,
          splynx_payment_id: data.response.id,
        });

        await updatePaymentStatusRepository({ knex, paymentId, status: "completed" });
        await proxyPay(`/payments/${paymentId}`, { method: "DELETE" });
        result.reprocessed++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

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
