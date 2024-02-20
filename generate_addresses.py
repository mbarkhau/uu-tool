# Quelle:
#
# https://www.statistikportal.de/de/veroeffentlichungen/anschriftenverzeichnis
#
import json
import pathlib as pl
import openpyxl

IN_FILE = "Anschriften_der_Gemeinde_und_Stadtverwaltungen_Stand_31012023_final.xlsx"

wb = openpyxl.load_workbook(IN_FILE)
ws = wb['Anschriften_31_01_2023']

COL_NAMES = [
    '',                 # A
    '',                 # B
    '',                 # C
    '',                 # D
    # 'kennzeichen',    # E  Textkennzeichen
    '',                 # E  Textkennzeichen
    # 'ARS',            # F  Amtlicher Regionalschluessel
    '',                 # F  Amtlicher Regionalschluessel
    'AGS',              # G  Amtlicher Gemeindeschluessel
    'gemeinde',         # H  Gemeinde/Stadt
    'sitz',             # I  Verwaltungssitz
    'strasse',          # J  Strasse
    'PLZ',              # K  Postleitzahl
    'ort',              # L  Ort
    'area',             # M  Flaeche
    'population',       # N  Bevoelkerung
]

row_num = 9
last_row = 13394

entries_by_plz_prefix = {}

while True:
    for row in ws[f"A{row_num}:Q{row_num}"]:
        entry = {col: cell.value for col, cell in zip(COL_NAMES, row) if col}
        if not entry['AGS']:
            continue

        # fixup fields to align with postleitzahlen_xyz.json
        # for field in ('ort', 'gemeinde'):
        #     entry[field] = (
        #         entry[field]
        #             .replace("a.d.", "a.d. ")
        #             .replace("a.", "a. ")
        #             .replace("b.", "b. ")
        #             .replace("i.", "i. ")
        #             .replace("  ", " ")
        #     )

        plz = entry['PLZ']
        prefix = plz[:1]

        if prefix not in entries_by_plz_prefix:
            entries_by_plz_prefix[prefix] = []

        entries_by_plz_prefix[prefix].append(entry)

        # print(entry['strasse'], entry['PLZ'], entry['ort'], entry['gemeinde'], entry['population'])

    row_num = row_num + 1
    if row_num > last_row:
        break

dir_path = pl.Path("city_data")
if not dir_path.exists():
    dir_path.mkdir()

for prefix, entries in entries_by_plz_prefix.items():
    file_path = dir_path / f"adr_{prefix}.json"
    entries_data = json.dumps(entries)
    entries_data = entries_data.replace("}, {", "},\n {")
    with file_path.open(mode="w", encoding="utf-8") as fobj:
        fobj.write(entries_data)


# remove entries from autocomplete file (which also contains districts)
valid_items = set()

for _, entries in entries_by_plz_prefix.items():
    for entry in entries:
        valid_items.add((entry['PLZ'][:1], entry['ort'].replace("", "")))
        valid_items.add((entry['PLZ'], entry['ort'].replace("", "")))
        valid_items.add((entry['PLZ'], entry['gemeinde'].replace("", "")))

with pl.Path("postleitzahlen_2023.json").open(mode='r') as fobj:
    plz_data = json.loads(fobj.read())

new_plz_data = []

for plz, name in plz_data:
    if (plz, name.replace("", "")) in valid_items:
        new_plz_data.append([plz, name])
    elif (plz[:1], name.replace("", "")) in valid_items:
        new_plz_data.append([plz, name])
    # else:
    #     print("unsearchable", plz, ",", name)

with pl.Path("postleitzahlen_2023_v2.json").open(mode='w') as fobj:
    fobj.write(json.dumps(new_plz_data).replace("], [", "],\n ["))

print("  searchable entries", len(new_plz_data))
print("unsearchable entries", len(plz_data) - len(new_plz_data))
