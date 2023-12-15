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

    console.log(validCustomers);

    const results = await Promise.allSettled(
      validCustomers.map((c) => createProxyPayReferenceService(c))
    );

    type SimpleCostumerWithNameType = SimpleCostumerType & {
      name: string;
    };

    const failedCustomers: SimpleCostumerWithNameType[] = [];
    const successCustomers: SimpleCostumerWithNameType[] = [];

    const [successCount, failureCount] = results.reduce(
      (
        [success, failure]: [number, number],
        result: PromiseSettledResult<void>,
        index: number
      ): [number, number] => {
        const cos = customers[index];
        if (result.status === "fulfilled") {
          successCustomers.push({
            id: cos.id,
            login: cos.login,
            name: cos.name,
          });
          return [success + 1, failure];
        } else {
          failedCustomers.push({
            id: cos.id,
            login: cos.login,
            name: cos.name,
          });
          return [success, failure + 1];
        }
      },
      [0, 0]
    );

    return res.json({
      message: `${successCount} were updated successfully and ${failureCount} failed. ${
        failureCount > 0
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
