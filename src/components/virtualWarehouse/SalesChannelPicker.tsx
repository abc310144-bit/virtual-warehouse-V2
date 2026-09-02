import { useEffect, useMemo, useState } from 'react';
import { Button, Checkbox, Form, Modal, Select, Tag, Tooltip } from 'antd';
import { CloseOutlined, DeleteOutlined, ExclamationCircleFilled } from '@ant-design/icons';
import {
  PARTNER_CHANNEL_CATALOG,
  getPartnerTypeByKey,
} from '../../data/partnerChannelCatalog';
import type { L3AcceptanceRuleFormRow, L3Channel } from '../../types/virtualWarehouse';
import { createEmptyL3AcceptanceFormRow } from '../../types/virtualWarehouse';
import './SalesChannelPicker.css';

export interface SalesChannelPickerProps {
  value?: string[];
  onChange?: (value: string[]) => void;
  l3Channels: L3Channel[];
  editingHubId?: string | null;
  /** 配回目標名稱（通常為目前通路分組名稱） */
  hubName?: string;
}

const L3_REMOVE_DISMISS_KEY = 'vw-dismiss-l3-remove-confirm-date-v1';

function getTodayKey(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function isL3RemoveConfirmDismissedToday(): boolean {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(L3_REMOVE_DISMISS_KEY) === getTodayKey();
}

function setL3RemoveConfirmDismissedToday(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(L3_REMOVE_DISMISS_KEY, getTodayKey());
}

function toAcceptanceRowArray(
  rows?: L3AcceptanceRuleFormRow[] | Record<string, L3AcceptanceRuleFormRow>,
): L3AcceptanceRuleFormRow[] {
  if (Array.isArray(rows)) return rows;
  if (rows && typeof rows === 'object') {
    return Object.keys(rows)
      .sort((a, b) => Number(a) - Number(b))
      .map((key) => (rows as Record<string, L3AcceptanceRuleFormRow>)[key])
      .filter(Boolean);
  }
  return [];
}

function isChannelTakenByOtherHub(
  channel: L3Channel,
  editingHubId?: string | null,
): boolean {
  return channel.l2_hub_id != null && channel.l2_hub_id !== editingHubId;
}

function isChannelSelectable(
  channel: L3Channel,
  editingHubId?: string | null,
): boolean {
  return !isChannelTakenByOtherHub(channel, editingHubId);
}

function findPartnerTypeKeyByChannelName(channelName: string): string | undefined {
  return PARTNER_CHANNEL_CATALOG.find((type) => type.channels.includes(channelName))?.key;
}

function confirmRemoveSalesChannels(hubName: string): Promise<boolean> {
  if (isL3RemoveConfirmDismissedToday()) {
    return Promise.resolve(true);
  }

  let dontRemindToday = false;
  return new Promise((resolve) => {
    Modal.confirm({
      title: '確認刪除銷售通路',
      icon: <ExclamationCircleFilled />,
      content: (
        <div className="sales-channel-picker__remove-confirm">
          <div>刪除銷售通路，將自動刪除該銷售通路的允收限制設定</div>
          <div>{`且，該銷售通路所有商品將自動配回「${hubName}」`}</div>
          <Checkbox
            className="sales-channel-picker__remove-confirm-check"
            onChange={(event) => {
              dontRemindToday = event.target.checked;
            }}
          >
            今日不再提醒
          </Checkbox>
        </div>
      ),
      okText: '確定',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        if (dontRemindToday) setL3RemoveConfirmDismissedToday();
        resolve(true);
      },
      onCancel: () => resolve(false),
    });
  });
}

/** 兩層銷售通路選擇：合作通路類型 → 通路名稱（複選）→ 已選擇清單 */
export function SalesChannelPicker({
  value = [],
  onChange,
  l3Channels,
  editingHubId,
  hubName = '此通路分組',
}: SalesChannelPickerProps) {
  const form = Form.useFormInstance();
  const [partnerTypeKey, setPartnerTypeKey] = useState<string | undefined>(undefined);

  const availableChannels = useMemo(
    () =>
      l3Channels.filter(
        (channel) => channel.status === 'active' || channel.l2_hub_id === editingHubId,
      ),
    [l3Channels, editingHubId],
  );

  const idToChannel = useMemo(() => {
    const map = new Map<string, L3Channel>();
    availableChannels.forEach((channel) => map.set(channel.id, channel));
    return map;
  }, [availableChannels]);

  const nameToChannel = useMemo(() => {
    const map = new Map<string, L3Channel>();
    availableChannels.forEach((channel) => map.set(channel.name, channel));
    return map;
  }, [availableChannels]);

  // 編輯帶入已選通路時，自動切到第一個有選取項目的合作通路類型
  const selectedIdsKey = value.join(',');
  useEffect(() => {
    if (!editingHubId || value.length === 0) return;
    if (partnerTypeKey) return;
    const first = idToChannel.get(value[0]);
    if (!first) return;
    const typeKey = findPartnerTypeKeyByChannelName(first.name);
    if (typeKey) setPartnerTypeKey(typeKey);
  }, [editingHubId, selectedIdsKey, idToChannel, value, partnerTypeKey]);

  const partnerTypeOptions = useMemo(
    () =>
      PARTNER_CHANNEL_CATALOG.map((type) => ({
        value: type.key,
        label: type.label,
      })),
    [],
  );

  const currentType = partnerTypeKey ? getPartnerTypeByKey(partnerTypeKey) : undefined;
  const currentTypeChannelIds = useMemo(() => {
    if (!currentType) return [];
    return currentType.channels
      .map((name) => nameToChannel.get(name)?.id)
      .filter((id): id is string => Boolean(id));
  }, [currentType, nameToChannel]);

  const currentTypeChannelIdSet = useMemo(
    () => new Set(currentTypeChannelIds),
    [currentTypeChannelIds],
  );

  /** 下拉只顯示目前類型；已選／已被其他分組佔用者反灰 */
  const nameOptions = useMemo(() => {
    if (!currentType) return [];
    return currentType.channels
      .map((name) => nameToChannel.get(name))
      .filter((channel): channel is L3Channel => Boolean(channel))
      .map((channel) => {
        const takenByOther = isChannelTakenByOtherHub(channel, editingHubId);
        const alreadySelected = value.includes(channel.id);
        return {
          value: channel.id,
          label: takenByOther
            ? `${channel.name}（已歸屬其他通路分組）`
            : alreadySelected
              ? `${channel.name}（已選擇）`
              : channel.name,
          disabled: takenByOther || alreadySelected,
        };
      });
  }, [currentType, nameToChannel, editingHubId, value]);

  const selectedChannels = useMemo(
    () =>
      value
        .map((id) => idToChannel.get(id))
        .filter((channel): channel is L3Channel => Boolean(channel)),
    [value, idToChannel],
  );

  const syncAcceptanceRulesAfterRemove = (removedIds: string[]) => {
    if (removedIds.length === 0) return;

    const removedSet = new Set(removedIds);
    const currentRules = toAcceptanceRowArray(form.getFieldValue('l3_acceptance_rules'));
    const removedAnyConfigured = currentRules.some(
      (row) => Boolean(row.l3_channel_id) && removedSet.has(row.l3_channel_id as string),
    );
    if (!removedAnyConfigured) return;

    const nextRules = currentRules.filter(
      (row) => !row.l3_channel_id || !removedSet.has(row.l3_channel_id),
    );
    const hasConfiguredRule = nextRules.some((row) => Boolean(row.l3_channel_id));

    if (!hasConfiguredRule) {
      form.setFieldsValue({
        enable_l3_acceptance: false,
        l3_acceptance_rules: [createEmptyL3AcceptanceFormRow()],
      });
      return;
    }

    form.setFieldsValue({ l3_acceptance_rules: nextRules });
  };

  const applyChange = async (nextIds: string[]) => {
    const removedIds = value.filter((id) => !nextIds.includes(id));
    if (removedIds.length === 0) {
      onChange?.(nextIds);
      return;
    }

    const removedBoundIds = removedIds.filter((id) => {
      const channel = idToChannel.get(id);
      return Boolean(editingHubId && channel?.l2_hub_id === editingHubId);
    });

    const enableL3Acceptance = form.getFieldValue('enable_l3_acceptance') === true;
    const acceptanceRules = toAcceptanceRowArray(form.getFieldValue('l3_acceptance_rules'));
    const removedWithAcceptanceIds = enableL3Acceptance
      ? removedIds.filter((id) => acceptanceRules.some((row) => row.l3_channel_id === id))
      : [];

    if (removedBoundIds.length > 0 || removedWithAcceptanceIds.length > 0) {
      const confirmed = await confirmRemoveSalesChannels(hubName);
      if (!confirmed) return;
    }

    onChange?.(nextIds);
    syncAcceptanceRulesAfterRemove(removedIds);
  };

  /** 從下拉新增一筆（已選項目在選單中反灰，不可再選） */
  const handlePickChannel = (channelId: string | undefined) => {
    if (!channelId || value.includes(channelId)) return;
    void applyChange([...value, channelId]);
  };

  const handleSelectAllForType = () => {
    if (!currentType) return;
    const idsToAdd = currentType.channels
      .map((name) => nameToChannel.get(name))
      .filter((channel): channel is L3Channel => Boolean(channel))
      .filter((channel) => isChannelSelectable(channel, editingHubId))
      .map((channel) => channel.id);
    const keptFromOtherTypes = value.filter((id) => !currentTypeChannelIdSet.has(id));
    void applyChange([...new Set([...keptFromOtherTypes, ...idsToAdd])]);
  };

  const handleRemoveSelected = (channelId: string) => {
    void applyChange(value.filter((id) => id !== channelId));
  };

  return (
    <div className="sales-channel-picker">
      <div className="sales-channel-picker__field">
        <div className="sales-channel-picker__label">合作通路類型</div>
        <Select
          className="sales-channel-picker__type-select"
          value={partnerTypeKey}
          options={partnerTypeOptions}
          placeholder="請選擇合作通路類型"
          onChange={(key) => setPartnerTypeKey(key)}
          allowClear
          onClear={() => setPartnerTypeKey(undefined)}
        />
      </div>

      {currentType && (
        <div className="sales-channel-picker__field sales-channel-picker__field--expand">
          <div className="sales-channel-picker__name-header">
            <div className="sales-channel-picker__label">通路名稱</div>
            <Button
              type="link"
              size="small"
              className="sales-channel-picker__select-all"
              disabled={currentType.channels.length === 0 || nameOptions.length === 0}
              onClick={handleSelectAllForType}
            >
              全選
            </Button>
          </div>
          <Select
            allowClear
            className="sales-channel-picker__name-select"
            placeholder={
              nameOptions.length === 0
                ? '此類型尚無通路'
                : '請選擇通路名稱（一個銷售通路僅能歸屬一個通路分組）'
            }
            value={undefined}
            options={nameOptions}
            onChange={handlePickChannel}
            optionFilterProp="label"
            disabled={nameOptions.length === 0}
            showSearch
          />
        </div>
      )}

      <div className="sales-channel-picker__selected">
        <div className="sales-channel-picker__selected-header">
          <div className="sales-channel-picker__label">
            已選擇
            <span className="sales-channel-picker__selected-count">（{value.length}）</span>
          </div>
          <Tooltip title="全部刪除">
            <Button
              type="text"
              icon={<DeleteOutlined />}
              className="sales-channel-picker__clear-all"
              disabled={value.length === 0}
              onClick={() => {
                void applyChange([]);
              }}
            />
          </Tooltip>
        </div>
        {selectedChannels.length === 0 ? (
          <div className="sales-channel-picker__selected-empty">尚未選擇銷售通路</div>
        ) : (
          <div className="sales-channel-picker__selected-list">
            {selectedChannels.map((channel) => (
              <Tag
                key={channel.id}
                className="sales-channel-picker__selected-tag"
                closable
                closeIcon={<CloseOutlined />}
                onClose={(event) => {
                  event.preventDefault();
                  handleRemoveSelected(channel.id);
                }}
              >
                {channel.name}
              </Tag>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
