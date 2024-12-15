// @ts-check
import { execSync } from "child_process";
import { unlinkSync } from "fs";
import { generateKeyPairSync, randomBytes } from "node:crypto";

var DOMAIN = process.env.DOMAIN;
var NAMESPACE = process.env.NAMESPACE;

function addPublicLoadBalancerCerts() {
  try {
    console.log("🪪 installing mkcert certificate authority");
    execSync("mkcert -install", { stdio: "inherit" });

    console.log("🔍 checking if secret/certs-secret exists");
    execSync(`kubectl get secret certs-secret -n ${NAMESPACE}`, {
      stdio: "ignore",
    });

    console.log("🔐 secret/certs-secret already exists, skipping creation");
  } catch (error) {
    console.log(
      `🪪 generating certificate and key for domain ${DOMAIN} using mkcert`
    );
    execSync(`mkcert -cert-file cert.pem -key-file key.pem ${DOMAIN}`, {
      stdio: "inherit",
    });
    execSync(
      `kubectl create secret tls certs-secret --cert=cert.pem --key=key.pem -n ${NAMESPACE}`,
      { stdio: "inherit" }
    );

    unlinkSync("cert.pem");
    unlinkSync("key.pem");
  }
}

function addAuthServiceResources() {
  var hasAuthSecrets = (() => {
    try {
      execSync(`kubectl get secret auth-secrets --namespace=${NAMESPACE}`, {
        stdio: "ignore",
      });

      return true;
    } catch (err) {
      return false;
    }
  })();

  if (!hasAuthSecrets) {
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

    console.log("creating k8s secret for auth-secrets...");

    execSync(
      `kubectl create secret generic auth-secrets \
      --from-literal=ACCESS_TOKEN_PRIVATE_KEY="${privateKey}" \
      --from-literal=ACCESS_TOKEN_PUBLIC_KEY="${publicKey}" \
      --from-literal=REFRESH_TOKEN_SECRET="${refreshTokenSecret}" \
      --namespace="${NAMESPACE}"`
    );
  } else {
    console.log("secret auth-secrets already exists, skipping creation.");
  }
}

addPublicLoadBalancerCerts();
addAuthServiceResources();
