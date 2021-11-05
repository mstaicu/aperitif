import axios from "axios";

/**
 * If window is undefined, then that means we are inside the cluster. 
 * We can make requests to our ingress controller by its service name.
 * Sine the port is 80, we don't need to specify it
 * 
 *  apiVersion: v1
    kind: Service
    metadata:
      name: traefik-srv
    spec:
      type: ClusterIP
      selector:
        app: traefik
      ports:
        - name: http
          protocol: TCP
          port: 80
          targetPort: 80

    Otherwise, if window is defined, we are making the request from the browser
    where we can omit the protocol and sub domain as those will be picked when making relative path requests
 */

/**
 *
  TODO: Add env var for determining if we're in dev or prod mode and pick the host name from there

  prod: http://www.ticketing-test-prod-app.xyz/
  dev: http://traefik-srv/

  TODO: Test this with just http://traefik-srv/ in Digital Ocean as I think we don't need the BASE_URL
  as the request headers, including the Host, are passed from req.headers

  UHM, I don't think this is necessary, as the server side requests will be performed inside the cluster,
  and we can communicate via the ClusterIP of Traefik
 */

// const BASE_URL =
//   process.env.NODE_ENV === "development"
//     ? "http://traefik-srv/"
//     : "http://www.ticketing-test-prod-app.xyz/";

export const buildClient = ({ req }) =>
  typeof window === "undefined"
    ? axios.create({
        baseURL: "http://traefik-srv/",
        headers: req.headers,
      })
    : axios.create({
        baseURL: "/",
      });
