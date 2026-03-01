import { type RouteConfig, route } from "@react-router/dev/routes";

export default [
  route("/", "./routes/login.tsx"),

  route("/login/challenge", "./routes/login.challenge.ts"),
  route("/login/authenticate", "./routes/login.authenticate.ts"),

  route("/register", "./routes/register.tsx"),
  route("/register/challenge", "./routes/register.challenge.ts"),
  route("/register/account", "./routes/register.account.ts"),
] satisfies RouteConfig;