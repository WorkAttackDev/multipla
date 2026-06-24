require("dotenv").config();
module.exports = {
  apps: [
    {
      name: process.env.APP_NAME,
      script: "npm start",
    },
  ],
};
