import { Request, Response } from "express";
import { getSplynxApi } from "../config/app";
import { SimpleCostumerType, simpleCostumerSchema } from "../models/Costumer";
import createProxyPayReferenceService from "../services/createProxyPayReferenceService";
import { z } from "zod";

type SimpleCostumerWithNameType = SimpleCostumerType & {
  name: string;
};

const paramsSchema = z.object({
  limit: z.coerce
    .number()
    .min(1, "limit must be at least 1")
    .max(100, "limit cannot exceed 100"),
  offset: z.coerce.number().min(0, "offset must be at least 0").default(0),
});

export const updateReferencesController = async (
  req: Request,
  res: Response
) => {
  try {
    const params = paramsSchema.safeParse(req.query);

    if (!params.success) {
      return res.status(400).json({ message: params.error });
    }

    const { limit, offset } = params.data;

    const customersList = (
      (await (await getSplynxApi()).get("admin/customers/customer"))
        ?.response as any[]
    ).filter((c) => !isNaN(parseInt(c.login)));

    if (!customersList?.length) {
      return res.status(404).json({ message: "no customers found" });
    }

    const customers = customersList.slice(offset, offset + limit);

    if (!customers?.length) {
      return res.status(404).json({ message: "no customers found" });
    }

    const validCustomers = z.array(simpleCostumerSchema).parse(customers);

    const results = await Promise.allSettled(
      validCustomers.map((c) => createProxyPayReferenceService(c))
    );

    const { failedCustomers, successCustomers } = results.reduce(
      (
        acc: {
          successCustomers: SimpleCostumerWithNameType[];
          failedCustomers: SimpleCostumerWithNameType[];
        },
        result,
        index
      ) => {
        const cos = customers[index];
        if (result.status === "fulfilled") {
          acc.successCustomers.push({
            id: cos.id,
            login: cos.login,
            name: cos.name,
          });
        } else {
          acc.failedCustomers.push({
            id: cos.id,
            login: cos.login,
            name: cos.name,
          });
        }
        return acc;
      },
      { failedCustomers: [], successCustomers: [] }
    );

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
