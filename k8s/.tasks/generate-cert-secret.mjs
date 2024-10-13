import { execSync } from "child_process";
import { unlinkSync } from "fs";

const DOMAIN = process.env.DOMAIN;

try {
  console.log("🪪 installing mkcert certificate authority");
  execSync("mkcert -install", { stdio: "inherit" });

  console.log("🔍 checking if secret/certs-secret exists");
  execSync("kubectl get secret certs-secret", { stdio: "ignore" });

  console.log("🔐 secret/certs-secret already exists, skipping creation");
} catch (error) {
  console.log(
    `🪪 generating certificate and key for domain ${DOMAIN} using mkcert`
  );
  execSync(`mkcert -cert-file cert.pem -key-file key.pem ${DOMAIN}`, {
    stdio: "inherit",
  });
  execSync(
    "kubectl create secret tls certs-secret --cert=cert.pem --key=key.pem",
    { stdio: "inherit" }
  );

  unlinkSync("cert.pem");
  unlinkSync("key.pem");
}
