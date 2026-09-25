#!/bin/zsh
# Uso: qa/captura.sh URL ANCHOxALTO salida.png [segundos]
URL=$1; SIZE=$2; OUT=$3; T=${4:-14}
PROF=$(mktemp -d)
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --enable-unsafe-swiftshader --use-angle=swiftshader \
  --user-data-dir=$PROF --hide-scrollbars --window-size=${SIZE/x/,} --virtual-time-budget=$((T*1000)) --screenshot=$OUT "$URL" >/dev/null 2>&1 &
PID=$!
sleep $((T+20)); kill $PID 2>/dev/null; rm -rf $PROF
ls -la $OUT
