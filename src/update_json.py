#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.13"
# dependencies = [
#   "requests",
# ]
# ///
import sys
import json
import pathlib as pl


OUT_DIR = pl.Path("www") / "data"


def pretty_json(data: dict | list) -> str:
    return (
        json.dumps(data, sort_keys=True, ensure_ascii=False)
            .replace('], "', '], \n"')
            .replace('}, {', '}, \n{')
        )

def chunk_plz_data(all_data: dict[str, list[str]]):
    for a in "0123456789":
        (OUT_DIR / a).mkdir(exist_ok=True)
        for b in "0123456789":
            prefix = a + b
            partial_plz_data = {plz: names for plz, names in all_data.items() if plz.startswith(prefix)}
            if len(partial_plz_data) == 0:
                continue
            out_path = OUT_DIR / a / f"plz_{prefix}_data.json"
            with out_path.open(mode='w') as fobj:
                fobj.write(pretty_json(partial_plz_data))


def chunk_buero_data(all_data: list[dict]):
    for a in "0123456789":
        (OUT_DIR / a).mkdir(exist_ok=True)
        for b in "0123456789":
            prefix = a + b
            partial_buero_data = [row for row in all_data if row['plz'].startswith(prefix)]
            if len(partial_buero_data) == 0:
                continue
            out_path = OUT_DIR / a / f"buero_{prefix}.json"
            with out_path.open(mode='w') as fobj:
                fobj.write(pretty_json(partial_buero_data))


def main(args: list[str]) -> int:
    if "plz-data" in args:
        in_path = OUT_DIR / "plz_data.json"
        with in_path.open(mode='r') as fobj:
            all_plz_data = json.load(fobj)

        chunk_plz_data(all_plz_data)

    if "buero-data" in args:
        buero_path = pl.Path("www") / "data" / f"buero_data.json"
        with buero_path.open(mode='r') as fobj:
            all_buero_data = json.load(fobj)
            
        chunk_buero_data(all_buero_data)

    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
