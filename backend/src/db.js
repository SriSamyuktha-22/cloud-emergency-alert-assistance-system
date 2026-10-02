import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { config } from "./config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localDir = path.join(__dirname, "../data");
const localFile = path.join(localDir, "local-db.json");

const emptyDb = { users: [], contacts: [], alerts: [] };

async function ensureLocalDb() {
  await fs.mkdir(localDir, { recursive: true });

  try {
    await fs.access(localFile);
  } catch {
    await fs.writeFile(localFile, JSON.stringify(emptyDb, null, 2));
  }
}

async function localRead() {
  await ensureLocalDb();

  try {
    return JSON.parse(await fs.readFile(localFile, "utf8"));
  } catch {
    await fs.writeFile(localFile, JSON.stringify(emptyDb, null, 2));
    return structuredClone(emptyDb);
  }
}

async function localWrite(db) {
  await ensureLocalDb();
  await fs.writeFile(localFile, JSON.stringify(db, null, 2));
}
const dynamo = config.useAws
  ? DynamoDBDocumentClient.from(new DynamoDBClient({ region: config.awsRegion }))
  : null;

export async function putUser(user) {
  if (!config.useAws) {
    const db = await localRead();
    db.users = db.users.filter(x => x.email !== user.email);
    db.users.push(user);
    return localWrite(db);
  }
  return dynamo.send(new PutCommand({ TableName: config.tables.users, Item: user }));
}

export async function getUserByEmail(email) {
  if (!config.useAws) {
    const db = await localRead();
    return db.users.find(x => x.email.toLowerCase() === email.toLowerCase()) || null;
  }
  const result = await dynamo.send(new GetCommand({
    TableName: config.tables.users,
    Key: { email: email.toLowerCase() }
  }));
  return result.Item || null;
}

export async function addContact(contact) {
  if (!config.useAws) {
    const db = await localRead();
    db.contacts.push(contact);
    return localWrite(db);
  }
  return dynamo.send(new PutCommand({ TableName: config.tables.contacts, Item: contact }));
}

export async function getContacts(userId) {
  if (!config.useAws) {
    const db = await localRead();
    return db.contacts.filter(x => x.userId === userId);
  }
  const result = await dynamo.send(new QueryCommand({
    TableName: config.tables.contacts,
    KeyConditionExpression: "userId = :u",
    ExpressionAttributeValues: { ":u": userId }
  }));
  return result.Items || [];
}

export async function putAlert(alert) {
  if (!config.useAws) {
    const db = await localRead();
    db.alerts.push(alert);
    await localWrite(db);
    return alert;
  }
  await dynamo.send(new PutCommand({ TableName: config.tables.alerts, Item: alert }));
  return alert;
}

export async function listAlerts() {
  if (!config.useAws) {
    const db = await localRead();
    return db.alerts.sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  }
  const result = await dynamo.send(new ScanCommand({ TableName: config.tables.alerts }));
  return (result.Items || []).sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export async function getAlert(id) {
  if (!config.useAws) {
    const db = await localRead();
    return db.alerts.find(x => x.id === id) || null;
  }
  const result = await dynamo.send(new GetCommand({
    TableName: config.tables.alerts,
    Key: { id }
  }));
  return result.Item || null;
}

export async function updateAlert(id, patch) {
  if (!config.useAws) {
    const db = await localRead();
    const index = db.alerts.findIndex(x => x.id === id);
    if (index < 0) return null;
    db.alerts[index] = { ...db.alerts[index], ...patch, updatedAt: new Date().toISOString() };
    await localWrite(db);
    return db.alerts[index];
  }

  const keys = Object.keys(patch);
  const names = {};
  const values = {};
  const expressions = [];
  keys.forEach((key, i) => {
    names[`#k${i}`] = key;
    values[`:v${i}`] = patch[key];
    expressions.push(`#k${i} = :v${i}`);
  });
  names["#updatedAt"] = "updatedAt";
  values[":updatedAt"] = new Date().toISOString();
  expressions.push("#updatedAt = :updatedAt");

  const result = await dynamo.send(new UpdateCommand({
    TableName: config.tables.alerts,
    Key: { id },
    UpdateExpression: "SET " + expressions.join(", "),
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
    ReturnValues: "ALL_NEW"
  }));
  return result.Attributes;
}

export async function seedDemoUsers(hashPassword) {
  if (config.useAws) return;
  const db = await localRead();
  if (db.users.length) return;
  const users = [
    { id: "demo-user", name: "Demo User", email: "user@demo.com", role: "user", passwordHash: await hashPassword("User@123"), phone: "+919999999999" },
    { id: "demo-responder", name: "Demo Responder", email: "responder@demo.com", role: "responder", passwordHash: await hashPassword("Responder@123"), phone: "+919999999998" },
    { id: "demo-admin", name: "Demo Admin", email: "admin@demo.com", role: "admin", passwordHash: await hashPassword("Admin@123"), phone: "+919999999997" }
  ];
  db.users.push(...users);
  await localWrite(db);
}
