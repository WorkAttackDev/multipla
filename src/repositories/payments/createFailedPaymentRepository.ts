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
  await knex(tablesName.failed_payments).insert({
    payment_id: paymentId,
    customer_id: customerId,
    error_message: errorMessage,
  });
};
