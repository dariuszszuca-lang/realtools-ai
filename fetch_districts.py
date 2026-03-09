#!/usr/bin/env python3
"""
fetch_districts.py — Pobiera mapowanie ulic → dzielnic z OpenStreetMap (Overpass API)
Generuje plik districts_data.json używany przez serwer RCT.

Użycie: python3 fetch_districts.py
Wynik:  data/districts_data.json

Źródło: OpenStreetMap Overpass API — darmowe, publiczne dane.
"""

import json
import time
import urllib.request
import urllib.parse
import sys
from pathlib import Path

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
OUTPUT_FILE = Path(__file__).parent / "data" / "districts_data.json"
DELAY_BETWEEN_REQUESTS = 5  # seconds — Overpass wymaga przerw
MAX_RETRIES = 3

# Miasta i ich admin_level w OSM
CITIES = {
    "Gdańsk":  {"admin_level": "9"},
    "Sopot":   {"admin_level": "10"},
    "Gdynia":  {"admin_level": "9"},
}

# Statyczna mapa (fallback — ręcznie utrzymywana, z districts.js)
# Merge z danymi OSM — OSM ma priorytet, statyczna mapa wypełnia luki
STATIC_MAP = {
    "Sopot": {
        "Bohaterów Monte Cassino": "Dolny Sopot", "Dworcowa": "Dolny Sopot",
        "Jana Jerzego Haffnera": "Dolny Sopot", "Tadeusza Kościuszki": "Dolny Sopot",
        "Podjazd": "Dolny Sopot", "Aleja Niepodległości": "Dolny Sopot",
        "Stefana Żeromskiego": "Dolny Sopot", "Jakuba Goyki": "Dolny Sopot",
        "Jana Sobieskiego": "Dolny Sopot", "Jana Winieckiego": "Dolny Sopot",
        "Sopocka": "Dolny Sopot", "Bałtycka": "Dolny Sopot",
        "Bitwy pod Płowcami": "Dolny Sopot", "Parkowa": "Dolny Sopot",
        "Zwycięstwa": "Dolny Sopot", "Gdyńska": "Dolny Sopot",
        "Druskiennicka": "Dolny Sopot", "Kwietna": "Dolny Sopot", "Lipowa": "Dolny Sopot",
        "Józefa Czyżewskiego": "Górny Sopot", "Armii Krajowej": "Górny Sopot",
        "Polna": "Górny Sopot", "Podleśna": "Górny Sopot", "Leśna": "Górny Sopot",
        "Fryderyka Chopina": "Górny Sopot", "Władysława Orkana": "Górny Sopot",
        "Kameralna": "Górny Sopot", "Strzelców": "Górny Sopot",
        "Wzgórze Bernadowo": "Górny Sopot", "Bernadowska": "Górny Sopot",
        "Spokojna": "Górny Sopot", "Nowodworcowa": "Górny Sopot",
        "Orłowska": "Kamienny Potok", "Karlikowska": "Kamienny Potok",
        "Krynicka": "Kamienny Potok", "Południowa": "Kamienny Potok",
        "Małopolska": "Kamienny Potok", "Bursztynowa": "Kamienny Potok",
        "Jana Husa": "Brodwino", "Kazimierza Kruczkowskiego": "Brodwino",
        "Leopolda Staffa": "Brodwino", "Kornela Makuszyńskiego": "Brodwino",
        "Zofii Nałkowskiej": "Brodwino", "Jana Brzechwy": "Brodwino",
        "Aleja Grunwaldzka": "Centrum", "Króla Jana Kazimierza": "Centrum",
    },
    "Gdynia": {
        "Świętojańska": "Śródmieście", "10 Lutego": "Śródmieście",
        "Starowiejska": "Śródmieście", "Abrahama": "Śródmieście",
        "Waszyngtona": "Śródmieście", "Armii Krajowej": "Śródmieście",
        "Batorego": "Śródmieście", "Piłsudskiego": "Śródmieście",
        "Władysława IV": "Śródmieście", "Portowa": "Śródmieście",
        "Plac Kaszubski": "Śródmieście", "3 Maja": "Śródmieście",
        "Orłowska": "Orłowo", "Kasztanowa": "Orłowo", "Perkuna": "Orłowo",
        "Legionów": "Redłowo", "Redłowska": "Redłowo",
        "Powstania Styczniowego": "Redłowo",
        "Partyzantów": "Wzgórze Św. Maksymiliana",
        "Wyspiańskiego": "Wzgórze Św. Maksymiliana",
        "Sienkiewicza": "Wzgórze Św. Maksymiliana",
        "Śląska": "Działki Leśne", "Warszawska": "Działki Leśne",
        "Morska": "Grabówek", "Chylońska": "Chylonia", "Gniewska": "Chylonia",
        "Bosmańska": "Obłuże", "Dickmana": "Oksywie",
        "Chwarznieńska": "Witomino", "Rolnicza": "Witomino",
        "Łużycka": "Mały Kack", "Stryjska": "Mały Kack",
        "Rdestowa": "Dąbrowa", "Makuszyńskiego": "Karwiny",
        "Żeliwna": "Pogórze", "Aluminiowa": "Pogórze",
    },
}

# Fallback: Sopot ma 4 dzielnice na level 10, ale też mniejsze osiedla
# Gdynia ma 22 dzielnice na level 9


def overpass_query(query, retries=MAX_RETRIES):
    """Wykonaj zapytanie Overpass API z retry."""
    data = urllib.parse.urlencode({"data": query}).encode("utf-8")
    for attempt in range(retries):
        if attempt > 0:
            wait = DELAY_BETWEEN_REQUESTS * (attempt + 1)
            print(f"  [RETRY] Attempt {attempt + 1}/{retries}, waiting {wait}s...", file=sys.stderr)
            time.sleep(wait)
        req = urllib.request.Request(OVERPASS_URL, data=data, headers={
            "User-Agent": "RCT-DistrictFetcher/1.0",
            "Content-Type": "application/x-www-form-urlencoded",
        })
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            print(f"  [ERROR] Overpass (attempt {attempt + 1}): {e}", file=sys.stderr)
    return None


def fetch_districts_for_city(city, admin_level):
    """Pobierz nazwy dzielnic i ich ulice z OSM."""
    print(f"\n{'='*50}", file=sys.stderr)
    print(f"[{city}] Pobieram dzielnice (admin_level={admin_level})...", file=sys.stderr)

    # Krok 1: Pobierz dzielnice (relacje admin_level=X w danym mieście)
    query_districts = f"""
    [out:json][timeout:60];
    area["name"="{city}"]["admin_level"="6"]->.city;
    rel(area.city)["admin_level"="{admin_level}"]["boundary"="administrative"];
    out tags;
    """
    result = overpass_query(query_districts)
    if not result or "elements" not in result:
        print(f"  [WARN] Brak dzielnic dla {city}", file=sys.stderr)
        # Spróbuj z innym admin_level
        alt_level = "10" if admin_level == "9" else "9"
        print(f"  [RETRY] Próbuję admin_level={alt_level}...", file=sys.stderr)
        query_districts = f"""
        [out:json][timeout:60];
        area["name"="{city}"]["admin_level"="6"]->.city;
        rel(area.city)["admin_level"="{alt_level}"]["boundary"="administrative"];
        out tags;
        """
        result = overpass_query(query_districts)
        if not result or "elements" not in result:
            return {}

    districts = {}
    for el in result["elements"]:
        name = el.get("tags", {}).get("name", "")
        if name:
            districts[el["id"]] = name

    print(f"  Znaleziono {len(districts)} dzielnic: {', '.join(districts.values())}", file=sys.stderr)

    # Krok 2: Dla każdej dzielnicy pobierz ulice
    street_map = {}  # {ulica: dzielnica}
    for rel_id, district_name in districts.items():
        time.sleep(DELAY_BETWEEN_REQUESTS)  # Rate limit — Overpass wymaga przerw
        print(f"  [{district_name}] Pobieram ulice...", file=sys.stderr)

        query_streets = f"""
        [out:json][timeout:60];
        rel({rel_id});
        map_to_area->.district;
        way(area.district)["highway"]["name"];
        out tags;
        """
        streets_result = overpass_query(query_streets)
        if not streets_result or "elements" not in streets_result:
            print(f"    [WARN] Brak ulic dla {district_name}", file=sys.stderr)
            continue

        unique_streets = set()
        for el in streets_result["elements"]:
            street_name = el.get("tags", {}).get("name", "")
            if street_name and street_name not in unique_streets:
                unique_streets.add(street_name)
                # Ulica może być w kilku dzielnicach — pierwsza wygrywa
                if street_name not in street_map:
                    street_map[street_name] = district_name

        print(f"    → {len(unique_streets)} ulic", file=sys.stderr)

    return street_map


def fetch_nominatim_districts(city):
    """Fallback: pobierz dzielnice z Nominatim (prostsze, mniej dokładne)."""
    print(f"\n[{city}] Fallback: Nominatim search...", file=sys.stderr)
    url = f"https://nominatim.openstreetmap.org/search?q={urllib.parse.quote(city)},Poland&format=json&addressdetails=1&limit=1"
    req = urllib.request.Request(url, headers={"User-Agent": "RCT-DistrictFetcher/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if data:
                return data[0].get("address", {})
    except Exception:
        pass
    return {}


def load_existing():
    """Load existing districts_data.json if it exists."""
    if OUTPUT_FILE.exists():
        try:
            return json.loads(OUTPUT_FILE.read_text(encoding='utf-8'))
        except Exception:
            pass
    return {}


def main():
    print("RCT — Pobieranie mapowania ulic → dzielnic z OpenStreetMap", file=sys.stderr)
    print(f"Wynik: {OUTPUT_FILE}", file=sys.stderr)

    # Załaduj istniejące dane (żeby nie tracić tego co już pobrano)
    all_data = load_existing()
    print(f"Istniejące dane: {sum(len(v) for v in all_data.values())} ulic", file=sys.stderr)

    # Opcja: --skip-fetch (tylko merge ze statyczną mapą)
    skip_fetch = "--skip-fetch" in sys.argv

    if not skip_fetch:
        for city, config in CITIES.items():
            existing_count = len(all_data.get(city, {}))
            print(f"\n[{city}] Istniejące: {existing_count} ulic", file=sys.stderr)

            street_map = fetch_districts_for_city(city, config["admin_level"])

            if street_map:
                # Merge: nowe dane OSM + istniejące
                merged = all_data.get(city, {})
                merged.update(street_map)  # OSM nadpisuje
                all_data[city] = merged
                print(f"[{city}] Po merge: {len(merged)} ulic", file=sys.stderr)

            time.sleep(3)

    # Merge ze statyczną mapą (wypełnia luki — nie nadpisuje OSM)
    for city, static_streets in STATIC_MAP.items():
        if city not in all_data:
            all_data[city] = {}
        for street, district in static_streets.items():
            if street not in all_data[city]:
                all_data[city][street] = district
    print(f"\nPo merge ze statyczną mapą:", file=sys.stderr)

    # Wyczyść dziwne klucze (np. "5-6", "A-B" z OSM)
    for city in all_data:
        all_data[city] = {
            k: v for k, v in all_data[city].items()
            if len(k) > 3 and not k.replace('-', '').replace("'", '').isdigit()
        }

    # Zapisz wynik
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(
        json.dumps(all_data, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )
    print(f"\n{'='*50}", file=sys.stderr)
    print(f"GOTOWE! Zapisano {OUTPUT_FILE}", file=sys.stderr)

    # Statystyki
    total = sum(len(v) for v in all_data.values())
    print(f"Łącznie: {total} ulic w {len(all_data)} miastach", file=sys.stderr)
    for city, streets in all_data.items():
        districts = set(streets.values())
        print(f"  {city}: {len(streets)} ulic, {len(districts)} dzielnic", file=sys.stderr)


if __name__ == "__main__":
    main()
