#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.13"
# dependencies = [
#     "pudb", "ipython",
#     "jinja2",
# ]
# ///
import re
import sys
import json
import tomllib
import pathlib as pl
import typing as typ

import jinja2

OUTPUT_DIR = pl.Path(__file__).parent.parent

OUTPUTS = [
    OUTPUT_DIR / "www" / "index.html",
    OUTPUT_DIR / "www" / "select.html",
    OUTPUT_DIR / "www" / "formular.html",
]


def _formated_html_lines(html: str) -> typ.Generator[str, None, None]:
    indent = 0
    for line in html.splitlines():
        if line.startswith("<!doctype") or line.startswith("<html"):
            yield line
            continue
           
        line = line.strip()
        if not line:
            continue
        if line.startswith("<!--"):
            continue

        if re.match(r"<[^>]+\s*/>", line):
            # Self-closing:  <tag />
            yield ("\t" * indent) + line
        elif re.match(r"<(\w+)\s*[^>]*>.*</\1\s*>", line):
            # Same line open close: <tag></tag>
            yield ("\t" * indent) + line
        elif re.match(r"</\w+>", line):
            # closing tag:  </tag>
            indent -= 1
            yield ("\t" * indent) + line
        else:
            yield ("\t" * indent) + line

            # Multi line open close: <tag>
            if line.startswith("<"):
                indent += 1


def _format_html(html: str) -> str:
    return "\n".join(_formated_html_lines(html))


def _config_toml_to_json() -> None:
    config_in_path = OUTPUT_DIR / "www" / "data" / "config.toml"
    config_out_path = OUTPUT_DIR / "www" / "data" / "config.json"
    with config_in_path.open(mode="rb") as fobj:
        data = tomllib.load(fobj)

    with config_out_path.open(mode="w") as fobj:
        json.dump(data, fobj, indent=2)


def _main(args: list[str]) -> int:
    _config_toml_to_json()

    template_dir = pl.Path(__file__).parent.parent / "templates"
    loader = jinja2.FileSystemLoader(str(template_dir))
    env = jinja2.Environment(loader=loader)

    base_tmpl = env.get_template("base.html")
    breadcrumbs_tmpl = env.get_template("breadcrumbs.html")

    script_path = OUTPUT_DIR / "www" / "assets" / "uu_app.js"
    styles_path = OUTPUT_DIR / "www" / "assets" / "uu_styles.css"

    script_base_path = OUTPUT_DIR / "www" / "assets" / "uu_app_base.js"
    styles_base_path = OUTPUT_DIR / "www" / "assets" / "uu_styles_base.css"

    scripts = set()
    scripts.add(open(script_base_path).read())

    styles = set()
    styles.add(open(styles_base_path).read())

    for output_path in OUTPUTS:
        output_tmpl = env.get_template(output_path.name)
        raw_html = output_tmpl.render(active=output_path.name)

        while match := re.search(r"<script>(.*?)</script>", raw_html, re.DOTALL):
            scripts.add(match.group(1))
            raw_html = raw_html[:match.span()[0]] + raw_html[match.span()[1]:]

        while match := re.search(r"<style>(.*?)</style>", raw_html, re.DOTALL):
            styles.add(match.group(1))
            raw_html = raw_html[:match.span()[0]] + raw_html[match.span()[1]:]

        output_html = _format_html(raw_html)

        with output_path.open(mode="w") as fobj:
            fobj.write(output_html)
    
    with script_path.open(mode="w") as fobj:
        fobj.write(";\n\n".join(scripts))

    with styles_path.open(mode="w") as fobj:
        fobj.write("\n\n".join(styles))

    return 0


if __name__ == "__main__":
    sys.exit(_main(sys.argv[1:]))
