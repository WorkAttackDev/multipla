export default {
  development: {
    client: "mysql",
    connection: {
      host: "127.0.0.1",
      port: 3306,
      user: "root",
      password: "root",
      database: "multipla",
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: "knex_migrations",
      extension: "ts",
    },
  },
  production: {
    client: "mysql",
    connection: {
      // host: "srv-splynx",
      // port: 3306,
      user: "apidb_user",
      password: "Angola2021",
      database: "ipworld",
      socketPath: "/var/run/mysqld/mysqld.sock",
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: "knex_migrations",
    },
  },
};
