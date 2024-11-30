import { spawn } from "child_process";

var ORIGIN = process.env.ORIGIN;

var skaffoldProcess = spawn("skaffold", ["dev", "--cache-artifacts=false"], {
  stdio: "inherit",
});

console.log(`🚀 started development environment at ${ORIGIN}`);

var signals = ["SIGINT", "SIGTERM", "SIGHUP", "SIGQUIT"];

signals.forEach((signal) => {
  process.on(signal, () => skaffoldProcess.kill(signal));
});

skaffoldProcess.on("exit", (code, signal) => {
  if (signal) {
    console.log(`skaffold process was killed by signal: ${signal}`);
    process.exit(1);
  } else if (code !== 0) {
    console.error(`skaffold process exited with error code: ${code}`);
    process.exit(code);
  } else {
    console.log("skaffold process exited successfully.");
    process.exit(0);
  }
});
