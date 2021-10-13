module.exports = {
  apps: [
    {
      name: "api",
      script: "npm start",
      args: "--port 3001",
      env: {
        PORT: 3001,
        // PROXYPAY
        PROXY_PAY_URL: "https://api.sandbox.proxypay.co.ao",
        PROXY_PAY_API_KEY: "jnmkdkl64j9sq7qcnrv1isrusnln2ddp",
        // SPLINX
        SPLYNX_API_KEY: "76ca38fdd3f172f71049a7e2967d4bb9",
        SPLYNX_HOOK_SECRET: "12345678",
        SPLYNX_USER: "proxypay-api-user",
        SPLYNX_PASSWORD: "JHfLsu8M",
        // DATABASE
        DB_HOST: "srv-splynx",
        DB_PORT: 3306,
        DB_USER: "apidb_user",
        DB_PASSWORD: "Angola2021",
        DB_NAME: "ipworld",
        DB_SOCKET_PATH: "/var/run/mysqld/mysqld.sock",
      },
    },
  ],
};
