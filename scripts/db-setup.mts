import { createConnection } from "mysql2/promise";
import { execSync } from "child_process";
import { dirname, resolve } from "path";

const __dirname = process.argv[1]
  ? dirname(resolve(process.cwd(), process.argv[1]))
  : process.cwd();

async function main() {
  const host = process.env.DB_HOST!;
  const port = Number(process.env.DB_PORT) || 3306;
  const user = process.env.DB_USER!;
  const password = process.env.DB_PASSWORD!;
  const dbName = process.env.DB_NAME!;

  const conn = await createConnection({ host, port, user, password });
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
  await conn.end();
  console.log(`Database "${dbName}" ready`);

  execSync("npx knex migrate:latest --knexfile src/config/db/knexfile.ts", {
    stdio: "inherit",
    cwd: resolve(__dirname, ".."),
  });
}

main().catch((err) => {
  console.error("Database setup failed:", err.message);
  process.exit(1);
});
