require("dotenv").config();
module.exports = {
  apps: [
    {
      name: process.env.APP_NAME,
      script: "npm start",
      env: {
        NODE_ENV: process.env.NODE_ENV,
        PORT: process.env.PORT,
        PROXY_PAY_URL: process.env.PROXY_PAY_URL,
        PROXY_PAY_API_KEY: process.env.PROXY_PAY_API_KEY,
        SPLYNX_API_KEY: process.env.SPLYNX_API_KEY,
        SPLYNX_HOOK_SECRET: process.env.SPLYNX_HOOK_SECRET,
        SPLYNX_USER: process.env.SPLYNX_USER,
        SPLYNX_PASSWORD: process.env.SPLYNX_PASSWORD,
        // DATABASE
        DB_HOST: process.env.DB_HOST,
        DB_PORT: process.env.DB_PORT,
        DB_USER: process.env.DB_USER,
        DB_PASSWORD: process.env.DB_PASSWORD,
        DB_NAME: process.env.DB_NAME,
        DB_SOCKET_PATH: process.env.DB_SOCKET_PATH,
      },
    },
  ],
};
