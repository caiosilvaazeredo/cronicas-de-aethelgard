#!/usr/bin/env bash
# Copia os sprites do Tiny Swords (Pixel Frog) para public/assets.
# Os PNGs não vão para o Git: a licença do pacote não permite redistribuir os arquivos.
# Uso: scripts/import-assets.sh <Tiny_Swords_Enemy_Pack.zip> <Tiny_Swords_Free_Pack.zip>
set -euo pipefail
ENEMY_ZIP=${1:?informe o zip do Enemy Pack}
FREE_ZIP=${2:?informe o zip do Free Pack}
ROOT=$(cd "$(dirname "$0")/.." && pwd)
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
unzip -q "$ENEMY_ZIP" -d "$TMP/enemy"
unzip -q "$FREE_ZIP" -d "$TMP/free"
E=$(find "$TMP/enemy" -type d -name 'Enemy Pack' | head -1)
F=$(find "$TMP/free" -type d -name 'Tiny Swords (Free Pack)' -not -path '*__MACOSX*' | head -1)
A="$ROOT/public/assets"
mkdir -p "$A/chars" "$A/terrain" "$A/fx"

char() { # personagem pasta prefixo idle run attack
  cp "$E/$2/$3_$4.png" "$A/chars/$1_idle.png"
  cp "$E/$2/$3_$5.png" "$A/chars/$1_run.png"
  cp "$E/$2/$3_$6.png" "$A/chars/$1_attack.png"
  cp "$E/$2/$3_Avatar.png" "$A/chars/$1_avatar.png"
}
char skull  'Skull'         'Skull'         Idle Run  Attack
char lizard 'Lizard'        'Lizard'        Idle Run  Attack
char gnoll  'Gnoll'         'Gnoll'         Idle Walk Throw
char shark  'Harpoon Shark' 'Harpoon Shark' Idle Run  Throw
char goblin 'Spear Goblin'  'Spear Goblin'  Idle Run  'Attack Fast'
cp "$E/Extra/Skull Guard/Skull_Guard.png" "$A/chars/skull_guard.png"
cp "$E/Gnoll/Gnoll_Bone.png" "$A/chars/bone.png"
cp "$E/Harpoon Shark/Harpoon.png" "$A/chars/harpoon.png"
cp "$E/Extra/Skull decorations/Skull Spike_01.png" "$A/terrain/skull_spike.png"
cp "$E/Extra/Skull decorations/Bones_01.png" "$A/terrain/bones.png"
cp "$E/Extra/Hex Shaman Transformation Spell/Hex Shaman_Transformation Spell.png" "$A/fx/transform.png"

cp "$F/Terrain/Tileset/Tilemap_color1.png" "$A/terrain/tilemap.png"
cp "$F/Terrain/Decorations/Rocks in the Water/Water Rocks_01.png" "$A/terrain/water_rocks.png"
cp "$F/Terrain/Decorations/Bushes/Bushe1.png" "$A/terrain/bush.png"
for i in 01 02 03 04 05 06 07 08; do cp "$F/Terrain/Decorations/Clouds/Clouds_$i.png" "$A/terrain/cloud_$i.png"; done
cp "$F/Terrain/Resources/Wood/Trees/Tree1.png" "$A/terrain/tree.png"
cp "$F/Terrain/Resources/Wood/Trees/Stump 1.png" "$A/terrain/stump.png"
cp "$F/Terrain/Decorations/Rocks/Rock1.png" "$A/terrain/rock1.png"
cp "$F/Terrain/Decorations/Rocks/Rock3.png" "$A/terrain/rock2.png"
cp "$E/Extra/Dead Tree/Dead Tree.png" "$A/terrain/dead_tree.png"
cp "$F/Particle FX/Water Splash.png" "$A/fx/splash.png"
cp "$F/Particle FX/Dust_01.png" "$A/fx/dust.png"
echo "Sprites copiados para $A"
