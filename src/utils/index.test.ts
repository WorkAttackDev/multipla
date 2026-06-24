import { describe, expect, it } from "vitest";
import { formatTodayDate, getHash, redact, verifySignature } from "./index";

const mockRequest = (rawBody: Buffer, signature: string) =>
  ({
    rawBody,
    headers: { "x-signature": signature },
  } as any);

describe("getHash", () => {
  it("returns a hex hmac", () => {
    const hash = getHash("hello", "secret");
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("is deterministic", () => {
    expect(getHash("hello", "secret")).toBe(getHash("hello", "secret"));
  });
});

describe("verifySignature", () => {
  it("accepts a valid signature", () => {
    const body = Buffer.from('{"foo":"bar"}', "utf8");
    const signature = getHash(body, "secret");
    const result = verifySignature({
      req: mockRequest(body, signature),
      secret: "secret",
      signatureHeaderKey: "x-signature",
    });
    expect(result.status).toBe(200);
  });

  it("rejects an invalid signature", () => {
    const body = Buffer.from('{"foo":"bar"}', "utf8");
    const result = verifySignature({
      req: mockRequest(body, "wrong"),
      secret: "secret",
      signatureHeaderKey: "x-signature",
    });
    expect(result.status).toBe(401);
  });

  it("requires a raw body", () => {
    const result = verifySignature({
      req: { rawBody: undefined, headers: {} } as any,
      secret: "secret",
      signatureHeaderKey: "x-signature",
    });
    expect(result.status).toBe(401);
  });
});

describe("formatTodayDate", () => {
  it("returns a yyyy-mm-dd string", () => {
    const date = formatTodayDate();
    expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("redact", () => {
  it("masks sensitive fields", () => {
    const input = {
      id: "123",
      password: "secret",
      email: "a@b.com",
      phone: "123456",
      name: "John",
    };
    const result = redact(input) as typeof input;
    expect(result.id).toBe("123");
    expect(result.password).toBe("***");
    expect(result.email).toBe("***");
    expect(result.phone).toBe("***");
    expect(result.name).toBe("***");
  });

  it("recursively redacts nested objects", () => {
    const input = {
      attributes: {
        password: "secret",
        login: "123",
      },
    };
    const result = redact(input) as typeof input;
    expect(result.attributes.password).toBe("***");
    expect(result.attributes.login).toBe("123");
  });

  it("leaves primitives unchanged", () => {
    expect(redact(42)).toBe(42);
    expect(redact(null)).toBe(null);
    expect(redact(undefined)).toBe(undefined);
  });
});
