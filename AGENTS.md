# Repository Guidelines

## Project Description

This is **UU-Tool** - a German web application to help generate "Unterstützungsunterschrift" pdf documents (documents for support signatures). These signatures must be collected by political parties to participate in elections. The tool generates PDF documents for voters to sign and submit to their local municipal office to help parties meet legal requirements for ballot access.


## Jargon/Terms

- buero: Municipal administration responsible for verification of voter eligability.
- plz: Short for "PostLeitZahl" the German word for the five digit postal code.


## Tooling
- **uv**: Python dependency management
- **bun**: JavaScript/TypeScript dependency management
- **make**: Build and development commands

## Development

- `make build_www` to update www/ from source templates and config files.
- `make serve` to run a basic python http server on http://localhost:8080
- `make plz-data` update static postcode/plz dataset in `www/data/[0-9]/plz_[0-9][0-9].json`
- `make buero-data` update static buero dataset in `www/data/[0-9]/buero_[0-9][0-9].json`

## File Organization

```
src/           # Python 3.13+ scripts
templates/     # Jinja templates
www/           # Static web application hosted at uu-tool.de
www/assets/    # Styles and application JavaScript
www/lib/       # JavaScript libraries
www/img/       # Static images including favicon, video thumbnails, seals/flags of juristictions and logos of parties
www/data/      # JSON data, including `config.json`, data for postcode and buero lookups
www/pdf/       # PDF form templates
www/*.html     # Static html
```

## Project Structure & Module Organization
- `src/` holds Python 3.13+ scripts executed with `uv run --script`.
    - `build_www.py` render pages in `templates/` to `www/*.html`
    - `update_json.py` reshape and output datasets to `www/data/`
- `templates/` provides the Jinja layouts; inline `<script>/<style>` content is hoisted into shared bundles during the build.
- `www/` is the publishable tree: `assets/` for compiled JS/CSS, `data/` for sharded JSON, `lib/` for vendored tools, with `city_data/` and `pdf/` as supporting payloads.
- `Makefile` is the canonical index of repeatable tasks.


## Build, Test, and Development Commands
- `make build_www` rebuilds the three HTML entry points, synchronizes `www/data/config.json`, and minifies JS/CSS.
- `uv run --script src/build_www.py` skips minification for quicker HTML and bundle regeneration while iterating.
- `make plz-data` or `make buero-data` reclusters JSON into `www/data/<prefix>/` shards consumed on the client.
- `make serve` serves the site from `www/` at `http://localhost:8080` for manual smoke checks.


## Coding Style & Naming Conventions
- Python: Follow PEP 8 with four-space indentation and type hints; prefer `pathlib` and explicit `main(args)` entry points as seen in existing scripts.
- JavaScript: Plain Vanilla JS, no frameworks or build steps. Two space indention.
- Keep front-end additions self-contained so concatenation into `www/assets/uu_app.js` does not leak globals; continue the `uu-*` naming pattern for DOM IDs and classes.
- When touching templates, reference scripts and styles through blocks/includes to let `build_www.py` capture them automatically.


## Testing Guidelines
- Run `make build_www` before committing and ensure the diff only contains intentional HTML, asset, or JSON updates.
- After data refreshes, spot-check a couple of generated shards (e.g., `www/data/12/plz_12_data.json`) for valid encoding and expected keys.
- Use `make serve` to verify the three main pages render and interactive flows still reach the correct bureaus; document manual steps in the PR.

## Commit & Pull Request Guidelines
- Use concise, imperative commits similar to existing history (`reorg data`, `add disk_cache.py`), bundling regenerated artifacts with the change that produced them.
- PR descriptions should summarize intent, list regenerated files or datasets, and link supporting notes under `research/` when applicable.
- Record the commands you ran and attach screenshots or clips when UI or data presentation changes.

## Data Refresh Workflow
- Update `plz_data/` or `pdf_data/` sources first, then regenerate shards with `make plz-data` / `make buero-data`; commit both raw and processed outputs together.
- Log provenance and oversized diffs in `research/` so reviewers can trace new datasets.
