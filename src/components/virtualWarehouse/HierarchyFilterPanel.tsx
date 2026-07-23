import { Radio, Select } from 'antd';
import type { HierarchyFilterState, L2HubListItem, L3Channel, VirtualWarehouseViewMode } from '../../types/virtualWarehouse';
import type { L2DropdownOption, L3DropdownOption } from '../../hooks/useL2L3CascadeFilter';
import { shouldShowL3SalesChannelFilter } from '../../hooks/useL2L3CascadeFilter';
import './HierarchyFilterPanel.css';

export interface HierarchyFilterPanelProps {
  filter: HierarchyFilterState;
  l2Hubs: L2HubListItem[];
  l2Options: L2DropdownOption[];
  l3Options: L3DropdownOption[];
  l3Channels: L3Channel[];
  onViewModeChange: (viewMode: VirtualWarehouseViewMode) => void;
  onL2Change: (l2Id: string | undefined) => void;
  onL3Change: (l3Id: string) => void;
}

/**
 * 虛擬倉篩選（嵌入篩選面板：SKU 與商品名稱之間）
 */
export function HierarchyFilterPanel({
  filter,
  l2Hubs,
  l2Options,
  l3Options,
  l3Channels,
  onViewModeChange,
  onL2Change,
  onL3Change,
}: HierarchyFilterPanelProps) {
  const isChannelMode = filter.viewMode === 'channel';
  const showL3Dropdown = shouldShowL3SalesChannelFilter(filter, l3Channels, l2Hubs);

  return (
    <div className="filter-field col-12 hierarchy-filter-panel hierarchy-filter-panel--embedded">
      <span className="filter-label">虛擬倉</span>
      <div className="hierarchy-filter-panel__controls">
        <Radio.Group
          className="hierarchy-filter-panel__mode"
          value={filter.viewMode}
          onChange={(e) => onViewModeChange(e.target.value)}
        >
          <Radio value="main">總倉</Radio>
          <Radio value="channel">通路</Radio>
        </Radio.Group>

        {isChannelMode && (
          <div className="hierarchy-filter-panel__channel-fields">
            <div className="hierarchy-filter-panel__field">
              <span className="hierarchy-filter-panel__label">通路分組</span>
              <Select
                className="hierarchy-filter-panel__select"
                value={filter.l2Id ?? undefined}
                options={l2Options}
                onChange={onL2Change}
                placeholder="請選擇通路分組"
                allowClear
              />
            </div>

            {showL3Dropdown && (
              <div className="hierarchy-filter-panel__field">
                <span className="hierarchy-filter-panel__label">銷售通路</span>
                <Select
                  className="hierarchy-filter-panel__select"
                  value={filter.l3Id ?? undefined}
                  options={l3Options}
                  onChange={onL3Change}
                  placeholder="請選擇銷售通路"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
