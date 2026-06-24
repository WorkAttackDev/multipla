import { env } from "../env";

export default {
  client: "mysql2",
  connection: {
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    socketPath: env.DB_SOCKET_PATH,
  },
  pool: {
    min: 0,
    max: 10,
    idleTimeoutMillis: 30_000,
    acquireTimeoutMillis: 30_000,
    afterCreate: (conn: any, done: any) =>
      conn.query("SELECT 1", (err: unknown) => done(err, conn)),
  },
  migrations: {
    tableName: "knex_migrations",
    extension: env.NODE_ENV === "production" ? "js" : "ts",
  },
};
