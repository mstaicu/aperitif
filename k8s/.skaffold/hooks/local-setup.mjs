import fs from "fs";
import { execSync } from "node:child_process";

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

console.log("🔑 Installing mkcert CA...");
execSync("mkcert -install", { stdio: "inherit" });

console.log("🔧 Applying namespaces...");

execSync("kustomize build infra2/envs/dev/namespace | kubectl apply -f -", {
  stdio: "inherit",
});

var traefikNamespace = "traefik";
var traefikSecretName = "traefik-tls";

console.log(`⏳ Waiting for namespace '${traefikNamespace}'...`);

while (true) {
  try {
    execSync(`kubectl get ns ${traefikNamespace}`, { stdio: "ignore" });
    break;
  } catch {
    await new Promise((res) => setTimeout(res, 1000));
  }
}
console.log(`✅ Namespace '${traefikNamespace}' is ready.`);

console.log(`🔐 Generating TLS cert for ${domain}...`);
execSync(
  `mkcert -cert-file traefik-tls.crt -key-file traefik-tls.key ${domain} "*.${domain}"`,
  { stdio: "inherit" }
);

console.log(
  `🔒 Creating/updating TLS secret '${traefikSecretName}' in namespace '${traefikNamespace}'...`
);

execSync(
  `kubectl -n ${traefikNamespace} delete secret ${traefikSecretName} || true`
);
execSync(
  `kubectl -n ${traefikNamespace} create secret tls ${traefikSecretName} --cert=traefik-tls.crt --key=traefik-tls.key`
);

console.log("✅ TLS secret applied. Ready for Skaffold deploy!");
