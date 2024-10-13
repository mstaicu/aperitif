import { execSync } from "child_process";

const DOTENV_SECRET_NAME = process.env.DOTENV_SECRET_NAME;
const ENV_FILE = process.env.ENV_FILE;

try {
  console.log(
    `🔍 checking if Kubernetes secret/${DOTENV_SECRET_NAME} exists...`
  );

  execSync(`kubectl get secret ${DOTENV_SECRET_NAME}`, { stdio: "ignore" });

  console.log(`🔐 secret/${DOTENV_SECRET_NAME} exists, skipping creation`);
} catch (error) {
  console.log(
    `🔐 secret/${DOTENV_SECRET_NAME} does not exist, creating it from ${ENV_FILE}...`
  );
  execSync(
    `kubectl create secret generic ${DOTENV_SECRET_NAME} --from-env-file=${ENV_FILE}`,
    { stdio: "inherit" }
  );
}
