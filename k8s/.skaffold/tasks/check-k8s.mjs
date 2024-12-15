import { execSync } from "child_process";

export function checkK8sAccess() {
  try {
    console.log("🔍 checking k8s access...");

    var serverVersion = execSync("kubectl version", {
      encoding: "utf-8",
    });

    console.log(`✅ k8s is accessible.\n${serverVersion}`);
  } catch (err) {
    console.error("❌ unable to access k8s, please check your setup");
    process.exit(1);
  }
}
