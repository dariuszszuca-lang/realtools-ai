#!/usr/bin/env python3
"""
RealTools AI — Backend serwer
Pobiera prawdziwe dane z WFS Rejestru Cen Nieruchomości (geoportal.gov.pl)
i serwuje JSON + frontend
"""

import http.server
import json
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
import os
import sys
import re
from math import radians, cos, sin, sqrt, atan2

PORT = 5557
WFS_URL = "https://mapy.geoportal.gov.pl/wss/service/rcn"

# EPSG:2180 (PL-2000 zone 7) approximate conversion to WGS84
# For bounding box we use WGS84 directly in the WFS request

# City center coordinates (WGS84) for bounding box calculation
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

# EPSG:2180 conversion helpers (simplified)
# For search we just expand the city bbox generously
def city_bbox_wgs84(city, radius_km=5):
    """Return WGS84 bounding box around city center."""
    if city not in CITY_CENTERS:
        return None
    lat, lon = CITY_CENTERS[city]
    # ~1 degree lat = 111 km, ~1 degree lon = 111*cos(lat) km
    dlat = radius_km / 111.0
    dlon = radius_km / (111.0 * cos(radians(lat)))
    return (lat - dlat, lon - dlon, lat + dlat, lon + dlon)


def parse_gml_lokale(xml_text):
    """Parse WFS GML response into list of dicts."""
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

        # Parse address
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

        # Parse numeric fields
        def num(val):
            try:
                return float(val.replace(',', '.')) if val else 0
            except (ValueError, AttributeError):
                return 0

        pow_uzyt = num(txt('lok_pow_uzyt'))
        cena = num(txt('lok_cena_brutto'))
        funkcja = txt('lok_funkcja')

        # Skip garages, storage units etc.
        if funkcja and funkcja != 'mieszkalna':
            continue

        # Skip if no area or price
        if pow_uzyt <= 0 or cena <= 0:
            continue

        # Parse date
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

        # Filter: require date, skip very old transactions and price anomalies
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
            'market': 'wtórny' if rynek == 'wtorny' else ('pierwotny' if rynek == 'pierwotny' else rynek),
        })

    return results


def fetch_rcn_data(city, max_records=500):
    """Fetch lokale from WFS for given city."""
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
    print(f"[RCN] URL: {url}", file=sys.stderr)

    try:
        req = urllib.request.Request(url, headers={
            'User-Agent': 'RealTools-AI/1.0',
            'Accept': 'application/xml',
        })
        with urllib.request.urlopen(req, timeout=60) as resp:
            xml_data = resp.read().decode('utf-8')

        print(f"[RCN] Got XML response: {len(xml_data)} bytes", file=sys.stderr)
        return parse_gml_lokale(xml_data)
    except Exception as e:
        print(f"[RCN] Error fetching data for {city}: {e}", file=sys.stderr)
        return []


def compute_stats(transactions):
    """Compute summary statistics from transactions list."""
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


# ═══ HTTP SERVER ═══
class RealToolsHandler(http.server.SimpleHTTPRequestHandler):

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)

        if parsed.path == '/api/rcn':
            self.handle_rcn_api(parsed)
        else:
            # Serve static files
            super().do_GET()

    def handle_rcn_api(self, parsed):
        """API endpoint: /api/rcn?city=Gdańsk"""
        params = urllib.parse.parse_qs(parsed.query)
        city = params.get('city', [''])[0]

        if not city:
            self.send_json(400, {'error': 'Brak parametru city'})
            return

        if city not in CITY_CENTERS:
            self.send_json(400, {'error': f'Nieznane miasto: {city}'})
            return

        print(f"[RCN] Fetching data for: {city}...", file=sys.stderr)

        transactions = fetch_rcn_data(city)
        stats = compute_stats(transactions)

        # Sort by date (newest first)
        transactions.sort(key=lambda t: t['date'], reverse=True)

        print(f"[RCN] Got {len(transactions)} transactions for {city}", file=sys.stderr)

        self.send_json(200, {
            'city': city,
            'transactions': transactions,
            'stats': stats,
            'source': 'Rejestr Cen Nieruchomości (RCN) — geoportal.gov.pl',
            'count': len(transactions),
        })

    def send_json(self, code, data):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', len(body))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        if '/api/' in str(args[0]):
            super().log_message(format, *args)


if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    server = http.server.HTTPServer(('', PORT), RealToolsHandler)
    print(f"🏠 RealTools AI → http://localhost:{PORT}")
    print(f"📊 API endpoint: http://localhost:{PORT}/api/rcn?city=Gdańsk")
    print(f"🔗 Źródło: Rejestr Cen Nieruchomości (geoportal.gov.pl)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nZamykam serwer.")
        server.server_close()
