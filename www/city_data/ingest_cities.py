#!/usr/bin/env python3
import re
import time
import json
import logging
import pathlib as pl
import collections

logger = logging.getLogger('ingest_cities')


MAIN_KEYS = [
    'PLZ',
    'ort',
    'strasse',
    'phone',
    'email',
    'name',
]

MISC_KEYS = ['AGS', 'area', 'population', 'sitz', 'gemeinde']

ALL_KEYS = MAIN_KEYS + MISC_KEYS


def try_write(path: pl.Path, data: bytes | str) -> None:
    if isinstance(data, str):
        data = data.encode("utf-8")

    tmp_path = path.parent / (path.name + ".tmp")
    for _ in range(5):
        try:
            logger.info(f"write {tmp_path}")
            with tmp_path.open(mode='wb') as fobj:
                fobj.write(data)

            tmp_path.replace(path)
            return
        except PermissionError as err:
            logger.warning(f"error writing {err}")
            time.sleep(2)


raw_ingested = []

for i in range(10):
    path = pl.Path("city_data") / f"adr_{i}.json"
    with path.open(mode="r", encoding="utf-8") as fobj:
        raw_ingested.extend(json.load(fobj))


full_items = collections.defaultdict(list)

for raw_item in raw_ingested:
    full_item = {}
    for key in MAIN_KEYS + MISC_KEYS:
        full_item[key.lower()] = raw_item.get(key, None)

    full_item['str'] = full_item.pop('strasse')
    full_items[full_item['plz']].append(full_item)


NAME_PREFIXES = [
    "Bürgeramt",
    "Meldestelle",
    "Bürgerbüro",
    "Ortsamt",
    "Verwaltungsstelle",
    "Einwohnermeldeamt",
]

admin = None


class LineIterator:

    def __init__(self):
        self.path = pl.Path("city_data") / f"aemter_raw.txt"
        self.line = None

    def next(self):
        while True:
            self.line = next(self.iterator).strip()
            if self.line:
                return self.line

    def peek(self):
        if self.line is None:
            return self.next()
        else:
            return self.line

    def __enter__(self):
        self.fobj = self.path.open(mode="r", encoding="utf-8")
        self.iterator = iter(self.fobj)
        return self

    def __exit__(self, *exc):
        self.fobj.close()


ORT_RE = re.compile(r"^\d{5} [A-Za-zÄÖÜäöüß\(\)\- ]+$")
assert ORT_RE.match("73035 Göppingen")
assert ORT_RE.match("73525 Schwäbisch Gmünd")
assert ORT_RE.match("45701 Herten-Westerholt")


with LineIterator() as itor:
    admin = {}

    while True:
        try:
            if itor.peek().startswith("#"):
                if admin:
                    full_items[plz].append(admin)
                    admin = {}

                name = itor.peek().lstrip("# ")
                for prefix in NAME_PREFIXES:
                    if name.startswith(prefix):
                        admin['prefix'] = prefix
                        name = name[len(prefix):].lstrip()
                admin['name'] = name
                itor.next()
            elif itor.peek() == admin['name']:
                itor.next()
                continue
            elif itor.peek().lower().startswith("telefon"):
                phone = itor.peek()[len("telefon"):].lstrip(": ")
                phone = phone.replace(" ", "-").split(",")[0]
                while "--" in phone:
                    phone = phone.replace("--", "-")
                admin['phone'] = phone
                itor.next()
            elif itor.peek().lower().startswith("email"):
                email = itor.peek()[len("email"):].lstrip(": ")
                admin['email'] = email.lower()
                itor.next()
            elif "," in itor.peek():
                admin['subdivisions'] = [
                    sd.strip() for sd in itor.peek().split(":", 1)[-1].split(",")
                ]

                itor.next()
            elif ORT_RE.match(itor.peek()):
                plz, ort = itor.peek().split(" ", 1)
                admin['plz'] = plz
                admin['ort'] = ort
                itor.next()
            else:
                if 'str' in admin:
                    admin['str'] += "\n" + itor.peek()
                else:
                    admin['str'] = itor.peek()
                itor.next()
        except StopIteration:
            break


items_by_prefix = collections.defaultdict(list)

for plz, admin_items in full_items.items():
    prefix = plz[0]
    assert prefix.isdigit()

    merged_items = {}
    for item_a in admin_items:
        if 'gemeinde' in item_a:
            assert item_a.get('name') is None
            item_a['name'] = item_a.pop('gemeinde')

        addr = (item_a['ort'], item_a['name'], item_a['str'])
        if addr in merged_items:
            item_b = merged_items[addr]
            for key in item_a.keys():
                if key in ('ags', 'prefix'):
                    continue

                if item_b.get(key) is None or key not in item_b:
                    item_b[key] = item_a[key]
                else:
                    if item_b[key] != item_a[key]:
                        print(item_a)
                        print(item_b)
                        print(key, item_b[key], item_a[key])
                        assert False
        else:
            merged_items[addr] = item_a

    items_by_prefix[prefix].extend(merged_items.values())


for prefix, items in items_by_prefix.items():
    path = pl.Path("city_data") / f"buero_{prefix}.json"
    data = json.dumps(items)
    data = data.replace("}, {", "},\n{")
    try_write(path, data)

