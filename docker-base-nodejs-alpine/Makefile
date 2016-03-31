IMAGE=kbeaudemo/alpine_node
VERSION=1.0

build:
	docker build -t ${IMAGE}:${VERSION} .
	docker tag ${IMAGE}:${VERSION} ${IMAGE}:latest

release:
	docker push ${IMAGE}

.PHONY: build release

