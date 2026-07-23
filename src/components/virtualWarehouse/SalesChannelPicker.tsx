import { useMemo, useState } from 'react';
import { Button, Select, Tooltip } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import {
  PARTNER_CHANNEL_CATALOG,
  getPartnerTypeByKey,
} from '../../data/partnerChannelCatalog';
import type { L3Channel } from '../../types/virtualWarehouse';
import './SalesChannelPicker.css';

export interface SalesChannelPickerProps {
  value?: string[];
  onChange?: (value: string[]) => void;
  l3Channels: L3Channel[];
  editingHubId?: string | null;
}

function isChannelTakenByOtherHub(
  channel: L3Channel,
  editingHubId?: string | null,
): boolean {
  return channel.l2_hub_id != null && channel.l2_hub_id !== editingHubId;
}

function buildOptionLabel(channel: L3Channel, editingHubId?: string | null): string {
  if (isChannelTakenByOtherHub(channel, editingHubId)) {
    return `${channel.name}（已歸屬其他通路分組）`;
  }
  return channel.name;
}

function isChannelSelectable(
  channel: L3Channel,
  editingHubId?: string | null,
): boolean {
  return !isChannelTakenByOtherHub(channel, editingHubId);
}

/** 兩層銷售通路選擇：合作通路類型 → 通路名稱 */
export function SalesChannelPicker({
  value = [],
  onChange,
  l3Channels,
  editingHubId,
}: SalesChannelPickerProps) {
  const [partnerTypeKey, setPartnerTypeKey] = useState(PARTNER_CHANNEL_CATALOG[0]?.key ?? '');

  const availableChannels = useMemo(
    () =>
      l3Channels.filter(
        (channel) => channel.status === 'active' || channel.l2_hub_id === editingHubId,
      ),
    [l3Channels, editingHubId],
  );

  const nameToChannel = useMemo(() => {
    const map = new Map<string, L3Channel>();
    availableChannels.forEach((channel) => map.set(channel.name, channel));
    return map;
  }, [availableChannels]);

  const partnerTypeOptions = useMemo(
    () =>
      PARTNER_CHANNEL_CATALOG.map((type) => ({
        value: type.key,
        label: type.label,
      })),
    [],
  );

  const currentType = getPartnerTypeByKey(partnerTypeKey);
  const currentTypeChannelIds = useMemo(() => {
    if (!currentType) return [];
    return currentType.channels
      .map((name) => nameToChannel.get(name)?.id)
      .filter((id): id is string => Boolean(id));
  }, [currentType, nameToChannel]);

  const nameOptions = useMemo(() => {
    if (!currentType) return [];
    return currentType.channels
      .map((name) => nameToChannel.get(name))
      .filter((channel): channel is L3Channel => Boolean(channel))
      .map((channel) => ({
        value: channel.id,
        label: buildOptionLabel(channel, editingHubId),
        disabled: isChannelTakenByOtherHub(channel, editingHubId),
      }));
  }, [currentType, nameToChannel, editingHubId]);

  const currentTypeSelectedCount = currentTypeChannelIds.filter((id) => value.includes(id)).length;

  const handleSelectAllForType = (typeKey: string) => {
    const type = getPartnerTypeByKey(typeKey);
    if (!type) return;
    const idsToAdd = type.channels
      .map((name) => nameToChannel.get(name))
      .filter((channel): channel is L3Channel => Boolean(channel))
      .filter((channel) => isChannelSelectable(channel, editingHubId))
      .map((channel) => channel.id);
    onChange?.([...new Set([...value, ...idsToAdd])]);
  };

  const handleNameChange = (nextIds: string[]) => {
    const otherTypeIds = value.filter((id) => !currentTypeChannelIds.includes(id));
    onChange?.([...otherTypeIds, ...nextIds]);
  };

  const selectedInCurrentType = value.filter((id) => currentTypeChannelIds.includes(id));

  return (
    <div className="sales-channel-picker">
      <div className="sales-channel-picker__field">
        <div className="sales-channel-picker__label">合作通路類型</div>
        <Select
          className="sales-channel-picker__type-select"
          value={partnerTypeKey || undefined}
          options={partnerTypeOptions}
          onChange={setPartnerTypeKey}
        />
      </div>

      <div className="sales-channel-picker__field">
        <div className="sales-channel-picker__name-header">
          <div className="sales-channel-picker__label">通路名稱</div>
          <div className="sales-channel-picker__name-actions">
            <Button
              type="link"
              size="small"
              className="sales-channel-picker__select-all"
              disabled={!currentType || currentType.channels.length === 0}
              onClick={() => handleSelectAllForType(partnerTypeKey)}
            >
              全選
            </Button>
            <Tooltip title="全部刪除">
              <Button
                type="text"
                icon={<DeleteOutlined />}
                className="sales-channel-picker__clear-all"
                disabled={value.length === 0}
                onClick={() => onChange?.([])}
              />
            </Tooltip>
          </div>
        </div>
        <Select
          mode="multiple"
          allowClear
          className="sales-channel-picker__name-select"
          placeholder={
            currentType && currentType.channels.length === 0
              ? '此類型尚無通路'
              : '選擇通路名稱（一個銷售通路僅能歸屬一個通路分組）'
          }
          value={selectedInCurrentType}
          options={nameOptions}
          onChange={handleNameChange}
          optionFilterProp="label"
          disabled={!currentType || currentType.channels.length === 0}
        />
      </div>

      <div className="sales-channel-picker__summary">
        已選擇 {value.length} 個銷售通路
        {currentType && currentType.channels.length > 0 && (
          <span className="sales-channel-picker__summary-sub">
            （{currentType.label}：{currentTypeSelectedCount}/{currentType.channels.length}）
          </span>
        )}
      </div>
    </div>
  );
}
