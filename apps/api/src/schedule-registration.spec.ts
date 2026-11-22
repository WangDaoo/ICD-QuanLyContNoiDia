import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Each ScheduleModule.forRoot() import registers every @Cron/@Interval handler again,
 * so two imports make every scheduled job (EDI dispatch, notification delivery,
 * expiry checks) run twice concurrently. The scheduler must be registered once, in AppModule.
 */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'generated' ? [] : sourceFiles(path);
    return entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts') ? [path] : [];
  });
}

describe('ScheduleModule registration', () => {
  it('is registered exactly once, in AppModule', () => {
    const registrations = sourceFiles(__dirname)
      .filter(file => readFileSync(file, 'utf8').includes('ScheduleModule.forRoot('))
      .map(file => relative(__dirname, file).replace(/\\/g, '/'));

    expect(registrations).toEqual(['app.module.ts']);
  });
});
