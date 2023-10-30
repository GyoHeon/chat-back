import dotenv from "dotenv";
import dynamoose from "dynamoose";

dotenv.config({ path: "../../.env" });

// AWS Config
const ddb = new dynamoose.aws.ddb.DynamoDB({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  region: "ap-northeast-2",
});

dynamoose.aws.ddb.set(ddb);
