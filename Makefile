.DEFAULT_GOAL := help
SHELL := /bin/bash

# ---- local development -------------------------------------------------------

.PHONY: help
help: ## List the available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2}'

.PHONY: setup
setup: ## Install dependencies for both services and copy env templates
	@[ -f backend/.env ] || cp backend/.env.example backend/.env
	@[ -f frontend/.env.local ] || cp frontend/.env.example frontend/.env.local
	cd backend && npm install
	cd frontend && npm install

.PHONY: up
up: ## Start postgres, redis, backend and frontend with docker compose
	docker compose up --build

.PHONY: down
down: ## Stop the local stack
	docker compose down

.PHONY: reset
reset: ## Stop the stack and delete the database volume
	docker compose down -v

.PHONY: infra
infra: ## Start only postgres and redis (run the apps on the host)
	docker compose up -d postgres redis

.PHONY: dev-api
dev-api: ## Run the NestJS API on the host with hot reload
	cd backend && npm run start:dev

.PHONY: dev-web
dev-web: ## Run the Next.js storefront on the host
	cd frontend && npm run dev

# ---- database ----------------------------------------------------------------

.PHONY: migrate
migrate: ## Create and apply a new migration (make migrate name=add_wishlist)
	cd backend && npx prisma migrate dev --name $(name)

.PHONY: migrate-deploy
migrate-deploy: ## Apply pending migrations (used in CI/CD)
	cd backend && npx prisma migrate deploy

.PHONY: seed
seed: ## Load demo categories, products, variants and accounts
	cd backend && npm run db:seed

.PHONY: studio
studio: ## Open Prisma Studio
	cd backend && npx prisma studio

# ---- quality -----------------------------------------------------------------

.PHONY: typecheck
typecheck: ## Type-check both services
	cd backend && npx tsc --noEmit
	cd frontend && npm run typecheck

.PHONY: build
build: ## Production build of both services
	cd backend && npm run build
	cd frontend && npm run build

# ---- GCP ---------------------------------------------------------------------

.PHONY: tf-init
tf-init: ## Initialise Terraform
	cd infra/terraform && terraform init

.PHONY: tf-plan
tf-plan: ## Plan the GCP infrastructure
	cd infra/terraform && terraform plan

.PHONY: tf-apply
tf-apply: ## Apply the GCP infrastructure
	cd infra/terraform && terraform apply
