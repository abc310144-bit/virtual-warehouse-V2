import { useEffect, useMemo, useState } from 'react';
import { Button, Input, InputNumber, Modal, Select, Space, Table, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { WarehouseProductRow } from '../../data/warehouseProductSeed';
import {
  buildL2GroupOptions,
  buildL3ChannelOptions,
  getActiveL3ByL2,
  shouldShowL3SalesChannelFilter,
} from '../../hooks/useL2L3CascadeFilter';
import type { HierarchyFilterState, L2HubListItem, L3Channel } from '../../types/virtualWarehouse';
import { getSourceChannelLabel } from '../../utils/getSourceChannelLabel';
import './BulkAllocationModal.css';

export interface BulkAllocationModalProps {
  open: boolean;
  selectedRows: WarehouseProductRow[];
  filter: HierarchyFilterState;
  l2Hubs: L2HubListItem[];
  l3Channels: L3Channel[];
  onClose: () => void;
  onConfirm?: () => void;
}

function HeaderWithTip({ title, tip }: { title: string; tip: string }) {
  return (
    <span className="bulk-allocation-modal__header-with-tip">
      {title}
      <Tooltip title={tip}>
        <InfoCircleOutlined className="bulk-allocation-modal__header-tip" />
      </Tooltip>
    </span>
  );
}

function getTargetLocationLabel(
  targetL2Id: string | null,
  targetL3Id: string | null,
  l2Hubs: L2HubListItem[],
  l3Channels: L3Channel[],
): string | null {
  if (!targetL2Id) return null;
  if (targetL3Id) {
    const l3 = l3Channels.find((channel) => channel.id === targetL3Id);
    if (l3) return l3.name;
  }
  return l2Hubs.find((hub) => hub.id === targetL2Id)?.name ?? null;
}

/**
 * 批量配貨彈窗：配貨位置連動邏輯與虛擬倉篩選相同（通路分組 → 有則顯示銷售通路）
 */
export function BulkAllocationModal({
  open,
  selectedRows,
  filter,
  l2Hubs,
  l3Channels,
  onClose,
  onConfirm,
}: BulkAllocationModalProps) {
  const [targetL2Id, setTargetL2Id] = useState<string | null>(null);
  const [targetL3Id, setTargetL3Id] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number | null>>({});
  const [remarks, setRemarks] = useState<Record<string, string>>({});

  const sourceChannelLabel = useMemo(
    () => getSourceChannelLabel(filter, l2Hubs, l3Channels),
    [filter, l2Hubs, l3Channels],
  );

  const l2TargetOptions = useMemo(() => buildL2GroupOptions(l2Hubs), [l2Hubs]);

  const targetFilter = useMemo<HierarchyFilterState>(
    () => ({ viewMode: 'channel', l2Id: targetL2Id, l3Id: targetL3Id }),
    [targetL2Id, targetL3Id],
  );

  const showTargetL3Dropdown = shouldShowL3SalesChannelFilter(targetFilter, l3Channels, l2Hubs);

  const l3TargetOptions = useMemo(() => {
    if (!targetL2Id) return [];
    return buildL3ChannelOptions(getActiveL3ByL2(targetL2Id, l3Channels));
  }, [targetL2Id, l3Channels]);

  const targetLocationLabel = useMemo(
    () => getTargetLocationLabel(targetL2Id, targetL3Id, l2Hubs, l3Channels),
    [targetL2Id, targetL3Id, l2Hubs, l3Channels],
  );

  useEffect(() => {
    if (!open) return;
    setTargetL2Id(null);
    setTargetL3Id(null);
    setQuantities({});
    setRemarks({});
  }, [open]);

  useEffect(() => {
    if (!targetL2Id) {
      if (targetL3Id !== null) setTargetL3Id(null);
      return;
    }
    if (!showTargetL3Dropdown && targetL3Id !== null) {
      setTargetL3Id(null);
      return;
    }
    if (targetL3Id && !l3TargetOptions.some((option) => option.value === targetL3Id)) {
      setTargetL3Id(null);
    }
  }, [targetL2Id, targetL3Id, showTargetL3Dropdown, l3TargetOptions]);

  const handleTargetL2Change = (l2Id: string | undefined) => {
    setTargetL2Id(l2Id ?? null);
    setTargetL3Id(null);
  };

  const handleQtyChange = (rowKey: string, value: number | null) => {
    setQuantities((prev) => ({ ...prev, [rowKey]: value }));
  };

  const handleRemarkChange = (rowKey: string, value: string) => {
    setRemarks((prev) => ({ ...prev, [rowKey]: value }));
  };

  const hasValidTarget = Boolean(targetL2Id);

  const canConfirm = useMemo(() => {
    if (!hasValidTarget || selectedRows.length === 0) return false;
    return selectedRows.every((row) => {
      const qty = quantities[row.key];
      return qty != null && qty > 0 && qty <= row.allocatableQty;
    });
  }, [hasValidTarget, selectedRows, quantities]);

  const handleConfirm = () => {
    onConfirm?.();
    onClose();
  };

  const columns: ColumnsType<WarehouseProductRow> = [
    { title: 'SKU', dataIndex: 'sku', width: 130 },
    { title: '商品名稱', dataIndex: 'productName', ellipsis: true },
    { title: '效期_批號', dataIndex: 'expiryBatch', width: 130 },
    {
      title: '來源通路',
      width: 120,
      render: () => sourceChannelLabel,
    },
    {
      title: '當前可配數',
      dataIndex: 'allocatableQty',
      width: 100,
      align: 'center',
    },
    {
      title: '配貨位置',
      width: 140,
      render: () =>
        targetLocationLabel ? (
          targetLocationLabel
        ) : (
          <span className="bulk-allocation-modal__placeholder">請選擇配貨位置</span>
        ),
    },
    {
      title: '配貨數量',
      width: 110,
      render: (_, row) => (
        <InputNumber
          className="bulk-allocation-modal__qty-input"
          min={1}
          max={row.allocatableQty || undefined}
          precision={0}
          placeholder=""
          value={quantities[row.key] ?? null}
          disabled={!hasValidTarget || row.allocatableQty <= 0}
          onChange={(value) => handleQtyChange(row.key, value)}
        />
      ),
    },
    {
      title: (
        <HeaderWithTip
          title="配貨前可分配數"
          tip="配貨至目標通路分組前，該商品於目標位置的可分配數量"
        />
      ),
      width: 130,
      align: 'center',
      render: () => 0,
    },
    {
      title: (
        <HeaderWithTip
          title="配貨後可分配數"
          tip="配貨完成後，該商品於目標位置的可分配數量"
        />
      ),
      width: 130,
      align: 'center',
      render: (_, row) => quantities[row.key] ?? 0,
    },
    {
      title: '備註',
      width: 140,
      render: (_, row) => (
        <Input
          value={remarks[row.key] ?? ''}
          allowClear
          placeholder="選填"
          onChange={(e) => handleRemarkChange(row.key, e.target.value)}
        />
      ),
    },
  ];

  return (
    <Modal
      title="批量配貨"
      open={open}
      onCancel={onClose}
      width={1200}
      destroyOnClose
      footer={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" disabled={!canConfirm} onClick={handleConfirm}>
            確認
          </Button>
        </Space>
      }
    >
      <div className="bulk-allocation-modal__location">
        <span className="bulk-allocation-modal__location-label">配貨位置</span>
        <div className="bulk-allocation-modal__location-fields">
          <div className="bulk-allocation-modal__location-field">
            <span className="bulk-allocation-modal__field-label">通路分組</span>
            <Select
              className="bulk-allocation-modal__location-select"
              value={targetL2Id ?? undefined}
              options={l2TargetOptions}
              onChange={handleTargetL2Change}
              placeholder="請選擇通路分組"
              allowClear
            />
          </div>
          {showTargetL3Dropdown && (
            <div className="bulk-allocation-modal__location-field">
              <span className="bulk-allocation-modal__field-label">銷售通路</span>
              <Select
                className="bulk-allocation-modal__location-select"
                value={targetL3Id ?? undefined}
                options={l3TargetOptions}
                onChange={setTargetL3Id}
                placeholder="請選擇銷售通路"
                allowClear
              />
            </div>
          )}
        </div>
      </div>

      <div className="bulk-allocation-modal__section-title">當前選擇資料</div>
      <Table
        rowKey="key"
        columns={columns}
        dataSource={selectedRows}
        pagination={false}
        size="small"
        scroll={{ x: 1120 }}
      />
    </Modal>
  );
}
