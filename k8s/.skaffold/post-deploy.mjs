import { execSync } from "node:child_process";
import fs from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

var DOMAIN = process.env.DOMAIN || "tma.com";

if (!DOMAIN) {
  console.error(
    `❌ ${DOMAIN} is not available. Specify it as an environment variable`
  );
  process.exit(1);
}

var hostsContent = fs.readFileSync("/etc/hosts", "utf8");

if (!hostsContent.includes(`127.0.0.1 ${DOMAIN}`)) {
  console.log(`Adding 127.0.0.1 ${DOMAIN} to /etc/hosts`);
  execSync(`echo "127.0.0.1 ${DOMAIN}" | sudo tee -a /etc/hosts`);
} else {
  console.log(`📍 127.0.0.1 ${DOMAIN} already exists in /etc/hosts`);
}

// var TRAEFIK_NAMESPACE = "traefik";
// var APP_NAMESPACE = "app";
var LINKERD_NAMESPACE = "linkerd";
// var TRAEFIK_CERT = "traefik-tls";

// var traefikDir = fs.mkdtempSync(path.join(tmpdir(), "traefik-tls-"));

// var traefikCrt = path.join(traefikDir, "tls.crt");
// var traefikKey = path.join(traefikDir, "tls.key");

// execSync("mkcert -install", { stdio: "inherit" });

// execSync(
//   `mkcert -cert-file "${traefikCrt}" -key-file "${traefikKey}" ${DOMAIN} "*.${DOMAIN}"`,
//   { stdio: "inherit" }
// );

// try {
//   execSync(
//     `kubectl -n ${TRAEFIK_NAMESPACE} create secret tls ${TRAEFIK_CERT} --cert="${traefikCrt}" --key="${traefikKey}"`
//   );
// } catch {}

// try {
//   execSync(
//     `kubectl -n ${APP_NAMESPACE} create secret tls ${TRAEFIK_CERT} --cert="${traefikCrt}" --key="${traefikKey}"`
//   );
// } catch {}

// fs.rmSync(traefikDir, { recursive: true });

// import { writeFileSync } from "fs";
// import { generateKeyPairSync, randomBytes } from "node:crypto";

// const { privateKey, publicKey } = generateKeyPairSync("rsa", {
//   modulusLength: 2048,
//   publicKeyEncoding: { type: "spki", format: "pem" },
//   privateKeyEncoding: { type: "pkcs8", format: "pem" },
// });
// const refreshTokenSecret = randomBytes(32).toString("base64");

// writeFileSync("/secrets/access_token_private_key.pem", privateKey);
// writeFileSync("/secrets/access_token_public_key.pem", publicKey);
// writeFileSync("/secrets/refresh_token_secret.txt", refreshTokenSecret);

// nsc add operator --name TMA --sys --generate-signing-key

// nsc edit operator --require-signing-keys

// nsc add account TMA

// nsc edit account TMA --sk generate

// # This is how you enable Jetstream for an account
// # https://www.synadia.com/newsletter/nats-weekly-27
// nsc edit account TMA \
//   --js-mem-storage -1 \
//   --js-disk-storage -1 \
//   --js-streams -1 \
//   --js-consumer -1

// nsc add user --account SYS sys
// nsc add user --account TMA auth

// nsc generate creds --account SYS --name sys > /secrets/sys.creds
// nsc generate creds --account TMA --name auth > /secrets/auth.creds

// nsc generate config --mem-resolver --sys-account SYS > /secrets/resolver.conf

// kubectl create secret generic nats-resolver \
//   --from-file=/secrets/resolver.conf \
//   -n $NAMESPACE \
//   --dry-run=client -o yaml | kubectl apply -f -

// kubectl create secret generic nats-auth-creds \
//   --from-file=/secrets/auth.creds \
//   -n $NAMESPACE \
//   --dry-run=client -o yaml | kubectl apply -f -

// kubectl create secret generic nats-sys-creds \
//   --from-file=/secrets/sys.creds \
//   -n $NAMESPACE \
//   --dry-run=client -o yaml | kubectl apply -f -

var linkerdDir = fs.mkdtempSync(path.join(tmpdir(), "linkerd-certs-"));

process.chdir(linkerdDir);

execSync(
  `step certificate create root.linkerd.cluster.local ca.crt ca.key \
  --profile root-ca --no-password --insecure --not-after=87600h`,
  { stdio: "inherit" }
);

execSync(
  `step certificate create identity.linkerd.cluster.local issuer.crt issuer.key \
  --profile intermediate-ca --not-after 8760h --no-password --insecure \
  --ca ca.crt --ca-key ca.key`,
  { stdio: "inherit" }
);

try {
  execSync(
    `kubectl -n ${LINKERD_NAMESPACE} create secret generic linkerd-identity-issuer \
    --from-file=tls.crt=${linkerdDir}/issuer.crt \
    --from-file=tls.key=${linkerdDir}/issuer.key \
    --from-file=ca.crt=${linkerdDir}/ca.crt`,
    { stdio: "inherit" }
  );
} catch {}

try {
  execSync(
    `kubectl -n ${LINKERD_NAMESPACE} create configmap linkerd-identity-trust-roots \
    --from-file=ca-bundle.crt=${linkerdDir}/ca.crt`,
    { stdio: "inherit" }
  );
} catch {}

fs.rmSync(linkerdDir, { recursive: true });
