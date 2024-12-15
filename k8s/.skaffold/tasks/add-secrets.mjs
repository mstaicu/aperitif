// @ts-check
import { execSync } from "child_process";
import { unlinkSync } from "fs";
import { generateKeyPairSync, randomBytes } from "crypto";

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

function createAuthSecrets(namespace) {
  console.log("🔑 generating RSA key pair for access tokens...");

  var { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: "spki",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
    },
  });

  console.log("🔑 generating random secret for refresh tokens...");

  var refreshTokenSecret = randomBytes(32).toString("base64");

  console.log("🔐 creating secrets for auth-secrets...");

  execSync(
    `kubectl create secret generic auth-secrets \
      --from-literal=ACCESS_TOKEN_PRIVATE_KEY="${privateKey}" \
      --from-literal=ACCESS_TOKEN_PUBLIC_KEY="${publicKey}" \
      --from-literal=REFRESH_TOKEN_SECRET="${refreshTokenSecret}" \
      --namespace="${namespace}"`,
    { stdio: "inherit" }
  );
}

export function addSecrets({ domain, namespace }) {
  console.log("🔍 checking if secret/certs-secret exists...");

  if (!secretExists("certs-secret", namespace)) {
    createCertSecret(domain, namespace);
    console.log("✅ certificates secret created successfully.");
  } else {
    console.log("🔐 secret certs-secret already exists. Skipping creation.");
  }

  console.log("🔍 checking if secret/auth-secrets exists...");

  if (!secretExists("auth-secrets", namespace)) {
    createAuthSecrets(namespace);
    console.log("✅ auth secrets created successfully.");
  } else {
    console.log("🔐 secret auth-secrets already exists, skipping creation.");
  }
}
