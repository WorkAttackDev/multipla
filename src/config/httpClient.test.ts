import { describe, expect, it } from "vitest";
import { createHttpClient, HttpError } from "./httpClient";

const baseURL = "https://example.com";
const client = createHttpClient(baseURL, {
  Authorization: "Token test",
  "Content-Type": "application/json",
});

describe("createHttpClient", () => {
  it("returns parsed json on a successful response", async () => {
    const body = { id: 1, status: "ok" };
    global.fetch = async () =>
      new Response(JSON.stringify(body), { status: 200 });

    const result = await client<{ id: number; status: string }>("/test");
    expect(result).toEqual(body);
  });

  it("throws HttpError with the response body on non-ok", async () => {
    const body = { error: "Invalid customer ID" };
    global.fetch = async () =>
      new Response(JSON.stringify(body), { status: 422 });

    await expect(client("/test")).rejects.toMatchObject({
      name: "HttpError",
      status: 422,
      body,
    });
  });

  it("handles empty response bodies", async () => {
    global.fetch = async () => new Response(null, { status: 204 });
    const result = await client<unknown>("/test");
    expect(result).toBeUndefined();
  });

  it("sends the method and body when provided", async () => {
    let captured: RequestInit | undefined;
    global.fetch = async (_, init) => {
      captured = init;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    };

    await client("/test", { method: "POST", body: { foo: "bar" } });
    expect(captured?.method).toBe("POST");
    expect(captured?.body).toBe('{"foo":"bar"}');
  });
});

describe("HttpError", () => {
  it("exposes status and body", () => {
    const error = new HttpError(500, "boom");
    expect(error.status).toBe(500);
    expect(error.body).toBe("boom");
  });
});
