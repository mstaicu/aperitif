docker build -t mdstaicu/auth-migrate domains/auth/migrations
docker push mdstaicu/auth-migrate
docker run -it --rm --entrypoint sh mdstaicu/auth-migrate