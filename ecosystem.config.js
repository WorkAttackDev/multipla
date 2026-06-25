require("dotenv").config();
module.exports = {
  apps: [
    {
      name: process.env.APP_NAME,
      script: "npm start",
    },
    {
      name: "izinet-reconcile",
      script: "./build/scripts/reconcile.js",
      cron_restart: "0 0 * * *",
      autorestart: false,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
