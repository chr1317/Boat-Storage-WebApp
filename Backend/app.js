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

const corsOriginList = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim())
  : ["http://localhost:5173", "http://127.0.0.1:5173"];

function isAllowedOrigin(origin) {
  if (!origin) return true;
  try {
    const u = new URL(origin);
    const h = u.hostname;

    if (h === "localhost" || h === "127.0.0.1") return true;

    if (
      /^192\.168\.\d{1,3}\.\d{1,3}$/.test(h) ||
      /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h) ||
      /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(h)
    ) return true;

    return corsOriginList.includes(origin);
  } catch {
    return false;
  }
}

app.use(
  cors({
    origin: (origin, cb) => cb(null, isAllowedOrigin(origin)),
    credentials: true,
    exposeHeaders: ["Content-Type", "Content-Disposition"],
  })
);


app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", env: process.env.NODE_ENV || "dev", time: new Date().toISOString() });
});

const routesPath = path.join(__dirname, "Routes");
if (fs.existsSync(routesPath)) {
  fs.readdirSync(routesPath).forEach((file) => {
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

module.exports = app;

if (process.env.NODE_ENV !== "test") {
  (async () => {
    try {
      const { sequelize } = require("./Database/db");
      const { seed } = require("./Database/Seed");

      await sequelize.sync();  
      await seed();        


      const PORT = parseInt(process.env.PORT || "3000", 10);
      const HOST = process.env.HOST || "0.0.0.0";
      app.listen(PORT, HOST, () => {
        console.log(`🚀 Server running at http://${HOST}:${PORT}`);
      });
    } catch (e) {
      console.error("❌ Startup failed:", e);
      process.exit(1);
    }
  })();
}
