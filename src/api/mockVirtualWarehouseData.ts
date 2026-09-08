import { buildHierarchyFromSeed } from '../data/hierarchySeed';
import type { L2Hub, L3Channel } from '../types/virtualWarehouse';

const { l2Hubs, l3Channels } = buildHierarchyFromSeed();

/** 初始 mock：L2 中介虛擬倉（來源：業務對照表） */
export const INITIAL_L2_HUBS: L2Hub[] = l2Hubs;

/** 初始 mock：L3 銷售通路 */
export const INITIAL_L3_CHANNELS: L3Channel[] = l3Channels;

/** 模擬：尚有未完結訂單、不可刪除的 L2 */
export const L2_HUBS_WITH_PENDING_ORDERS = new Set<string>(['l2-002', 'l2-005']);

export function l2HubHasPendingOrders(id: string): boolean {
  return L2_HUBS_WITH_PENDING_ORDERS.has(id);
}
