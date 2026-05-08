COMPOSE := docker compose

.PHONY: build up down logs ps prisma-push prisma-migrate

build:
	$(COMPOSE) build

up:
	$(COMPOSE) up -d --build

down:
	$(COMPOSE) down

logs:
	$(COMPOSE) logs -f

# Run `prisma db push` using a transient node container (requires internet)
prisma-push:
	docker run --rm -v "$(PWD)/backend/prisma:/workspace" -w /workspace node:18 bash -lc "npm install -g prisma && prisma db push --schema=./schema.prisma --accept-data-loss --url=$${DATABASE_URL}"

# Run `prisma migrate deploy` using a transient node container
prisma-migrate:
	docker run --rm -v "$(PWD)/backend/prisma:/workspace" -w /workspace node:18 bash -lc "npm install -g prisma && prisma migrate deploy --schema=./schema.prisma --url=$${DATABASE_URL}"
