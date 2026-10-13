#!/usr/bin/env bash
# Gera a versão Word para a IJGSI a partir do main.tex.
# Uso (na pasta artigos/ijgsi-atratores): bash word/gerar.sh
# Requer pandoc, python-docx e lxml.
set -euo pipefail
cd "$(dirname "$0")/.."
tmp=$(mktemp -d)
pandoc main.tex -t markdown-simple_tables-multiline_tables-grid_tables+pipe_tables --wrap=none -o "$tmp/bruto.md"
python3 word/preparar_md.py "$tmp/bruto.md" "$tmp/limpo.md"
mkdir -p word/submissao/figures
python3 word/montar_docx.py "$tmp/limpo.md" word/submissao/manuscript-anonymous.docx
python3 word/folha_de_rosto.py word/submissao/title-page.docx
# figuras como arquivos separados, numeradas na ordem de aparição
n=1
for f in $(grep -o '!\[\]([^)]*)' "$tmp/limpo.md" | sed 's/!\[\](\(.*\))/\1/'); do
  cp "figuras/$f" "word/submissao/figures/Figure$n.png"; n=$((n+1))
done
echo "palavras (com referências): $(pandoc word/submissao/manuscript-anonymous.docx -t plain | wc -w)"
rm -rf "$tmp"
