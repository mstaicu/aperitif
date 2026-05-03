FROM migrate/migrate:v4.19.1

COPY . /migrations

# Kubernetes placement hierarchy:
#   Kubernetes cluster
#     Node
#       Pod
#         Container
#           PID 1 process
#             child processes
#
# This is a one-shot Job. `sh -c` is only here to expand `$DATABASE_URL` before
# running migrate; the container exits when migrations finish.
ENTRYPOINT ["sh", "-c"]
CMD ["migrate -path=/migrations -database=$DATABASE_URL up"]
