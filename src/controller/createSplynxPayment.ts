import { Request, Response } from "express";
import { getSplynxApi } from "../config/app";
import { knex } from "../config/db";
import { tablesName } from "../config/db/utils";
import ProxyPayPaymentPayload from "../models/ProxyPayPaymentPayload";
import { formatTodayDate } from "../utils";

interface PaymentProps {
  id: number;
  payment_id: string;
}

export const createSplynxPayment = async (req: Request, res: Response) => {
  if (!req.body)
    return res.status(400).json({ message: "no request was provided body" });

  const paymentPayload: ProxyPayPaymentPayload = req.body;

  const payment = await knex<PaymentProps>(tablesName.payments)
    .where("payment_id", paymentPayload.id.toString())
    .first();

  if (payment)
    return res.status(200).json({ message: "payment already exists" });

  const trx = await knex.transaction();

  try {
    await trx<PaymentProps>(tablesName.payments).insert({
      payment_id: paymentPayload.id.toString(),
    });

    const api = await getSplynxApi();
    const date = formatTodayDate();

    const postParams = {
      customer_id: paymentPayload.custom_fields.user_id,
      payment_type: "2",
      date,
      receipt_number: "",
      amount: paymentPayload.amount,
      field_1: "",
      field_2: "",
      field_3: "",
      field_4: "",
      field_5: "",
    };

    const data = await api.post("admin/finance/payments", postParams);

    console.log({ message: "sucesso", data });

    await trx.commit();

    return res.json({
      message: "success",
      paymentId: paymentPayload.id.toString(),
    });
  } catch (error) {
    await trx.rollback();
    console.log(error);
    return res.status(500).json({ message: "error processing payment" });
  }
};
