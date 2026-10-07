from pathlib import Path
import re

path = Path('apps/web/src/components/ContainersView.tsx')
source = path.read_text(encoding='utf-8')
start = source.index('{activeVisit && (')
end = source.index('</ModalOverlay>', start)
detail = source[start:end]

def guard_button(match):
    opening = match.group(0)
    if re.search(r'\bdisabled=', opening):
        return opening
    return opening.replace('<button', '<button disabled={action.pending}', 1)

detail = re.sub(r'<button\b(?:(?:[^>]|=>))*?>', guard_button, detail)
source = source[:start] + detail + source[end:]
path.write_text(source, encoding='utf-8')
