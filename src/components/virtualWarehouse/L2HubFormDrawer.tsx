import { useEffect } from 'react';
import {
  Drawer,
  Button,
  Form,
  Input,
  Modal,
  Space,
} from 'antd';
import type { FormInstance } from 'antd';
import type { L2HubListItem, L3Channel, SaveL2HubFormValues } from '../../types/virtualWarehouse';
import { EMPTY_ACCEPTANCE_FORM } from '../../types/virtualWarehouse';
import { buildL3TransferConfirmContent } from '../../hooks/useL2HubManagement';
import type { L3TransferConflict } from '../../types/virtualWarehouse';
import { AcceptanceRuleFields, toFormAcceptance } from './AcceptanceRuleFields';
import { SalesChannelPicker } from './SalesChannelPicker';
import { getMissingAcceptanceScopeLabels } from '../../utils/acceptanceRule';

export interface L2HubFormDrawerProps {
  open: boolean;
  editingHub: L2HubListItem | null;
  l3Channels: L3Channel[];
  existingNames: string[];
  onClose: () => void;
  onSubmit: (values: SaveL2HubFormValues) => Promise<void>;
  detectL3TransferConflicts: (selectedL3Ids: string[], editingL2Id?: string) => L3TransferConflict[];
}

async function confirmMissingAcceptance(values: SaveL2HubFormValues): Promise<boolean> {
  const missing = getMissingAcceptanceScopeLabels(values);
  if (missing.length === 0) return true;
  return new Promise((resolve) => {
    Modal.confirm({
      title: '允收天數未設定',
      content: (
        <div style={{ whiteSpace: 'pre-line' }}>
          {`目前尚未設定${missing.join('、')}的允收天數。`}
          {'\n\n'}
          商品若超過允收，商品不會自動回到總倉。
          {'\n\n'}
          是否仍要儲存？
        </div>
      ),
      okText: '仍要儲存',
      cancelText: '返回修改',
      onOk: () => resolve(true),
      onCancel: () => resolve(false),
    });
  });
}

async function confirmL3Transfers(conflicts: L3TransferConflict[]): Promise<boolean> {
  if (conflicts.length === 0) return true;
  return new Promise((resolve) => {
    Modal.confirm({
      title: '銷售通路轉移確認',
      content: (
        <div style={{ whiteSpace: 'pre-line' }}>
          {buildL3TransferConfirmContent(conflicts)}
          {'\n'}是否確認？
        </div>
      ),
      okText: '確認轉移',
      cancelText: '取消',
      onOk: () => resolve(true),
      onCancel: () => resolve(false),
    });
  });
}

/** 新增 / 編輯通路分組表單 Drawer */
export function L2HubFormDrawer({
  open,
  editingHub,
  l3Channels,
  existingNames,
  onClose,
  onSubmit,
  detectL3TransferConflicts,
}: L2HubFormDrawerProps) {
  const [form] = Form.useForm<SaveL2HubFormValues>();
  const isEditing = Boolean(editingHub);

  useEffect(() => {
    if (!open) return;
    if (editingHub) {
      const boundIds = l3Channels
        .filter((c) => c.l2_hub_id === editingHub.id)
        .map((c) => c.id);
      form.setFieldsValue({
        name: editingHub.name,
        l3_channel_ids: boundIds,
        acceptance_domestic: toFormAcceptance(editingHub.acceptance_domestic),
        acceptance_foreign: toFormAcceptance(editingHub.acceptance_foreign),
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        l3_channel_ids: [],
        acceptance_domestic: { ...EMPTY_ACCEPTANCE_FORM },
        acceptance_foreign: { ...EMPTY_ACCEPTANCE_FORM },
      });
    }
  }, [open, editingHub, l3Channels, form]);

  const handleFinish = async (values: SaveL2HubFormValues) => {
    const acceptanceConfirmed = await confirmMissingAcceptance(values);
    if (!acceptanceConfirmed) return;

    const l3Ids = values.l3_channel_ids ?? [];
    const conflicts = detectL3TransferConflicts(l3Ids, editingHub?.id);
    const confirmed = await confirmL3Transfers(conflicts);
    if (!confirmed) return;
    await onSubmit(values);
  };

  return (
    <Drawer
      title={isEditing ? '編輯通路分組' : '新增通路分組'}
      width={560}
      open={open}
      onClose={onClose}
      destroyOnClose
      className="l2-hub-form-drawer"
      footer={
        <Space style={{ float: 'right' }}>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" onClick={() => form.submit()}>
            儲存
          </Button>
        </Space>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        requiredMark
      >
        <Form.Item
          name="name"
          label="通路分組名稱"
          rules={[
            { required: true, whitespace: true, message: '請輸入通路分組名稱' },
            {
              validator: async (_, value: string) => {
                const trimmed = value?.trim();
                if (!trimmed) return;
                const duplicate = existingNames.some(
                  (n) => n === trimmed && n !== editingHub?.name,
                );
                if (duplicate) throw new Error('名稱不可與其他通路分組重複');
              },
            },
          ]}
        >
          <Input placeholder="例如：線上2C" maxLength={50} showCount />
        </Form.Item>

        <div className="l2-hub-form-drawer__section-title">允收天數</div>
        <AcceptanceRuleFields title="國內商品" prefix="acceptance_domestic" />
        <AcceptanceRuleFields title="國外商品" prefix="acceptance_foreign" />

        <Form.Item
          name="l3_channel_ids"
          label="銷售通路"
          rules={[
            {
              required: true,
              type: 'array',
              min: 1,
              message: '請至少選擇一個銷售通路',
            },
          ]}
        >
          <SalesChannelPicker l3Channels={l3Channels} editingHubId={editingHub?.id ?? null} />
        </Form.Item>
      </Form>
    </Drawer>
  );
}

export type { FormInstance };
