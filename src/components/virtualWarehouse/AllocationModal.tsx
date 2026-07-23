import { useEffect, useMemo, useState } from 'react';
import { Button, InputNumber, Modal, Select, Space, Table, Tooltip } from 'antd';
import { InfoCircleOutlined, PlusOutlined } from '@ant-design/icons';
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
import './AllocationModal.css';

export interface AllocationModalProps {
  open: boolean;
  product: WarehouseProductRow | null;
  filter: HierarchyFilterState;
  l2Hubs: L2HubListItem[];
  l3Channels: L3Channel[];
  onClose: () => void;
  onConfirm?: () => void;
}

interface AllocationLine {
  id: string;
  l2Id: string | null;
  l3Id: string | null;
  qty: number | null;
}

function HeaderWithTip({ title, tip }: { title: string; tip: string }) {
  return (
    <span className="allocation-modal__header-with-tip">
      {title}
      <Tooltip title={tip}>
        <InfoCircleOutlined className="allocation-modal__header-tip" />
      </Tooltip>
    </span>
  );
}

function createEmptyLine(): AllocationLine {
  return {
    id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    l2Id: null,
    l3Id: null,
    qty: null,
  };
}

function AllocationLocationCell({
  line,
  l2Hubs,
  l3Channels,
  onL2Change,
  onL3Change,
}: {
  line: AllocationLine;
  l2Hubs: L2HubListItem[];
  l3Channels: L3Channel[];
  onL2Change: (l2Id: string | undefined) => void;
  onL3Change: (l3Id: string | undefined) => void;
}) {
  const rowFilter = useMemo<HierarchyFilterState>(
    () => ({ viewMode: 'channel', l2Id: line.l2Id, l3Id: line.l3Id }),
    [line.l2Id, line.l3Id],
  );
  const showL3 = shouldShowL3SalesChannelFilter(rowFilter, l3Channels, l2Hubs);
  const l2Options = useMemo(() => buildL2GroupOptions(l2Hubs), [l2Hubs]);
  const l3Options = useMemo(() => {
    if (!line.l2Id) return [];
    return buildL3ChannelOptions(getActiveL3ByL2(line.l2Id, l3Channels));
  }, [line.l2Id, l3Channels]);

  return (
    <div className="allocation-modal__location-cell">
      <Select
        value={line.l2Id ?? undefined}
        options={l2Options}
        onChange={onL2Change}
        placeholder="請選擇通路分組"
        allowClear
      />
      {showL3 && (
        <Select
          value={line.l3Id ?? undefined}
          options={l3Options}
          onChange={onL3Change}
          placeholder="請選擇銷售通路"
          allowClear
        />
      )}
    </div>
  );
}

/** 單筆配貨彈窗：點擊商品列「配貨」開啟，可多列配至不同通路 */
export function AllocationModal({
  open,
  product,
  filter,
  l2Hubs,
  l3Channels,
  onClose,
  onConfirm,
}: AllocationModalProps) {
  const [lines, setLines] = useState<AllocationLine[]>([createEmptyLine()]);

  const sourceChannelLabel = useMemo(
    () => getSourceChannelLabel(filter, l2Hubs, l3Channels),
    [filter, l2Hubs, l3Channels],
  );

  useEffect(() => {
    if (!open) return;
    setLines([createEmptyLine()]);
  }, [open, product?.key]);

  const updateLine = (lineId: string, patch: Partial<AllocationLine>) => {
    setLines((prev) => prev.map((line) => (line.id === lineId ? { ...line, ...patch } : line)));
  };

  const handleL2Change = (lineId: string, l2Id: string | undefined) => {
    updateLine(lineId, { l2Id: l2Id ?? null, l3Id: null });
  };

  const handleL3Change = (lineId: string, l3Id: string | undefined) => {
    updateLine(lineId, { l3Id: l3Id ?? null });
  };

  const handleQtyChange = (lineId: string, qty: number | null) => {
    updateLine(lineId, { qty });
  };

  const addLine = () => {
    setLines((prev) => [...prev, createEmptyLine()]);
  };

  const maxQty = product?.allocatableQty ?? 0;

  const canConfirm = useMemo(() => {
    if (!product || maxQty <= 0) return false;
    const validLines = lines.filter(
      (line) => line.l2Id && line.qty != null && line.qty > 0 && line.qty <= maxQty,
    );
    if (validLines.length === 0) return false;
    const totalQty = validLines.reduce((sum, line) => sum + (line.qty ?? 0), 0);
    return totalQty <= maxQty;
  }, [product, maxQty, lines]);

  const columns: ColumnsType<AllocationLine> = [
    {
      title: '配貨位置',
      width: 220,
      render: (_, line) => (
        <AllocationLocationCell
          line={line}
          l2Hubs={l2Hubs}
          l3Channels={l3Channels}
          onL2Change={(l2Id) => handleL2Change(line.id, l2Id)}
          onL3Change={(l3Id) => handleL3Change(line.id, l3Id)}
        />
      ),
    },
    {
      title: '配貨數量',
      width: 120,
      render: (_, line) => (
        <InputNumber
          className="allocation-modal__qty-input"
          min={1}
          max={maxQty || undefined}
          precision={0}
          value={line.qty ?? null}
          disabled={!line.l2Id || maxQty <= 0}
          onChange={(value) => handleQtyChange(line.id, value)}
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
      render: (_, line) => line.qty ?? 0,
    },
    {
      title: '',
      width: 48,
      align: 'center',
      render: (_, line, index) =>
        index === lines.length - 1 ? (
          <Button
            type="text"
            icon={<PlusOutlined />}
            className="allocation-modal__add-row"
            onClick={addLine}
          />
        ) : null,
    },
  ];

  return (
    <Modal
      title="配貨"
      open={open}
      onCancel={onClose}
      width={860}
      destroyOnClose
      footer={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button
            type="primary"
            disabled={!canConfirm}
            onClick={() => {
              onConfirm?.();
              onClose();
            }}
          >
            確認
          </Button>
        </Space>
      }
    >
      {product && (
        <>
          <div className="allocation-modal__summary">
            <div className="allocation-modal__summary-item">
              <span className="allocation-modal__summary-label">SKU</span>
              <span className="allocation-modal__summary-value">{product.sku}</span>
            </div>
            <div className="allocation-modal__summary-item">
              <span className="allocation-modal__summary-label">商品名稱</span>
              <span className="allocation-modal__summary-value">{product.productName}</span>
            </div>
            <div className="allocation-modal__summary-item">
              <span className="allocation-modal__summary-label">效期_批號</span>
              <span className="allocation-modal__summary-value">{product.expiryBatch}</span>
            </div>
            <div className="allocation-modal__summary-item">
              <span className="allocation-modal__summary-label">來源通路</span>
              <span className="allocation-modal__summary-value">{sourceChannelLabel}</span>
            </div>
            <div className="allocation-modal__summary-item">
              <span className="allocation-modal__summary-label">當前可分配數</span>
              <span className="allocation-modal__summary-value">{product.allocatableQty}</span>
            </div>
          </div>

          <div className="allocation-modal__section-title">當前選擇資料</div>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={lines}
            pagination={false}
            size="small"
          />
        </>
      )}
    </Modal>
  );
}
