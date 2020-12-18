# Production environment

1. Build the production image: `docker build -t api:prod ./express`

# Development environment

1. Start the application: `docker-compose up`
2. Any added or removed node modules will require a image rebuild: `docker-compose build`
