import { knex } from "../../config/db";
import { tablesName } from "../../config/db/utils";
import { PaymentProps } from "./types";

const getPaymentRepository = async (paymentId: string) =>
  await knex<PaymentProps>(tablesName.payments)
    .where("payment_id", paymentId)
    .first();

export default getPaymentRepository;
