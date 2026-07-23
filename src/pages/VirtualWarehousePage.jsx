import { useMemo, useState } from 'react';
import { Button, DatePicker, Input, Select, Table, message } from 'antd';
import { FilterOutlined, SettingOutlined, UploadOutlined } from '@ant-design/icons';
import { AllocationModal } from '../components/virtualWarehouse/AllocationModal';
import { BulkAllocationModal } from '../components/virtualWarehouse/BulkAllocationModal';
import { HierarchyFilterPanel } from '../components/virtualWarehouse/HierarchyFilterPanel';
import { L2HubManagementModal } from '../components/virtualWarehouse/L2HubManagementModal';
import { useL2L3CascadeFilter } from '../hooks/useL2L3CascadeFilter';
import { useL2HubManagement } from '../hooks/useL2HubManagement';
import { filterWarehouseTableData } from '../utils/filterWarehouseTableData';
import { WAREHOUSE_PRODUCT_MOCK } from '../data/warehouseProductSeed';
import './VirtualWarehousePage.css';

const { RangePicker } = DatePicker;

function VirtualWarehousePage() {
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [pageSize, setPageSize] = useState(20);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bulkAllocationOpen, setBulkAllocationOpen] = useState(false);
  const [allocationProduct, setAllocationProduct] = useState(null);

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
  } = useL2L3CascadeFilter({
    l2Hubs,
    l3Channels,
  });

  const tableData = useMemo(
    () => filterWarehouseTableData(WAREHOUSE_PRODUCT_MOCK, filter),
    [filter],
  );

  const selectedRows = useMemo(
    () => tableData.filter((row) => selectedRowKeys.includes(row.key)),
    [tableData, selectedRowKeys],
  );

  const columns = [
    { title: 'SKU', dataIndex: 'sku', width: 140 },
    { title: '商品名稱', dataIndex: 'productName', ellipsis: true },
    { title: '效期_批次', dataIndex: 'expiryBatch', width: 150 },
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
    },
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

  return (
    <div className="virtual-warehouse-page">
      <div className="page-actions">
        <Button type="primary" icon={<UploadOutlined />}>
          匯入配貨單
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
            <span className="filter-label">效期</span>
            <RangePicker placeholder={['開始日期', '結束日期']} />
          </label>
          <label className="filter-field col-6">
            <span className="filter-label">批次</span>
            <Input />
          </label>
          <div className="filter-actions col-12">
            <Button>清除篩選條件</Button>
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
