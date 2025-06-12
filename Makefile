REGISTRY=ghcr.io
ORG=maestro-org
REPOSITORY=maestro-mcp-server
IMAGE=maestro-mcp-server
VERSION=$(shell git rev-parse HEAD)$(if $(shell git status --short),-dev)

BASE_DIR=$(CURDIR)

.PHONY: build push install dev dist start test clean

build:
	docker build -t $(REGISTRY)/$(ORG)/$(REPOSITORY):$(VERSION) -f Dockerfile --target $(IMAGE) .

push: build
	docker push $(REGISTRY)/$(ORG)/$(REPOSITORY):$(VERSION)

install:
	npm install

dev:
	npm run dev

dist:
	npm run build

start:
	npm run start

test:
	npm test

lint:
	npm run lint

clean:
	rm -rf dist
	rm -rf node_modules
