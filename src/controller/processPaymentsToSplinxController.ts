import { Request, Response } from "express";
import { getSplynxApi } from "../config/app";
import { AxiosProxyPayInstance } from "../config/axios";
import { knex } from "../config/db";
import ProxyPayPaymentPayload from "../models/ProxyPayPaymentPayload";
import createPaymentRepository from "../repositories/payments/createPaymentRepository";
import getPaymentRepository from "../repositories/payments/getPaymentRepository";
import { formatTodayDate } from "../utils";

export const processPaymentsToSplinxController = async (
  req: Request,
  res: Response
) => {
  const proxypayRes = await AxiosProxyPayInstance.get<ProxyPayPaymentPayload[]>(
    "/payments"
  );

  const payments = proxypayRes.data;

  const paymentsOnHold: ProxyPayPaymentPayload[] = [];

  for await (const payment of payments) {
    const p = await getPaymentRepository(payment);
    if (!p) {
      paymentsOnHold.push(payment);
    }
  }

  if (paymentsOnHold.length === 0) {
    return res.status(200).json({ message: "payments already exists" });
  }

  const trx = await knex.transaction();
  try {
    const api = await getSplynxApi();
    const date = formatTodayDate();

    for await (const paymentPayload of paymentsOnHold) {
      await createPaymentRepository({ paymentPayload, trx });
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
      console.log({ message: "sucesso", data: JSON.stringify(data) });
      await AxiosProxyPayInstance.delete(`/payments/${paymentPayload.id}`);
    }

    await trx.commit();
    return res.json({
      message: "success",
      paymentIds: paymentsOnHold.map((p) => p.id.toString()),
    });
  } catch (error) {
    await trx.rollback();
    console.log({ message: "error processing multiples payments to splinx" });
    console.log(error);
    return res.status(500).json({ message: "error processing payment" });
  }
};
