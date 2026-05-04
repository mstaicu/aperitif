FROM flyway/flyway:12.4.0

COPY migrations /db/migrations
COPY repeatable /db/repeatable
COPY seeds /db/seeds
COPY checks /db/checks

# Kubernetes placement hierarchy:
#   Kubernetes cluster
#     Node
#       Pod
#         Container
#           PID 1 process
#             child processes
#
# This is a one-shot Job. Flyway reads FLYWAY_URL, FLYWAY_USER, and
# FLYWAY_LOCATIONS from the Job environment, validates migration history while
# applying only pending migrations, validates the final state, prints it, and
# exits.
ENTRYPOINT ["sh", "-c"]
CMD ["flyway migrate && flyway validate && flyway info"]
