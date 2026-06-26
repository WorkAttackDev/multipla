import { describe, expect, it, vi } from "vitest";
import { processPaymentsToSplinxController } from "./processPaymentsToSplinxController";
import { Request, Response } from "express";

vi.mock("../config/db", () => ({
  knex: {
    insert: vi.fn().mockResolvedValue([]),
    where: vi.fn().mockReturnThis(),
    update: vi.fn().mockResolvedValue(1),
  },
}));

vi.mock("../config/proxyPay", () => ({
  proxyPay: vi.fn(),
}));

vi.mock("../config/app", () => ({
  getSplynxApi: vi.fn(),
}));

vi.mock("../repositories/payments/getPaymentRepository", () => ({
  default: vi.fn().mockResolvedValue(null),
}));

vi.mock("../repositories/payments/createPaymentRepository", () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../repositories/payments/updatePaymentStatusRepository", () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../repositories/payments/createFailedPaymentRepository", () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../utils", async () => {
  const actual = await vi.importActual<typeof import("../utils")>("../utils");
  return {
    ...actual,
    logger: {
      child: () => ({
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
      }),
    },
  };
});

describe("processPaymentsToSplinxController", () => {
  it("continues processing when one item fails", async () => {
    const { proxyPay } = await import("../config/proxyPay");
    const { getSplynxApi } = await import("../config/app");
    const updatePaymentStatusRepository = await import(
      "../repositories/payments/updatePaymentStatusRepository"
    );
    const createFailedPaymentRepository = await import(
      "../repositories/payments/createFailedPaymentRepository"
    );

    const payments = [
      { id: 1, custom_fields: { user_id: "100" }, amount: "10" },
      { id: 2, custom_fields: { user_id: "" }, amount: "20" },
      { id: 3, custom_fields: { user_id: "300" }, amount: "30" },
    ];

    vi.mocked(proxyPay).mockResolvedValueOnce(payments);
    vi.mocked(proxyPay).mockResolvedValueOnce(undefined); // DELETE payment 1
    vi.mocked(proxyPay).mockResolvedValueOnce(undefined); // DELETE payment 3

    const api = {
      get: vi
        .fn()
        .mockResolvedValueOnce({ response: [], statusCode: 200 })
        .mockResolvedValueOnce({ response: [], statusCode: 200 }),
      post: vi
        .fn()
        .mockResolvedValueOnce({ response: { id: 1000 }, statusCode: 201 })
        .mockResolvedValueOnce({ response: { id: 1002 }, statusCode: 201 }),
    };
    vi.mocked(getSplynxApi).mockResolvedValue(api as any);

    const req = {} as Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await processPaymentsToSplinxController(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "done",
        succeeded: ["1", "3"],
        failed: expect.arrayContaining([
          expect.objectContaining({ id: 2, userId: "" }),
        ]),
      }),
    );

    // Verify failed payment was recorded in failed_payments
    expect(createFailedPaymentRepository.default).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentId: "2",
        customerId: "unknown",
        errorMessage: "Invalid customer ID",
      }),
    );

    // Verify completed payments had status update
    expect(updatePaymentStatusRepository.default).toHaveBeenCalledWith(
      expect.objectContaining({ paymentId: "1", status: "completed" }),
    );
    expect(updatePaymentStatusRepository.default).toHaveBeenCalledWith(
      expect.objectContaining({ paymentId: "3", status: "completed" }),
    );
  });

  it("recovers payments that already exist in Splynx (crash after POST before status update)", async () => {
    const { proxyPay } = await import("../config/proxyPay");
    const { getSplynxApi } = await import("../config/app");
    const updatePaymentStatusRepository = await import(
      "../repositories/payments/updatePaymentStatusRepository"
    );

    const payments = [
      { id: 1, custom_fields: { user_id: "100" }, amount: "10" },
    ];

    vi.mocked(proxyPay).mockResolvedValueOnce(payments);
    vi.mocked(proxyPay).mockResolvedValueOnce(undefined); // DELETE after recovery

    const api = {
      get: vi.fn().mockResolvedValueOnce({
        response: [{ id: 42, receipt_number: "1" }],
        statusCode: 200,
      }),
      post: vi.fn(),
    };
    vi.mocked(getSplynxApi).mockResolvedValue(api as any);

    const req = {} as Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await processPaymentsToSplinxController(req, res);

    // Should mark as completed without calling Splynx POST
    expect(api.post).not.toHaveBeenCalled();
    expect(updatePaymentStatusRepository.default).toHaveBeenCalledWith(
      expect.objectContaining({ paymentId: "1", status: "completed" }),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "done",
        succeeded: ["1"],
      }),
    );
  });

  it("returns early when all payments are already processed", async () => {
    const { proxyPay } = await import("../config/proxyPay");
    const getPaymentRepository = await import(
      "../repositories/payments/getPaymentRepository"
    );

    vi.mocked(proxyPay).mockResolvedValueOnce([
      { id: 1, custom_fields: { user_id: "100" }, amount: "10" },
    ]);

    vi.mocked(getPaymentRepository.default).mockResolvedValueOnce({
      id: 1,
      payment_id: "1",
      status: "completed",
      created_at: new Date().toISOString(),
    });

    const req = {} as Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await processPaymentsToSplinxController(req, res);

    expect(res.json).toHaveBeenCalledWith({
      message: "payments already exists",
    });
  });
});
