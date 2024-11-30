import { execSync } from "child_process";

function checkCommand(cmd) {
  try {
    execSync(`command -v ${cmd}`, { stdio: "ignore" });
    console.log(`✅ ${cmd} is already installed`);
  } catch (error) {
    console.log(
      `🔧 ${cmd} is not installed. Installing ${cmd} via Homebrew...`
    );
    execSync(`brew install ${cmd}`, { stdio: "inherit" });
  }
}

["kubectl", "skaffold", "mkcert", "nats"].forEach(checkCommand);
