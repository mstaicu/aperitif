import fs from "fs";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";

var tools = ["mkcert", "skaffold", "kustomize"];

var domain = "tma.com";

if (!domain) {
  console.error(
    `❌ ${domain} is not available. Specify it as an environment variable`
  );
  process.exit(1);
}

tools.forEach((cmd) => {
  try {
    execSync(`command -v ${cmd}`, { stdio: "ignore" });
    console.log(`✅ ${cmd} is already installed.`);
  } catch {
    console.error(`❌ ${cmd} is not installed. Please install ${cmd}.`);
    process.exit(1);
  }
});

var hostsContent = fs.readFileSync("/etc/hosts", "utf8");

if (!hostsContent.includes(`127.0.0.1 ${domain}`)) {
  console.log(`Adding 127.0.0.1 ${domain} to /etc/hosts`);
  execSync(`echo "127.0.0.1 ${domain}" | sudo tee -a /etc/hosts`);
} else {
  console.log(`📍 127.0.0.1 ${domain} already exists in /etc/hosts`);
}

execSync("mkcert -install", { stdio: "inherit" });

execSync("kustomize build infra/envs/dev/namespace | kubectl apply -f -", {
  stdio: "inherit",
});

var traefikNamespace = "traefik";
var traefikSecretName = "mkcert-tls-secret";

var tempDir = fs.mkdtempSync(path.join(tmpdir(), "traefik-tls-"));
var certPath = path.join(tempDir, "traefik-tls.crt");
var keyPath = path.join(tempDir, "traefik-tls.key");

try {
  execSync(
    `mkcert -cert-file "${certPath}" -key-file "${keyPath}" ${domain} "*.${domain}"`,
    { stdio: "inherit" }
  );

  execSync(
    `kubectl -n ${traefikNamespace} delete secret ${traefikSecretName} || true`
  );
  execSync(
    `kubectl -n ${traefikNamespace} create secret tls ${traefikSecretName} --cert="${certPath}" --key="${keyPath}"`
  );
} finally {
  fs.unlinkSync(certPath);
  fs.unlinkSync(keyPath);
  fs.rmdirSync(tempDir);
}
