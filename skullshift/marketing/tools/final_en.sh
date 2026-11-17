#!/bin/bash
cd "$(dirname "$0")"; export BASE=http://localhost:5174
GAMELANG=en CLIPDIR=clips_en/ node clips.cjs versus s_gnoll s_spider b_spider f_bat shop > clips_en/log_0.txt 2>&1 &
GAMELANG=en CLIPDIR=clips_en/ node clips.cjs parry world t_mare t_forja s_shark s_mino b_mino f_bee loadout > clips_en/log_1.txt 2>&1 &
(GAMELANG=pt-BR CLIPDIR=clips/ node clips.cjs rescue > clips/log_rescue.txt 2>&1; GAMELANG=en CLIPDIR=clips_en/ node clips.cjs rescue t_bosque t_ceu s_bat reserve b_shark > clips_en/log_2.txt 2>&1) &
wait; echo FIM > clips_en/done.txt
