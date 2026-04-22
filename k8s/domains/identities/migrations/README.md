docker build -t mdstaicu/identities-migrate domains/identities/migrations
docker push mdstaicu/identities-migrate
docker run -it --rm --entrypoint sh mdstaicu/identities-migrate