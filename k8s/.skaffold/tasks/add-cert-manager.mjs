import { execSync } from "child_process";

export function deployCertManager() {
  try {
    console.log("🚀 deploying cert-manager...");
    execSync("kubectl apply -f infra/base/cert-manager", { stdio: "inherit" });
    console.log("✅ cert-manager deployed successfully");
  } catch (error) {
    console.error("❌ error deploying cert-manager:", error.message);
    process.exit(1);
  }
}

export function waitForCertManager() {
  try {
    console.log("⏳ waiting for cert-manager to be ready...");

    execSync("cmctl check api --wait=2m", { stdio: "inherit" });
    console.log("✅ cert-manager is ready");
  } catch (error) {
    console.error("❌ error while waiting for cert-manager:", error.message);
    process.exit(1);
  }
}
