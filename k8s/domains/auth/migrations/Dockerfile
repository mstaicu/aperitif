FROM migrate/migrate:v4.19.1

COPY . /migrations

ENTRYPOINT ["sh", "-c"]
CMD ["migrate -path=/migrations -database=$DATABASE_URL up"]