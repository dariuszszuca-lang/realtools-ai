"""
RealTools AI — Market Data endpoint (NBP prices)
"""

import json
from http.server import BaseHTTPRequestHandler

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


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        data = {
            'nbp_prices': NBP_PRICES,
            'last_update': None,
        }
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 's-maxage=86400')
        self.end_headers()
        self.wfile.write(body)
