import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    env: {
      NODE_ENV: "test",
      PORT: "3001",
      API_URL: "http://localhost:3001",
      API_ROUTE_PASS: "test-pass",
      PROXY_PAY_URL: "https://api.sandbox.proxypay.co.ao",
      PROXY_PAY_API_KEY: "test-key",
      SPLYNX_HOOK_SECRET: "test-secret",
      SPLYNX_USER: "admin",
      SPLYNX_PASSWORD: "admin",
      DB_HOST: "localhost",
      DB_USER: "root",
      DB_PASSWORD: "root",
      DB_NAME: "test",
    },
  },
});
