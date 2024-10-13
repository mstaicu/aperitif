import { execSync } from "child_process";
import fs from "fs";

const DOMAIN = process.env.DOMAIN;

try {
  const hostsContent = fs.readFileSync("/etc/hosts", "utf8");

  if (!hostsContent.includes(`127.0.0.1 ${DOMAIN}`)) {
    console.log(`Adding 127.0.0.1 ${DOMAIN} to /etc/hosts`);

    execSync(`echo "127.0.0.1 ${DOMAIN}" | sudo tee -a /etc/hosts`);
  } else {
    console.log(`📍 127.0.0.1 ${DOMAIN} already exists in /etc/hosts`);
  }
} catch (error) {
  console.error("Error reading /etc/hosts:", error);
}
