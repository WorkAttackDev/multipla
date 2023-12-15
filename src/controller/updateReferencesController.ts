import { Request, Response } from "express";
import { getSplynxApi } from "../config/app";
import { SimpleCostumerType, simpleCostumerSchema } from "../models/Costumer";
import createProxyPayReferenceService from "../services/createProxyPayReferenceService";
import { z } from "zod";

export const updateReferencesController = async (
  req: Request,
  res: Response
) => {
  try {
    const customers = (
      await (await getSplynxApi()).get("admin/customers/customer")
    )?.response as any[];

    if (!customers?.length) {
      return res.status(404).json({ message: "no customers found" });
    }

    const validCustomers = z.array(simpleCostumerSchema).parse(customers);

    type SimpleCostumerWithNameType = SimpleCostumerType & {
      name: string;
    };

    const failedCustomers: SimpleCostumerWithNameType[] = [];
    const successCustomers: SimpleCostumerWithNameType[] = [];

    for await (const c of validCustomers) {
      if (isNaN(parseInt(c.login))) continue;
      await createProxyPayReferenceService(c)
        .catch(() => {
          failedCustomers.push({ ...c, name: c.login });
        })
        .then(() => {
          successCustomers.push({ ...c, name: c.login });
        });
    }

    return res.json({
      message: `${successCustomers.length} were updated successfully and ${
        failedCustomers.length
      } failed. ${
        failedCustomers.length > 0
          ? "if some failed, check if the login of the customer is a number and not a text"
          : ""
      }`,
      data: { failedCustomers, successCustomers },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "error updating references" });
  }
};
