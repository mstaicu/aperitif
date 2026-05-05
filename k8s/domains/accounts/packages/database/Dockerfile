FROM flyway/flyway:12.4.0

COPY migrations /db/migrations
COPY repeatable /db/repeatable
COPY seeds /db/seeds
COPY checks /db/checks

# One-shot migration image. The Kubernetes Job supplies FLYWAY_URL,
# FLYWAY_USER, FLYWAY_PASSWORD, and FLYWAY_LOCATIONS from its unit Secret.
ENTRYPOINT ["sh", "-c"]
CMD ["flyway migrate && flyway validate && flyway info"]
