import { useMemo, useState } from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../../theme/ThemeProvider';
import type { InspectionRecord, YardSlot } from '../api/yard.api';
import {
  canSelectYardSlot,
  getSlotsAt,
  getYardBlocks,
  getYardGeometry,
  getYardSlotAppearance,
  YARD_SLOT_LEGEND,
  type YardMapHold,
} from '../api/yard-map';

export type YardSlotGridProps = {
  slots: YardSlot[];
  holds?: YardMapHold[];
  inspections?: InspectionRecord[];
  onSelectSlot?: (slot: YardSlot) => void;
  selectionEnabled?: boolean;
  onOpenContainer?: (visitId: string) => void;
};

const CELL_WIDTH = 104;
const CELL_GAP = 6;
const ROW_LABEL_WIDTH = 64;
const INSPECTION_STATUS_LABELS: Record<string, string> = {
  REQUESTED: 'Chờ kiểm định',
  PENDING: 'Chờ kiểm định',
  IN_PROGRESS: 'Đang kiểm định',
  COMPLETED: 'Đã kiểm định',
  CANCELLED: 'Đã hủy',
};
const INSPECTION_RESULT_LABELS: Record<string, string> = {
  HOLD: 'Giữ container (Hold)',
  PASS: 'Đạt',
  FAIL: 'Không đạt',
};

export function YardSlotGrid({
  slots,
  holds = [],
  inspections = [],
  onSelectSlot,
  selectionEnabled = false,
  onOpenContainer,
}: YardSlotGridProps) {
  const { theme } = useTheme();
  const [selectedBlockCode, setSelectedBlockCode] = useState('');
  const [selectedTier, setSelectedTier] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const blocks = useMemo(() => getYardBlocks(slots), [slots]);
  const block = blocks.find((item) => item.code === selectedBlockCode) ?? blocks[0];
  const tier = block?.tiers.includes(selectedTier) ? selectedTier : block?.tiers[0];
  const geometry = useMemo(() => getYardGeometry(block?.slots ?? []), [block]);
  // Resolve the ID against refreshed props so an open detail never keeps a stale slot object.
  const selectedSlot = slots.find((slot) => slot.id === selectedSlotId);
  const selectedAppearance = selectedSlot
    ? getYardSlotAppearance(selectedSlot, holds, inspections)
    : undefined;

  const handleChooseSlot = () => {
    if (selectedSlot && selectionEnabled && onSelectSlot && canSelectYardSlot(selectedSlot)) {
      onSelectSlot(selectedSlot);
      setSelectedSlotId(null);
    }
  };
  const handleOpenContainer = () => {
    const visitId = selectedSlot?.currentContainer?.containerVisitId;
    if (visitId && onOpenContainer) {
      onOpenContainer(visitId);
      setSelectedSlotId(null);
    }
  };
  const renderSlot = (slot: YardSlot) => {
    const appearance = getYardSlotAppearance(slot, holds, inspections);
    return (
      <TouchableOpacity
        key={slot.id}
        testID={`yard-slot-${slot.id}`}
        accessibilityRole="button"
        accessibilityLabel={`Slot ${slot.slotCode}, ${appearance.label}${slot.currentContainer ? `, ${slot.currentContainer.containerNumber}` : ''}`}
        accessibilityHint="Mở thông tin vị trí trong bãi"
        onPress={() => setSelectedSlotId(slot.id)}
        style={{
          width: CELL_WIDTH,
          minWidth: 44,
          minHeight: 64,
          borderRadius: 7,
          borderWidth: 1,
          borderColor: appearance.border,
          backgroundColor: appearance.background,
          padding: 7,
          justifyContent: 'center',
          gap: 3,
        }}
      >
        <Text
          numberOfLines={1}
          style={{ fontSize: 11, fontWeight: '700', color: appearance.color }}
        >
          {slot.slotCode}
        </Text>
        <Text numberOfLines={1} style={{ fontSize: 10, color: appearance.color }}>
          {slot.currentContainer?.containerNumber || appearance.label}
        </Text>
        {slot.currentContainer && (appearance.key === 'hold' || appearance.key === 'inspection') ? (
          <Text
            numberOfLines={1}
            style={{ fontSize: 10, fontWeight: '600', color: appearance.color }}
          >
            {appearance.label}
          </Text>
        ) : null}
      </TouchableOpacity>
    );
  };
  const renderDetail = (label: string, value: string | number | undefined | null) => (
    <View style={{ gap: 3 }}>
      <Text style={{ fontSize: 11, color: theme.colors.textMuted }}>{label}</Text>
      <Text style={{ fontSize: 13, color: theme.colors.textPrimary }}>
        {value ?? 'Không có dữ liệu'}
      </Text>
    </View>
  );

  return (
    <View style={{ gap: 12 }}>
      <View
        accessibilityLabel="Chú giải màu sơ đồ bãi"
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}
      >
        {YARD_SLOT_LEGEND.map((entry) => (
          <View
            key={entry.key}
            style={{
              borderRadius: 6,
              borderWidth: 1,
              borderColor: entry.border,
              backgroundColor: entry.background,
              paddingVertical: 5,
              paddingHorizontal: 7,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: '600', color: entry.color }}>
              {entry.label}
            </Text>
          </View>
        ))}
      </View>

      {!block ? (
        <Text style={{ fontSize: 13, color: theme.colors.textMuted }}>
          Chưa có vị trí trong bãi.
        </Text>
      ) : (
        <>
          <View style={{ gap: 5 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary }}>
              Block · Khu bãi
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator
              contentContainerStyle={{ gap: 6 }}
              accessibilityLabel="Chọn Block"
            >
              {blocks.map((item) => (
                <TouchableOpacity
                  key={item.code}
                  accessibilityRole="button"
                  accessibilityLabel={`Block ${item.code}`}
                  accessibilityState={{ selected: item.code === block.code }}
                  onPress={() => {
                    setSelectedBlockCode(item.code);
                    setSelectedTier('');
                  }}
                  style={{
                    minWidth: 64,
                    minHeight: 44,
                    paddingHorizontal: 12,
                    justifyContent: 'center',
                    borderRadius: 7,
                    borderWidth: 1,
                    borderColor:
                      item.code === block.code ? theme.colors.primary : theme.colors.borderDark,
                    backgroundColor:
                      item.code === block.code ? theme.colors.primary : theme.colors.surface,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: item.code === block.code ? '#FFFFFF' : theme.colors.textPrimary,
                    }}
                  >
                    {item.code}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {block.name ? (
              <Text style={{ fontSize: 11, color: theme.colors.textMuted }}>{block.name}</Text>
            ) : null}
          </View>

          {block.tiers.length ? (
            <View style={{ gap: 5 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary }}>
                Tier · Tầng
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator
                contentContainerStyle={{ gap: 6 }}
                accessibilityLabel="Chọn Tier"
              >
                {block.tiers.map((item) => (
                  <TouchableOpacity
                    key={item}
                    accessibilityRole="button"
                    accessibilityLabel={`Tier ${item}`}
                    accessibilityState={{ selected: item === tier }}
                    onPress={() => setSelectedTier(item)}
                    style={{
                      minWidth: 52,
                      minHeight: 44,
                      paddingHorizontal: 12,
                      justifyContent: 'center',
                      borderRadius: 7,
                      borderWidth: 1,
                      borderColor: item === tier ? theme.colors.primary : theme.colors.borderDark,
                      backgroundColor: item === tier ? theme.colors.primary : theme.colors.surface,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: item === tier ? '#FFFFFF' : theme.colors.textPrimary,
                      }}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {tier !== undefined ? (
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 11, color: theme.colors.textMuted }}>
                Row · Hàng × Bay · Dãy — vuốt ngang để xem các dãy.
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator
                nestedScrollEnabled
                accessibilityLabel={`Sơ đồ Block ${block.code}, Tier ${tier}`}
                contentContainerStyle={{ paddingBottom: 5 }}
              >
                <View style={{ gap: CELL_GAP }}>
                  <View style={{ flexDirection: 'row', gap: CELL_GAP, alignItems: 'center' }}>
                    <Text
                      style={{
                        width: ROW_LABEL_WIDTH,
                        fontSize: 10,
                        fontWeight: '700',
                        color: theme.colors.textSecondary,
                      }}
                    >
                      Row / Bay
                    </Text>
                    {geometry.bays.map((bay) => (
                      <Text
                        key={bay}
                        style={{
                          width: CELL_WIDTH,
                          textAlign: 'center',
                          fontSize: 11,
                          fontWeight: '700',
                          color: theme.colors.textSecondary,
                        }}
                      >
                        {bay}
                      </Text>
                    ))}
                  </View>
                  {geometry.rows.map((row) => (
                    <View
                      key={row}
                      style={{ flexDirection: 'row', gap: CELL_GAP, alignItems: 'stretch' }}
                    >
                      <View style={{ width: ROW_LABEL_WIDTH, justifyContent: 'center' }}>
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '700',
                            color: theme.colors.textSecondary,
                          }}
                        >
                          {row}
                        </Text>
                      </View>
                      {geometry.bays.map((bay) => {
                        const cellSlots = getSlotsAt(block.slots, row, bay, tier);
                        return (
                          <View
                            key={bay}
                            style={{ width: CELL_WIDTH, minHeight: 64, gap: CELL_GAP }}
                          >
                            {cellSlots.length ? (
                              cellSlots.map(renderSlot)
                            ) : (
                              <View
                                accessible
                                accessibilityLabel={`Không có slot tại Row ${row}, Bay ${bay}, Tier ${tier}`}
                                style={{
                                  flex: 1,
                                  minHeight: 64,
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                  borderRadius: 7,
                                  borderWidth: 1,
                                  borderStyle: 'dashed',
                                  borderColor: theme.colors.borderDark,
                                }}
                              >
                                <Text style={{ fontSize: 14, color: theme.colors.textMuted }}>
                                  —
                                </Text>
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  ))}
                </View>
              </ScrollView>
              <Text style={{ fontSize: 10, color: theme.colors.textMuted }}>
                — Không có slot tại tọa độ này. Chạm một slot để xem chi tiết.
              </Text>
            </View>
          ) : null}

          {block.unlocatedSlots.length ? (
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 11, color: theme.colors.textMuted }}>
                Slot chưa có đủ tọa độ Row / Bay / Tier
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: CELL_GAP }}>
                {block.unlocatedSlots.map(renderSlot)}
              </View>
            </View>
          ) : null}
        </>
      )}

      <Modal
        visible={Boolean(selectedSlot)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedSlotId(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: '#00000088',
            padding: 16,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <View
            accessibilityViewIsModal
            style={{
              width: '100%',
              maxWidth: 480,
              maxHeight: '90%',
              borderRadius: 12,
              backgroundColor: theme.colors.surface,
              borderWidth: 1,
              borderColor: theme.colors.borderDark,
              padding: 16,
              gap: 12,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text
                accessibilityRole="header"
                style={{
                  flex: 1,
                  fontSize: 16,
                  fontWeight: '700',
                  color: theme.colors.textPrimary,
                }}
              >
                {selectedSlot ? `Slot ${selectedSlot.slotCode}` : 'Chi tiết slot'}
              </Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Đóng chi tiết slot"
                onPress={() => setSelectedSlotId(null)}
                style={{
                  minWidth: 44,
                  minHeight: 44,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{ fontSize: 14, fontWeight: '600', color: theme.colors.textSecondary }}
                >
                  Đóng
                </Text>
              </TouchableOpacity>
            </View>
            {selectedSlot && selectedAppearance ? (
              <ScrollView contentContainerStyle={{ gap: 12 }}>
                <View
                  style={{
                    alignSelf: 'flex-start',
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: selectedAppearance.border,
                    backgroundColor: selectedAppearance.background,
                    paddingHorizontal: 8,
                    paddingVertical: 6,
                  }}
                >
                  <Text
                    style={{ fontSize: 12, fontWeight: '700', color: selectedAppearance.color }}
                  >
                    {selectedAppearance.label}
                  </Text>
                </View>
                {renderDetail(
                  'Block · Khu bãi',
                  `${selectedSlot.yardBlock.blockCode}${selectedSlot.yardBlock.name ? ` · ${selectedSlot.yardBlock.name}` : ''}`,
                )}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                  {renderDetail('Row · Hàng', selectedSlot.rowNo)}
                  {renderDetail('Bay · Dãy', selectedSlot.bayNo)}
                  {renderDetail('Tier · Tầng', selectedSlot.tierNo)}
                </View>
                {selectedSlot.supportedContainerType
                  ? renderDetail('Loại container hỗ trợ', selectedSlot.supportedContainerType)
                  : null}
                {selectedSlot.reeferPower !== undefined
                  ? renderDetail('Nguồn điện lạnh', selectedSlot.reeferPower ? 'Có' : 'Không')
                  : null}
                {selectedSlot.maxWeight != null
                  ? renderDetail('Tải trọng tối đa (kg)', selectedSlot.maxWeight)
                  : null}
                {selectedSlot.currentContainer
                  ? renderDetail(
                      'Container tại slot',
                      selectedSlot.currentContainer.containerNumber,
                    )
                  : null}
                {selectedAppearance.activeHolds.map((hold, index) => (
                  <View key={`${hold.holdType ?? 'hold'}-${index}`} style={{ gap: 3 }}>
                    <Text
                      style={{ fontSize: 12, fontWeight: '700', color: theme.colors.textPrimary }}
                    >
                      Hold đang hiệu lực{hold.holdType ? ` · ${hold.holdType}` : ''}
                    </Text>
                    <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                      {hold.reason || 'Chưa có lý do giữ container.'}
                    </Text>
                  </View>
                ))}
                {selectedAppearance.inspections.map((inspection) => (
                  <View key={inspection.id} style={{ gap: 3 }}>
                    <Text
                      style={{ fontSize: 12, fontWeight: '700', color: theme.colors.textPrimary }}
                    >
                      {INSPECTION_STATUS_LABELS[inspection.status] ?? inspection.status}
                      {inspection.result
                        ? ` · ${INSPECTION_RESULT_LABELS[inspection.result] ?? inspection.result}`
                        : ''}
                    </Text>
                    {inspection.notes ? (
                      <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                        {inspection.notes}
                      </Text>
                    ) : null}
                  </View>
                ))}
                {selectedSlot.currentContainer?.containerVisitId && onOpenContainer ? (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Mở chi tiết container"
                    onPress={handleOpenContainer}
                    style={{
                      minHeight: 44,
                      borderRadius: 7,
                      borderWidth: 1,
                      borderColor: theme.colors.borderDark,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      style={{ fontSize: 13, fontWeight: '700', color: theme.colors.textPrimary }}
                    >
                      Mở chi tiết container
                    </Text>
                  </TouchableOpacity>
                ) : null}
                {selectionEnabled && onSelectSlot && canSelectYardSlot(selectedSlot) ? (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Chọn slot làm vị trí đích"
                    onPress={handleChooseSlot}
                    style={{
                      minHeight: 44,
                      borderRadius: 7,
                      backgroundColor: theme.colors.primary,
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 10,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>
                      Chọn slot làm vị trí đích
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}
