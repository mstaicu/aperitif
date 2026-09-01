FROM docker.io/flyway/flyway:13.3.0 AS prod

COPY sql /db/sql

# One-shot migration image. The Kubernetes Job supplies the DB URL and hardcodes
# FLYWAY_LOCATIONS to the copied sql folder.
CMD ["migrate"]
