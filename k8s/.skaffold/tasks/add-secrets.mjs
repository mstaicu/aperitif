// @ts-check
import { execSync } from "child_process";
import { unlinkSync } from "fs";

function secretExists(secretName, namespace) {
  try {
    execSync(`kubectl get secret ${secretName} --namespace=${namespace}`, {
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

function createCertSecret(domain, namespace) {
  console.log("🪪 installing mkcert certificate authority...");

  execSync("mkcert -install", { stdio: "inherit" });

  console.log(
    `🪪 generating certificate and key for domain ${domain} using mkcert...`
  );

  execSync(`mkcert -cert-file cert.pem -key-file key.pem ${domain}`, {
    stdio: "inherit",
  });

  console.log("🔐 creating secrets for certificates...");

  execSync(
    `kubectl create secret tls certs-secret --cert=cert.pem --key=key.pem -n ${namespace}`,
    { stdio: "inherit" }
  );

  // Clean up the local files
  unlinkSync("cert.pem");
  unlinkSync("key.pem");
}

export function addSecrets({ domain, namespace }) {
  console.log("🔍 checking if secret/certs-secret exists...");

  if (!secretExists("certs-secret", namespace)) {
    createCertSecret(domain, namespace);
    console.log("✅ certificates secret created successfully.");
  } else {
    console.log("🔐 secret certs-secret already exists. Skipping creation.");
  }
}
