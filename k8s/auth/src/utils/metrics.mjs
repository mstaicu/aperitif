import promClient from "prom-client";

export const metrics = {
  activeConnections: new promClient.Gauge({
    help: "Number of active connections",
    name: "active_connections",
  }),
  dbConnectionAttempts: new promClient.Counter({
    help: "Total number of database connection attempts",
    labelNames: ["status"],
    name: "db_connection_attempts_total",
  }),
  dbQueryDuration: new promClient.Histogram({
    help: "Duration of database queries in seconds",
    labelNames: ["operation", "collection"],
    name: "db_query_duration_seconds",
  }),
  httpRequestDuration: new promClient.Histogram({
    help: "Duration of HTTP requests in seconds",
    labelNames: ["method", "route", "status"],
    name: "http_request_duration_seconds",
  }),
  httpRequestTotal: new promClient.Counter({
    help: "Total number of HTTP requests",
    labelNames: ["method", "route", "status"],
    name: "http_requests_total",
  }),
};
