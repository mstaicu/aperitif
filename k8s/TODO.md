# Development

1. Add a script in the Makefile to create certificates for the Ingress resource
2. For the local LoadBalancer, use the TLS certificate in Traefik
    tls:
      secretName: example-local-tls

# Production

1. For the production LoadBalancer, use the TLS certificate provided by DigitalOcean
2. If you manage your domain with DigitalOcean DNS, you can choose the Let’s Encrypt option to create a new, fully-managed SSL certificate. We create and automatically renew this certificate for you. https://docs.digitalocean.com/products/networking/load-balancers/how-to/ssl-termination/

# Both

1. Don't redirect to HTTPS, remove the access token if a request is done over HTTP