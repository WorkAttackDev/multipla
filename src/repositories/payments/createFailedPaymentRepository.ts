import { Knex } from "knex";
import { tablesName } from "../../config/db/utils";

export default async ({
  knex,
  paymentId,
  customerId,
  errorMessage,
}: {
  knex: Knex;
  paymentId: string;
  customerId: string;
  errorMessage: string;
}) => {
  await knex(tablesName.failed_payments)
    .insert({
      payment_id: paymentId,
      customer_id: customerId,
      error_message: errorMessage,
    })
    .onConflict("payment_id")
    .merge({
      error_message: knex.raw("VALUES(error_message)"),
      retry_count: knex.raw("failed_payments.retry_count + 1"),
      updated_at: knex.raw("NOW()"),
    });
};
