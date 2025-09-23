import re
import json
import time
import random
import collections
import subprocess as sp

import bs4

import disk_cache


plz_prefixes = """
010 011 012 013 014 015 016 017 018 019
026 027 028 029 030 031 032 041 042
043 044 045 046 047 048 049 061 062 063
064 065 066 067 068 069 073 074 075 076
077 078 079 080 081 082 083 084 085 086
091 092 093 094 095 096 101 102 103 104
105 106 107 108 109 120 121 122 123 124
125 126 130 131 133 134 135 136 140 141
144 145 146 147 148 149 152 153 155 157
158 159 162 163 165 167 168 169 170
171 172 173 174 175 180 181 182 183 184
185 186 190 192 193 194 200 201 202 203
204 205 210 211 212 213 214 215 216 217
220 221 222 223 224 225 226 227 228 229
235 236 237 238 239 241 242 243 244 245
246 247 248 249 253 254 255 256 257 258
259 261 262 263 264 265 266 267 268 269
272 273 274 275 276 277 278 281 282 283
287 288 292 293 294 295 296 301 304 305
306 308 309 310 311 312 313 315 316 317
318 320 321 322 323 324 325 326 327 328
330 331 333 334 336 337 338 341 342
343 344 345 346 350 351 352 353 354 355
356 357 360 361 362 363 364 370 371 372
373 374 375 376 381 382 383 384 385 386
387 388 391 392 393 394 395 396 402 404
405 406 407 408 410 411 412 413 414 415
417 418 421 422 423 424 425 426 427 428
429 441 442 443 445 446 447 448 451 452
453 454 455 456 457 458 459 460 461 462
463 464 465 470 471 472 474 475 476 477
478 479 481 482 483 484 485 486 487 490
491 492 493 494 495 496 497 498 501 502
503 506 507 508 509 510 511 513 514 515
516 517 520 521 522 523 524 525 531 532
533 534 535 536 537 538 539 542 543 544
545 546 551 552 554 555 556 557 560 561
562 563 564 565 566 567 568 570 572 573
574 575 576 580 581 582 583 584 585 586
587 588 590 591 592 593 594 595 596 597
598 599 603 604 605 611 612 613 614 630
631 632 633 634 635 636 637 638 639 642
643 644 645 646 647 648 651 652 653 654
655 656 657 658 659 661 662 663 664 665
666 667 668 669 670 671 672 673 674 675
676 677 678 681 682 683 685 686 687 688
691 692 694 695 701 703 704 705 706 707
708 710 711 712 713 714 715 716 717 720
721 722 723 724 725 726 727 728 730 731
732 733 734 735 736 737 740 741 742 743
744 745 746 747 748 749 750 751 752 753
754 761 762 763 764 765 766 767 768 776
777 778 779 780 781 782 783 784 785 786
787 790 791 792 793 794 795 796 797 798
803 804 805 806 807 808 809 812 813 814
815 816 817 818 819 820 821 822 823 824
825 830 831 832 833 834 835 836 837 840
841 843 844 845 850 851 852 853 854 855
856 857 861 863 864 865 866 867 868 869
874 875 876 877 880 881 882 883 884
885 886 887 890 891 892 893 894 895 896
904 905 906 907 910 911 912 913 914
915 916 917 918 922 923 924 925 926 927
930 931 933 934 940 941 942 943 944 945
950 951 952 953 954 955 956 957 960 961
962 963 964 965 970 971 972 973 974 975
976 977 978 979 985 986 987 990 991 993
994 995 997 999
"""

plz_prefixes = plz_prefixes.strip().split()

BASE_URL = "https://www.suche-postleitzahl.org/plz-gebiet/{plz}?json=1"

COOKIE = """

_ga=GA1.1.780374671.1706563952; __gads=ID=1e75d5154a4eac5c:T=1706567793:RT=1707619568:S=ALNI_MYszevnhh4gWIdgNGLZWDbj65xLww; __gpi=UID=00000d4c7e447855:T=1706567793:RT=1707619568:S=ALNI_MZpAWE7gz8-67isf6pWsgHGSIgbxA; __eoi=ID=29f0056deb02664c:T=1706640577:RT=1707619568:S=AA-AfjZczQXsBT9Tzndoc8QlSun2; cf_chl_3=b6eee85cadaf514; cf_clearance=LrAmy22J7ufSaM92LCbxYPOesw7nKpmoZ9mWN4R4_kE-1707622988-1-AV1wlTAGVMGWqjUMee/AUhSFioto4jaP0YbQSPNfXBmucHDSAS/CWjDn4Bg+S+pm54j9+iJ6QxeUJRZFBCJ+dKs=; _ga_QDDFWX2D36=GS1.1.1707619229.20.1.1707622993.0.0.0

"""
CACHE_PATH = "plz_request_cache.db"

disk_cache.load_cache(CACHE_PATH)


@disk_cache.cache
def query(prefix):
    print("---QUERY", prefix)
    time.sleep(2.0)
    for retry in range(5):
        cmd = ["bash", "plz_scrape_html.sh", prefix, COOKIE.strip()]
        output = sp.check_output(cmd)
        content = output.decode('utf-8')
        soup = bs4.BeautifulSoup(content, features="html.parser")

        try:
            header_line = soup.find_all('h1')[0].get_text().strip()
            break
        except IndexError:
            if retry == 4:
                raise
            print("retry", retry, prefix)
            time.sleep(9.0)

    title = header_line.split(" ", 1)[-1]

    tbl1 = soup.select_one("#info").select_one('tbody')

    data_table = soup.select_one("#data-table")
    if data_table is None:
        data_table = soup.select_one("#list")
        if data_table is None:
            tbl2 = soup.select('table')[1]
        else:
            tbl2 = data_table.select_one('tbody')
    else:
        tbl2 = data_table.select_one('tbody')

    area_info = {}
    if tbl1:
        for header, data in zip(tbl1.find_all('th'), tbl1.find_all('td')):
            key = header.get_text().strip()
            val = data.get_text().strip()
            area_info[key] = val

    if 'Bevölkerungsdichte' in area_info:
        area_info.pop('Bevölkerungsdichte', None)

    if 'Fläche' in area_info:
        area_info.pop('Fläche', None)

    if 'Anzahl Ortsteile' in area_info:
        area_info['is_city'] = True
        area_info.pop('Anzahl Ortsteile', None)
    else:
        area_info['is_city'] = False

    if 'Anzahl Orte' in area_info:
        area_info['is_region'] = True
        area_info.pop('Anzahl Orte', None)
    else:
        area_info['is_region'] = False

    if 'Einwohner' in area_info:
        population = int(area_info.pop('Einwohner').replace(".", ""))
    else:
        population = 0

    area_info['population'] = population

    # area_plzs_node = soup.select_one('.plz-gebiet-menu').find_all('span')
    # area_plzs = [span.get_text() for span in area_plzs_node]

    header = soup.find_all('thead')[0].find_all('th')
    num_headers = len(header)

    cells = tbl2.find_all('td')
    html_rows = []
    for key_cell, val_cell in zip(cells[0::num_headers], cells[1::num_headers]):
        key = key_cell.get_text().strip()
        val = val_cell.get_text().strip()
        html_rows.append([key, val])

    try:
        output = sp.check_output(["bash", "plz_scrape_json.sh", prefix])
        jsonhtml_rows = json.loads(output.decode('utf-8'))['data']
        json_rows = [
            [
                jhr[0].split(">", 1)[1].split("<")[0],
                jhr[1].split(">", 1)[1].split("<")[0],
            ]
            for jhr in jsonhtml_rows
        ]
    except json.JSONDecodeError as err:
        json_rows = []

    rows = sorted(map(list, (
        set(map(tuple, html_rows)) |
        set(map(tuple, json_rows))
    )))

    return [prefix, title, area_info, rows]


items_by_plz = collections.defaultdict(list)


try:
    for prefix in plz_prefixes:
        try:
            _prefix, title, area_info, rows = query(prefix)
            pop = area_info['population']
            is_city = int(area_info.get('is_city', 0))
            is_area = int(area_info.get('is_area', 0))

            area_info['is_city'] = is_city
            area_info['is_area'] = is_area

            # print(prefix, is_city, title, pop, len(rows))

            for plz, town in rows:
                city = title.strip()
                town = town.strip()

                if city in town:
                    expanded_name = None
                else:
                    has_simple_names = (
                        " " in city or
                        " " in town or
                        "/" in town or
                        "-" in town or
                        "/" in city or
                        "-" in city
                    )
                    if has_simple_names:
                        expanded_name = f"{town} ({city})"
                    else:
                        expanded_name = f"{city}-{town}"

                # if prefix == "029":
                #     print("####", plz, city, town)
                #     print("        ", area_info)
                # if plz == "10243":
                #     print("####", plz, is_city, is_area, city, town)
                #     print("      ..", area_info)
                #     print("      <<", name)

                new_item = area_info.copy()
                new_item['plz'] = plz
                new_item['names'] = []

                if plz in items_by_plz:
                    old_item = items_by_plz[plz]
                    is_same_item = all(
                        old_item[key] == new_item[key]
                        for key in old_item.keys()
                        if key != 'names'
                    )
                    assert is_same_item, (old_item, new_item)

                    found_item = old_item
                else:
                    found_item = items_by_plz[plz] = new_item

                if expanded_name:
                    found_item['names'].append(expanded_name)
                    found_item['names'].append(town)
                else:
                    found_item['names'].append(town)

        except Exception as ex:
            print(prefix, "fail")
            raise
finally:
    disk_cache.dump_cache(CACHE_PATH)


with open("postleitzahlen_2023.json", mode="r") as fobj:
    base_plz_rows = json.loads(fobj.read())

plz_names = collections.defaultdict(list)
for plz, name in base_plz_rows:
    plz_names[plz].append(name)

all_plz = set(plz_names.keys()) | set(items_by_plz.keys())


default_item = {
    'is_city'   : 0,
    'is_area'   : 0,
    'population': 0,
}

output = {}

for plz in sorted(all_plz):
    names = plz_names.get(plz, [])
    if plz in items_by_plz:
        item = items_by_plz[plz]
    else:
        item = default_item.copy()
        item['plz'] = plz

    names = sorted(set(names) | set(item.get('names', [])))

    assert plz not in output
    output[plz] = names

    # if plz.startswith("029"):
    #     print(plz, int(item['is_city']), str(item['population']).rjust(9), end="  ")
    #     print("    ", ", ".join(item['names']))


output_data = json.dumps(output)
output_data = output_data.replace('], "', '],\n"')

with open("postleitzahlen_2023_v3.json", mode="wb") as fobj:
    fobj.write(output_data.encode('utf-8'))
