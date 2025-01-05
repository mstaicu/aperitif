import { execSync } from "child_process";
import fs from "fs";

export function addHost(domain) {
  var hostsContent = fs.readFileSync("/etc/hosts", "utf8");

  if (!hostsContent.includes(`127.0.0.1 ${domain}`)) {
    console.log(`Adding 127.0.0.1 ${domain} to /etc/hosts`);

    execSync(`echo "127.0.0.1 ${domain}" | sudo tee -a /etc/hosts`);
  } else {
    console.log(`📍 127.0.0.1 ${domain} already exists in /etc/hosts`);
  }
}
