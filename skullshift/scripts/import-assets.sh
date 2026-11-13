#!/usr/bin/env bash
# Copia os sprites do Tiny Swords (Pixel Frog) para public/assets.
# Os PNGs não vão para o Git: a licença do pacote não permite redistribuir os arquivos.
# Uso: scripts/import-assets.sh <Tiny_Swords_Enemy_Pack.zip> <Tiny_Swords_Free_Pack.zip> [anak_manja.zip] [matcha_style.zip]
# O terceiro zip (fonte Anak Manja) é opcional; requer python3 + fonttools para gerar os acentos.
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
# Fase 2 (caverna) e fase 3 (céu)
char spider   'Spider'          'Spider'          Idle Run  Attack
char bat      'Giant Bat'       'Giant Bat'       Idle Move Attack
char torchgob 'Torch Goblin'    'Torch Goblin'    Idle Run  Attack
char bee      'Bumblebee'       'Bumblebee'       Idle Move Attack
char sgnome   'Slingshot Gnome' 'Slingshot Gnome' Idle Run  Shoot
cp "$E/Imp/Imp_Idle.png" "$A/chars/imp_idle.png"
cp "$E/Imp/Imp_Move.png" "$A/chars/imp_run.png"
cp "$E/Imp/Imp_Avatar.png" "$A/chars/imp_avatar.png"
cp "$E/Imp/Imp_Attack_Start.png" "$A/chars/imp_attack_start.png"
cp "$E/Imp/Imp_Attack_Loop.png" "$A/chars/imp_attack_loop.png"
cp "$E/Imp/Imp_Attack_End.png" "$A/chars/imp_attack_end.png"
cp "$E/Slingshot Gnome/Acorn_Projectile.png" "$A/chars/acorn.png"
# Fase 3 (vulcão)
cp "$E/Minotaur/Minotaur_Idle.png" "$A/chars/minotaur_idle.png"
cp "$E/Minotaur/Minotaur_Walk.png" "$A/chars/minotaur_run.png"
cp "$E/Minotaur/Minotaur_Attack.png" "$A/chars/minotaur_attack.png"
cp "$E/Minotaur/Minotaur__Avatar.png" "$A/chars/minotaur_avatar.png"
cp "$E/Extra/Skull Guard/Skull_Guard.png" "$A/chars/skull_guard.png"
cp "$E/Gnoll/Gnoll_Bone.png" "$A/chars/bone.png"
cp "$E/Harpoon Shark/Harpoon.png" "$A/chars/harpoon.png"
cp "$E/Extra/Skull decorations/Skull Spike_01.png" "$A/terrain/skull_spike.png"
cp "$E/Extra/Skull decorations/Bones_01.png" "$A/terrain/bones.png"
cp "$E/Extra/Hex Shaman Transformation Spell/Hex Shaman_Transformation Spell.png" "$A/fx/transform.png"
cp "$E/Hex Shaman/Hex Shaman_Idle.png" "$A/chars/shaman_idle.png"
cp "$E/Hex Shaman/Hex Shaman_Attack.png" "$A/chars/shaman_attack.png"
cp "$F/Terrain/Tileset/Water Foam.png" "$A/terrain/water_foam.png"

cp "$F/Terrain/Tileset/Tilemap_color1.png" "$A/terrain/tilemap.png"
cp "$F/Terrain/Tileset/Tilemap_color5.png" "$A/terrain/tiles_cave.png"
cp "$F/Terrain/Tileset/Tilemap_color3.png" "$A/terrain/tiles_sky.png"
cp "$F/Terrain/Tileset/Tilemap_color4.png" "$A/terrain/tiles_volcano.png"
cp "$F/Terrain/Decorations/Rocks in the Water/Water Rocks_01.png" "$A/terrain/water_rocks.png"
cp "$F/Terrain/Decorations/Bushes/Bushe1.png" "$A/terrain/bush.png"
# Recursos (fases de chave e porta, presentes, ferramentas das habilidades).
R="$F/Terrain/Resources"
mkdir -p "$A/res"
cp "$R/Tools/Tool_01.png" "$A/res/tool_hammer.png"
cp "$R/Tools/Tool_02.png" "$A/res/tool_axe.png"
cp "$R/Tools/Tool_03.png" "$A/res/tool_sword.png"
cp "$R/Tools/Tool_04.png" "$A/res/tool_pickaxe.png"
cp "$R/Meat/Meat Resource/Meat Resource.png" "$A/res/meat.png"
cp "$R/Wood/Wood Resource/Wood Resource.png" "$A/res/wood.png"
cp "$R/Gold/Gold Resource/Gold_Resource.png" "$A/res/gold.png"
cp "$R/Gold/Gold Stones/Gold Stone 3.png" "$A/res/gold_stone.png"
cp "$R/Gold/Gold Stones/Gold Stone 6.png" "$A/res/gold_stone_big.png"
cp "$R/Meat/Sheep/Sheep_Idle.png" "$A/res/sheep_idle.png"
cp "$R/Meat/Sheep/Sheep_Move.png" "$A/res/sheep_move.png"
cp "$R/Wood/Trees/Tree3.png" "$A/res/tree.png"
cp "$R/Wood/Trees/Stump 1.png" "$A/res/stump.png"
for i in 01 02 03 04 05 06 07 08; do cp "$F/Terrain/Decorations/Clouds/Clouds_$i.png" "$A/terrain/cloud_$i.png"; done
cp "$F/Terrain/Resources/Wood/Trees/Tree1.png" "$A/terrain/tree.png"
cp "$F/Terrain/Resources/Wood/Trees/Stump 1.png" "$A/terrain/stump.png"
cp "$F/Terrain/Decorations/Rocks/Rock1.png" "$A/terrain/rock1.png"
cp "$F/Terrain/Decorations/Rocks/Rock3.png" "$A/terrain/rock2.png"
cp "$E/Extra/Dead Tree/Dead Tree.png" "$A/terrain/dead_tree.png"
cp "$F/Particle FX/Water Splash.png" "$A/fx/splash.png"
cp "$F/Particle FX/Dust_01.png" "$A/fx/dust.png"
echo "Sprites copiados para $A"

if [ -n "${3:-}" ]; then
  mkdir -p "$TMP/font"
  unzip -q "$3" -d "$TMP/font"
  TTF=$(find "$TMP/font" -iname '*.ttf' | head -1)
  python3 "$ROOT/scripts/build-font.py" "$TTF"
fi

# Fonte das instruções (já tem os acentos do português).
if [ -n "${4:-}" ]; then
  mkdir -p "$TMP/font2" "$ROOT/public/fonts"
  unzip -q "$4" -d "$TMP/font2"
  cp "$(find "$TMP/font2" -iname '*.ttf' | head -1)" "$ROOT/public/fonts/matcha-style.ttf"
  echo "Fonte das instruções copiada"
fi

# Aldeão (Pawn do Free Pack): a forma final da caveira.
P="$F/Units/Blue Units/Pawn"
cp "$P/Pawn_Idle.png" "$A/chars/villager_idle.png"
cp "$P/Pawn_Run.png" "$A/chars/villager_run.png"
cp "$P/Pawn_Interact Knife.png" "$A/chars/villager_attack.png"
# Construções (mapa do mundo e cenários), pedras, arbustos e o tileset outonal.
mkdir -p "$A/bld"
for c in Blue Red Yellow Purple Black; do
  for n in Castle Monastery Tower House1 House2 House3 Barracks Archery; do
    cp "$F/Buildings/$c Buildings/$n.png" "$A/bld/$(echo "$c" | tr A-Z a-z)_$(echo "$n" | tr A-Z a-z).png"
  done
done
for i in 1 2 3 4; do
  cp "$F/Terrain/Decorations/Rocks/Rock$i.png" "$A/terrain/stone$i.png"
  cp "$F/Terrain/Decorations/Bushes/Bushe$i.png" "$A/terrain/bush$i.png"
done
cp "$F/Terrain/Tileset/Tilemap_color2.png" "$A/terrain/tiles_meadow.png"
