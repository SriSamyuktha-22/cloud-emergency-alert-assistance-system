import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: Number(process.env.PORT || 5000),
  jwtSecret: process.env.JWT_SECRET || "development-secret-change-me",
  frontendOrigin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  useAws: String(process.env.USE_AWS).toLowerCase() === "true",
  awsRegion: process.env.AWS_REGION || "ap-south-1",
  tables: {
    users: process.env.USERS_TABLE || "EmergencyUsers",
    contacts: process.env.CONTACTS_TABLE || "EmergencyContacts",
    alerts: process.env.ALERTS_TABLE || "EmergencyAlerts"
  },
  smsSenderId: process.env.SNS_SMS_SENDER_ID || "",
  sesFromEmail: process.env.SES_FROM_EMAIL || ""
};
