# Staging environment

1. Provision a N Docker Swarm cluster on a platform (digitalocean, etc)
2. Install Docker on all nodes and join all the nodes to the swarm
3. SSH into a node and initialise the swarm
```
  $ export NODE_ID=$(docker info -f '{{.Swarm.NodeID}}')
  $ export EMAIL=admin@example.com
  $ export DOMAIN=iarmaroc.space
  $ export USERNAME=admin
  $ export PASSWORD=admin
  $ export HASHED_PASSWORD=$(openssl passwd -apr1 $PASSWORD)
  $ docker swarm init --advertise-addr 167.99.12.25
  $ docker node update --label-add traefik-certificates=true $NODE_ID
```
4. Create a network
```
  $ docker network create --driver=overlay public
```
5. Create the secrets for the API and Postgres
```
  $ echo -e "NODE_ENV=development\nPORT=3000\nMORGAN_LEVEL=common\nSIGNATURE=supersecret" | docker secret create api_env -
  $ echo "postgres" | docker secret create psql_password -
  $ echo "postgres" | docker secret create psql_user -
```
6. Authenticate to Docker hub from the leader node
```
  $ docker login
```
7. Deploy the stack:
```
  $ docker stack deploy --compose-file docker-compose.yml -c docker-compose.staging.yml --with-registry-auth tma1
```

# Development environment

1. In case that we don't have any certificates or we need to renew them, this command creates a 2048-bit private key (domain.key) and a self-signed certificate (domain.crt) from scratch:
```
openssl req \
  -newkey rsa:2048 -nodes -keyout domain.key \
  -x509 -days 365 -out domain.crt
```
2. Add the domains to `/etc/hosts/`
3. Start the application: `docker-compose up`
4. Any added or removed node modules will require a image rebuild: `docker-compose build`
