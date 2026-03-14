import { type RouteConfig, route } from "@react-router/dev/routes";

export default [
  route("/login", "./routes/login.tsx"),
  route("/login/challenge", "./routes/login.challenge.ts"),

  route("/register", "./routes/register.tsx"),
  route("/register/challenge", "./routes/register.challenge.ts"),
] satisfies RouteConfig;