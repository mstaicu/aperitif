import { execSync } from "child_process";

function checkKubernetes() {
  try {
    const serverVersion = execSync("kubectl version", {
      encoding: "utf-8",
      stdio: "inherit",
    });

    console.log(`✅ k8s is accessible.\n${serverVersion}`);
  } catch (err) {
    process.exit(1);
  }
}

checkKubernetes();
