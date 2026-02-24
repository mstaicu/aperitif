import { type RouteConfig, route } from "@react-router/dev/routes";

export default [
  route("/", "./routes/login.tsx"),
  route("/login/challenge", "./routes/login.challenge.ts"),
  route("/login/authenticate", "./routes/login.authenticate.ts"),
  route("/register", "./routes/register.tsx"),
] satisfies RouteConfig;
