# Production environment

1. Provision a N Docker Swarm cluster on a platform (digitalocean, etc)
2. Install Docker on all nodes and join all the nodes to the swarm
3. SSH into a node and initialise the swarm
  $ export NODE_ID=$(docker info -f '{{.Swarm.NodeID}}')
  $ export EMAIL=admin@example.com
  $ export DOMAIN=iarmaroc.space
  $ export USERNAME=admin
  $ export PASSWORD=admin
  $ export HASHED_PASSWORD=$(openssl passwd -apr1 $PASSWORD)
  $ docker swarm init --advertise-addr 167.99.12.25
  $ docker node update --label-add traefik-certificates=true $NODE_ID
4. Create a network
  $ docker network create --driver=overlay public
5. Create the secrets for the API and Postgres
  $ echo -e "NODE_ENV=development\nPORT=3000\nMORGAN_LEVEL=common\nSIGNATURE=supersecret" | docker secret create api_env -
  $ echo "postgres" | docker secret create psql_password -
  $ echo "postgres" | docker secret create psql_user -
6. Authenticate to Docker hub from the leader node
7. Deploy the stack:
  $ docker stack deploy --compose-file docker-compose.yml -c docker-compose.prod.yml --with-registry-auth tma1

# Development environment

1. Start the application: `docker-compose up`
2. Any added or removed node modules will require a image rebuild: `docker-compose build`
