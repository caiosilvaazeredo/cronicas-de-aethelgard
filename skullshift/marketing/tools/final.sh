#!/bin/bash
cd "$(dirname "$0")"
node clips.cjs versus menu s_gnoll s_spider b_spider f_bat shop > clips/log_0.txt 2>&1 &
node clips.cjs parry world t_mare t_forja s_shark s_mino b_mino f_bee loadout > clips/log_1.txt 2>&1 &
node clips.cjs finale t_bosque t_ceu s_bat reserve b_shark > clips/log_2.txt 2>&1 &
wait; echo FIM > clips/done.txt
