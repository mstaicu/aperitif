import { get, route } from "remix/fetch-router/routes";

export const routes = route("/<domain>", {
  home: get("/"),
});
