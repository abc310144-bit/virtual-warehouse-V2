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
  L3Channel,
  UpdateL2HubPayload,
} from '../types/virtualWarehouse';
import { L2HubErrorCode } from '../types/virtualWarehouse';

const L2_STORE_KEY = 'vw-mock-l2-hubs';
const L3_STORE_KEY = 'vw-mock-l3-channels';
const MOCK_STORE_VERSION_KEY = 'vw-mock-store-version';
const MOCK_STORE_VERSION = '2026-07-22-tw-department';

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

function bindL3Channels(hubId: string, channelIds: string[]): void {
  l3ChannelsStore = l3ChannelsStore.map((channel) => {
    if (channelIds.includes(channel.id)) {
      return { ...channel, l2_hub_id: hubId };
    }
    if (channel.l2_hub_id === hubId && !channelIds.includes(channel.id)) {
      return { ...channel, l2_hub_id: null };
    }
    return channel;
  });
}

export const virtualWarehouseApi = {
  /** GET /api/virtual-warehouse/l2-hubs */
  async fetchL2Hubs(): Promise<L2HubListItem[]> {
    await delay();
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
    bindL3Channels(newHub.id, payload.l3_channel_ids ?? []);
    persistMockStores();
    return { success: true, data: toListItem(newHub) };
  },

  /** PUT /api/virtual-warehouse/l2-hubs/:id */
  async updateL2Hub(payload: UpdateL2HubPayload): Promise<ApiResponse<L2HubListItem>> {
    await delay();
    const idx = l2HubsStore.findIndex((h) => h.id === payload.id);
    if (idx === -1) {
      return {
        success: false,
        error: { code: L2HubErrorCode.NOT_FOUND, message: '找不到通路分組' },
      };
    }
    const trimmed = payload.name.trim();
    if (l2HubsStore.some((h) => h.name === trimmed && h.id !== payload.id)) {
      return {
        success: false,
        error: { code: L2HubErrorCode.DUPLICATE_NAME, message: '通路分組名稱不可重複' },
      };
    }
    const updated: L2Hub = {
      ...l2HubsStore[idx],
      name: trimmed,
      acceptance_domestic: payload.acceptance_domestic,
      acceptance_foreign: payload.acceptance_foreign,
      status: payload.status ?? l2HubsStore[idx].status,
      updated_at: new Date().toISOString(),
    };
    l2HubsStore = l2HubsStore.map((h) => (h.id === payload.id ? updated : h));
    bindL3Channels(payload.id, payload.l3_channel_ids ?? []);
    persistMockStores();
    return { success: true, data: toListItem(updated) };
  },

  /** DELETE /api/virtual-warehouse/l2-hubs/:id */
  async deleteL2Hub(id: string): Promise<ApiResponse<null>> {
    await delay();
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
    l3ChannelsStore = l3ChannelsStore.map((c) =>
      c.l2_hub_id === id ? { ...c, l2_hub_id: null } : c,
    );
    l2HubsStore = l2HubsStore.filter((h) => h.id !== id);
    persistMockStores();
    return { success: true, data: null };
  },

  /** 開發用：重置 mock 資料 */
  resetMockData(): void {
    l2HubsStore = structuredClone(INITIAL_L2_HUBS);
    l3ChannelsStore = structuredClone(INITIAL_L3_CHANNELS);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(L2_STORE_KEY);
      localStorage.removeItem(L3_STORE_KEY);
    }
  },
};
