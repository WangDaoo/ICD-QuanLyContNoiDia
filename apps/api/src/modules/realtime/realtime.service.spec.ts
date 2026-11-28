import type { RealtimeChange } from './realtime.types';
import { RealtimeService, sanitizeRealtimeId, toRealtimeMessage } from './realtime.service';

const ICD_A = 'icd-a';
const ICD_B = 'icd-b';

function collect(service: RealtimeService, userId: string, icdId: string) {
  const received: RealtimeChange[] = [];
  const subscription = service.streamFor({ userId, icdId }).subscribe((change) => received.push(change));
  return { received, subscription };
}

describe('sanitizeRealtimeId', () => {
  it('keeps short client ids', () => {
    expect(sanitizeRealtimeId('web-2f6c1b3a')).toBe('web-2f6c1b3a');
    expect(sanitizeRealtimeId(['mobile:abc', 'ignored'])).toBe('mobile:abc');
  });

  it.each([undefined, null, 42, '', '   ', 'has space', 'a'.repeat(65), 'x\ny'])(
    'drops unsafe value %p',
    (value) => {
      expect(sanitizeRealtimeId(value)).toBeNull();
    },
  );
});

describe('RealtimeService', () => {
  let service: RealtimeService;

  beforeEach(() => {
    service = new RealtimeService();
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  it('delivers ICD events only to subscribers of the same ICD', () => {
    const sameIcd = collect(service, 'user-1', ICD_A);
    const otherIcd = collect(service, 'user-2', ICD_B);

    service.publish({ topics: ['gate', 'containers'], source: 'http', icdId: ICD_A, userId: 'user-9' });

    expect(sameIcd.received).toHaveLength(1);
    expect(sameIcd.received[0]).toMatchObject({ id: 1, topics: ['gate', 'containers'], audience: 'icd' });
    expect(otherIcd.received).toHaveLength(0);
  });

  it('broadcasts events without an ICD to every subscriber', () => {
    const a = collect(service, 'user-1', ICD_A);
    const b = collect(service, 'user-2', ICD_B);

    service.publish({ topics: ['handovers'], source: 'http', icdId: null });

    expect(a.received).toHaveLength(1);
    expect(b.received).toHaveLength(1);
  });

  it('keeps user-scoped events to that user within the ICD', () => {
    const owner = collect(service, 'user-1', ICD_A);
    const colleague = collect(service, 'user-2', ICD_A);

    service.publish({
      topics: ['notifications'],
      source: 'system',
      audience: 'user',
      icdId: ICD_A,
      userId: 'user-1',
    });

    expect(owner.received).toHaveLength(1);
    expect(colleague.received).toHaveLength(0);
  });

  it('refuses user-scoped events without a recipient', () => {
    const anyone = collect(service, 'user-1', ICD_A);

    const result = service.publish({ topics: ['notifications'], source: 'system', audience: 'user', icdId: ICD_A });

    expect(result).toBeNull();
    expect(anyone.received).toHaveLength(0);
  });

  it('removes duplicate topics and skips empty events', () => {
    expect(service.publish({ topics: [], source: 'http', icdId: ICD_A })).toBeNull();

    const change = service.publish({ topics: ['yard', 'yard', 'containers'], source: 'http', icdId: ICD_A });

    expect(change?.topics).toEqual(['yard', 'containers']);
  });

  it('numbers events in order and sanitizes the origin and visit id', () => {
    const first = service.publish({ topics: ['yard'], source: 'http', icdId: ICD_A, origin: 'tab-1', visitId: 'visit-1' });
    const second = service.publish({ topics: ['yard'], source: 'http', icdId: ICD_A, origin: 'bad origin', visitId: '../x y' });

    expect(first?.id).toBe(1);
    expect(second?.id).toBe(2);
    expect(first?.origin).toBe('tab-1');
    expect(first?.visitId).toBe('visit-1');
    expect(second?.origin).toBeNull();
    expect(second?.visitId).toBeNull();
  });

  it('stops delivering after unsubscribe', () => {
    const listener = collect(service, 'user-1', ICD_A);
    listener.subscription.unsubscribe();

    service.publish({ topics: ['gate'], source: 'http', icdId: ICD_A });

    expect(listener.received).toHaveLength(0);
  });

  it('completes open streams on shutdown', () => {
    const complete = jest.fn();
    service.streamFor({ userId: 'user-1', icdId: ICD_A }).subscribe({ complete });

    service.onModuleDestroy();

    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('does not expose ICD or user ids in client messages', () => {
    const change = service.publish({ topics: ['gate'], source: 'http', icdId: ICD_A, userId: 'user-1' });

    const message = toRealtimeMessage(change!);

    expect(message).toEqual({ id: 1, at: change!.at, topics: ['gate'], source: 'http', origin: null, visitId: null });
    expect(message).not.toHaveProperty('icdId');
    expect(message).not.toHaveProperty('userId');
  });
});
