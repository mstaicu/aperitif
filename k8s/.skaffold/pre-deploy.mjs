import fs from "fs";
import { execSync } from "node:child_process";

var DOMAIN = process.env.DOMAIN;

if (!DOMAIN) {
  console.error(
    `❌ ${DOMAIN} is not available. Specify it as an environment variable`
  );
  process.exit(1);
}

var hostsContent = fs.readFileSync("/etc/hosts", "utf8");

if (!hostsContent.includes(`127.0.0.1 ${DOMAIN}`)) {
  console.log(`Adding 127.0.0.1 ${DOMAIN} to /etc/hosts`);
  execSync(`echo "127.0.0.1 ${DOMAIN}" | sudo tee -a /etc/hosts`);
} else {
  console.log(`📍 127.0.0.1 ${DOMAIN} already exists in /etc/hosts`);
}

execSync("mkcert -install", { stdio: "inherit" });
