import express from "express";
import { addContact, getContacts, getAlert, listAlerts, putAlert, updateAlert } from "./db.js";
import { authRequired, login, roles, hashPassword, newId, publicUser } from "./auth.js";
import { getUserByEmail, putUser } from "./db.js";
import { notifyContacts } from "./notifications.js";

export function buildRouter(io) {
  const router = express.Router();

  router.get("/health", (req, res) => res.json({ ok: true, service: "cloud-emergency-backend", time: new Date().toISOString() }));

  router.post("/auth/register", async (req, res) => {
    try {
      const { name, email, password, phone } = req.body || {};
      if (!name || !email || !password) return res.status(400).json({ error: "name, email and password are required" });
      if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
      const normalized = email.toLowerCase().trim();
      if (await getUserByEmail(normalized)) return res.status(409).json({ error: "Email already registered" });
      const user = { id: newId("usr"), name, email: normalized, phone: phone || "", role: "user", passwordHash: await hashPassword(password) };
      await putUser(user);
      res.status(201).json({ user: publicUser(user) });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  router.post("/auth/login", async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "Email and password are required" });
    const result = await login(email, password);
    if (!result) return res.status(401).json({ error: "Invalid email or password" });
    res.json(result);
  });

  router.get("/me", authRequired, async (req, res) => {
    const user = await getUserByEmail(req.user.email);
    res.json({ user: publicUser(user) });
  });

  router.get("/contacts", authRequired, async (req, res) => {
    res.json({ contacts: await getContacts(req.user.sub) });
  });

  router.post("/contacts", authRequired, async (req, res) => {
    const { name, phone, email, relationship } = req.body || {};
    if (!name || (!phone && !email)) return res.status(400).json({ error: "Name and phone or email are required" });
    const contact = { id: newId("con"), userId: req.user.sub, name, phone: phone || "", email: email || "", relationship: relationship || "Emergency Contact" };
    await addContact(contact);
    res.status(201).json({ contact });
  });

  router.post("/alerts", authRequired, async (req, res) => {
    try {
      const { latitude, longitude, type, accuracy, note, offlineQueued } = req.body || {};
      if (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) return res.status(400).json({ error: "Valid latitude and longitude are required" });
      const allowedTypes = ["medical", "fire", "police", "accident", "women-safety"];
      if (!allowedTypes.includes(type)) return res.status(400).json({ error: "Invalid emergency type" });

      const contacts = await getContacts(req.user.sub);
      const alert = {
        id: newId("alert"),
        userId: req.user.sub,
        userName: req.user.name,
        type,
        latitude: Number(latitude),
        longitude: Number(longitude),
        accuracy: accuracy ? Number(accuracy) : null,
        note: note || "",
        status: "Received",
        responderId: null,
        responderName: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        offlineQueued: Boolean(offlineQueued)
      };

      await putAlert(alert);
      io.emit("alert:new", alert);
      const notificationResults = await notifyContacts(contacts, alert);
      res.status(201).json({ alert, notificationResults });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Could not create alert" });
    }
  });

  router.get("/alerts", authRequired, async (req, res) => {
    const all = await listAlerts();
    if (req.user.role === "user") return res.json({ alerts: all.filter(a => a.userId === req.user.sub) });
    res.json({ alerts: all });
  });

  router.get("/alerts/:id", authRequired, async (req, res) => {
    const alert = await getAlert(req.params.id);
    if (!alert) return res.status(404).json({ error: "Alert not found" });
    if (req.user.role === "user" && alert.userId !== req.user.sub) return res.status(403).json({ error: "Access denied" });
    res.json({ alert });
  });

  router.patch("/alerts/:id", authRequired, roles("responder", "admin"), async (req, res) => {
    const allowed = ["Received", "Dispatched", "Resolved"];
    const { status, note } = req.body || {};
    if (status && !allowed.includes(status)) return res.status(400).json({ error: "Invalid status" });
    const current = await getAlert(req.params.id);
    if (!current) return res.status(404).json({ error: "Alert not found" });
    const patch = {};
    if (status) patch.status = status;
    if (note !== undefined) patch.responderNote = note;
    if (req.user.role === "responder") {
      patch.responderId = req.user.sub;
      patch.responderName = req.user.name;
    }
    const updated = await updateAlert(req.params.id, patch);
    io.emit("alert:updated", updated);
    res.json({ alert: updated });
  });

  return router;
}
