# Quelle:
#
# https://www.statistikportal.de/de/veroeffentlichungen/anschriftenverzeichnis
#
import json
import pathlib
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

        plz = entry['PLZ']
        prefix = plz[:1]

        if prefix not in entries_by_plz_prefix:
            entries_by_plz_prefix[prefix] = []

        entries_by_plz_prefix[prefix].append(entry)

        # print(entry['strasse'], entry['PLZ'], entry['ort'], entry['gemeinde'], entry['population'])

    row_num = row_num + 1
    if row_num > last_row:
        break

dir_path = pathlib.Path("city_data")
if not dir_path.exists():
    dir_path.mkdir()

for prefix, entries_by_plz in entries_by_plz_prefix.items():
    file_path = dir_path / f"adr_{prefix}.json"
    entries_data = json.dumps(entries_by_plz)
    entries_data = entries_data.replace("}, {", "},\n{")
    with file_path.open(mode="w", encoding="utf-8") as fobj:
        fobj.write(entries_data)

# in_file.sheet_by_name('Sheet1')
# 'Anschriften'
