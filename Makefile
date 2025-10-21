
.DEFAULT_GOAL := help

.PHONY: help
help:
	@echo "Makefile available targets:"
	@echo "  serve     - serve the current directory on port 8080"
	@echo "  help      - display this message"


.PHONY: deps
deps:
	@echo "TODO: bun and python deps"


www/assets/uu_app.js:
	@echo "TODO: uu_app.js"
	uv run --script src/build_html.py


www/lib/htmx.min.js: www/lib/htmx.js
	@bun install --silent --global uglify-js
	uglifyjs www/lib/htmx.js > www/lib/htmx.min.js


www/assets/uu_app.min.js: www/assets/uu_app.js
	@bun install --silent --global uglify-js
	uglifyjs www/assets/uu_app.js > www/assets/uu_app.min.js


www/assets/uu_styles.min.css: www/assets/uu_styles.css
	@bun install --silent --global clean-css-cli
	cleancss --format 'keep-breaks' www/assets/uu_styles.css > www/assets/uu_styles.min.css

.PHONY: buero-data
buero-data:
	./src/update_json.py buero-data

.PHONY: plz-data
plz-data:
	./src/update_json.py plz-data


www/index.html: \
	templates/*.html \
	www/assets/uu_styles_base.css \
	www/assets/uu_app_base.js \
	www/data/config.toml \
	src/build_www.py
	uv run --script src/build_www.py


.PHONY: build_www
build_www: \
	www/index.html \
	www/assets/uu_app.min.js \
	www/assets/uu_styles.min.css \
	www/data/config.json
	@echo "done"


.PHONY: dev_build_www
dev_build_www: \
	www/index.html
	@echo "done"


.PHONY: serve
serve:
	@echo "http://localhost:8080"
	@python3 -m http.server 8080 -d www
