import { Knex } from "knex";
import { tablesName } from "../../config/db/utils";
import { PaymentProps } from "./types";

export default async ({
  knex,
  paymentId,
  status,
}: {
  knex: Knex;
  paymentId: string;
  status: PaymentProps["status"];
}) => {
  await knex<PaymentProps>(tablesName.payments)
    .where("payment_id", paymentId)
    .update({ status });
};
