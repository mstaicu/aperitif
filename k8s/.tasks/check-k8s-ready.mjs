import { execSync } from "child_process";

function checkKubernetes() {
  try {
    const serverVersion = execSync("kubectl version", {
      encoding: "utf-8",
      stdio: "inherit",
    });

    console.log(`✅ Kubernetes API is accessible.\n${serverVersion}`);
  } catch (err) {
    process.exit(1);
  }
}

checkKubernetes();
