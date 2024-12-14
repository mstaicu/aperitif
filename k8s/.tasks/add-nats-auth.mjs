import { execSync } from "child_process";

var NAMESPACE = process.env.NAMESPACE;

var operators = execSync("nsc list operators 2>&1", {
  encoding: "utf-8",
});

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
}

var accounts = execSync("nsc list accounts 2>&1", {
  encoding: "utf-8",
});

if (!accounts.includes("tma_account")) {
  execSync("nsc add account tma_account", {
    encoding: "utf-8",
  });

  /**
   * --sk strings
   *
   * signing key or keypath or the value "generate" to generate a key pair on the fly -
   * comma separated list or option can be specified multiple times
   */
  execSync("nsc edit account tma_account --sk generate", {
    encoding: "utf-8",
  });
}

var users = execSync("nsc list users 2>&1", {
  encoding: "utf-8",
});

if (!users.includes("auth_service")) {
  execSync("nsc add user --account tma_account auth_service", {
    encoding: "utf-8",
  });
}

var natsResolverExists = (() => {
  try {
    execSync(`kubectl get secret nats-resolver --namespace=${NAMESPACE}`, {
      stdio: "ignore",
    });

    return true;
  } catch {
    return false;
  }
})();

if (!natsResolverExists) {
  var memoryResolver = execSync(
    "nsc generate config --mem-resolver --sys-account SYS",
    { encoding: "utf-8" }
  ).trim();

  execSync(
    `kubectl create secret generic nats-resolver \
        --from-literal=resolver.conf="${memoryResolver}" \
        --namespace="${NAMESPACE}"`
  );
}

var natsUsersExist = (() => {
  try {
    execSync(`kubectl get secret nats-users --namespace=${NAMESPACE}`, {
      stdio: "ignore",
    });

    return true;
  } catch {
    return false;
  }
})();

if (!natsUsersExist) {
  var authServiceCreds = execSync(
    "nsc generate creds --account tma_account --name auth_service",
    { encoding: "utf-8" }
  );

  execSync(
    `kubectl create secret generic nats-users \
        --from-literal=auth_service.creds="${authServiceCreds}" \
        --namespace="${NAMESPACE}"`
  );
}
