#!/usr/bin/env python3
# Monta o trailer: python3 build.py pt|en
import subprocess, sys, os
lang = sys.argv[1]
ids = ['story', 'shift', 'parry', 'boss', 'flight', 'versus', 'shop', 'finale']
C = lambda name, start, n, chip=None: ('clip', name, start, n, chip)
K = lambda name, n: ('card', name, n)
PLAN = [
  C('menu', 60, 330), K('logo', 150),
  K('story_title', 90), K('story_avatar', 90), C('world', 20, 120), C('t_mare', 60, 100, 0), C('t_forja', 60, 100, 0), C('t_bosque', 60, 100, 0), C('t_ceu', 60, 100, 0),
  K('shift_title', 90), K('shift_avatar', 90), C('s_gnoll', 30, 115, 1), C('s_shark', 30, 115, 1), C('s_spider', 30, 115, 1), C('s_mino', 30, 115, 1), C('s_bat', 30, 115, 1),
  K('parry_title', 90), K('parry_avatar', 90), C('parry', 105, 200, 2), C('reserve', 10, 150, 2),
  K('boss_title', 90), K('boss_avatar', 90), C('b_spider', 190, 150, 3), C('b_mino', 60, 150, 3), C('b_shark', 60, 150, 3),
  K('flight_title', 90), K('flight_avatar', 90), C('f_bat', 60, 150, 4), C('f_bee', 60, 150, 4),
  K('versus_title', 90), K('versus_avatar', 90), C('loadout', 20, 80), C('versus', 20, 150, 5), C('versus', 200, 150, 5), C('versus', 400, 160, 5),
  K('shop_title', 90), K('shop_avatar', 90), C('shop', 30, 220),
  K('finale_title', 90), K('finale_avatar', 90), C('finale', 0, 240, 7),
  K('end', 270),
]
exec(open('plan_override.py').read()) if os.path.exists('plan_override.py') else None
os.makedirs(f'seg/{lang}', exist_ok=True)
ENC = ['-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', '-r', '60', '-g', '60', '-bf', '2', '-movflags', '+faststart', '-an']
lst = []; total = 0
for i, seg in enumerate(PLAN):
    out = f'seg/{lang}/{i:02d}.mp4'; lst.append(out); total += seg[-1] if seg[0] == 'card' else seg[3]
    if seg[0] == 'card':
        cmd = ['ffmpeg', '-loglevel', 'error', '-y', '-framerate', '60', '-i', f'cards/{lang}/{seg[1]}/f%05d.jpg', '-frames:v', str(seg[2]), '-vf', 'format=yuv420p'] + ENC + [out]
    else:
        _, name, start, n, chip = seg
        cmd = ['ffmpeg', '-loglevel', 'error', '-y', '-framerate', '60', '-start_number', str(start), '-i', f'clips/{name}/f%05d.jpg']
        if chip is not None:
            cmd += ['-i', f'cards/{lang}/chips/f{chip:05d}.png', '-filter_complex', '[0]scale=1920:1080:flags=lanczos[v];[v][1]overlay=0:0']
        else:
            cmd += ['-vf', 'scale=1920:1080:flags=lanczos']
        cmd += ['-frames:v', str(n)] + ENC + [out]
    subprocess.run(cmd, check=True)
open(f'seg/{lang}/list.txt', 'w').write(''.join(f"file '{os.path.abspath(p)}'\n" for p in lst))
dur = total / 60
print('frames', total, 'seg', dur)
a = ['-i', 'music.wav', '-af', f'afade=t=in:d=0.3,afade=t=out:st={dur-2.5}:d=2.5,loudnorm=I=-15:TP=-1.5', '-c:a', 'aac', '-b:a', '256k', '-shortest'] if os.path.exists('music.wav') else []
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', f'seg/{lang}/list.txt'] + a + ['-c:v', 'copy', '-t', str(dur), '-movflags', '+faststart', f'out/skullshift_trailer_{lang}_1080p60.mp4'], check=True)
