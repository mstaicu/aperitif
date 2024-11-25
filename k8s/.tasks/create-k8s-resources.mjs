import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";

var namespace = process.env.NAMESPACE;

if (!namespace) {
  console.error("error: NAMESPACE environment variable must be set.");
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
  const accessTokenSecret = randomBytes(32).toString("base64");
  const refreshTokenSecret = randomBytes(32).toString("base64");

  if (!checkResourceExists("secret", "auth-service-secrets", namespace)) {
    console.log("creating k8s secret for auth-service-secrets...");

    execSync(
      `kubectl create secret generic auth-service-secrets \
      --from-literal=ACCESS_TOKEN_SECRET="${accessTokenSecret}" \
      --from-literal=REFRESH_TOKEN_SECRET="${refreshTokenSecret}" \
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
