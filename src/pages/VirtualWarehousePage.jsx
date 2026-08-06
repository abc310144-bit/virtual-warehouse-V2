import { useEffect, useMemo, useState } from 'react';
import { Button, DatePicker, Input, Select, Table, message } from 'antd';
import {
  CaretDownFilled,
  DownloadOutlined,
  FilterOutlined,
  SettingOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { AllocationModal } from '../components/virtualWarehouse/AllocationModal';
import { BulkAllocationModal } from '../components/virtualWarehouse/BulkAllocationModal';
import { HierarchyFilterPanel } from '../components/virtualWarehouse/HierarchyFilterPanel';
import { L2HubManagementModal } from '../components/virtualWarehouse/L2HubManagementModal';
import { useL2L3CascadeFilter } from '../hooks/useL2L3CascadeFilter';
import { useL2HubManagement } from '../hooks/useL2HubManagement';
import { exportWarehouseTableCsv } from '../utils/exportWarehouseTableCsv';
import { filterWarehouseTableData } from '../utils/filterWarehouseTableData';
import { WAREHOUSE_PRODUCT_MOCK } from '../data/warehouseProductSeed';
import './VirtualWarehousePage.css';

const { RangePicker } = DatePicker;

/** demo：品牌篩選選項 */
const BRAND_OPTIONS = [
  { value: '英國 Crude', label: '英國 Crude' },
  { value: 'FreezedryReunion凍物團圓', label: 'FreezedryReunion凍物團圓' },
  { value: 'Roots Foods', label: 'Roots Foods' },
  { value: 'Agnesi', label: 'Agnesi' },
  { value: '詠恩生技', label: '詠恩生技' },
  { value: '澳洲Ozganics', label: '澳洲Ozganics' },
  { value: '英國Higher Living', label: '英國Higher Living' },
];

const L3_BREAKDOWN_COLUMNS = [
  { title: '銷售通路', dataIndex: 'l3Name', width: 160 },
  { title: '商品名稱', dataIndex: 'productName', ellipsis: true },
  { title: '效期_批號', dataIndex: 'expiryBatch', width: 150 },
  {
    title: '當前可配數',
    dataIndex: 'allocatableQty',
    width: 120,
    align: 'center',
  },
];

function VirtualWarehousePage() {
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [expandedRowKeys, setExpandedRowKeys] = useState([]);
  const [pageSize, setPageSize] = useState(20);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bulkAllocationOpen, setBulkAllocationOpen] = useState(false);
  const [allocationProduct, setAllocationProduct] = useState(null);
  const [brandFilter, setBrandFilter] = useState(undefined);

  const {
    l2Hubs,
    l3Channels,
    loading: hubLoading,
    saveL2Hub,
    deleteL2Hub,
    detectL3TransferConflicts,
  } = useL2HubManagement();

  const {
    filter,
    l2Options,
    l3Options,
    handleViewModeChange,
    handleL2Change,
    handleL3Change,
    resetFilter,
  } = useL2L3CascadeFilter({
    l2Hubs,
    l3Channels,
  });

  const tableData = useMemo(
    () => filterWarehouseTableData(WAREHOUSE_PRODUCT_MOCK, filter),
    [filter],
  );

  const canExpandL3 =
    filter.viewMode === 'channel' && Boolean(filter.l2Id) && !filter.l3Id;

  useEffect(() => {
    setExpandedRowKeys([]);
    setSelectedRowKeys([]);
  }, [filter.viewMode, filter.l2Id, filter.l3Id]);

  const selectedRows = useMemo(
    () => tableData.filter((row) => selectedRowKeys.includes(row.key)),
    [tableData, selectedRowKeys],
  );

  const expandable = useMemo(() => {
    if (!canExpandL3) return undefined;

    return {
      expandedRowKeys,
      onExpand: (expanded, record) => {
        setExpandedRowKeys(expanded ? [record.key] : []);
      },
      expandIconColumnIndex: 1,
      columnWidth: 36,
      expandIcon: ({ expanded, onExpand, record }) => (
        <CaretDownFilled
          className={`l2-expand-icon${expanded ? ' l2-expand-icon--open' : ''}`}
          onClick={(event) => onExpand(record, event)}
        />
      ),
      expandedRowRender: (record) => {
        const breakdown = record.l3Breakdown ?? [];
        if (breakdown.length === 0) {
          return (
            <div className="l3-breakdown-panel">
              <div className="l3-breakdown-empty">銷售通路並無分配數量</div>
            </div>
          );
        }
        return (
          <div className="l3-breakdown-panel">
            <Table
              className="l3-breakdown-table"
              rowKey="key"
              columns={L3_BREAKDOWN_COLUMNS}
              dataSource={breakdown}
              pagination={false}
              size="small"
            />
          </div>
        );
      },
    };
  }, [canExpandL3, expandedRowKeys]);

  const handleExportCsv = () => {
    const result = exportWarehouseTableCsv({
      rows: tableData,
      filter,
      l2Hubs,
      l3Channels,
    });
    if (!result.success) {
      message.warning(result.message);
      return;
    }
    message.success(`已匯出 ${result.count} 筆資料`);
  };

  const columns = useMemo(() => {
    const qtyColumns = [
      ...(filter.viewMode === 'channel'
        ? [
            {
              title: '總倉當前可配數',
              dataIndex: 'mainAllocatableQty',
              width: 130,
              align: 'center',
            },
          ]
        : []),
      {
        title: '當前可分配數',
        dataIndex: 'allocatableQty',
        width: 120,
        align: 'center',
      },
      {
        title: '實際倉庫數量',
        dataIndex: 'actualQty',
        width: 120,
        align: 'center',
        sorter: (a, b) => a.actualQty - b.actualQty,
      },
    ];

    return [
      { title: 'SKU', dataIndex: 'sku', width: 140 },
      { title: '商品名稱', dataIndex: 'productName', width: 200, ellipsis: true },
      {
        title: '效期_批號',
        dataIndex: 'expiryBatch',
        width: 150,
        sorter: (a, b) => String(a.expiryBatch).localeCompare(String(b.expiryBatch), 'zh-Hant'),
      },
      ...qtyColumns,
      {
        title: '',
        key: 'action',
        width: 64,
        align: 'center',
        render: (_, record) => (
          <a className="action-link" onClick={() => setAllocationProduct(record)}>
            配貨
          </a>
        ),
      },
    ];
  }, [filter.viewMode]);

  return (
    <div className="virtual-warehouse-page">
      <div className="page-actions">
        <Button type="primary" icon={<UploadOutlined />}>
          匯入配貨單
        </Button>
        <Button type="primary" icon={<DownloadOutlined />} onClick={handleExportCsv}>
          匯出
        </Button>
        <Button type="primary" icon={<SettingOutlined />} onClick={() => setSettingsOpen(true)}>
          通路分組設定
        </Button>
        <Button icon={<FilterOutlined />}>篩選</Button>
      </div>

      <div className="filter-panel">
        <div className="filter-grid">
          <label className="filter-field col-6">
            <span className="filter-label">SKU</span>
            <Input placeholder="輸入 SKU" />
          </label>

          <HierarchyFilterPanel
            filter={filter}
            l2Hubs={l2Hubs}
            l2Options={l2Options}
            l3Options={l3Options}
            l3Channels={l3Channels}
            onViewModeChange={handleViewModeChange}
            onL2Change={handleL2Change}
            onL3Change={handleL3Change}
          />

          <label className="filter-field col-6">
            <span className="filter-label">商品名稱</span>
            <Input />
          </label>

          <label className="filter-field col-6">
            <span className="filter-label">品牌</span>
            <Select
              allowClear
              showSearch
              placeholder="請選擇品牌"
              value={brandFilter}
              options={BRAND_OPTIONS}
              onChange={setBrandFilter}
              optionFilterProp="label"
              filterOption={(input, option) =>
                String(option?.label ?? '')
                  .toLowerCase()
                  .includes(input.trim().toLowerCase())
              }
            />
          </label>

          <label className="filter-field col-6">
            <span className="filter-label">效期</span>
            <RangePicker placeholder={['開始日期', '結束日期']} />
          </label>
          <label className="filter-field col-6">
            <span className="filter-label">批次</span>
            <Input />
          </label>
          <div className="filter-actions col-12">
            <Button
              onClick={() => {
                resetFilter();
                setBrandFilter(undefined);
              }}
            >
              清除篩選條件
            </Button>
            <Button type="primary">搜尋</Button>
          </div>
        </div>
      </div>

      <div className="table-toolbar">
        <div className="table-toolbar-left">
          <Button
            type="primary"
            disabled={selectedRowKeys.length === 0}
            onClick={() => setBulkAllocationOpen(true)}
          >
            批量配貨
          </Button>
          <Button onClick={() => setSelectedRowKeys([])}>清除選擇</Button>
        </div>
        <div className="table-toolbar-right">
          總共 {tableData.length} 筆，每頁顯示
          <Select
            value={pageSize}
            onChange={setPageSize}
            className="page-size-select"
            options={[
              { value: 20, label: '20' },
              { value: 50, label: '50' },
              { value: 100, label: '100' },
            ]}
          />
          筆
        </div>
      </div>

      <Table
        rowSelection={{
          columnWidth: 48,
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
        expandable={expandable}
        columns={columns}
        dataSource={tableData}
        pagination={false}
        size="small"
        className="warehouse-table"
      />

      <AllocationModal
        open={allocationProduct != null}
        product={allocationProduct}
        filter={filter}
        l2Hubs={l2Hubs}
        l3Channels={l3Channels}
        onClose={() => setAllocationProduct(null)}
        onConfirm={() => message.success('配貨已提交')}
      />

      <BulkAllocationModal
        open={bulkAllocationOpen}
        selectedRows={selectedRows}
        filter={filter}
        l2Hubs={l2Hubs}
        l3Channels={l3Channels}
        onClose={() => setBulkAllocationOpen(false)}
        onConfirm={() => {
          message.success('批量配貨已提交');
          setSelectedRowKeys([]);
        }}
      />

      <L2HubManagementModal
        open={settingsOpen}
        l2Hubs={l2Hubs}
        l3Channels={l3Channels}
        loading={hubLoading}
        onClose={() => setSettingsOpen(false)}
        onSave={saveL2Hub}
        onDelete={deleteL2Hub}
        detectL3TransferConflicts={detectL3TransferConflicts}
      />
    </div>
  );
}

export default VirtualWarehousePage;
