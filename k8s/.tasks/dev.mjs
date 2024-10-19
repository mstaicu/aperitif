import { spawn } from "child_process";

var ORIGIN = process.env.ORIGIN;

var skaffoldProcess = spawn(
  "skaffold",
  [
    "dev",
    "--cache-artifacts=false",
    "--no-prune=false",
    "--no-prune-children=false",
  ],
  { stdio: "inherit" }
);

console.log(`🚀 started development environment at ${ORIGIN}`);

// List of signals to forward to the child process (Skaffold)
var signals = ["SIGINT", "SIGTERM", "SIGHUP", "SIGQUIT"];

// Forward each signal received by the Node.js process to the Skaffold process
signals.forEach((signal) => {
  process.on(
    signal,
    () => skaffoldProcess.kill(signal) // Forward the signal to Skaffold
  );
});

skaffoldProcess.on("exit", (code, signal) => {
  if (signal) {
    console.log(`Skaffold process was killed by signal: ${signal}`);
    process.exit(1);
  } else if (code !== 0) {
    console.error(`Skaffold process exited with error code: ${code}`);
    process.exit(code);
  } else {
    console.log("Skaffold process exited successfully.");
    process.exit(0);
  }
});
