import { execSync } from "child_process";

const NAMESPACE = process.env.NAMESPACE;

try {
  console.log(`🔍 checking if ${NAMESPACE} namespace exists...`);

  execSync(`kubectl get namespace ${NAMESPACE}`, { stdio: "ignore" });

  console.log(`🪐 namespace/${NAMESPACE} exists, skipping creation`);
} catch (error) {
  console.log(`🪐 namespace/${NAMESPACE} does not exist, creating it...`);
  execSync(`kubectl create namespace ${NAMESPACE}`, { stdio: "inherit" });
}
