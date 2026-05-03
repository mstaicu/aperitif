import { get, post, route } from "remix/fetch-router/routes";

export const routes = route("/identity", {
  home: get("/"),
  login: route("login", {
    action: post("/"),
    challenge: post("/challenge"),
    index: get("/"),
  }),
  register: route("register", {
    action: post("/"),
    challenge: post("/challenge"),
    index: get("/"),
  }),
});
