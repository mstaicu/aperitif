import { execSync } from "child_process";

function checkCommand(cmd) {
  try {
    execSync(`command -v ${cmd}`, { stdio: "ignore" });
    console.log(`✅ ${cmd} is already installed`);
  } catch (error) {
    console.log(
      `🔧 ${cmd} is not installed. Consider installing ${cmd} via Homebrew`
    );
    execSync(`brew info ${cmd}`, { stdio: "inherit" });
  }
}

["kubectl", "skaffold", "mkcert", "nats", "nsc"].forEach(checkCommand);
