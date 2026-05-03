import { get, post, route } from "remix/fetch-router/routes";

export const routes = route("/", {
  home: get("/"),
  login: route("login", {
    action: post("/"),
    challenge: post("/challenge"),
    index: get("/"),
  }),
  signup: route("signup", {
    action: post("/"),
    challenge: post("/challenge"),
    index: get("/"),
  }),
});
