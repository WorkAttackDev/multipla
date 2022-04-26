import { Request, Response } from "express";
import { getSplynxApi } from "../config/app";
import { knex } from "../config/db";
import ProxyPayPaymentPayload from "../models/ProxyPayPaymentPayload";
import createPaymentRepository from "../repositories/payments/createPaymentRepository";
import getPaymentRepository from "../repositories/payments/getPaymentRepository";
import { formatTodayDate } from "../utils";

export const processPaymentToSplinxController = async (
  req: Request,
  res: Response
) => {
  if (!req.body)
    return res.status(400).json({ message: "no request was provided body" });

  const paymentPayload: ProxyPayPaymentPayload = req.body;

  const payment = await getPaymentRepository(paymentPayload);

  if (payment)
    return res.status(200).json({ message: "payment already exists" });

  const trx = await knex.transaction();

  try {
    await createPaymentRepository({ paymentPayload, trx });

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
    console.log("error processing payment to splinx");
    return res.status(500).json({ message: "error processing payment" });
  }
};
