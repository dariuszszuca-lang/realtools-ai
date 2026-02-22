#!/bin/bash
cd "$(dirname "$0")"

echo "==================================="
echo "  RealTools AI v2.0"
echo "  http://localhost:5557"
echo "==================================="

# Setup weekly data fetch (launchd) if not already installed
PLIST_PATH="$HOME/Library/LaunchAgents/pl.realtools.fetch-data.plist"
SCRIPT_PATH="$(cd "$(dirname "$0")" && pwd)/fetch_data.py"

if [ ! -f "$PLIST_PATH" ]; then
  echo "Instaluje cotygodniowe pobieranie danych..."
  mkdir -p "$HOME/Library/LaunchAgents"
  cat > "$PLIST_PATH" << PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>pl.realtools.fetch-data</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/bin/python3</string>
    <string>${SCRIPT_PATH}</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Weekday</key>
    <integer>1</integer>
    <key>Hour</key>
    <integer>6</integer>
  </dict>
  <key>StandardOutPath</key>
  <string>/tmp/realtools-fetch.log</string>
  <key>StandardErrorPath</key>
  <string>/tmp/realtools-fetch.log</string>
</dict>
</plist>
PLIST
  launchctl load "$PLIST_PATH" 2>/dev/null
  echo "Zainstalowano! Dane beda pobierane co poniedzialek o 6:00"
fi

(sleep 1 && open http://localhost:5557) &
python3 server.py
