import { knex } from "../../config/db";
import { tablesName } from "../../config/db/utils";
import ProxyPayPaymentPayload from "../../models/ProxyPayPaymentPayload";

const getPaymentRepository = async (paymentPayload: ProxyPayPaymentPayload) =>
  await knex<PaymentProps>(tablesName.payments)
    .where("payment_id", paymentPayload.id.toString())
    .first();

export default getPaymentRepository;
