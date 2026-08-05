import { useCallback, useEffect, useMemo, useState } from 'react';
import { DEFAULT_FILTER_STATE } from '../types/virtualWarehouse';
import type {
  HierarchyFilterState,
  L2Hub,
  L3Channel,
  VirtualWarehouseViewMode,
} from '../types/virtualWarehouse';

export interface L2DropdownOption {
  value: string;
  label: string;
}

export interface L3DropdownOption {
  value: string;
  label: string;
}

interface UseL2L3CascadeFilterParams {
  l2Hubs: L2Hub[];
  l3Channels: L3Channel[];
  initialFilter?: HierarchyFilterState;
}

interface UseL2L3CascadeFilterReturn {
  filter: HierarchyFilterState;
  l2Options: L2DropdownOption[];
  l3Options: L3DropdownOption[];
  handleViewModeChange: (viewMode: VirtualWarehouseViewMode) => void;
  handleL2Change: (l2Id: string | undefined) => void;
  handleL3Change: (l3Id: string) => void;
  /** 還原為預設：總倉 */
  resetFilter: () => void;
}

/** 取得 L2 底下已綁定的 L3 通路（含停用，與設定彈窗「銷售通路數」一致） */
export function getBoundL3ByL2(l2Id: string, l3Channels: L3Channel[]): L3Channel[] {
  return l3Channels.filter((c) => c.l2_hub_id === l2Id);
}

/** 取得 L2 底下啟用中的 L3 通路 */
export function getActiveL3ByL2(l2Id: string, l3Channels: L3Channel[]): L3Channel[] {
  return l3Channels.filter((c) => c.status === 'active' && c.l2_hub_id === l2Id);
}

/** 是否顯示銷售通路下拉（與設定彈窗「銷售通路數」一致：0 則不顯示） */
export function shouldShowL3SalesChannelFilter(
  filter: HierarchyFilterState,
  l3Channels: L3Channel[],
  l2Hubs: Array<{ id: string; l3_channel_count?: number }> = [],
): boolean {
  if (filter.viewMode !== 'channel' || !filter.l2Id) return false;

  const hub = l2Hubs.find((item) => item.id === filter.l2Id);
  if (hub != null && hub.l3_channel_count === 0) return false;

  return getBoundL3ByL2(filter.l2Id, l3Channels).length > 0;
}

/** 建構通路分組（L2）下拉選項 */
export function buildL2GroupOptions(l2Hubs: L2Hub[]): L2DropdownOption[] {
  return l2Hubs
    .filter((h) => h.status === 'active')
    .map((h) => ({ value: h.id, label: h.name }));
}

/** 建構銷售通路（L3）下拉選項 */
export function buildL3ChannelOptions(channels: L3Channel[]): L3DropdownOption[] {
  return channels.map((c) => ({ value: c.id, label: c.name }));
}


/**
 * 虛擬倉篩選 Hook
 * 總倉 / 通路互斥；通路模式下依 L2 是否有 L3 決定是否顯示銷售通路下拉
 */
export function useL2L3CascadeFilter({
  l2Hubs,
  l3Channels,
  initialFilter = DEFAULT_FILTER_STATE,
}: UseL2L3CascadeFilterParams): UseL2L3CascadeFilterReturn {
  const [filter, setFilter] = useState<HierarchyFilterState>(initialFilter);

  const l2Options = useMemo(() => buildL2GroupOptions(l2Hubs), [l2Hubs]);

  const activeL3ForL2 = useMemo(() => {
    if (filter.viewMode !== 'channel' || !filter.l2Id) return [];
    return getActiveL3ByL2(filter.l2Id, l3Channels);
  }, [filter.viewMode, filter.l2Id, l3Channels]);

  const l3Options = useMemo(
    () => buildL3ChannelOptions(activeL3ForL2),
    [activeL3ForL2],
  );

  // 舊有通路分組在設定中解除銷售通路綁定後，同步清除失效的 l3Id
  useEffect(() => {
    if (filter.viewMode !== 'channel' || !filter.l2Id) return;

    const hub = l2Hubs.find((item) => item.id === filter.l2Id);
    const boundL3 = getBoundL3ByL2(filter.l2Id, l3Channels);
    const activeL3 = getActiveL3ByL2(filter.l2Id, l3Channels);
    const hasNoSalesChannel =
      (hub != null && hub.l3_channel_count === 0) ||
      boundL3.length === 0 ||
      activeL3.length === 0;

    if (hasNoSalesChannel) {
      if (filter.l3Id !== null) {
        setFilter((prev) => ({ ...prev, l3Id: null }));
      }
      return;
    }

    if (filter.l3Id && !activeL3.some((channel) => channel.id === filter.l3Id)) {
      setFilter((prev) => ({ ...prev, l3Id: null }));
    }
  }, [filter.viewMode, filter.l2Id, filter.l3Id, l3Channels, l2Hubs]);

  const handleViewModeChange = useCallback(
    (viewMode: VirtualWarehouseViewMode) => {
      if (viewMode === 'main') {
        setFilter({ viewMode: 'main', l2Id: null, l3Id: null });
        return;
      }

      // 切換至通路模式時不自動選取通路分組，待使用者選擇後再依是否有 L3 決定是否顯示銷售通路
      setFilter({ viewMode: 'channel', l2Id: null, l3Id: null });
    },
    [],
  );

  const handleL2Change = useCallback(
    (l2Id: string | undefined) => {
      if (!l2Id) {
        setFilter((prev) => ({ ...prev, viewMode: 'channel', l2Id: null, l3Id: null }));
        return;
      }

      setFilter((prev) => ({
        ...prev,
        viewMode: 'channel',
        l2Id,
        l3Id: null,
      }));
    },
    [],
  );

  const handleL3Change = useCallback((l3Id: string) => {
    setFilter((prev) => ({ ...prev, viewMode: 'channel', l3Id }));
  }, []);

  const resetFilter = useCallback(() => {
    setFilter({ ...DEFAULT_FILTER_STATE });
  }, []);

  return {
    filter,
    l2Options,
    l3Options,
    handleViewModeChange,
    handleL2Change,
    handleL3Change,
    resetFilter,
  };
}
