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

skaffoldProcess.on("exit", (code, signal) => {
  if (signal) {
    console.log(`Skaffold process was killed by signal: ${signal}`);
  } else if (code !== 0) {
    console.error(`Skaffold process exited with error code: ${code}`);
  } else {
    console.log("Skaffold process exited successfully.");
  }
});

process.on("SIGINT", () => {
  console.log("Received SIGINT. Terminating Skaffold...");
  skaffoldProcess.kill("SIGINT");
});
