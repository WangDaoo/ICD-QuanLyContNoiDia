from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[5]
COMPONENTS=ROOT/'apps/web/src/components'
config={
 'AuditsView.tsx':('activity',{'searchTerm':('search',"''")}),
 'ContainersView.tsx':('containers',{'searchTerm':('search',"''"),'stateFilter':('state',"'ALL'")}),
 'ManifestsView.tsx':('manifests',{'searchTerm':('search',"''"),'selectedManifestId':('selection',"manifests[0]?.id || ''")}),
 'MovementOrdersView.tsx':('movement-orders',{'searchTerm':('search',"''")}),
 'TruckVisitsView.tsx':('truck-visits',{'searchTerm':('search',"''")}),
 'GatePassView.tsx':('gate-pass',{'searchTerm':('search',"''"),'selectedGatePassId':('selection',"targetGatePassId || gatePasses[0]?.id || ''")}),
 'EDIView.tsx':('edi',{'filterType':('type',"'ALL'"),'selectedEdiId':('selection',"ediMessages[0]?.id || ''")}),
 'PartnerManagementView.tsx':('partner-api-logs',{'selectedLogId':('selection',"partnerApiLogs[0]?.id ?? ''")}),
 'HandoversView.tsx':('handovers',{'searchTerm':('search',"''"),'statusFilter':('status',"'ALL'")}),
 'YardView.tsx':('yard',{'filter':('search',"''"),'blockFilter':('block',"'ALL'"),'statusFilter':('status',"'ALL'")}),
}
for name,(view,values) in config.items():
    file=COMPONENTS/name;text=file.read_text(encoding='utf-8')
    text="import { useViewQueryState } from '../context/useViewQueryState';\n"+text
    for variable,(key,initial) in values.items():
        pattern=r'(const \['+variable+r',\s*\w+\]\s*=\s*)useState(?:<[^;]+?>)?\([^\n]+?\);'
        text,count=re.subn(pattern,lambda m:m[1]+f"useViewQueryState('{view}', '{key}', {initial});",text)
        if count!=1: raise RuntimeError(f'{name}: state {variable}: {count}')
    if name=='ManifestsView.tsx': text=text.replace('asString(asRecord(result.data).id) || null','asString(asRecord(result.data).id) || \'\'')
    file.write_text(text,encoding='utf-8')
for name,view,var,setter,initial,choices in [
 ('BillingView.tsx','billing','activeTab','setActiveTab','INVOICES',['INVOICES','ORDERS','TARIFFS']),
 ('EDIView.tsx','edi','tab','setTab','OUTBOX',['OUTBOX','ROUTES','ALERTS']),
 ('UsersRolesView.tsx','users-roles','tab','setTab','USERS',['USERS','ROLES']),
 ('MasterDataView.tsx','master-data','tab','setTab','SHIPPING_LINES',['SHIPPING_LINES','CONSIGNEES','CLEARING_AGENTS','TRANSPORTERS']),
]:
    file=COMPONENTS/name;text=file.read_text(encoding='utf-8')
    if 'useViewQueryState' not in text: text="import { useViewQueryState } from '../context/useViewQueryState';\n"+text
    pattern=r'  const \['+var+r', '+setter+r'\] = useState<[^\n]+>\([^\n]+\);'
    check=' || '.join(f"{var}Value === '{choice}'" for choice in choices)
    replacement=f"  const [{var}Value, {setter}] = useViewQueryState('{view}', 'section', '{initial}');\n  const {var}"+(': Tab' if name=='MasterDataView.tsx' else '')+f" = {check} ? {var}Value : '{initial}';"
    text,count=re.subn(pattern,replacement,text)
    if count!=1: raise RuntimeError(f'{name}: enumtab {count}')
    file.write_text(text,encoding='utf-8')
