// @ts-check
import { checkRequiredCommands } from "../tasks/check-tools.mjs";
import { checkK8sAccess } from "../tasks/check-k8s.mjs";
import { checkNamespace } from "../tasks/check-namespace.mjs";
import { addSecrets } from "../tasks/add-secrets.mjs";
import { addNatsResources } from "../tasks/add-nats-auth.mjs";
import { addHost } from "../tasks/add-host.mjs";
import { addCrds } from "../tasks/add-crds.mjs";
import {
  deployCertManager,
  waitForCertManager,
} from "../tasks/add-cert-manager.mjs";

var namespace = "dev";
var domain = "tma.com";

checkRequiredCommands([
  "kubectl",
  "skaffold",
  "mkcert",
  "nats",
  "nsc",
  "cmctl",
]);

checkK8sAccess();
checkNamespace(namespace);
addSecrets({ domain, namespace });
addNatsResources(namespace);
addHost(domain);
addCrds();

deployCertManager();
waitForCertManager();
