#!/usr/bin/env python3
"""
RealTools AI — Cotygodniowe pobieranie danych transakcyjnych
Uruchamiany przez launchd co poniedzialek o 6:00

Uzycie reczne: python3 fetch_data.py [miasto]
  - bez argumentu: pobiera dla WSZYSTKICH miast
  - z argumentem: pobiera dla jednego miasta
"""

import sys
import os

# Dodaj katalog skryptu do PATH zeby importowac server.py
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from server import CITY_CENTERS, fetch_rcn_data, compute_stats, write_cache, CACHE_DIR
from datetime import datetime


def fetch_city(city):
    """Pobierz i zacheuj dane dla jednego miasta."""
    print(f"[FETCH] {city}...", end=" ", flush=True)
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
    write_cache(city, data)
    print(f"OK ({len(transactions)} transakcji)")
    return len(transactions)


def main():
    print(f"=== RealTools AI — Pobieranie danych ===")
    print(f"Data: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"Cache: {CACHE_DIR}")
    print()

    # Opcjonalnie jedno miasto
    if len(sys.argv) > 1:
        city = sys.argv[1]
        if city not in CITY_CENTERS:
            print(f"Nieznane miasto: {city}")
            print(f"Dostepne: {', '.join(CITY_CENTERS.keys())}")
            sys.exit(1)
        fetch_city(city)
        return

    # Wszystkie miasta
    total = 0
    errors = 0
    for city in CITY_CENTERS:
        try:
            n = fetch_city(city)
            total += n
        except Exception as e:
            print(f"BLAD: {e}")
            errors += 1

    print(f"\nGotowe: {total} transakcji z {len(CITY_CENTERS) - errors}/{len(CITY_CENTERS)} miast")
    if errors:
        print(f"Bledy: {errors}")


if __name__ == '__main__':
    main()
