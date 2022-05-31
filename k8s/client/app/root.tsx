import {
  Links,
  LiveReload,
  Outlet,
  Meta,
  ScrollRestoration,
  Scripts,
} from "@remix-run/react";
import type { LinksFunction, MetaFunction } from "@remix-run/node";

import styles from "~/styles/root.css";

export const meta: MetaFunction = () => ({
  charset: "utf-8",
  title: "App name in progress",
  viewport: "width=device-width,initial-scale=1",
});

export let links: LinksFunction = () => [
  {
    rel: "stylesheet",
    href: "https://unpkg.com/modern-normalize@1.1.0/modern-normalize.css",
  },
  { rel: "stylesheet", href: styles },
];

export default () => (
  <html lang="en">
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      {/* All meta exports on all routes will go here */}
      <Meta />

      {/* All link exports on all routes will go here */}
      <Links />
    </head>
    <body>
      {/* Child routes go here */}
      <Outlet />

      {/* Manages scroll position for client-side transitions */}
      <ScrollRestoration />

      {/* Script tags go here */}
      <Scripts />

      {/* Sets up automatic reload when you change code */}
      {/* and only does anything during development */}
      {process.env.NODE_ENV === "development" && <LiveReload />}
    </body>
  </html>
);
