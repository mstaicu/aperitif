import { execSync } from "child_process";

export function addCrds() {
  try {
    console.log("🚀 applying crds...");
    execSync("kubectl apply -f infra/crds", { stdio: "ignore" });
    console.log("✅ crds applied successfully");

    console.log("⏳ waiting for crds to become established...");
    execSync(
      "kubectl wait --for=condition=established crd --all --timeout=120s",
      { stdio: "inherit" }
    );
    console.log("✅ crds are now established and ready");
  } catch (error) {
    console.error("❌ error applying crds:", error.message);
    process.exit(1);
  }
}
