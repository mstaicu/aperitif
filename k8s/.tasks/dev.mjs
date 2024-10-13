import { spawn } from "child_process";

const ORIGIN = process.env.ORIGIN;

console.log(`🚀 starting development environment at ${ORIGIN}`);

const skaffoldProcess = spawn(
  "skaffold",
  [
    "dev",
    "--cache-artifacts=false",
    "--no-prune=false",
    "--no-prune-children=false",
  ],
  { stdio: "inherit" }
);

// List of signals to forward to the child process (Skaffold)
const signals = ["SIGINT", "SIGTERM", "SIGHUP", "SIGQUIT"];

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
