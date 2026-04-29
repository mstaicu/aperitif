docker build -t mdstaicu/accounts-migrate domains/accounts/migrations
docker push mdstaicu/accounts-migrate
docker run -it --rm --entrypoint sh mdstaicu/accounts-migrate
