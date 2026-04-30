docker build -t mdstaicu/tenancy-migrate domains/tenancy/migrations
docker push mdstaicu/tenancy-migrate
docker run -it --rm --entrypoint sh mdstaicu/tenancy-migrate
