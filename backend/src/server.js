import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { config } from "./config.js";
import { seedDemoUsers, getAlert, updateAlert } from "./db.js";
import { buildRouter } from "./routes.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: config.frontendOrigin, methods: ["GET", "POST", "PATCH"] }
});

app.use(cors({ origin: config.frontendOrigin }));
app.use(express.json({ limit: "1mb" }));

app.use("/api", buildRouter(io));

io.on("connection", socket => {
  socket.emit("connected", { message: "Real-time emergency channel connected" });
  socket.on("alert:location", async ({ alertId, latitude, longitude }) => {
    try {
      const alert = await getAlert(alertId);
      if (!alert) return;
      const updated = await updateAlert(alertId, { latitude: Number(latitude), longitude: Number(longitude) });
      io.emit("alert:updated", updated);
    } catch (e) {
      console.error("Location update failed", e);
    }
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

await seedDemoUsers(async p => {
  const { hashPassword } = await import("./auth.js");
  return hashPassword(p);
});

server.listen(config.port, () => {
  console.log(`Cloud Emergency backend running on http://localhost:${config.port}`);
  console.log(`AWS mode: ${config.useAws ? "ENABLED" : "LOCAL DEMO MODE"}`);
});
