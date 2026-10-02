import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { config } from "./config.js";

const sns = config.useAws ? new SNSClient({ region: config.awsRegion }) : null;
const ses = config.useAws ? new SESClient({ region: config.awsRegion }) : null;

export async function sendSms(phone, message) {
  if (!phone) return { sent: false, reason: "No phone number" };
  if (!config.useAws) {
    console.log(`[LOCAL SMS] ${phone}: ${message}`);
    return { sent: true, mode: "local-console" };
  }
  const input = {
    PhoneNumber: phone,
    Message: message
  };
  if (config.smsSenderId) input.MessageAttributes = {
    "AWS.SNS.SMS.SenderID": { DataType: "String", StringValue: config.smsSenderId }
  };
  await sns.send(new PublishCommand(input));
  return { sent: true, mode: "AWS SNS" };
}

export async function sendEmail(to, subject, body) {
  if (!to || !config.sesFromEmail) {
    if (!config.useAws) {
      console.log(`[LOCAL EMAIL] ${to}: ${subject}\n${body}`);
      return { sent: true, mode: "local-console" };
    }
    return { sent: false, reason: "SES_FROM_EMAIL or recipient missing" };
  }
  await ses.send(new SendEmailCommand({
    Source: config.sesFromEmail,
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: subject, Charset: "UTF-8" },
      Body: { Text: { Data: body, Charset: "UTF-8" } }
    }
  }));
  return { sent: true, mode: "AWS SES" };
}

export async function notifyContacts(contacts, alert) {
  const message = `EMERGENCY SOS: ${alert.type.toUpperCase()} | ${alert.userName} | Location: ${alert.latitude}, ${alert.longitude} | Time: ${alert.createdAt}`;
  const results = [];
  for (const c of contacts) {
    if (c.phone) results.push(await sendSms(c.phone, message));
    if (c.email) results.push(await sendEmail(c.email, "Emergency SOS Alert", message));
  }
  return results;
}
