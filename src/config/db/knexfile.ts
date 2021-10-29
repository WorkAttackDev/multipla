require("dotenv").config({ path: "./../../../.env" });

export default {
  client: "mysql",
  connection: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT!),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    socketPath: process.env.DB_SOCKET_PATH,
  },
  pool: {
    min: 2,
    max: 10,
  },
  migrations: {
    tableName: "knex_migrations",
    extension: process.env.NODE_ENV === "production" ? "js" : "ts",
  },
};
