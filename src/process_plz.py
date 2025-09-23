#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.13"
# dependencies = [
#   "requests",
# ]
# ///
import json
import time
import shelve
import requests
import pathlib as pl

import disk_cache

fds_url = "https://fragdenstaat.de/api/v1/publicbody/"

headers = {
    'authority': 'fragdenstaat.de',
    'accept': 'application/json',
    'accept-encoding': 'gzip, deflate, br',
    'cache-control': 'max-age=0',
}

CACHE_PATH = "fragdenstaat_request_cache.db"

disk_cache.load_cache(CACHE_PATH)


@disk_cache.cache
def request(url: str, params: dict) -> dict:
    response = requests.request("GET", url, headers=headers, params=params)
    return json.loads(response.content)


INVALID_CLS_IDS = set([
    118,    # ministerium
    101,    # stiftung
    102,    # medienanstalt
    111,    # rundfunkanstalt
    113,    # fachhochschule
    12,     # heimaufsicht
    13,     # stiftung des privatrechts
    136,    # gesundheitsamt
    147,    # investitionsbank
    15,     # hochschule
    170,    # krankenhaus
    176,    # gesundheit
    19,     # ausländerbehörde
    197,    # landesrechnungshof
    20,     # landwirtschaft
    208,    # landgericht
    213,    # landwirtschaftskammer
    22,     # veterinäramt
    221,    # bau
    228,    # ordnungsamt
    231,    # schule
    243,    # rundfunk
    25,     # amtsgericht
    253,    # schulamt
    259,    # krankenkasse
    27,     # kammer
    280,    # stadtwerke
    29,     # arbeitsgericht
    293,    # umweltamt
    294,    # unfallkasse
    297,    # verfassungsgericht
    30,     # arbeitskammer
    32,     # architektenkammer
    33,     # ärztekammer
    330,    # agentur für arbeit
    331,    # jobcenter
    335,    # forst und wald
    337,    # parks und gärten
    339,    # landeszentrale für politische bildung
    34,     # asta
    341,    # bäderbetriebe
    353,    # antikorruption
    355,    # archäologie
    356,    # archiv
    357,    # staatsarchiv
    364,    # aus- und weiterbildung
    369,    # bank
    379,    # bauamt
    380,    # behindertenbeauftragte
    384,    # beirat
    49,     # betrieb
    50,     # feuerwehr
    386,    # beratungsstelle
    390,    # bibliothek
    391,    # huchschulbibliothek
    405,    # denkmäler
    408,    # dienstleistung
    409,    # energie
    415,    # bahn
    421,    # forschung
    435,    # verfassungsschutz
    44,     # bau- und liegenschaftsbetrieb
    450,    # studierendenwerk
    466,    # jugendamt
    47,     # polizei
    48,     # akademie
    484,    # kommunaler verband
    485,    # städtetag
    486,    # bezirketag
    487,    # landkreistag
    490,    # universitätsklinikum
    492,    # kulturamt
    5,      # verband
    500,    # ländliche entwicklung
    503,    # liegenschaftsamt
    504,    # mess- und eichwesen
    507,    # münzerei
    508,    # museum und ausstellungen
    510,    # nahverkehr
    52,     # sparkasse
    521,    # landtagsverwaltung
    526,    # personal
    54,     # verkehrsbetriebe
    544,    # schloss
    547,    # berufsschule
    548,    # volkshochschule
    550,    # foerderschule
    557,    # versorgungskammer
    563,    # stadtenwicklungsamt
    569,    # straßen und grünflächen
    577,    # umweltschutz
    582,    # verkehr
    583,    # verkehrsamt
    585,    # versorgungsamt
    620,    # soziales
    624,    # regionalplanung
    626,    # gymnasium
    628,    # oberverwaltungsgericht
    636,    # beauftragte
    642,    # grundschule
    643,    # integrierte sekundarschule
    644,    # gemeinschaftsschule
    645,    # berufliches gymnasium
    646,    # freie waldorfschule
    654,    # kreisverwaltung
    657,    # verkehrsverbund
    347,    # wasserwirtschaft
    105,    # kolleg
    581,    # vergabe
    349,    # abwasser
    511,    # betriebshof
    60,     # Bezirksregierung
    637,    # Immissionsschutz
    397,    # Militärische Ausbildungsstätte
    612,    # Bezirksverwaltung
    479,    # Kirche
    68,     # IT-Dienstleister
    348,    # Abfallwirtschaft
    74,     # Lotto
    448,    # Gleichstellung
    43,     # Universität
    541,    # Regulierungsbehörde
    552,    # Arbeitsschutz
    572,    # Telekommunikation
    630,    # Bundesanstalt
    387,    # Bergbau und Geologie
    342,    # Wasser und Schifffahrt
    502,    # Liegenschaften
    533,    # Prüfungsamt
    573,    # THW
    354,    # Anzeigenblatt
    28,     # Apothekerkammer
    465,    # Jugend
    414,    # Flug
    635,    # Beauftragte für Datenschutz und Informationsfreiheit
    117,    # Finanzgericht
    26,     # Gericht
    361,    # Endlagerung
    359,    # Arzneimittel und Medizin
    240,    # Polizeiinspektion
    531,    # Bundespolizei
    273,    # Staatskanzlei
    520,    # Parlamentsverwaltung
    245,    # Rechnungshof
    246,    # Rechtsanwaltskammer
    260,    # Sozialgericht
    396,    # Bundeswehr
    417,    # Luftverkehr
    468,    # Steuerberaterkammer
    14,     # Stiftung des öffentlichen Rechts
    650,    # Bundesverwaltungsgericht
    82,     # Wahlleiter
    399,    # Bundeswehrkrankenhaus
    604,    # Zulassung
    452,    # Kunsthochschule
    462,    # Integration
    381,    # Bürgerbeauftragte(r)
    639,    # Landesbeauftragte für Datenschutz und Informationsfreiheit
    527,    # Kreispolizei
    171,    # Landkreisverwaltung
    447,    # GIZ
    594,    # Wirtschaftsförderung
    497,    # Oper
    97,     # Rentenversicherung
    263,    # Sozialversicherung
    489,    # Konferenz
    428,    # Frauen
    98,     # Richterakademie
    340,    # Sport und Freizeit
    580,    # Verein
    506,    # Meteorologie
    574,    # Tourismus
    555,    # Sozialamt
    416,    # Autobahndirektion
    499,    # Landesbotschaft
    638,    # Beauftragte für Datenschutz
    90,     # Justizvollzugsbeauftragte
    656,    # Gemeinsames Kommunalunternehmen
    543,    # Rettung
    480,    # Kita
    653,    # Kreisfreie Stadt
    652,    # Militärische Mission
    571,    # Daten
    411,    # EU
    627,    # Finanzamt
    360,    # Atomkraft
    614,    # Natur
    375,    # Bauaufsicht
    598,    # Zentralverband
    45,     # Landeskriminalamt
    457,    # Hochschule für öffentliche Verwaltung
    189,    # Landesfinanzschule
    122,    # Forstamt
    449,    # Haushalt und Steuern
    121,    # Flughafen
    659,    # Friedhof
    575,    # TÜV
    430,    # Führerscheinstelle
    606,    # Justiz
    597,    # Wohnungsgesellschaft
    133,    # Generalstaatsanwaltschaft
    424,    # Leibniz-Institut
    463,    # Internationale Beziehungen
    641,    # Unternehmen
    138,    # Gutachterausschuss
    103,    # Dienstleistungszentrum
    647,    # Ausländische Schule
    153,    # Justizvollzugsanstalt
    149,    # Jugendstrafanstalt
    412,    # Familie
    155,    # Justizvollzugskrankenhaus
    388,    # Berufsbildung
    567,    # Statistik
    565,    # Wasserwerk
    535,    # Rechnungswesen
    570,    # Technologie
    368,    # Automobil
    173,    # Kriminaldirektion
    174,    # Kriminalinspektion
    195,    # Landesprüfungsamt
    179,    # Landesarchiv
    528,    # Bereitschaftspolizei
    494,    # Musik
    336,    # Regionalforstamt
    517,    # Pädagogik
    100,    # Theater
    505,    # Eichamt
    187,    # Landesfeuerwehrschule
    538,    # Rechtsmedizin
    545,    # Lehrerfortbildung
    372,    # Förderbank
    579,    # Verbraucherschutzamt
    481,    # Medien
    651,    # Landessozialgericht
    560,    # Sprachen
    291,    # Tierärztekammer
    529,    # Wasserschutzpolizei
    471,    # Zahnärztekammer
    619,    # Bürger
    156,    # Justizvollzugsschule
    370,    # Entwicklungsbank
    443,    # Gewerbe
    160,    # Katastrophenschutz
    495,    # Film
    218,    # Messe
    625,    # Musikhochschule
    493,    # Kunst
    251,    # Notarkammer
    464,    # Jagdamt
    230,    # Ortspolizeibehörde
    459,    # Pädagogische Hochschule
    523,    # Passwesen
    93,     # Polizeipräsident
    237,    # Polizeidirektion
    238,    # Polizei-Führungsakademie
    239,    # Polizeipräsidium
    241,    # Polizeiwache
    534,    # Rechnungsprüfungsamt
    402,    # Bußgeldstelle
    539,    # Regierungspräsidium
    542,    # Regulierungskammer
    406,    # Gedenkstätte
    455,    # Technische Hochschule
    456,    # Technische Universität
    568,    # Politische Stiftung
    640,    # Landesbeauftragte für Datenschutz
    442,    # Gestüte
    198,    # Landesschule
    660,    # Landesarbeitsgericht
    649,    # Verwaltungsgericht
    554,    # Senioren
    389,    # Bewährungshilfe
    556,    # Sozialer Dienst der Justiz
    327,    # Medizinisches Zentrum
    631,    # Sozialwerk
    461,    # Studierendenparlament
    496,    # Galerie
    265,    # Staatliches Berufskolleg
    445,    # Gewerbeaufsicht
    272,    # Staatsanwaltschaft
    392,    # Staatsbibliothek
    358,    # Stadtarchiv
    275,    # Stadtbibliothek
    590,    # Wahlamt
    518,    # Park
    282,    # Standesamt
    377,    # Tiefbau
    287,    # Struktur- und Genehmigungsdirektion
    458,    # Hochschule für Medien
    584,    # Versicherung
    296,    # Verbraucherzentrale
    472,    # Vergabekammer
    589,    # Wahlen
    345,    # Wasserstraßen-Neubauamt
    346,    # Wasser- und Schiffahrtsamt
    519,    # Zoologischer Garten
    437,    # Geoinformationen
    658,    # Zentrales Vollstreckungsgericht
    325,    # Verwaltungsschule
    413,    # Fernverkehr
    553,    # Gesundheitsschutz
    600,    # Zollfahndungsamt
    591,    # Hafen
    172,    # Krematorium
    470,    # Baukammer
    249,    # Investitionskreditbank
    141,    # Handwerkskammer
    145,    # Industrie- und Handelskammer
    146,    # Ingenieurkammer
    599,    # Hauptzollamt
    551,    # Schutz
    367,    # Lehrwerkstatt
    540,    # Register
    546,    # Abendschule
    451,    # Akademie der Künste

    434,    # Geheimdienst
    439,    # Anwaltsgericht
    35,     # Berufsakademie
    491,    # Kultur
    57,     # Berufsgenossenschaft
    66,     # Börse
    332,    # Regionaldirektion der Agentur für Arbeit
    608,    # Verbraucher
    592,    # Wettbewerbsbehörde
    374,    # Bundeskasse
    473,    # Lotsenkammer
    400,    # Bundeswehrverwaltungsstelle
    338,    # Politische Bildung
    410,    # Ernährung
    522,    # Kreistagsverwaltung
    395,    # Boden
    498,    # Ausstellungen
    525,    # Patente
    106,    # Einheitlicher Ansprechpartner
    164,    # Studentenwerk
    559,    # Familienkasse
    83,     # Zoll
    120,    # Fischereiamt
    444,    # Gewerbeamt

    512,    # Schiffsnahverkehr
    422,    # Helmholtz-Zentrum
    376,    # Hochbau
    148,    # Jugendarrestanstalt
    151,    # Justizakademie
    629,    # Kommunalaufsicht
    427,    # Nationalpark
    607,    # Justizvollzug
    217,    # Materialprüfungsamt
    236,    # Pflanzenschutzamt
    469,    # Psychotherapeutenkammer
    244,    # Rechenzentrum
    256,    # Selbsthilfegruppen
    365,    # Lehramt
    460,    # Studienkolleg
    120,    # Fischereiamt
    299,    # Verkehrsdirektion
    475,    # Wirtschaftsprüferkammer
])


VALID_CLS_IDS = set([
    41,     # Stadtverwaltung
    126,    # Gemeindeverwaltung
    482,    # Kommunale Verwaltung
    634,    # Verwaltungsverbund
    401,    # Bürgeramt
    58,     # Bezirksamt
    84,     # Bürgermeister

    516,    # Ortsamt
    85,     # Bürgerschaftsverwaltung
])


first_offset = 0
last_offset  = 55000
page_size = 50


try:
    for offset in range(first_offset, last_offset, page_size):
        params = {"format": "json", "offset": offset, "limit": page_size}
        result = request(fds_url, params)
        for obj in result['objects']:
            if not obj['address']:
                continue
            print(json.dumps(obj['address']) + ",")

            if 'postfach' in obj['address'].lower():
                continue

            try:
                cls_id = obj['classification']['id']
                if cls_id in INVALID_CLS_IDS:
                    continue
            except (TypeError, KeyError, ValueError) as err:
                # print(err, obj)
                continue

            obj.pop('geo', None)
            obj.pop('laws', None)
            obj.pop('site_url', None)
            obj.pop('jurisdiction', None)

            cls_name = obj['classification']['name']
            if cls_id not in VALID_CLS_IDS:
                print("unkown class", cls_id, cls_name)

            # print(cls_id, obj['id'], (obj['name'], obj['address'], obj['email']))

        if len(result['objects']) < page_size:
            break
finally:
    disk_cache.dump_cache(CACHE_PATH)
