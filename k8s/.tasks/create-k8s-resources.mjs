var { execSync } = require("child_process");

var domain = process.env.DOMAIN;

if (!domain) {
  console.error("error: DOMAIN and HOST environment variables must be set.");
  process.exit(1);
}

function generateRSAKeyPair() {
  var { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: "spki",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
    },
  });

  return { privateKey, publicKey };
}

var { privateKey, publicKey } = generateRSAKeyPair();

const authMongoDbUrl = "mongodb://auth-mongo-srv:27017";

try {
  console.log("creating k8s secret for auth-service-secrets...");
  execSync(
    `kubectl create secret generic auth-service-secrets \
    --from-literal=MONGO_DB_URI=${authMongoDbUrl} \
   --from-literal=JWT_PRIVATE_KEY='${privateKey}' \
    --from-literal=JWT_PUBLIC_KEY='${publicKey}'`,
    { stdio: "inherit" }
  );

  console.log("Creating k8s configmap for auth-service-config...");
  execSync(
    `kubectl create configmap auth-service-config \
    --from-literal=DOMAIN=${domain}`,
    { stdio: "inherit" }
  );

  console.log("k8s secrets and configmap created successfully!");
} catch (err) {
  console.error("error creating Kubernetes resources:", err);
  process.exit(1);
}
