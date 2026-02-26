"""
RealTools AI — Vercel Serverless Function
Pobiera dane z WFS RCN (geoportal.gov.pl) na zywo
"""

import json
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
import re
from math import radians, cos
from http.server import BaseHTTPRequestHandler

CITY_CENTERS = {
    "Gdańsk":    (54.372, 18.638),
    "Sopot":     (54.441, 18.560),
    "Gdynia":    (54.519, 18.531),
    "Warszawa":  (52.230, 21.012),
    "Kraków":    (50.065, 19.945),
    "Wrocław":   (51.110, 17.038),
    "Poznań":    (52.407, 16.930),
    "Łódź":      (51.760, 19.456),
    "Szczecin":  (53.429, 14.553),
    "Lublin":    (51.246, 22.568),
}

NBP_PRICES = {
    "Gdańsk":    {"primary": 14200, "secondary": 13100, "quarter": "Q3 2025"},
    "Sopot":     {"primary": 18500, "secondary": 16800, "quarter": "Q3 2025"},
    "Gdynia":    {"primary": 13800, "secondary": 12200, "quarter": "Q3 2025"},
    "Warszawa":  {"primary": 16300, "secondary": 16400, "quarter": "Q3 2025"},
    "Kraków":    {"primary": 15100, "secondary": 14600, "quarter": "Q3 2025"},
    "Wrocław":   {"primary": 13900, "secondary": 12800, "quarter": "Q3 2025"},
    "Poznań":    {"primary": 12600, "secondary": 11200, "quarter": "Q3 2025"},
    "Łódź":      {"primary": 10100, "secondary": 8200,  "quarter": "Q3 2025"},
    "Szczecin":  {"primary": 11800, "secondary": 9900,  "quarter": "Q3 2025"},
    "Lublin":    {"primary": 10500, "secondary": 9200,  "quarter": "Q3 2025"},
}

WFS_URL = "https://mapy.geoportal.gov.pl/wss/service/rcn"


def city_bbox_wgs84(city, radius_km=5):
    if city not in CITY_CENTERS:
        return None
    lat, lon = CITY_CENTERS[city]
    dlat = radius_km / 111.0
    dlon = radius_km / (111.0 * cos(radians(lat)))
    return (lat - dlat, lon - dlon, lat + dlat, lon + dlon)


def parse_gml_lokale(xml_text):
    ns = {
        'wfs': 'http://www.opengis.net/wfs/2.0',
        'ms': 'http://mapserver.gis.umn.edu/mapserver',
        'gml': 'http://www.opengis.net/gml/3.2',
    }
    results = []
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError:
        return results

    for member in root.findall('.//wfs:member', ns):
        lokal = member.find('ms:lokale', ns)
        if lokal is None:
            continue

        def txt(tag):
            el = lokal.find(f'ms:{tag}', ns)
            return el.text.strip() if el is not None and el.text else ""

        addr_raw = txt('lok_adres')
        addr_parts = {}
        if addr_raw:
            for part in addr_raw.split(';'):
                if ':' in part:
                    k, v = part.split(':', 1)
                    addr_parts[k.strip()] = v.strip()

        city = addr_parts.get('MSC', '')
        street = addr_parts.get('UL', '')
        nr = addr_parts.get('NR_PORZ', '')
        address = f"{street} {nr}".strip() if street else city

        def num(val):
            try:
                return float(val.replace(',', '.')) if val else 0
            except (ValueError, AttributeError):
                return 0

        pow_uzyt = num(txt('lok_pow_uzyt'))
        cena = num(txt('lok_cena_brutto'))
        funkcja = txt('lok_funkcja')

        if funkcja and funkcja != 'mieszkalna':
            continue
        if pow_uzyt <= 0 or cena <= 0:
            continue

        dok_data = txt('dok_data')
        date_str = ""
        if dok_data:
            match = re.match(r'(\d{4})-(\d{2})-(\d{2})', dok_data)
            if match:
                date_str = f"{match.group(3)}.{match.group(2)}.{match.group(1)}"

        izby = txt('lok_liczba_izb')
        kond = txt('lok_nr_kond')
        rynek = txt('tran_rodzaj_rynku')
        price_m2 = round(cena / pow_uzyt) if pow_uzyt > 0 else 0

        if not date_str:
            continue
        try:
            year = int(date_str.split('.')[-1])
            if year < 2021:
                continue
        except ValueError:
            continue
        if price_m2 < 2000 or price_m2 > 80000:
            continue

        results.append({
            'address': address,
            'city': city,
            'area': round(pow_uzyt, 1),
            'rooms': int(izby) if izby and izby.isdigit() else None,
            'floor': int(kond) if kond and kond.lstrip('-').isdigit() else None,
            'price': int(cena),
            'priceM2': price_m2,
            'date': date_str,
            'market': 'wtorny' if rynek == 'wtorny' else ('pierwotny' if rynek == 'pierwotny' else rynek),
        })

    return results


def fetch_rcn_data(city, max_records=500):
    bbox = city_bbox_wgs84(city)
    if not bbox:
        return []

    params = {
        'service': 'WFS',
        'version': '2.0.0',
        'request': 'GetFeature',
        'typeName': 'ms:lokale',
        'count': str(max_records),
        'bbox': f'{bbox[0]},{bbox[1]},{bbox[2]},{bbox[3]},EPSG:4326',
        'outputFormat': 'application/gml+xml; version=3.2',
        'sortBy': 'dok_data D',
    }

    url = WFS_URL + '?' + urllib.parse.urlencode(params)

    try:
        req = urllib.request.Request(url, headers={
            'User-Agent': 'RealTools-AI/2.0',
            'Accept': 'application/xml',
        })
        with urllib.request.urlopen(req, timeout=55) as resp:
            xml_data = resp.read().decode('utf-8')
        return parse_gml_lokale(xml_data)
    except Exception as e:
        print(f"[RCN] Error for {city}: {e}")
        return []


def compute_stats(transactions):
    if not transactions:
        return None
    prices_m2 = [t['priceM2'] for t in transactions if t['priceM2'] > 0]
    if not prices_m2:
        return None
    prices_m2.sort()
    n = len(prices_m2)
    median = prices_m2[n // 2] if n % 2 == 1 else (prices_m2[n//2 - 1] + prices_m2[n//2]) // 2
    return {
        'count': n,
        'avg': round(sum(prices_m2) / n),
        'median': median,
        'min': prices_m2[0],
        'max': prices_m2[-1],
    }


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)
        city = params.get('city', [''])[0]

        if not city:
            self.send_json(400, {'error': 'Brak parametru city'})
            return

        if city not in CITY_CENTERS:
            self.send_json(400, {'error': f'Nieznane miasto: {city}'})
            return

        transactions = fetch_rcn_data(city)
        stats = compute_stats(transactions)
        transactions.sort(key=lambda t: t['date'], reverse=True)

        data = {
            'city': city,
            'transactions': transactions,
            'stats': stats,
            'source': 'Rejestr Cen Nieruchomosci (RCN)',
            'count': len(transactions),
        }

        nbp = NBP_PRICES.get(city)
        if nbp:
            data['nbp'] = nbp

        self.send_json(200, data)

    def send_json(self, code, data):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
        self.end_headers()
        self.wfile.write(body)
