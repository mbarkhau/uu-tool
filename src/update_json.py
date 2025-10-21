#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.13"
# dependencies = [
#   "requests",
# ]
# ///
import re
import sys
import json
import pathlib as pl
import typing as typ
import collections


OUT_DIR = pl.Path("www") / "data"


def pretty_json(data: dict | list) -> str:
    return (
        json.dumps(data, ensure_ascii=False)
            .replace('], "', '], \n"')
            .replace('}, {', '}, \n{')
        )


class CleanRow(typ.NamedTuple):
    plz: str
    ort: str
    name: str
    street: str
    phone: str | None = None
    email: str | None = None


def _clean_row(row: dict) -> CleanRow:
    street = row['str']
    if street:
        street = re.sub(r'(\d+)\s*-\s*(\d+)$', r'\1-\2', street)
    return CleanRow(
        plz=row['plz'],
        ort=row['ort'],
        name=row['name'] or row['gemeinde'],
        street=street,
        phone=row.get('phone'),
        email=row.get('email'),
    )


def _dump_row(row: CleanRow) -> dict[str, str]:
    row_data = row._asdict()
    if row.phone is None:
        del row_data['phone']
    if row.email is None:
        del row_data['email']
    return row_data


def clean_buero_data(all_data: list[dict]) -> typ.Iterable[CleanRow]:
    rows_by_plz = collections.defaultdict(list)

    for row in all_data:
        rows_by_plz[row['plz']].append(row)

    for plz, rows in rows_by_plz.items():
        if len(rows) == 1:
            yield _clean_row(rows[0])
        else:
            for row in rows:
                yield _clean_row(row)


def merge_buero_rows(rows: set[CleanRow]) -> typ.Iterable[CleanRow]:
    rows_by_plz = collections.defaultdict(list)
    for row in rows:
        key = (row.plz, row.street)
        rows_by_plz[key].append(row)

    for key, rows in rows_by_plz.items():
        rows.sort(key=lambda row: len(row.name))

        if len(rows) == 1:
            yield rows[0]
            continue
    
        merged_row = rows[0]
        for row in rows[1:]:
            if len(row.name) > len(merged_row.name):
                merged_row = merged_row._replace(name=row.name)
            if row.phone is not None:
                merged_row = merged_row._replace(phone=row.phone)
            if row.email is not None:
                merged_row = merged_row._replace(email=row.email)
        yield merged_row


def _chunk_plz_data(all_data: dict[str, list[str]]) -> None:
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


def _chunk_buero_data(all_data: set[CleanRow]) -> None:
    for a in "0123456789":
        (OUT_DIR / a).mkdir(exist_ok=True)
        for b in "0123456789":
            prefix = a + b
            partial_buero_data = [_dump_row(row) for row in all_data if row.plz.startswith(prefix)]
            if len(partial_buero_data) == 0:
                continue
            partial_buero_data.sort(key=lambda row: row['plz'])

            out_path = OUT_DIR / a / f"buero_{prefix}.json"
            with out_path.open(mode='w') as fobj:
                fobj.write(pretty_json(partial_buero_data))


def main(args: list[str]) -> int:
    if "plz-data" in args:
        in_path = OUT_DIR / "plz_data.json"
        with in_path.open(mode='r') as fobj:
            all_plz_data = json.load(fobj)

        _chunk_plz_data(all_plz_data)

    if "buero-data" in args:
        buero_path = pl.Path("www") / "data" / f"buero_data.json"
        with buero_path.open(mode='r') as fobj:
            all_buero_data = json.load(fobj)

        cleaned_rows = set(clean_buero_data(all_buero_data))
        merged_rows = list(merge_buero_rows(cleaned_rows))
        _chunk_buero_data(merged_rows)

    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
