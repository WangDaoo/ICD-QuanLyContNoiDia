from pathlib import Path
import re, json
ROOT=Path(__file__).resolve().parents[5]
COMPONENTS=ROOT/'apps/web/src/components'
owned=lambda file: file.name not in {'Header.tsx','AppHeader.tsx','Sidebar.tsx','DashboardView.tsx','WorkQueueView.tsx'} and '.test.' not in file.name
lint=json.loads((Path(__file__).parent/'lint-progress-2.json').read_text(encoding='utf-8-sig'))
for entry in lint:
    file=Path(entry['filePath'])
    if not owned(file): continue
    text=file.read_text(encoding='utf-8')
    unused={re.match(r"'([^']+)'",m['message'])[1] for m in entry['messages'] if m['ruleId']=='@typescript-eslint/no-unused-vars'}
    def clean_import(match):
        tokens=match['names'].split(',')
        keep=[token for token in tokens if token.strip() and re.sub(r'^type\s+','',token.strip()).split(' as ')[-1] not in unused]
        if not keep: return ''
        return match.group(0)[:match.start('names')-match.start()]+','.join(keep)+match.group(0)[match.end('names')-match.start():]
    text=re.sub(r'import\s+(?:type\s+)?(?:\w+,\s*)?\{(?P<names>[^}]+)\}\s+from\s+[^;]+;',clean_import,text)
    if file.name=='ContainersView.tsx':
        text=text.replace('    yardSlots,\n','')
        text=re.sub(r'  const activeVisitOrders =[^\n]+\n','',text)
    file.write_text(text,encoding='utf-8')
for file in COMPONENTS.rglob('*'):
    if file.suffix not in {'.tsx','.ts'} or not owned(file): continue
    text=file.read_text(encoding='utf-8')
    text=re.sub(r'text-\[(?:8|9|10|11|12)px\]','text-caption',text).replace('transition-all','transition-colors')
    file.write_text(text,encoding='utf-8')

file=COMPONENTS/'MovementOrdersView.tsx';text=file.read_text(encoding='utf-8')
text=text.replace("(o) =>\n      o.orderCode", "(o) =>\n      (!targetVisitId || o.containerVisitId === targetVisitId) && (o.orderCode").replace("o.containerNumber.toLowerCase().includes(searchTerm.toLowerCase())\n  );", "o.containerNumber.toLowerCase().includes(searchTerm.toLowerCase()))\n  );")
file.write_text(text,encoding='utf-8')
file=COMPONENTS/'UsersRolesView.tsx';text=file.read_text(encoding='utf-8')
text=text.replace('const { currentUser, managedUsers, roles,', 'const { currentUser, permissions = [], detailStatus, managedUsers, roles,')
text=re.sub(r'  const PERMISSIONS_CATALOG = \[.*?\n  \];', '  const PERMISSIONS_CATALOG = permissions.map(permission => permission.code);',text,flags=re.S)
text=text.replace('can("roles.manage") && <button', 'can("roles.manage") && (!detailStatus?.roles?.[r.id] || detailStatus.roles[r.id] === "ready") && <button')
text=text.replace('{editingRoleId === r.id && (','{editingRoleId === r.id && (!detailStatus?.roles?.[r.id] || detailStatus.roles[r.id] === "ready") && (')
text=text.replace('{PERMISSIONS_CATALOG.map((code)', '<CollectionState resource="permissions" count={PERMISSIONS_CATALOG.length} />\n                  {PERMISSIONS_CATALOG.map((code)')
file.write_text(text,encoding='utf-8')
file=COMPONENTS/'yard/YardSiteMap.tsx';text=file.read_text(encoding='utf-8')
text=text.replace('flex gap-2 border border-slate-300 rounded-lg items-center px-2', 'flex gap-2 border border-slate-300 rounded-lg items-center px-2 focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2')
file.write_text(text,encoding='utf-8')
# Search and filtering controls must have stable accessible names.
for name, pairs in {
 'AuditsView.tsx': [('placeholder="Tìm theo hành động, đối tượng, người thực hiện..."','aria-label="Tìm nhật ký kiểm toán" placeholder="Tìm theo hành động, đối tượng, người thực hiện..."')],
 'GatePassView.tsx': [('value={scannerInput}','aria-label="Mã QR hoặc mã Gate Pass" value={scannerInput}'),('value={searchTerm}','aria-label="Tìm Gate Pass" value={searchTerm}')],
 'HandoversView.tsx': [('value={searchTerm}','aria-label="Tìm lệnh bàn giao" value={searchTerm}'),('value={statusFilter}','aria-label="Lọc trạng thái bàn giao" value={statusFilter}'),('id="handovers-transport-code-input"','id="handovers-transport-code-input" {...validation.props("handovers-transport-code-input")}')],
 'EDIView.tsx': [('value={filterType}','aria-label="Lọc loại điện tín" value={filterType}')],
 'TruckVisitsView.tsx': [('value={searchTerm}','aria-label="Tìm chuyến xe" value={searchTerm}')],
 'ContainersView.tsx': [('value={searchTerm}','aria-label="Tìm container" value={searchTerm}'),('value={stateFilter}','aria-label="Lọc trạng thái container" value={stateFilter}'),('      {/* Container Table */}', '      <CollectionState resource="containerVisits" count={filteredVisits.length} total={containerVisits.length} filtered={!!searchTerm || stateFilter !== "ALL" || hasBlockerOnly} onClear={() => { setSearchTerm(\'\'); setStateFilter("ALL"); setHasBlockerOnly(false); }} />\n      {/* Container Table */}')],
 'ManifestsView.tsx': [('value={searchTerm}','aria-label="Tìm Manifest" value={searchTerm}')],
}.items():
    file=COMPONENTS/name;text=file.read_text(encoding='utf-8')
    if name=='ContainersView.tsx': text=text.replace("import { ReadinessNotice }", "import { CollectionState } from './CollectionState';\nimport { ReadinessNotice }")
    for old,new in pairs: text=text.replace(old,new)
    file.write_text(text,encoding='utf-8')
