import type { HierarchyFilterState, L2Hub, L3Channel } from '../types/virtualWarehouse';

/** 依目前虛擬倉篩選狀態取得來源通路顯示名稱 */
export function getSourceChannelLabel(
  filter: HierarchyFilterState,
  l2Hubs: L2Hub[],
  l3Channels: L3Channel[],
): string {
  if (filter.viewMode === 'main') return '總倉';

  const l2 = l2Hubs.find((hub) => hub.id === filter.l2Id);
  if (filter.l3Id) {
    const l3 = l3Channels.find((channel) => channel.id === filter.l3Id);
    return l3?.name ?? l2?.name ?? '通路';
  }
  return l2?.name ?? '通路';
}
