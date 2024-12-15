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
