FROM docker.io/flyway/flyway:13.8.0-alpine AS prod

# Keep the migration image limited to its PostgreSQL runtime surface.
RUN apk upgrade --no-cache \
    && rm -f /flyway/drivers/databricks-jdbc-*.jar /flyway/drivers/mssql-jdbc-*.jar

COPY sql /db/sql

# One-shot migration image. The Kubernetes Job supplies the DB URL and hardcodes
# FLYWAY_LOCATIONS to the copied sql folder.
CMD ["migrate"]
