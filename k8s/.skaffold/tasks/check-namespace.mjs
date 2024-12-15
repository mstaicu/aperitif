import { execSync } from "child_process";

export function checkNamespace(namespace) {
  if (!namespace) {
    console.error("❌ namespace must be provided");
    process.exit(1);
  }

  try {
    console.log(`🔍 checking if namespace '${namespace}' exists...`);
    execSync(`kubectl get namespace ${namespace}`, { stdio: "ignore" });
    console.log(`✅ namespace '${namespace}' exists, skipping creation.`);
  } catch (error) {
    console.log(`🪐 namespace '${namespace}' does not exist, creating it...`);
    execSync(`kubectl create namespace ${namespace}`, { stdio: "inherit" });
    console.log(`✅ namespace '${namespace}' created successfully.`);
  }
}
