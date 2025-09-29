const express = require("express");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use((req, _res, next) => {
  console.log(">>", req.method, req.originalUrl, "| CT:", req.get("content-type"));
  next();
});

const CORS_ORIGIN = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map(s => s.trim())
  : ["http://localhost:5173","http://localhost:3000"]; // IP:port frontu w LAN dla QR testów
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true,
  exposeHeaders: ["Content-Type", "Content-Disposition"]
}));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", env: process.env.NODE_ENV || "dev", time: new Date().toISOString() });
});

const routesPath = path.join(__dirname, "routes");
if (fs.existsSync(routesPath)) {
  fs.readdirSync(routesPath).forEach(file => {
    if (!file.endsWith(".js")) return;
    const route = require(path.join(routesPath, file));
    const mount = `/api/${file.replace(/\.js$/, "")}`;
    app.use(mount, route);
  });
}
app.use((req, res) => {
  res.status(404).json({ error: "Not found", path: req.originalUrl });
});


app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

(async () => {
  try {
    const { seed } = require("./Database/Seed");
    const { sequelize } = require("./Database/db");

    if (process.env.DEV_RESET_DB === "true") {
      await seed(true); // drop + seed
      console.log("✅ Database reseeded");
    } else {
      await sequelize.sync();
      console.log("✅ Database synced");
    }

    const PORT = parseInt(process.env.PORT || "3000", 10);
    const HOST = process.env.HOST || "0.0.0.0"; // 0.0.0.0 = dostęp z telefonu w LAN (QR)
    app.listen(PORT, HOST, () => {
      console.log(`🚀 Server running at http://${HOST}:${PORT}`);
    });
  } catch (e) {
    console.error("❌ Startup failed:", e);
    process.exit(1);
  }
})();
