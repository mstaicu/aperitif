FROM flyway/flyway:12.8.1 AS prod

COPY migrations /db/migrations

# One-shot migration image. The Kubernetes Job supplies the DB URL and hardcodes
# FLYWAY_LOCATIONS to the copied migrations folder.
CMD ["migrate"]
