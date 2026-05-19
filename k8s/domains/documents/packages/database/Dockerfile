FROM flyway/flyway:12.4.0

COPY migrations /db/migrations

# One-shot migration image. The Kubernetes Job supplies DB credentials from its
# unit Secret and hardcodes FLYWAY_LOCATIONS to the copied migrations folder.
CMD ["migrate"]
