
.DEFAULT_GOAL := help

.PHONY: help
help:
	@echo "Makefile available targets:"
	@echo "  serve     - serve the current directory on port 8080"
	@echo "  help      - display this message"


.PHONY: deps
deps:
	@echo "TODO: bun and python deps"


.PHONY: build_www
build_www:
	uvx lektor build

.PHONY: serve
serve:
	@echo "http://localhost:8080"
	@python3 -m http.server 8080 -d www
