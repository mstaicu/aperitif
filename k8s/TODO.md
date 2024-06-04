# Development

1. For the local environment, use the LoadBalancer that points to Traefik to do the TLS certificate and SSL termination

# Production

1. For the production environment, use the LoadBalancer to point to the frontend. The cloud provider's LB will use the TLS certificate provided by DigitalOcean
2. If you manage your domain with DigitalOcean DNS, you can choose the Let’s Encrypt option to create a new, fully-managed SSL certificate. We create and automatically renew this certificate for you. https://docs.digitalocean.com/products/networking/load-balancers/how-to/ssl-termination/

# Both

1. Don't redirect to HTTPS, remove the access token if a request is done over HTTP