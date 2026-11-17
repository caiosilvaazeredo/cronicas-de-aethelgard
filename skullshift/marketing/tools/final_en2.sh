#!/bin/bash
cd "$(dirname "$0")"; export BASE=http://localhost:5174 GAMELANG=en CLIPDIR=clips_en/
node clips.cjs b_spider f_bat shop world t_mare loadout > clips_en/log_3.txt 2>&1 &
sleep 40
node clips.cjs parry t_forja s_shark s_mino b_mino f_bee > clips_en/log_4.txt 2>&1 &
wait; echo FIM > clips_en/done2.txt
