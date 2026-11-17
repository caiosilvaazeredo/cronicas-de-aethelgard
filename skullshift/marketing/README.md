# Material de divulgação (Steam)

- `trailer/` — trailer de ~90 s, 1920×1080 a 60 fps, em português (`_pt_`) e inglês (`_en_`).
  Os arquivos `_leve` são uma cópia mais comprimida (cabem no GitHub); os originais (≈120 MB) não entram no repositório.
- `steam/` — cápsulas nos tamanhos da loja (header, small, main, vertical, library, hero, logo, fundo da página).
- `steam/screenshots/` — 14 capturas de gameplay em 1920×1080, sem texto por cima.
- `tools/` — como tudo foi gerado (com `npx vite --port 5173` no ar):
  - `rec.cjs` grava o jogo quadro a quadro (relógio falso de 16 ms, captura 2560×1440); `clips.cjs <cena...>` são as cenas ensaiadas; `final.sh` grava todas.
  - `cards.html` + `cards.cjs`/`chips.cjs`: cartelas de título e avatar (PT/EN) na fonte do jogo.
  - `audio.cjs` grava a música do próprio jogo em tempo real.
  - `build.py pt|en` monta o trailer com ffmpeg. `caps.html` + `caps.cjs` geram as cápsulas.

## Trailer v2 (sem spoilers)
- `trailer/skullshift_trailer_v2_pt_*` e `_v2_en_*`: ~51 s, sem a tela inicial e sem a luta final; o Xamã aparece como
  "um amigo na nuvem" (cena do resgate). Cortes mais curtos. A versão em inglês foi gravada com o jogo em inglês (`?lang=en`).
- Os trailers da primeira versão continuam na pasta (mostram a luta final: não usar na loja).
- `tools/build2.py pt|en <início do contra>` monta a v2; `clips.cjs rescue` grava a cena do resgate.
- As gravações usam uma cópia congelada do projeto servida em outra porta (`BASE=http://localhost:5174`), porque o
  servidor de desenvolvimento recarrega a página quando arquivos mudam.
