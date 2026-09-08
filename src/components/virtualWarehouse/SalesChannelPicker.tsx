import { useEffect, useMemo, useState } from 'react';
import { Button, Form, Select, Tag, Tooltip } from 'antd';
import { CheckOutlined, CloseOutlined, DeleteOutlined } from '@ant-design/icons';
import {
  PARTNER_CHANNEL_CATALOG,
  getPartnerTypeByKey,
} from '../../data/partnerChannelCatalog';
import type { L3AcceptanceRuleFormRow, L3Channel } from '../../types/virtualWarehouse';
import { createEmptyL3AcceptanceFormRow } from '../../types/virtualWarehouse';
import {
  hasAnyL3RemainingProducts,
  warnMustReturnStockBeforeDelete,
} from '../../utils/remainingWarehouseStock';
import './SalesChannelPicker.css';

export interface SalesChannelPickerProps {
  value?: string[];
  onChange?: (value: string[]) => void;
  l3Channels: L3Channel[];
  editingHubId?: string | null;
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

/** 兩層銷售通路選擇：合作通路類型 → 通路名稱（打勾複選）→ 已選擇清單 */
export function SalesChannelPicker({
  value = [],
  onChange,
  l3Channels,
  editingHubId,
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

  const currentTypeSelectedIds = useMemo(
    () => value.filter((id) => currentTypeChannelIdSet.has(id)),
    [value, currentTypeChannelIdSet],
  );

  /** 下拉只顯示目前類型；已被其他分組佔用者反灰；已選以打勾顯示 */
  const nameOptions = useMemo(() => {
    if (!currentType) return [];
    return currentType.channels
      .map((name) => nameToChannel.get(name))
      .filter((channel): channel is L3Channel => Boolean(channel))
      .map((channel) => {
        const takenByOther = isChannelTakenByOtherHub(channel, editingHubId);
        return {
          value: channel.id,
          label: takenByOther
            ? `${channel.name}（已歸屬其他通路分組）`
            : channel.name,
          disabled: takenByOther,
        };
      });
  }, [currentType, nameToChannel, editingHubId]);

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

    if (removedBoundIds.length > 0 && hasAnyL3RemainingProducts(removedBoundIds)) {
      warnMustReturnStockBeforeDelete('l3');
      return;
    }

    onChange?.(nextIds);
    syncAcceptanceRulesAfterRemove(removedIds);
  };

  /** 下拉打勾／取消打勾；選單保持開啟，點擊外部才收合 */
  const handleCurrentTypeChange = (selectedInType: string[]) => {
    const keptFromOtherTypes = value.filter((id) => !currentTypeChannelIdSet.has(id));
    void applyChange([...keptFromOtherTypes, ...selectedInType]);
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
            mode="multiple"
            className="sales-channel-picker__name-select"
            placeholder={
              nameOptions.length === 0
                ? '此類型尚無通路'
                : '請選擇通路名稱（一個銷售通路僅能歸屬一個通路分組）'
            }
            value={currentTypeSelectedIds}
            options={nameOptions}
            onChange={handleCurrentTypeChange}
            optionFilterProp="label"
            disabled={nameOptions.length === 0}
            showSearch
            autoClearSearchValue={false}
            maxTagCount={0}
            maxTagPlaceholder={() => null}
            menuItemSelectedIcon={<CheckOutlined />}
            popupClassName="sales-channel-picker__name-dropdown"
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
