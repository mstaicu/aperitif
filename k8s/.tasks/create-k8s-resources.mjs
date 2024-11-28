// @ts-check
import { execSync } from "child_process";
import { generateKeyPairSync, randomBytes } from "node:crypto";

var namespace = process.env.NAMESPACE;

if (!namespace) {
  console.error("error: NAMESPACE environment variables must be set.");
  execSync("kubectl get namespaces", { stdio: "inherit" });
  process.exit(1);
}

function checkResourceExists(kind, name, namespace) {
  try {
    execSync(`kubectl get ${kind} ${name} --namespace=${namespace}`, {
      stdio: "ignore",
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

    var refreshTokenSecret = randomBytes(32).toString("base64");

    console.log("creating k8s secret for auth-service-secrets...");

    execSync(
      `kubectl create secret generic auth-service-secrets \
      --from-literal=ACCESS_TOKEN_PRIVATE_KEY="${privateKey}" \
      --from-literal=ACCESS_TOKEN_PUBLIC_KEY="${publicKey}" \
      --from-literal=REFRESH_TOKEN_SECRET="${refreshTokenSecret}" \
      --namespace="${namespace}"`
    );
  } else {
    console.log(
      "secret auth-service-secrets already exists, skipping creation."
    );
  }
}

createAuthServiceResources();
