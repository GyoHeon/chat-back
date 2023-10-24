import AWS from "aws-sdk";
import dotenv from "dotenv";

dotenv.config({ path: "../../env" });

// AWS Config
AWS.config.update({
  region: "ap-northeast-2",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const dynamodb = new AWS.DynamoDB();

export default dynamodb;
