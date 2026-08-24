import type {
  AcceptanceRuleFormValues,
  AcceptanceRuleSettings,
  L3AcceptanceRuleFormRow,
  L3AcceptanceRulePayload,
  L3Channel,
} from '../types/virtualWarehouse';
import {
  EMPTY_ACCEPTANCE_FORM,
  createEmptyL3AcceptanceFormRow,
} from '../types/virtualWarehouse';

export function getByPath(obj: unknown, path: Array<string | number>): unknown {
  return path.reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== 'object') return undefined;
    return (acc as Record<string | number, unknown>)[key];
  }, obj);
}

/** 儲存前正規化允收規範 */
export function normalizeAcceptanceSettings(
  form?: AcceptanceRuleFormValues,
): AcceptanceRuleSettings | undefined {
  if (!form) return undefined;

  if (form.use_tier_ratio) {
    const tier_0_30 = form.tier_0_30?.trim() || undefined;
    const tier_31_90 = form.tier_31_90?.trim() || undefined;
    const tier_91_365 = form.tier_91_365?.trim() || undefined;
    const tier_366_plus = form.tier_366_plus?.trim() || undefined;
    if (!tier_0_30 && !tier_31_90 && !tier_91_365 && !tier_366_plus) return undefined;
    return {
      use_tier_ratio: true,
      tier_0_30,
      tier_31_90,
      tier_91_365,
      tier_366_plus,
    };
  }

  const flat_value = form.flat_value?.trim() || undefined;
  if (!flat_value) return undefined;
  return { use_tier_ratio: false, flat_value };
}

/** 是否已設定允收天數（非必填，但儲存前可警示） */
export function isAcceptanceConfigured(form?: AcceptanceRuleFormValues): boolean {
  return normalizeAcceptanceSettings(form) !== undefined;
}

export function getMissingAcceptanceScopeLabels(values: {
  acceptance_domestic?: AcceptanceRuleFormValues;
  acceptance_foreign?: AcceptanceRuleFormValues;
}): string[] {
  const missing: string[] = [];
  if (!isAcceptanceConfigured(values.acceptance_domestic)) missing.push('國內商品');
  if (!isAcceptanceConfigured(values.acceptance_foreign)) missing.push('國外商品');
  return missing;
}

/** 列表摘要 */
export function formatAcceptanceSummary(settings?: AcceptanceRuleSettings): string {
  if (!settings) return '-';
  if (settings.use_tier_ratio) {
    const parts = [
      settings.tier_0_30,
      settings.tier_31_90,
      settings.tier_91_365,
      settings.tier_366_plus,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join('｜') : '-';
  }
  return settings.flat_value || '-';
}

/** 表單用：後端資料 → 可編輯欄位 */
export function toFormAcceptance(
  settings?: AcceptanceRuleSettings,
): AcceptanceRuleFormValues {
  if (!settings) return { ...EMPTY_ACCEPTANCE_FORM };

  if (settings.use_tier_ratio) {
    return {
      use_tier_ratio: true,
      flat_value: '',
      tier_0_30: settings.tier_0_30 ?? '',
      tier_31_90: settings.tier_31_90 ?? '',
      tier_91_365: settings.tier_91_365 ?? '',
      tier_366_plus: settings.tier_366_plus ?? '',
    };
  }

  return {
    use_tier_ratio: false,
    flat_value: settings.flat_value ?? '',
    tier_0_30: '',
    tier_31_90: '',
    tier_91_365: '',
    tier_366_plus: '',
  };
}

export function channelHasL3AcceptanceOverride(channel: L3Channel): boolean {
  return Boolean(channel.acceptance_domestic || channel.acceptance_foreign);
}

export function toL3AcceptanceFormRows(channels: L3Channel[]): L3AcceptanceRuleFormRow[] {
  const rows = channels
    .filter(channelHasL3AcceptanceOverride)
    .map((channel) => ({
      _rowKey: channel.id,
      l3_channel_id: channel.id,
      acceptance_domestic: toFormAcceptance(channel.acceptance_domestic),
      acceptance_foreign: toFormAcceptance(channel.acceptance_foreign),
    }));
  return rows.length > 0 ? rows : [createEmptyL3AcceptanceFormRow()];
}

export function normalizeL3AcceptanceRules(
  enabled: boolean | undefined,
  rows: L3AcceptanceRuleFormRow[] | undefined,
  selectedL3Ids: string[],
): L3AcceptanceRulePayload[] {
  if (!enabled) return [];
  const selected = new Set(selectedL3Ids);
  const seen = new Set<string>();
  const result: L3AcceptanceRulePayload[] = [];

  for (const row of rows ?? []) {
    const id = row.l3_channel_id;
    if (!id || !selected.has(id) || seen.has(id)) continue;
    const acceptance_domestic = normalizeAcceptanceSettings(row.acceptance_domestic);
    const acceptance_foreign = normalizeAcceptanceSettings(row.acceptance_foreign);
    if (!acceptance_domestic && !acceptance_foreign) continue;
    seen.add(id);
    result.push({ l3_channel_id: id, acceptance_domestic, acceptance_foreign });
  }

  return result;
}
