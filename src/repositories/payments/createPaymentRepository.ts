import { Knex } from "knex";
import { tablesName } from "../../config/db/utils";
import ProxyPayPaymentPayload from "../../models/ProxyPayPaymentPayload";

export default async ({
  trx,
  paymentPayload,
}: {
  trx: Knex.Transaction;
  paymentPayload: ProxyPayPaymentPayload;
}) => {
  await trx<PaymentProps>(tablesName.payments).insert({
    payment_id: paymentPayload.id.toString(),
  });
};
