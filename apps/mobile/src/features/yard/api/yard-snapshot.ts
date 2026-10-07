import { containerApi, type ContainerHold } from '../../containers/api/container.api';
import { yardApi, type InspectionRecord, type YardSlot } from './yard.api';

export type YardMapHold = ContainerHold & { containerVisitId: string };
export interface YardSnapshot {
  slots: YardSlot[];
  total: number;
  holds: YardMapHold[];
  inspections: InspectionRecord[];
  warnings: string[];
}

export async function loadYardSnapshot({
  canReadInspections,
  canReadHolds,
}: {
  canReadInspections: boolean;
  canReadHolds: boolean;
}): Promise<YardSnapshot> {
  const catalog = await yardApi.slots();
  const warnings: string[] = [];
  const visitIds = [
    ...new Set(
      catalog.data.flatMap((slot) =>
        slot.currentContainer?.containerVisitId ? [slot.currentContainer.containerVisitId] : [],
      ),
    ),
  ];
  const [inspectionResult, holdResults] = await Promise.all([
    Promise.allSettled([canReadInspections ? yardApi.inspections() : Promise.resolve([])]),
    Promise.allSettled(
      canReadHolds
        ? visitIds.map(async (containerVisitId) =>
            (await containerApi.holds(containerVisitId)).map((hold) => ({
              ...hold,
              containerVisitId,
            })),
          )
        : [],
    ),
  ]);
  const inspection = inspectionResult[0];
  const inspections = inspection.status === 'fulfilled' ? inspection.value : [];
  if (inspection.status === 'rejected')
    warnings.push('Chưa tải được trạng thái giám định. Kéo để tải lại sơ đồ.');
  const holds = holdResults.flatMap((result) =>
    result.status === 'fulfilled' ? result.value : [],
  );
  if (holdResults.some((result) => result.status === 'rejected'))
    warnings.push('Chưa tải đủ lệnh giữ của container. Kéo để tải lại sơ đồ.');
  return { slots: catalog.data, total: catalog.meta.total, inspections, holds, warnings };
}
