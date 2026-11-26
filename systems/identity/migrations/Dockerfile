FROM docker.io/flyway/flyway:13.13.0-alpine AS prod

# Keep the migration image limited to its PostgreSQL runtime surface.
RUN apk upgrade --no-cache \
    && rm -f /flyway/drivers/databricks-jdbc-*.jar /flyway/drivers/mssql-jdbc-*.jar

COPY sql/ /db/sql/

ENV FLYWAY_LOCATIONS=filesystem:/db/sql \
    FLYWAY_FAIL_ON_MISSING_LOCATIONS=true

CMD ["migrate"]
