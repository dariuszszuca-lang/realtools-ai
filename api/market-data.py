"""
RCT — Vercel Serverless Function: /api/market-data
Zwraca dane referencyjne NBP.
CDN cache: 7 dni.
"""

from http.server import BaseHTTPRequestHandler
import json
from datetime import datetime

NBP_PRICES = {
    "Gdańsk":           {"primary": 14200, "secondary": 13100, "quarter": "Q3 2025"},
    "Sopot":            {"primary": 18500, "secondary": 16800, "quarter": "Q3 2025"},
    "Gdynia":           {"primary": 13800, "secondary": 12200, "quarter": "Q3 2025"},
    "Rumia":            {"primary": 9500,  "secondary": 8200,  "quarter": "Q3 2025"},
    "Reda":             {"primary": 9200,  "secondary": 7800,  "quarter": "Q3 2025"},
    "Wejherowo":        {"primary": 8800,  "secondary": 7500,  "quarter": "Q3 2025"},
    "Pruszcz Gdański":  {"primary": 10500, "secondary": 9000,  "quarter": "Q3 2025"},
    "Elbląg":           {"primary": 7200,  "secondary": 5800,  "quarter": "Q3 2025"},
}


class handler(BaseHTTPRequestHandler):

    def do_GET(self):
        data = {
            'nbp_prices': NBP_PRICES,
            'last_update': datetime.now().isoformat(),
        }

        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'public, s-maxage=604800, stale-while-revalidate=86400')
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        pass
