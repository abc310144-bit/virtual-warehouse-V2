import type {
  AcceptanceRuleFormValues,
  AcceptanceRuleSettings,
} from '../types/virtualWarehouse';
import { EMPTY_ACCEPTANCE_FORM } from '../types/virtualWarehouse';

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
