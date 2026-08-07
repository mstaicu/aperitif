FROM docker.io/flyway/flyway:13.0.0@sha256:db6195c21e90872063ff257ec38edcb8d3c77259b25a7a8fee67189511079511 AS prod

COPY sql /db/sql

# One-shot migration image. The Kubernetes Job supplies the DB URL and hardcodes
# FLYWAY_LOCATIONS to the copied sql folder.
CMD ["migrate"]
