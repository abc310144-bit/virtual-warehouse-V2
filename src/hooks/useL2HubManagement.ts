import { useCallback, useEffect, useState } from 'react';
import { message } from 'antd';
import { virtualWarehouseApi } from '../api/virtualWarehouseApi';
import type {
  L2Hub,
  L2HubListItem,
  L3Channel,
  L3TransferConflict,
  SaveL2HubFormValues,
} from '../types/virtualWarehouse';
import { L2HubErrorCode } from '../types/virtualWarehouse';
import { normalizeAcceptanceSettings } from '../utils/acceptanceRule';

interface UseL2HubManagementReturn {
  l2Hubs: L2HubListItem[];
  l3Channels: L3Channel[];
  loading: boolean;
  refresh: () => Promise<void>;
  saveL2Hub: (
    values: SaveL2HubFormValues,
    editingId?: string,
  ) => Promise<boolean>;
  deleteL2Hub: (id: string) => Promise<boolean>;
  detectL3TransferConflicts: (
    selectedL3Ids: string[],
    editingL2Id?: string,
  ) => L3TransferConflict[];
  checkDuplicateName: (name: string, editingId?: string) => boolean;
}

const ERROR_MESSAGES: Record<L2HubErrorCode, string> = {
  [L2HubErrorCode.DUPLICATE_NAME]: '通路分組名稱不可重複',
  [L2HubErrorCode.HAS_INVENTORY]: '此通路分組尚有剩餘庫存，無法刪除',
  [L2HubErrorCode.HAS_PENDING_ORDERS]: '此通路分組尚有未完結訂單，無法刪除',
  [L2HubErrorCode.NOT_FOUND]: '找不到通路分組',
};

export function useL2HubManagement(): UseL2HubManagementReturn {
  const [l2Hubs, setL2Hubs] = useState<L2HubListItem[]>([]);
  const [l3Channels, setL3Channels] = useState<L3Channel[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [hubs, channels] = await Promise.all([
        virtualWarehouseApi.fetchL2Hubs(),
        virtualWarehouseApi.fetchL3Channels(),
      ]);
      setL2Hubs(hubs);
      setL3Channels(channels);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const checkDuplicateName = useCallback(
    (name: string, editingId?: string) => {
      const trimmed = name.trim();
      return l2Hubs.some((h) => h.name === trimmed && h.id !== editingId);
    },
    [l2Hubs],
  );

  const detectL3TransferConflicts = useCallback(
    (selectedL3Ids: string[], editingL2Id?: string): L3TransferConflict[] => {
      return selectedL3Ids.reduce<L3TransferConflict[]>((acc, l3Id) => {
        const channel = l3Channels.find((c) => c.id === l3Id);
        if (!channel?.l2_hub_id || channel.l2_hub_id === editingL2Id) return acc;
        const fromHub = l2Hubs.find((h) => h.id === channel.l2_hub_id);
        if (!fromHub) return acc;
        acc.push({
          l3Id,
          l3Name: channel.name,
          fromL2Id: fromHub.id,
          fromL2Name: fromHub.name,
        });
        return acc;
      }, []);
    },
    [l3Channels, l2Hubs],
  );

  const saveL2Hub = useCallback(
    async (values: SaveL2HubFormValues, editingId?: string): Promise<boolean> => {
      const payload = {
        name: values.name.trim(),
        l3_channel_ids: values.l3_channel_ids ?? [],
        acceptance_domestic: normalizeAcceptanceSettings(values.acceptance_domestic),
        acceptance_foreign: normalizeAcceptanceSettings(values.acceptance_foreign),
        status: 'active',
      };

      const result = editingId
        ? await virtualWarehouseApi.updateL2Hub({ id: editingId, ...payload })
        : await virtualWarehouseApi.createL2Hub(payload);

      if (!result.success) {
        const code = result.error?.code ?? L2HubErrorCode.NOT_FOUND;
        message.error(result.error?.message ?? ERROR_MESSAGES[code]);
        return false;
      }

      message.success(editingId ? '通路分組已更新' : '通路分組已建立');
      await refresh();
      return true;
    },
    [refresh],
  );

  const deleteL2Hub = useCallback(
    async (id: string): Promise<boolean> => {
      const result = await virtualWarehouseApi.deleteL2Hub(id);
      if (!result.success) {
        const code = result.error?.code ?? L2HubErrorCode.NOT_FOUND;
        message.error(result.error?.message ?? ERROR_MESSAGES[code]);
        return false;
      }
      message.success('通路分組已刪除');
      await refresh();
      return true;
    },
    [refresh],
  );

  return {
    l2Hubs,
    l3Channels,
    loading,
    refresh,
    saveL2Hub,
    deleteL2Hub,
    detectL3TransferConflicts,
    checkDuplicateName,
  };
}

/** 組合 L3 轉移確認訊息 */
export function buildL3TransferConfirmContent(conflicts: L3TransferConflict[]): string {
  return conflicts
    .map(
      (c) =>
        `「${c.l3Name}」目前已屬於「${c.fromL2Name}」通路分組，儲存後將自動從「${c.fromL2Name}」移除並轉移至當前通路分組。`,
    )
    .join('\n');
}
