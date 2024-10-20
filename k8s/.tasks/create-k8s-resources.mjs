import { execSync } from "child_process";
import { generateKeyPairSync } from "node:crypto";

var namespace = process.env.NAMESPACE;
var domain = process.env.DOMAIN;
var origin = process.env.ORIGIN;

if (!namespace || !domain || !origin) {
  console.error(
    "error: NAMESPACE, DOMAIN, and ORIGIN environment variables must be set."
  );
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
  const authMongoDbUrl = "mongodb://auth-mongo-srv:27017";

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
      --from-literal=MONGO_DB_URI="${authMongoDbUrl}" \
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

  if (!checkResourceExists("configmap", "auth-service-config", namespace)) {
    const authPort = 3000;

    console.log("creating k8s configmap for auth-service-config...");

    execSync(
      `kubectl create configmap auth-service-config \
      --from-literal=PORT="${authPort}" \
      --from-literal=DOMAIN="${domain}" \
      --from-literal=ORIGIN="${origin}" \
      --namespace="${namespace}"`,
      { stdio: "inherit" }
    );
  } else {
    console.log(
      "configMap auth-service-config already exists, skipping creation."
    );
  }
}

createAuthServiceResources();
