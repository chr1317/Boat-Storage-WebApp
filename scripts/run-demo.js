const os = require("os");
const { spawn } = require("child_process");

function getLanIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === "IPv4" && !net.internal) return net.address;
    }
  }
  return "127.0.0.1";
}

const ip = getLanIp();

console.log("\n=== BoatHall Docker Demo ===");
console.log("LAN IP   :", ip);
console.log("Frontend :", `http://${ip}:5173`);
console.log("Backend  :", `http://${ip}:3000/api/health`);
console.log("===========================\n");

const env = {
  ...process.env,
  VITE_API_URL: `http://${ip}:3000/api`,
  VITE_PUBLIC_BASE_URL: `http://${ip}:5173`,
};

const p = spawn(
  "docker",
  [
  "compose",
  "-f",
  "docker-compose.demo.yml",
  "up",
  "--force-recreate",
  "--remove-orphans"
],
  {
    stdio: "inherit",
    env,
  }
);

p.on("exit", (code) => process.exit(code ?? 0));
