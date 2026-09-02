import { useMemo, useState } from 'react';
import { Button, Modal, Space, Table } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { L2HubListItem, L3Channel, SaveL2HubFormValues } from '../../types/virtualWarehouse';
import { L2HubFormDrawer } from './L2HubFormDrawer';
import { formatAcceptanceSummary } from '../../utils/acceptanceRule';
import './L2HubManagementModal.css';

export interface L2HubManagementModalProps {
  open: boolean;
  l2Hubs: L2HubListItem[];
  l3Channels: L3Channel[];
  loading: boolean;
  onClose: () => void;
  onSave: (values: SaveL2HubFormValues, editingId?: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  detectL3TransferConflicts: (
    selectedL3Ids: string[],
    editingL2Id?: string,
  ) => import('../../types/virtualWarehouse').L3TransferConflict[];
}

/**
 * 通路分組設定彈窗
 */
export function L2HubManagementModal({
  open,
  l2Hubs,
  l3Channels,
  loading,
  onClose,
  onSave,
  onDelete,
  detectL3TransferConflicts,
}: L2HubManagementModalProps) {
  const [formDrawerOpen, setFormDrawerOpen] = useState(false);
  const [editingHub, setEditingHub] = useState<L2HubListItem | null>(null);

  const existingNames = useMemo(() => l2Hubs.map((h) => h.name), [l2Hubs]);

  const handleAdd = () => {
    setEditingHub(null);
    setFormDrawerOpen(true);
  };

  const handleEdit = (record: L2HubListItem) => {
    setEditingHub(record);
    setFormDrawerOpen(true);
  };

  const handleDelete = (record: L2HubListItem) => {
    if (record.is_ungrouped) {
      Modal.warning({
        title: '無法刪除',
        content: '「未分組通路」為系統預設，不可刪除。若要將銷售通路改掛其他分組，請先從此分組刪除該通路。',
      });
      return;
    }
    Modal.confirm({
      title: '確認刪除通路分組',
      content: `確定要刪除「${record.name}」嗎？所屬銷售通路將移至「未分組通路」。並且釋放所有商品至總倉`,
      okText: '確認刪除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        const ok = await onDelete(record.id);
        if (ok && editingHub?.id === record.id) {
          setFormDrawerOpen(false);
          setEditingHub(null);
        }
      },
    });
  };

  const handleFormSubmit = async (values: SaveL2HubFormValues) => {
    const ok = await onSave(values, editingHub?.id);
    if (ok) {
      setFormDrawerOpen(false);
      setEditingHub(null);
    }
  };

  const sortedHubs = useMemo(() => {
    const normal = l2Hubs.filter((hub) => !hub.is_ungrouped);
    const ungrouped = l2Hubs.filter((hub) => hub.is_ungrouped);
    return [...normal, ...ungrouped];
  }, [l2Hubs]);

  const columns: ColumnsType<L2HubListItem> = [
    {
      title: '通路分組名稱',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      render: (name: string, record) =>
        record.is_ungrouped ? `${name}（系統）` : name,
    },
    {
      title: '銷售通路數',
      dataIndex: 'l3_channel_count',
      key: 'l3_channel_count',
      width: 100,
      align: 'center',
    },
    {
      title: '允收（國內）',
      key: 'acceptance_domestic',
      width: 140,
      ellipsis: true,
      render: (_, record) =>
        record.is_ungrouped ? '-' : formatAcceptanceSummary(record.acceptance_domestic),
    },
    {
      title: '允收（國外）',
      key: 'acceptance_foreign',
      width: 140,
      ellipsis: true,
      render: (_, record) =>
        record.is_ungrouped ? '-' : formatAcceptanceSummary(record.acceptance_foreign),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      align: 'center',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            編輯
          </Button>
          {!record.is_ungrouped && (
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
            >
              刪除
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <Modal
        title="通路分組設定"
        open={open}
        onCancel={onClose}
        footer={null}
        width={1080}
        destroyOnClose
        className="l2-hub-management-modal"
      >
        <div className="l2-hub-management-modal__toolbar">
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增通路分組
          </Button>
        </div>

        <Table
          rowKey="id"
          columns={columns}
          dataSource={sortedHubs}
          loading={loading}
          pagination={false}
          size="small"
          scroll={{ y: 400 }}
        />

        <p className="l2-hub-management-modal__hint">
          總倉為實體庫存來源，不可在此編輯。一個銷售通路同一時間僅能歸屬一個通路分組。
        </p>
      </Modal>

      <L2HubFormDrawer
        open={formDrawerOpen}
        editingHub={editingHub}
        l3Channels={l3Channels}
        existingNames={existingNames}
        onClose={() => {
          setFormDrawerOpen(false);
          setEditingHub(null);
        }}
        onSubmit={handleFormSubmit}
        detectL3TransferConflicts={detectL3TransferConflicts}
      />
    </>
  );
}
