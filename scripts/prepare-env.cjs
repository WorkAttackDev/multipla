const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "..", ".env");
const exemplePath = path.join(__dirname, "..", ".env.exemple");

if (!fs.existsSync(envPath)) {
  if (!fs.existsSync(exemplePath)) {
    console.error(".env.exemple not found. Cannot create .env.");
    process.exit(1);
  }
  fs.copyFileSync(exemplePath, envPath);
  console.log("Created .env from .env.exemple — edit DB creds, then run again");
  process.exit(1);
}
