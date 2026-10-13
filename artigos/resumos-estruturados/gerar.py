"""Gera os resumos estruturados em .docx (Times 12, espaço 1,5, margens 2,5 cm)."""
import subprocess
import sys
from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Cm, Pt

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "ijgsi-atratores" / "word"))
from montar_docx import sanear  # noqa: E402  (corrige a ordem do XML do modelo do pandoc)

for md in sorted(Path(__file__).parent.glob("resumo-*.md")):
    saida = md.with_suffix(".docx")
    subprocess.run(["pandoc", str(md), "-o", str(saida)], check=True)
    doc = Document(saida)
    for s in doc.sections:
        s.top_margin = s.bottom_margin = s.left_margin = s.right_margin = Cm(2.5)
    for st in doc.styles:
        if st.type == 1:
            st.font.name = "Times New Roman"
            st.font.size = Pt(12)
            if st.font.color is not None:
                st.font.color.rgb = None
    em_refs = False
    for p in doc.paragraphs:
        texto = p.text.strip()
        if p.style.name.startswith("Heading"):
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for r in p.runs:
                r.font.size = Pt(14)
                r.font.bold = True
            continue
        if texto.startswith("Referências"):
            em_refs = True
            p.paragraph_format.space_before = Pt(12)
            continue
        pf = p.paragraph_format
        pf.line_spacing = 1.0 if em_refs else 1.5
        pf.space_after = Pt(6)
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT if em_refs else WD_ALIGN_PARAGRAPH.JUSTIFY
    cp = doc.core_properties
    cp.author = cp.last_modified_by = ""
    doc.save(saida)
    sanear(saida)
    print(saida.name)
