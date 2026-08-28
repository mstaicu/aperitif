FROM docker.io/flyway/flyway:13.3.0@sha256:eaaaef9e81578af3226576a6ff2b8ae949588e0ba298e9cc2e1b8c2fdb14b85a AS prod

COPY sql /db/sql

# One-shot migration image. The Kubernetes Job supplies the DB URL and hardcodes
# FLYWAY_LOCATIONS to the copied sql folder.
CMD ["migrate"]
