from pathlib import Path
import json, re
rows = json.loads(Path('audit/runs/2026-10-03-improvement-02/raw/root-lint-progress.json').read_text(encoding='utf-8-sig'))
for row in rows:
    p = Path(row['filePath'])
    names = [m['message'].split("'")[1] for m in row['messages'] if 'is defined but never used' in m['message']]
    p.write_text(''.join(line for line in p.read_text(encoding='utf-8').splitlines(keepends=True) if line.strip().rstrip(',') not in names), encoding='utf-8')
p = Path('apps/web/src/components/DashboardView.tsx')
s = p.read_text(encoding='utf-8')
s = re.sub(r'^  const (?:pendingIcdReview|inTransitHandovers|completedHandovers) =.*\n', '', s, flags=re.M)
s = s.replace('    handovers,\n', '').replace('<h3', '<h2').replace('</h3', '</h2')
p.write_text(s, encoding='utf-8')
p = Path('apps/web/src/components/WorkQueueView.tsx')
s = p.read_text(encoding='utf-8').replace('WorkQueueTask, TaskUrgency, TaskType', 'WorkQueueTask, TaskUrgency')
s = s.replace("import { NavTabId }", "import { taskDestination, type NavigationContext } from '../navigation';\nimport { NavTabId }")
s = s.replace('onNavigate: (tab: NavTabId, contextId?: string) => void;', 'onNavigate: (tab: NavTabId, contextId?: string, context?: NavigationContext) => void;')
a = s.index('    switch (task.taskType)')
b = s.index('\n  };', a)
s = s[:a] + '    const destination = taskDestination(task);\n    onNavigate(destination.tab, undefined, destination.context);' + s[b:]
s = s.replace('Overdue', 'Quá hạn').replace(' High', ' Ưu tiên cao')
s = s.replace('            value={urgencyFilter}', '            aria-label="Mức độ khẩn cấp"\n            value={urgencyFilter}').replace('            value={taskTypeFilter}', '            aria-label="Loại nghiệp vụ"\n            value={taskTypeFilter}')
p.write_text(s, encoding='utf-8')
