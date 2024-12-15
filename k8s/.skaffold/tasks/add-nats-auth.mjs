// @ts-check
import { execSync } from "child_process";

var secretExists = (secretName, namespace) => {
  try {
    execSync(`kubectl get secret ${secretName} --namespace=${namespace}`, {
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
};

var configureNatsResources = () => {
  var operators = execSync("nsc list operators 2>&1", { encoding: "utf-8" });

  if (!operators.includes("tma")) {
    execSync("nsc add operator --name tma --sys --generate-signing-key", {
      encoding: "utf-8",
    });

    /**
     * all accounts should have signing keys
     */
    execSync("nsc edit operator --require-signing-keys", {
      encoding: "utf-8",
    });

    console.log("✅ operator 'tma' created and configured.");
  } else {
    console.log("✅ operator 'tma' already exists.");
  }

  var accounts = execSync("nsc list accounts 2>&1", { encoding: "utf-8" });

  if (!accounts.includes("tma_account")) {
    execSync("nsc add account tma_account", { encoding: "utf-8" });

    /**
     * --sk strings
     *
     * signing key or keypath or the value "generate" to generate a key pair on the fly -
     * comma separated list or option can be specified multiple times
     */
    execSync("nsc edit account tma_account --sk generate", {
      encoding: "utf-8",
    });
    console.log("✅ account 'tma_account' created and configured.");
  } else {
    console.log("✅ account 'tma_account' already exists.");
  }

  var users = execSync("nsc list users 2>&1", { encoding: "utf-8" });

  if (!users.includes("auth_service")) {
    execSync("nsc add user --account tma_account auth_service", {
      encoding: "utf-8",
    });

    console.log("✅ user 'auth_service' created.");
  } else {
    console.log("✅ user 'auth_service' already exists.");
  }
};

var configureKubernetesSecrets = (namespace) => {
  if (!secretExists("nats-resolver", namespace)) {
    var memoryResolver = execSync(
      "nsc generate config --mem-resolver --sys-account SYS",
      { encoding: "utf-8" }
    ).trim();

    execSync(
      `kubectl create secret generic nats-resolver \
        --from-literal=resolver.conf="${memoryResolver}" \
        --namespace="${namespace}"`
    );

    console.log("✅ nats jetstream resolver secret created.");
  } else {
    console.log("✅ nats jetstream resolver secret already exists.");
  }

  if (!secretExists("nats-users", namespace)) {
    var authServiceCreds = execSync(
      "nsc generate creds --account tma_account --name auth_service",
      { encoding: "utf-8" }
    );

    execSync(
      `kubectl create secret generic nats-users \
        --from-literal=nats_users_auth_creds="${authServiceCreds}" \
        --namespace="${namespace}"`
    );
    console.log("✅ nats jetstream users secret created.");
  } else {
    console.log("✅ nats jetstream users secret already exists.");
  }
};

export async function addNatsResources(namespace) {
  console.log("🔄 configuring nats jetstream resources...");
  configureNatsResources();
  configureKubernetesSecrets(namespace);

  console.log("✅ nats jetstream setup completed successfully.");
}
