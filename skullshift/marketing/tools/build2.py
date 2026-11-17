#!/usr/bin/env python3
# Trailer v2 (sem spoilers, Xamã como amigo, sem tela inicial, cortes mais rápidos): python3 build2.py pt|en [parry_start]
import subprocess, sys, os
lang = sys.argv[1]; PS = int(sys.argv[2]) if len(sys.argv) > 2 else 105
CL = 'clips' if lang == 'pt' else 'clips_en'
C = lambda name, start, n, chip=None: ('clip', name, start, n, chip)
K = lambda name, n: ('card', name, n)
T, A = 54, 60
PLAN = [
  ('mark', 'story'), K('story_title', T), K('story_avatar', A), C('world', 20, 60), C('t_mare', 70, 60, 0), C('t_forja', 70, 60, 0), C('t_bosque', 70, 60, 0), C('t_ceu', 70, 60, 0),
  ('mark', 'guide'), K('guide_avatar', 66), C('rescue', 118, 165, 8),
  ('mark', 'shift'), K('shift_title', T), K('shift_avatar', A), C('s_gnoll', 32, 78, 1), C('s_shark', 32, 78, 1), C('s_spider', 32, 78, 1), C('s_mino', 32, 78, 1), C('s_bat', 32, 78, 1),
  ('mark', 'parry'), K('parry_title', T), K('parry_avatar', A), C('parry', PS, 130, 2), C('reserve', 15, 90, 2),
  ('mark', 'boss'), K('boss_title', T), K('boss_avatar', A), C('b_spider', 195, 90, 3), C('b_mino', 70, 90, 3), C('b_shark', 70, 90, 3),
  ('mark', 'flight'), K('flight_title', T), K('flight_avatar', A), C('f_bat', 70, 90, 4), C('f_bee', 70, 90, 4),
  ('mark', 'versus'), K('versus_title', T), K('versus_avatar', A), C('loadout', 20, 50), C('versus', 30, 100, 5), C('versus', 210, 100, 5), C('versus', 410, 110, 5),
  ('mark', 'shop'), K('shop_title', T), K('shop_avatar', A), C('shop', 30, 120),
  ('mark', 'end'), K('end', 180),
]
marks = {}; total = 0; segs = []
for s in PLAN:
    if s[0] == 'mark': marks[s[1]] = round(total / 60, 2); continue
    segs.append(s); total += s[2] if s[0] == 'card' else s[3]
print('frames', total, 'dur', total / 60, 'marks', marks)
if len(sys.argv) > 3 and sys.argv[3] == 'dry': sys.exit()
os.makedirs(f'seg2/{lang}', exist_ok=True); os.makedirs('out', exist_ok=True)
ENC = ['-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', '-r', '60', '-g', '60', '-bf', '2', '-an']
lst = []
for i, seg in enumerate(segs):
    out = f'seg2/{lang}/{i:02d}.mp4'; lst.append(out)
    if seg[0] == 'card':
        cmd = ['ffmpeg', '-loglevel', 'error', '-y', '-framerate', '60', '-i', f'cards/{lang}/{seg[1]}/f%05d.jpg', '-frames:v', str(seg[2]), '-vf', 'format=yuv420p'] + ENC + [out]
    else:
        _, name, start, n, chip = seg
        assert os.path.exists(f'{CL}/{name}/f{start + n - 1:05d}.jpg'), (name, start, n)
        cmd = ['ffmpeg', '-loglevel', 'error', '-y', '-framerate', '60', '-start_number', str(start), '-i', f'{CL}/{name}/f%05d.jpg']
        if chip is not None: cmd += ['-i', f'cards/{lang}/chips/f{chip:05d}.png', '-filter_complex', '[0]scale=1920:1080:flags=lanczos[v];[v][1]overlay=0:0']
        else: cmd += ['-vf', 'scale=1920:1080:flags=lanczos']
        cmd += ['-frames:v', str(n)] + ENC + [out]
    subprocess.run(cmd, check=True)
open(f'seg2/{lang}/list.txt', 'w').write(''.join(f"file '{os.path.abspath(p)}'\n" for p in lst))
dur = total / 60
a = ['-i', 'music2.wav', '-af', f'afade=t=in:d=0.2,afade=t=out:st={dur-2.2}:d=2.2,loudnorm=I=-15:TP=-1.5', '-c:a', 'aac', '-b:a', '256k'] if os.path.exists('music2.wav') else []
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', f'seg2/{lang}/list.txt'] + a + ['-c:v', 'copy', '-t', str(dur), '-movflags', '+faststart', f'out/skullshift_trailer_v2_{lang}_1080p60.mp4'], check=True)
