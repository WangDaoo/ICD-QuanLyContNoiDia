from pathlib import Path
p = Path('apps/web/src/context/AppContext.tsx')
s = p.read_text(encoding='utf-8')
s = s.replace('  UserRole,\n', '')
s = s.replace('  createOperationalHold: (visitId: string, holdType: any,', "  createOperationalHold: (visitId: string, holdType: OperationalHold['holdType'],")
s = s.replace('updateTruckVisitStatus: (id: string, status: any)', "updateTruckVisitStatus: (id: string, status: TruckVisit['status'])")
s = s.replace('  refreshData: () => Promise<void>;', '  refreshData: () => Promise<void>;\n  resourceStatus?: ResourceStatus;\n  detailStatus?: DetailStatus;')
start = s.index('const mapAuthUserToView =')
end = s.index("import { apiClient }", start)
s = s[:start] + """const mapAuthUserToView = (input: unknown): User => {
  const user = asRecord(input);
  return { id: asString(user.id), name: asString(user.name), email: asString(user.email),
    role: asEnum(user.role ?? asStrings(user.roleCodes)[0], ['ADMIN','MANAGER','OPERATOR','GATE_STAFF','YARD_STAFF','AGENT','CONSIGNEE'], 'OPERATOR'),
    active: user.active !== false, consigneeId: asOptionalString(user.consigneeId), permissionCodes: asStrings(user.permissionCodes) };
};

""" + s[end:]
s = s.replace("import { mapLiveCollections, mapBillingPreview }", "import { mapLiveCollections, mapBillingPreview, type LiveCollections }")
s = s.replace("import { getSafetyReadStatus", "import { asRecord, asRecords, asString, asStrings, asEnum, asOptionalString, asNumber } from '../services/mappers/api-response.mapper';\nimport { errorStatus, errorMessage, readFailureState, retainCollection, type ResourceStatus, type DetailStatus } from './resource-data';\nimport { getSafetyReadStatus")
s = s.replace('Promise<any[]>', 'Promise<Record<string, unknown>[]>').replace('return loadAllPages(params => apiClient.get<unknown>(path, { params }));', 'return asRecords(await loadAllPages(params => apiClient.get<unknown>(path, { params })));')
s = s.replace("const emptyData = () => ({ ...mapLiveCollections({}, ''), visitSafetyStatus: {} });", "const emptyData = () => ({ ...mapLiveCollections({}, ''), visitSafetyStatus: {} as VisitSafetyStatus });")
s = s.replace('useState<any>(emptyData)', 'useState(emptyData)')
s = s.replace('  const sessionVersion = useRef(0);', "  const [resourceStatus, setResourceStatus] = useState<ResourceStatus>({});\n  const [detailStatus, setDetailStatus] = useState<DetailStatus>({ manifests: {}, roles: {}, handovers: {} });\n  const currentData = useRef(data);\n  currentData.current = data;\n  const refreshFailed = useRef(false);\n  const sessionVersion = useRef(0);")
start = s.index('      const health =')
end = s.index('      const visits =', start)
s = s[:start] + """      const health = await apiClient.get<unknown>('/health/ready').catch(() => null);
      if (version !== sessionVersion.current) return;
      setApiReady(Boolean(health));
      const previous = currentData.current;
      const raw: Record<string, unknown[]> = {};
      const statuses: ResourceStatus = {};
      const details: DetailStatus = { manifests: {}, roles: {}, handovers: {} };
      const failures: string[] = [];
      setResourceStatus(old => Object.fromEntries(Object.keys(DATA_ROUTES).map(key => [key, old[key] === 'ready' || old[key] === 'stale' ? old[key] : 'loading'])));
      await Promise.all(Object.entries(DATA_ROUTES).map(async ([key, path]) => {
        try { raw[key] = await loadList(path); statuses[key] = 'ready'; }
        catch (error: unknown) {
          raw[key] = [];
          const hasPrevious = key in previous && Array.isArray(previous[key as keyof LiveCollections]) && previous[key as keyof LiveCollections].length > 0;
          statuses[key] = readFailureState(error, hasPrevious);
          if (![401,403].includes(errorStatus(error) ?? 0)) failures.push(path + ': ' + errorMessage(error));
        }
      }));
      const detailRead = async (resource: 'manifests' | 'roles' | 'handovers', row: Record<string, unknown>, read: () => Promise<unknown>) => {
        const id = asString(row.id);
        try { const result = asRecord(await read()); details[resource][id] = 'ready'; return result; }
        catch (error: unknown) {
          details[resource][id] = readFailureState(error, previous[resource].some(item => item.id === id));
          if (errorStatus(error) !== 403) failures.push(resource + '/' + id + ': ' + errorMessage(error));
          return row;
        }
      };
      raw.manifests = await Promise.all(asRecords(raw.manifests).map(m => detailRead('manifests', m, async () => {
        const masterBls = await loadList('/manifests/' + asString(m.id) + '/master-bls');
        const masterBills = await Promise.all(masterBls.map(async b => ({ ...b, houseBills: await loadList('/manifests/' + asString(m.id) + '/master-bls/' + asString(b.id) + '/house-bls') })));
        return { ...m, masterBills };
      })));
      raw.roles = await Promise.all(asRecords(raw.roles).map(r => detailRead('roles', r, async () => unwrapData<unknown>(await apiClient.get('/admin/roles/' + asString(r.id))))));
      raw.handovers = await Promise.all(asRecords(raw.handovers).map(h => detailRead('handovers', h, async () => unwrapData<unknown>(await apiClient.get('/handovers/' + asString(h.id))))));
""" + s[end:]
s = s.replace('const visits = raw.containerVisits ?? [];', 'const visits = asRecords(raw.containerVisits);')
s = s.replace("const summary = unwrapData<any>(await apiClient.get('/reports/summary'));\n        const limit = summary?.freeDayWarnings?.freeDaysLimit;", "const summary = asRecord(unwrapData<unknown>(await apiClient.get('/reports/summary')));\n        const limit = asRecord(summary.freeDayWarnings).freeDaysLimit;")
s = s.replace('catch (error: any)', 'catch (error: unknown)').replace('error?.status', 'errorStatus(error)').replace('error.message', 'errorMessage(error)').replace("error?.message || 'Đăng nhập thất bại.'", "errorMessage(error) || 'Đăng nhập thất bại.'")
s = s.replace("const visitSafetyStatus: VisitSafetyStatus", "const visitSafetyStatus: VisitSafetyStatus")
s = s.replace('visitSafetyStatus[v.id]', 'visitSafetyStatus[asString(v.id)]')
s = s.replace("raw.gatePasses.map(async pass =>", "asRecords(raw.gatePasses).map(async pass =>")
s = s.replace('new Date(pass.expiresAt)', 'new Date(asString(pass.expiresAt))')
s = s.replace("...unwrapData<any>(await apiClient.get('/gate-passes/' + pass.id + '/qr'))", "...asRecord(unwrapData<unknown>(await apiClient.get('/gate-passes/' + asString(pass.id) + '/qr')))")
s = s.replace('      const next = mapLiveCollections(raw, latestActor.current.role);', """      for (const key of ['invoices','payments','serviceOrders','tariffs']) {
        try { mapLiveCollections({ [key]: raw[key] ?? [] }, latestActor.current.role); }
        catch (error: unknown) { statuses[key] = readFailureState(error, previous[key as keyof LiveCollections].length > 0); raw[key] = []; failures.push(key + ': ' + errorMessage(error)); }
      }
      const next = mapLiveCollections(raw, latestActor.current.role);
      for (const key of Object.keys(DATA_ROUTES) as Array<keyof LiveCollections>) {
        if (statuses[key] === 'stale') Object.assign(next, { [key]: previous[key] });
      }
      next.manifests = next.manifests.map(row => details.manifests[row.id] === 'stale' ? previous.manifests.find(old => old.id === row.id) ?? row : details.manifests[row.id] === 'forbidden' ? { ...row, masterBills: [] } : row);
      next.roles = next.roles.map(row => details.roles[row.id] === 'stale' ? previous.roles.find(old => old.id === row.id) ?? row : details.roles[row.id] === 'forbidden' ? { ...row, permissionCodes: [] } : row);
      next.handovers = next.handovers.map(row => details.handovers[row.id] === 'stale' ? previous.handovers.find(old => old.id === row.id) ?? row : row);
      setResourceStatus(statuses); setDetailStatus(details);
      refreshFailed.current = failures.length > 0 || !health;""")
s = s.replace("const write = async (path: string, payload?: any", "const write = async (path: string, payload?: unknown").replace("unwrapData<any>(await apiClient.request({ method, url: path, data: payload }))", "asRecord(unwrapData<unknown>(await apiClient.request({ method, url: path, data: payload })))")
s = s.replace("const command = async (path: string, payload?: any", "const command = async (path: string, payload?: unknown")
s = s.replace("executeOperation(() => write(path, payload, method), refreshData)", "executeOperation(() => write(path, payload, method), async () => { await refreshData(); if (refreshFailed.current) throw new Error('Refresh incomplete'); })")
s = s.replace("list: any[]", "list: Array<{ id: string; name?: string; active?: boolean }>").replace('payload: any', 'payload: unknown')
import re
s = re.sub(r'\((\w+): any\)', r'(\1)', s)
s = s.replace('unwrapList<any>', 'unwrapList<unknown>')
s = s.replace("const scan = unwrapData<any>(await apiClient.post('/gate-pass/scan', { qrToken: token }));", "const scan = asRecord(unwrapData<unknown>(await apiClient.post('/gate-pass/scan', { qrToken: token })));\n        const readiness = asRecord(scan.readiness); const scanPass = asRecord(scan.gatePass); const scanContainer = asRecord(scan.container);")
s = s.replace("(scan.readiness?.blockers ?? []).join(', ')", "asStrings(readiness.blockers).join(', ')").replace('scan.gatePass?.containerVisitId', 'asOptionalString(scanPass.containerVisitId)').replace('scan.container?.containerNumber', 'asOptionalString(scanContainer.containerNumber)')
s = s.replace('result.data.id', 'asString(result.data?.id)').replace('client: r.data?.client', 'client: asRecord(r.data?.client)').replace('plainApiKey: r.data?.rawApiKey ?? r.data?.plainApiKey ?? r.data?.apiKey', 'plainApiKey: asOptionalString(r.data?.rawApiKey ?? r.data?.plainApiKey ?? r.data?.apiKey)').replace('sent: r.data?.sent ?? r.data?.dispatched ?? 0', 'sent: asNumber(r.data?.sent ?? r.data?.dispatched)')
s = s.replace("({ '20GP': '22G1', '40GP': '42G1', '40HC': '45G1', '20RF': '22R1', '45HC': 'L5G1' } as any)", "({ '20GP': '22G1', '40GP': '42G1', '40HC': '45G1', '20RF': '22R1', '45HC': 'L5G1' })")
s = s.replace('...data, currentUser, isAuthenticated, isLoading, apiReady, apiError, refreshData, login, logout,', '...data, currentUser, isAuthenticated, isLoading, apiReady, apiError, resourceStatus, detailStatus, refreshData, login, logout,')
s = s.replace('setData(emptyData()); setApiReady(false);', "setData(emptyData()); setResourceStatus({}); setDetailStatus({ manifests: {}, roles: {}, handovers: {} }); setApiReady(false);")
s = s.replace('retainCollection, ', '')
p.write_text(s, encoding='utf-8')
