import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(3001),
  API_URL: z.string().url(),
  API_ROUTE_PASS: z.string().min(1),
  PROXY_PAY_URL: z.string().url(),
  PROXY_PAY_API_KEY: z.string().min(1),
  SPLYNX_HOOK_SECRET: z.string().min(1),
  SPLYNX_USER: z.string().min(1),
  SPLYNX_PASSWORD: z.string().min(1),
  SPLYNX_HOST: z.string().url().optional(),
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().default(3306),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_NAME: z.string().min(1),
  DB_SOCKET_PATH: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:");
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === "production";
