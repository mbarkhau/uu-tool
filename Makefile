
.DEFAULT_GOAL := help

.PHONY: help
help:
	@echo "Makefile available targets:"
	@echo "  serve     - serve the current directory on port 8080"
	@echo "  help      - display this message"


.PHONY: deps
deps:
	@echo "TODO: bun and python deps"


docs/assets/uu_app.js:
	@echo "TODO: uu_app.js"
	uv run --script src/build_html.py


docs/lib/htmx.min.js: docs/lib/htmx.js
	@bun install --silent --global uglify-js
	uglifyjs docs/lib/htmx.js > docs/lib/htmx.min.js


docs/assets/uu_app.min.js: docs/assets/uu_app.js
	@bun install --silent --global uglify-js
	uglifyjs docs/assets/uu_app.js > docs/assets/uu_app.min.js


docs/assets/uu_styles.min.css: docs/assets/uu_styles.css
	@bun install --silent --global clean-css-cli
	cleancss --format 'keep-breaks' docs/assets/uu_styles.css > docs/assets/uu_styles.min.css

.PHONY: buero-data
buero-data:
	./src/update_json.py buero-data

.PHONY: plz-data
plz-data:
	./src/update_json.py plz-data


docs/index.html: \
	templates/*.html \
	docs/assets/uu_styles_base.css \
	docs/assets/uu_app_base.js \
	docs/data/config.toml \
	src/build_www.py
	uv run --script src/build_www.py


.PHONY: build_www
build_www: \
	docs/index.html \
	docs/assets/uu_app.min.js \
	docs/assets/uu_styles.min.css \
	docs/data/config.json
	@echo "done"


.PHONY: dev_build_www
dev_build_www: \
	docs/index.html
	@echo "done"


.PHONY: serve
serve:
	@echo "http://localhost:8080"
	@python3 -m http.server 8080 -d docs
