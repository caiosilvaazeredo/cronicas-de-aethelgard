#!/bin/bash
cd "$(dirname "$0")"
node bot.cjs agressivo 6 0 > log_agressivo.txt 2>&1 &
node bot.cjs cauteloso 6 35 > log_cauteloso.txt 2>&1 &
node bot.cjs explorador 6 70 > log_explorador.txt 2>&1 &
wait
node bot.cjs caotico 6 20 > log_caotico.txt 2>&1 &
node bot.cjs retrato 6 55 > log_retrato.txt 2>&1 &
wait
echo TUDO_PRONTO > done.txt
