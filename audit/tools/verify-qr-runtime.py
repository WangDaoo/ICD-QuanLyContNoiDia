"""Decode a real CUA screenshot; report only hash equality, never the pass token."""
import hashlib
import json
from pathlib import Path
import cv2
import numpy as np

root=Path(__file__).resolve().parents[2]
run=root/'audit/runs/2026-10-03-improvement-02'
evidence=json.loads((run/'raw/browser/qr-runtime-backend.json').read_text(encoding='utf-8'))
image=cv2.imdecode(np.frombuffer((run/'screenshots/web/qr-container-runtime.png').read_bytes(),dtype=np.uint8),cv2.IMREAD_COLOR)
assert image is not None
value,points,_=cv2.QRCodeDetector().detectAndDecode(image)
assert points is not None and value,'Actual screenshot must contain a decodable QR'
matches=hashlib.sha256(value.encode()).hexdigest()==evidence['expectedTokenSha256']
assert matches,'Rendered QR must exactly encode the backend-issued token'
result={'method':'OpenCV QRCodeDetector of real CUA browser screenshot','passed':True,'matchesBackendTokenSha256':matches,'gatePassId':evidence['gatePassId'],'visitId':evidence['visitId'],'imageShape':list(image.shape),'tokenSaved':False}
(run/'raw/browser/qr-runtime-decode.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
print(json.dumps(result))
