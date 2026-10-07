import type { SlotCheck, YardRecommendations, YardSlot } from './yard.api';

export type CheckedYardSlot = {
  visitId: string;
  yardSlotId: string;
  slotCode: string;
  result: SlotCheck;
};

export type YardAssignmentChoice = {
  visitId: string;
  yardSlotId: string;
  slotCode: string;
} & (
  | { source: 'RECOMMENDATION'; recommendations: YardRecommendations }
  | { source: 'MANUAL'; checked: CheckedYardSlot }
);

type LoadResult<T> = { data: T; error: null } | { data: null; error: string };
type AssignmentOptionsApi = {
  getRecommendations: (visitId: string) => Promise<YardRecommendations>;
  slots: () => Promise<{ data: YardSlot[] }>;
};

export async function loadYardAssignmentOptions(
  visitId: string,
  api: AssignmentOptionsApi,
  callbacks: {
    recommendations?: (result: LoadResult<YardRecommendations>) => void;
    slots?: (result: LoadResult<YardSlot[]>) => void;
  },
): Promise<void> {
  // Each result reaches its UI independently, including when the other request fails or stalls.
  const requests: Promise<void>[] = [];
  if (callbacks.recommendations) {
    const receive = callbacks.recommendations;
    requests.push(
      (async () => {
        try {
          receive({ data: await api.getRecommendations(visitId), error: null });
        } catch (error) {
          receive({
            data: null,
            error: error instanceof Error ? error.message : 'Không tải được đề xuất.',
          });
        }
      })(),
    );
  }
  if (callbacks.slots) {
    const receive = callbacks.slots;
    requests.push(
      (async () => {
        try {
          receive({ data: (await api.slots()).data, error: null });
        } catch (error) {
          receive({
            data: null,
            error: error instanceof Error ? error.message : 'Không tải được danh sách ô bãi.',
          });
        }
      })(),
    );
  }
  await Promise.all(requests);
}

export function findYardAssignmentChoice({
  visitId,
  recommendations,
  selectedSlotId,
  manualCode,
  slots,
  checked,
}: {
  visitId: string;
  recommendations: YardRecommendations | null;
  selectedSlotId: string;
  manualCode: string;
  slots: YardSlot[];
  checked: CheckedYardSlot | null;
}): YardAssignmentChoice | null {
  if (!visitId) return null;
  if (selectedSlotId) {
    const candidate = recommendations?.data.find((row) => row.yardSlotId === selectedSlotId);
    return candidate && recommendations
      ? {
          visitId,
          yardSlotId: candidate.yardSlotId,
          slotCode: candidate.slotCode,
          source: 'RECOMMENDATION',
          recommendations,
        }
      : null;
  }
  const slot = slots.find((row) => row.slotCode === manualCode.trim().toUpperCase());
  if (
    !slot ||
    !checked ||
    checked.visitId !== visitId ||
    checked.yardSlotId !== slot.id ||
    checked.slotCode !== slot.slotCode ||
    !checked.result.eligible ||
    checked.result.yardSlot.id !== slot.id ||
    checked.result.yardSlot.slotCode !== slot.slotCode
  )
    return null;
  return { visitId, yardSlotId: slot.id, slotCode: slot.slotCode, source: 'MANUAL', checked };
}
