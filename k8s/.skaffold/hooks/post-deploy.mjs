import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

var DOMAIN = process.env.DOMAIN;

if (!DOMAIN) {
  console.error(
    `❌ ${DOMAIN} is not available. Specify it as an environment variable`
  );
  process.exit(1);
}

var tools = ["mkcert"];

tools.forEach((cmd) => {
  try {
    execSync(`command -v ${cmd}`, { stdio: "ignore" });
    console.log(`✅ ${cmd} is already installed.`);
  } catch {
    console.error(`❌ ${cmd} is not installed. Please install ${cmd}.`);
    process.exit(1);
  }
});

const TRAEFIK_NAMESPACE = "traefik";
const TRAEFIK_CERT = "traefik-tls";

const traefikDir = mkdtempSync(path.join(tmpdir(), "traefik-tls-"));

const traefikCrt = path.join(traefikDir, "tls.crt");
const traefikKey = path.join(traefikDir, "tls.key");

execSync(
  `mkcert -cert-file "${traefikCrt}" -key-file "${traefikKey}" ${DOMAIN} "*.${DOMAIN}"`,
  { stdio: "inherit" }
);
execSync(
  `kubectl -n ${TRAEFIK_NAMESPACE} delete secret ${TRAEFIK_CERT} || true`
);
execSync(
  `kubectl -n ${TRAEFIK_NAMESPACE} create secret tls ${TRAEFIK_CERT} --cert="${traefikCrt}" --key="${traefikKey}"`
);

rmSync(traefikDir, { recursive: true });
