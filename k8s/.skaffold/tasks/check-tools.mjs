import { execSync } from "child_process";

export function checkRequiredCommands(commands) {
  var allCommandsAvailable = true;

  commands.forEach((cmd) => {
    try {
      execSync(`command -v ${cmd}`, { stdio: "ignore" });
      console.log(`✅ ${cmd} is already installed.`);
    } catch {
      console.error(
        `❌ ${cmd} is not installed. Please install ${cmd} via Homebrew.`
      );
      allCommandsAvailable = false;
    }
  });

  if (!allCommandsAvailable) {
    console.error("❌ one or more required commands are missing");
    process.exit(1);
  }
}
