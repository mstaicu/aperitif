import { execSync } from "child_process";

export function addCrds() {
  try {
    console.log("🚀 applying crds...");
    execSync("kubectl apply -f infra/crds", { stdio: "inherit" });
    console.log("✅ crds applied successfully");
  } catch (error) {
    console.error("❌ error applying crds:", error.message);
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
