import dotenv from "dotenv";
import * as fs from "fs";

if (fs.existsSync(".env")) {
  console.log("Using .env file to supply config environment variables");
  dotenv.config({ path: ".env" });
}

export const ENVIRONMENT = process.env.NODE_ENV;
const prod = ENVIRONMENT === "production";

export const MONGODB_URI = process.env["MONGO_URL"];

if (!MONGODB_URI) {
  if (prod) {
    console.warn(
      "No mongo connection string. Set MONGODB_URI environment variable."
    );
  } else {
    console.warn(
      "No mongo connection string. Set MONGODB_URI_LOCAL environment variable."
    );
  }
  process.exit(1);
}
