import { execSync } from "child_process";
import { generateKeyPairSync } from "node:crypto";

var namespace = process.env.NAMESPACE;

if (!namespace) {
  console.error("error: NAMESPACE environment variables must be set.");
  process.exit(1);
}

function checkResourceExists(kind, name, namespace) {
  try {
    execSync(`kubectl get ${kind} ${name} --namespace=${namespace}`, {
      stdio: "inherit",
    });
    return true;
  } catch (err) {
    return false;
  }
}

function createAuthServiceResources() {
  if (!checkResourceExists("secret", "auth-service-secrets", namespace)) {
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

    console.log("creating k8s secret for auth-service-secrets...");

    execSync(
      `kubectl create secret generic auth-service-secrets \
      --from-literal=JWT_PRIVATE_KEY="${privateKey}" \
      --from-literal=JWT_PUBLIC_KEY="${publicKey}" \
      --namespace="${namespace}"`,
      { stdio: "inherit" }
    );
  } else {
    console.log(
      "secret auth-service-secrets already exists, skipping creation."
    );
  }
}

createAuthServiceResources();
