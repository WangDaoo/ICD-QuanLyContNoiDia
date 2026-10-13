from pathlib import Path
from PIL import Image, ImageDraw
import sys

folder=Path(sys.argv[1]) if len(sys.argv)>1 else Path(r'D:\Project\Đồ Án 4 +Mobile\icd-management\test-artifacts\2026-10-08-mobile-report\usecase-render')
pages=sorted(folder.glob('page-*.png'))
assert pages
for offset in range(0,len(pages),12):
    sheet=Image.new('RGB',(1200,1350),'#d9e1e7')
    draw=ImageDraw.Draw(sheet)
    for n,page in enumerate(pages[offset:offset+12]):
        img=Image.open(page).convert('RGB');img.thumbnail((275,413))
        x=(n%4)*300+(300-img.width)//2;y=(n//4)*450+20
        sheet.paste(img,(x,y))
        draw.text(((n%4)*300+12,(n//4)*450+2),f'Trang {offset+n+1}',fill='black')
    sheet.save(folder/f'contact-{offset//12+1}.png')
print('pages',len(pages),'contacts',(len(pages)+11)//12)
