import {
  INITIAL_L2_HUBS,
  INITIAL_L3_CHANNELS,
  L2_HUBS_WITH_INVENTORY,
  L2_HUBS_WITH_PENDING_ORDERS,
} from './mockVirtualWarehouseData';
import type {
  ApiResponse,
  CreateL2HubPayload,
  L2Hub,
  L2HubDetail,
  L2HubListItem,
  L3AcceptanceRulePayload,
  L3Channel,
  UpdateL2HubPayload,
} from '../types/virtualWarehouse';
import {
  L2_UNGROUPED_HUB_ID,
  L2_UNGROUPED_HUB_NAME,
  L2HubErrorCode,
} from '../types/virtualWarehouse';

const L2_STORE_KEY = 'vw-mock-l2-hubs';
const L3_STORE_KEY = 'vw-mock-l3-channels';
const MOCK_STORE_VERSION_KEY = 'vw-mock-store-version';
const MOCK_STORE_VERSION = '2026-09-02-ungrouped-hub';

function loadMockStore<T>(key: string, initial: T): T {
  if (typeof localStorage === 'undefined') return structuredClone(initial);
  if (localStorage.getItem(MOCK_STORE_VERSION_KEY) !== MOCK_STORE_VERSION) {
    localStorage.removeItem(L2_STORE_KEY);
    localStorage.removeItem(L3_STORE_KEY);
    localStorage.setItem(MOCK_STORE_VERSION_KEY, MOCK_STORE_VERSION);
  }
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    // ignore corrupted cache
  }
  return structuredClone(initial);
}

function persistMockStores(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(L2_STORE_KEY, JSON.stringify(l2HubsStore));
  localStorage.setItem(L3_STORE_KEY, JSON.stringify(l3ChannelsStore));
}

/** 記憶體 mock store（開發用，正式環境替換為 HTTP client） */
let l2HubsStore: L2Hub[] = loadMockStore(L2_STORE_KEY, INITIAL_L2_HUBS);
let l3ChannelsStore: L3Channel[] = loadMockStore(L3_STORE_KEY, INITIAL_L3_CHANNELS);

const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

function countL3ByHub(hubId: string): number {
  return l3ChannelsStore.filter((c) => c.l2_hub_id === hubId).length;
}

function toListItem(hub: L2Hub): L2HubListItem {
  return { ...hub, l3_channel_count: countL3ByHub(hub.id) };
}

function isUngroupedHub(hub: Pick<L2Hub, 'id' | 'is_ungrouped'> | undefined): boolean {
  return Boolean(hub?.is_ungrouped || hub?.id === L2_UNGROUPED_HUB_ID);
}

function ensureUngroupedHub(): L2Hub {
  const existing = l2HubsStore.find((hub) => isUngroupedHub(hub));
  if (existing) {
    if (!existing.is_ungrouped || existing.name !== L2_UNGROUPED_HUB_NAME) {
      const fixed: L2Hub = {
        ...existing,
        id: L2_UNGROUPED_HUB_ID,
        name: L2_UNGROUPED_HUB_NAME,
        is_ungrouped: true,
        acceptance_domestic: undefined,
        acceptance_foreign: undefined,
        status: 'active',
      };
      l2HubsStore = l2HubsStore.map((hub) => (hub.id === existing.id ? fixed : hub));
      return fixed;
    }
    return existing;
  }
  const created: L2Hub = {
    id: L2_UNGROUPED_HUB_ID,
    name: L2_UNGROUPED_HUB_NAME,
    is_ungrouped: true,
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
  };
  l2HubsStore = [...l2HubsStore, created];
  return created;
}

/**
 * 綁定／解除 L3：
 * - 從一般 L2 移除 → 移入「未分組通路」
 * - 從「未分組通路」移除 → 解除歸屬（null，可再加入其他 L2）
 */
function bindL3Channels(
  hubId: string,
  channelIds: string[],
  l3AcceptanceRules: L3AcceptanceRulePayload[] = [],
): { movedToUngroupedCount: number } {
  const ungrouped = ensureUngroupedHub();
  const editingUngrouped = hubId === ungrouped.id;
  const ruleByChannelId = new Map(
    l3AcceptanceRules.map((rule) => [rule.l3_channel_id, rule]),
  );
  let movedToUngroupedCount = 0;

  l3ChannelsStore = l3ChannelsStore.map((channel) => {
    if (channelIds.includes(channel.id)) {
      const rule = ruleByChannelId.get(channel.id);
      return {
        ...channel,
        l2_hub_id: hubId,
        acceptance_domestic: editingUngrouped ? undefined : rule?.acceptance_domestic,
        acceptance_foreign: editingUngrouped ? undefined : rule?.acceptance_foreign,
      };
    }
    if (channel.l2_hub_id === hubId && !channelIds.includes(channel.id)) {
      if (editingUngrouped) {
        return {
          ...channel,
          l2_hub_id: null,
          acceptance_domestic: undefined,
          acceptance_foreign: undefined,
        };
      }
      movedToUngroupedCount += 1;
      return {
        ...channel,
        l2_hub_id: ungrouped.id,
        acceptance_domestic: undefined,
        acceptance_foreign: undefined,
      };
    }
    return channel;
  });

  return { movedToUngroupedCount };
}

ensureUngroupedHub();

export const virtualWarehouseApi = {
  /** GET /api/virtual-warehouse/l2-hubs */
  async fetchL2Hubs(): Promise<L2HubListItem[]> {
    await delay();
    ensureUngroupedHub();
    return l2HubsStore.map(toListItem);
  },

  /** GET /api/virtual-warehouse/l3-channels */
  async fetchL3Channels(): Promise<L3Channel[]> {
    await delay();
    return structuredClone(l3ChannelsStore);
  },

  /** GET /api/virtual-warehouse/l2-hubs/:id */
  async fetchL2HubDetail(id: string): Promise<ApiResponse<L2HubDetail>> {
    await delay();
    const hub = l2HubsStore.find((h) => h.id === id);
    if (!hub) {
      return {
        success: false,
        error: { code: L2HubErrorCode.NOT_FOUND, message: '找不到通路分組' },
      };
    }
    return {
      success: true,
      data: {
        ...hub,
        l3_channels: l3ChannelsStore.filter((c) => c.l2_hub_id === id),
      },
    };
  },

  /** POST /api/virtual-warehouse/l2-hubs */
  async createL2Hub(payload: CreateL2HubPayload): Promise<ApiResponse<L2HubListItem>> {
    await delay();
    const trimmed = payload.name.trim();
    if (trimmed === L2_UNGROUPED_HUB_NAME) {
      return {
        success: false,
        error: {
          code: L2HubErrorCode.SYSTEM_HUB_PROTECTED,
          message: '「未分組通路」為系統預設，不可新增同名分組',
        },
      };
    }
    if (l2HubsStore.some((h) => h.name === trimmed)) {
      return {
        success: false,
        error: { code: L2HubErrorCode.DUPLICATE_NAME, message: '通路分組名稱不可重複' },
      };
    }
    const newHub: L2Hub = {
      id: `l2-${Date.now()}`,
      name: trimmed,
      acceptance_domestic: payload.acceptance_domestic,
      acceptance_foreign: payload.acceptance_foreign,
      status: payload.status ?? 'active',
      created_at: new Date().toISOString(),
    };
    l2HubsStore = [...l2HubsStore, newHub];
    bindL3Channels(newHub.id, payload.l3_channel_ids ?? [], payload.l3_acceptance_rules ?? []);
    persistMockStores();
    return { success: true, data: toListItem(newHub) };
  },

  /** PUT /api/virtual-warehouse/l2-hubs/:id */
  async updateL2Hub(
    payload: UpdateL2HubPayload,
  ): Promise<ApiResponse<L2HubListItem & { movedToUngroupedCount?: number }>> {
    await delay();
    const idx = l2HubsStore.findIndex((h) => h.id === payload.id);
    if (idx === -1) {
      return {
        success: false,
        error: { code: L2HubErrorCode.NOT_FOUND, message: '找不到通路分組' },
      };
    }
    const current = l2HubsStore[idx];
    const editingUngrouped = isUngroupedHub(current);
    const trimmed = editingUngrouped ? L2_UNGROUPED_HUB_NAME : payload.name.trim();
    if (!editingUngrouped && trimmed === L2_UNGROUPED_HUB_NAME) {
      return {
        success: false,
        error: {
          code: L2HubErrorCode.SYSTEM_HUB_PROTECTED,
          message: '不可將通路分組改名為「未分組通路」',
        },
      };
    }
    if (l2HubsStore.some((h) => h.name === trimmed && h.id !== payload.id)) {
      return {
        success: false,
        error: { code: L2HubErrorCode.DUPLICATE_NAME, message: '通路分組名稱不可重複' },
      };
    }
    const updated: L2Hub = {
      ...current,
      name: trimmed,
      acceptance_domestic: editingUngrouped ? undefined : payload.acceptance_domestic,
      acceptance_foreign: editingUngrouped ? undefined : payload.acceptance_foreign,
      status: payload.status ?? current.status,
      updated_at: new Date().toISOString(),
      is_ungrouped: editingUngrouped ? true : current.is_ungrouped,
    };
    l2HubsStore = l2HubsStore.map((h) => (h.id === payload.id ? updated : h));
    const { movedToUngroupedCount } = bindL3Channels(
      payload.id,
      payload.l3_channel_ids ?? [],
      editingUngrouped ? [] : payload.l3_acceptance_rules ?? [],
    );
    persistMockStores();
    return { success: true, data: { ...toListItem(updated), movedToUngroupedCount } };
  },

  /** DELETE /api/virtual-warehouse/l2-hubs/:id */
  async deleteL2Hub(id: string): Promise<ApiResponse<null>> {
    await delay();
    const hub = l2HubsStore.find((h) => h.id === id);
    if (!hub) {
      return {
        success: false,
        error: { code: L2HubErrorCode.NOT_FOUND, message: '找不到通路分組' },
      };
    }
    if (isUngroupedHub(hub)) {
      return {
        success: false,
        error: {
          code: L2HubErrorCode.SYSTEM_HUB_PROTECTED,
          message: '「未分組通路」為系統預設，不可刪除',
        },
      };
    }
    if (L2_HUBS_WITH_INVENTORY.has(id)) {
      return {
        success: false,
        error: {
          code: L2HubErrorCode.HAS_INVENTORY,
          message: '此通路分組尚有剩餘庫存，無法刪除',
        },
      };
    }
    if (L2_HUBS_WITH_PENDING_ORDERS.has(id)) {
      return {
        success: false,
        error: {
          code: L2HubErrorCode.HAS_PENDING_ORDERS,
          message: '此通路分組尚有未完結訂單，無法刪除',
        },
      };
    }
    const ungrouped = ensureUngroupedHub();
    l3ChannelsStore = l3ChannelsStore.map((c) =>
      c.l2_hub_id === id
        ? {
            ...c,
            l2_hub_id: ungrouped.id,
            acceptance_domestic: undefined,
            acceptance_foreign: undefined,
          }
        : c,
    );
    l2HubsStore = l2HubsStore.filter((h) => h.id !== id);
    persistMockStores();
    return { success: true, data: null };
  },

  /** 開發用：重置 mock 資料 */
  resetMockData(): void {
    l2HubsStore = structuredClone(INITIAL_L2_HUBS);
    l3ChannelsStore = structuredClone(INITIAL_L3_CHANNELS);
    ensureUngroupedHub();
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(L2_STORE_KEY);
      localStorage.removeItem(L3_STORE_KEY);
    }
  },
};
