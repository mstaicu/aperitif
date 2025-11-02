export var probesOpenApi = {
  "/healthz": {
    get: {
      description: "Returns 200 to indicate the process is alive.",
      responses: {
        200: { description: "Service is healthy" },
      },
      summary: "Liveness probe",
      tags: ["probes"],
    },
  },
  "/readyz": {
    get: {
      description:
        "Reports 200 when dependent services are ready; otherwise 503.",
      responses: {
        200: { description: "Service is ready" },
        503: { description: "Dependencies unavailable" },
      },
      summary: "Readiness probe",
      tags: ["probes"],
    },
  },
};
