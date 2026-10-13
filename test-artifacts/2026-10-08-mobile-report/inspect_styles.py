from pathlib import Path
from docx import Document
from docx.oxml.ns import qn

root = Path(r'D:\Project\Đồ Án 4 +Mobile')
paths = [root / 'icd-management/test-artifacts/2026-10-08-mobile-report/DoAn3-mobile-reference.docx', root / '10123264 - Dao Minh Quang - Bao cao Mobile ICD - Use Case.docx']
for path in paths:
    doc = Document(path)
    print(path.name.encode('ascii','backslashreplace').decode())
    for name in ['Heading 1','Heading 2','Heading 3','Mục lớn','Tiểu mục','MucLon','MucNho','Nội dung','Normal','HinhVe','Bang']:
        try: s=doc.styles[name]
        except KeyError: continue
        pf=s.paragraph_format
        outline=s._element.find(qn('w:pPr'))
        outline=outline.find(qn('w:outlineLvl')) if outline is not None else None
        data={
          'font':s.font.name,'size':s.font.size.pt if s.font.size else None,'bold':s.font.bold,'italic':s.font.italic,
          'alignment':str(pf.alignment),'before':pf.space_before.pt if pf.space_before else None,
          'after':pf.space_after.pt if pf.space_after else None,
          'line':pf.line_spacing,'first':pf.first_line_indent.cm if pf.first_line_indent else None,
          'left':pf.left_indent.cm if pf.left_indent else None,'outline':outline.get(qn('w:val')) if outline is not None else None,
        }
        print(name.encode('ascii','backslashreplace').decode(),data)
