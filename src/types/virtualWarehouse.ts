/** L1 總倉固定 ID（實體庫存來源，不可修改） */
export const L1_MAIN_WAREHOUSE_ID = 'L1_MAIN' as const;

/** 篩選「全部」哨兵值 */
export const FILTER_ALL = 'ALL' as const;

export type FilterAllValue = typeof FILTER_ALL;
export type L2FilterValue = FilterAllValue | typeof L1_MAIN_WAREHOUSE_ID | string;
export type L3FilterValue = FilterAllValue | string;

export type EntityStatus = 'active' | 'inactive';

/** 效期允收規範設定 */
export interface AcceptanceRuleSettings {
  /** 是否啟用總效期分級比例（0-30 / 31-90 / 91-365 / 366+） */
  use_tier_ratio: boolean;
  /** 未啟用分級時的單一允收值，如 2/3、N、< 30天 */
  flat_value?: string;
  tier_0_30?: string;
  tier_31_90?: string;
  tier_91_365?: string;
  tier_366_plus?: string;
}

/** 表單編輯用允收規範 */
export interface AcceptanceRuleFormValues {
  use_tier_ratio: boolean;
  flat_value: string;
  tier_0_30: string;
  tier_31_90: string;
  tier_91_365: string;
  tier_366_plus: string;
}

/** L2 通路分組 */
export interface L2Hub {
  id: string;
  name: string;
  acceptance_domestic?: AcceptanceRuleSettings;
  acceptance_foreign?: AcceptanceRuleSettings;
  status: EntityStatus;
  created_at: string;
  updated_at?: string;
}

/** L3 銷售通路（同一時間僅能歸屬一個 L2） */
export interface L3Channel {
  id: string;
  name: string;
  /** null 表示尚未綁定任何 L2（仍視為 L1 總倉管轄） */
  l2_hub_id: string | null;
  status: EntityStatus;
  /** 有設定時，該通路商品只吃 L3 允收，不再套用所屬 L2 */
  acceptance_domestic?: AcceptanceRuleSettings;
  acceptance_foreign?: AcceptanceRuleSettings;
}

/** 列表展示用 L2（含 L3 計數） */
export interface L2HubListItem extends L2Hub {
  l3_channel_count: number;
}

export type VirtualWarehouseViewMode = 'main' | 'channel';

/** 頁面頂部虛擬倉篩選狀態 */
export interface HierarchyFilterState {
  viewMode: VirtualWarehouseViewMode;
  l2Id: string | null;
  l3Id: string | null;
}

export const DEFAULT_FILTER_STATE: HierarchyFilterState = {
  viewMode: 'main',
  l2Id: null,
  l3Id: null,
};

// ─── API Request / Response ───────────────────────────────────────────────

/** 單一 L3 通路的允收覆寫（已正規化） */
export interface L3AcceptanceRulePayload {
  l3_channel_id: string;
  acceptance_domestic?: AcceptanceRuleSettings;
  acceptance_foreign?: AcceptanceRuleSettings;
}

export interface CreateL2HubPayload {
  name: string;
  l3_channel_ids: string[];
  acceptance_domestic?: AcceptanceRuleSettings;
  acceptance_foreign?: AcceptanceRuleSettings;
  l3_acceptance_rules?: L3AcceptanceRulePayload[];
  status?: EntityStatus;
}

export interface UpdateL2HubPayload extends CreateL2HubPayload {
  id: string;
}

export interface L2HubDetail extends L2Hub {
  l3_channels: L3Channel[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiErrorBody;
}

export interface ApiErrorBody {
  code: L2HubErrorCode;
  message: string;
}

export enum L2HubErrorCode {
  DUPLICATE_NAME = 'L2_HUB_DUPLICATE_NAME',
  HAS_INVENTORY = 'L2_HUB_HAS_INVENTORY',
  HAS_PENDING_ORDERS = 'L2_HUB_HAS_PENDING_ORDERS',
  NOT_FOUND = 'L2_HUB_NOT_FOUND',
}

export interface L3TransferConflict {
  l3Id: string;
  l3Name: string;
  fromL2Id: string;
  fromL2Name: string;
}

export interface L3AcceptanceRuleFormRow {
  _rowKey: string;
  l3_channel_id?: string;
  acceptance_domestic: AcceptanceRuleFormValues;
  acceptance_foreign: AcceptanceRuleFormValues;
}

export interface SaveL2HubFormValues {
  name: string;
  l3_channel_ids: string[];
  acceptance_domestic?: AcceptanceRuleFormValues;
  acceptance_foreign?: AcceptanceRuleFormValues;
  enable_l3_acceptance?: boolean;
  l3_acceptance_rules?: L3AcceptanceRuleFormRow[];
}

export const EMPTY_ACCEPTANCE_FORM: AcceptanceRuleFormValues = {
  use_tier_ratio: false,
  flat_value: '',
  tier_0_30: '',
  tier_31_90: '',
  tier_91_365: '',
  tier_366_plus: '',
};

export function createEmptyL3AcceptanceFormRow(): L3AcceptanceRuleFormRow {
  return {
    _rowKey: `l3-acc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    l3_channel_id: undefined,
    acceptance_domestic: { ...EMPTY_ACCEPTANCE_FORM },
    acceptance_foreign: { ...EMPTY_ACCEPTANCE_FORM },
  };
}
