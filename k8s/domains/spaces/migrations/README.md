docker build -t mdstaicu/spaces-migrate domains/spaces/migrations
docker push mdstaicu/spaces-migrate
docker run -it --rm --entrypoint sh mdstaicu/spaces-migrate
