import { Button, Form, Modal, Radio, Select } from 'antd';
import { MinusOutlined, PlusOutlined } from '@ant-design/icons';
import type { L3AcceptanceRuleFormRow, L3Channel } from '../../types/virtualWarehouse';
import { createEmptyL3AcceptanceFormRow } from '../../types/virtualWarehouse';
import { AcceptanceRuleFields } from './AcceptanceRuleFields';
import './L3AcceptanceRuleList.css';

export interface L3AcceptanceRuleListProps {
  l3Channels: L3Channel[];
}

function toRowArray(
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

/** L3 通路允收覆寫：選是才展開，列可增刪，已選通路不可重複，取消勾選則下拉反灰 */
export function L3AcceptanceRuleList({ l3Channels }: L3AcceptanceRuleListProps) {
  const form = Form.useFormInstance();
  const enabled = Form.useWatch('enable_l3_acceptance', form) === true;
  const selectedIds: string[] = Form.useWatch('l3_channel_ids', form) ?? [];
  const watchedRows = Form.useWatch('l3_acceptance_rules', form);
  const idToName = new Map(l3Channels.map((channel) => [channel.id, channel.name]));

  const handleEnableChange = (value: boolean) => {
    if (!value) return;
    if (toRowArray(form.getFieldValue('l3_acceptance_rules')).length === 0) {
      form.setFieldsValue({ l3_acceptance_rules: [createEmptyL3AcceptanceFormRow()] });
    }
  };

  const handleRemoveRow = (fieldName: number, totalCount: number, remove: (name: number) => void) => {
    if (totalCount > 1) {
      remove(fieldName);
      return;
    }

    Modal.confirm({
      title: '若刪除此設定，銷售通路將無任何允收限制設定',
      okText: '確定',
      cancelText: '取消',
      onOk: () => {
        remove(fieldName);
        form.setFieldsValue({ enable_l3_acceptance: false });
      },
    });
  };

  return (
    <div className="l3-acceptance-rule-list">
      <div className="l2-hub-form-drawer__section-title">是否設定銷售通路允收限制</div>
      <Form.Item name="enable_l3_acceptance" className="l3-acceptance-rule-list__toggle">
        <Radio.Group onChange={(event) => handleEnableChange(event.target.value === true)}>
          <Radio value={true}>是</Radio>
          <Radio value={false}>否</Radio>
        </Radio.Group>
      </Form.Item>

      <Form.List name="l3_acceptance_rules">
        {(fields, { add, remove }) =>
          enabled
            ? fields.map((field, index) => {
                const currentId = toRowArray(watchedRows)[index]?.l3_channel_id;
                const isOrphan = Boolean(currentId && !selectedIds.includes(currentId));
                const takenIds = new Set(
                  toRowArray(watchedRows)
                    .map((item, itemIndex) => (itemIndex === index ? undefined : item.l3_channel_id))
                    .filter((id): id is string => Boolean(id)),
                );
                const optionMap = new Map<string, { value: string; label: string; disabled: boolean }>();
                if (currentId && !selectedIds.includes(currentId)) {
                  optionMap.set(currentId, {
                    value: currentId,
                    label: idToName.get(currentId) ?? currentId,
                    disabled: true,
                  });
                }
                selectedIds.forEach((id) => {
                  optionMap.set(id, {
                    value: id,
                    label: idToName.get(id) ?? id,
                    disabled: takenIds.has(id),
                  });
                });

                return (
                  <div className="l3-acceptance-rule-row" key={field.key}>
                    <div className="l3-acceptance-rule-row__header">
                      <Form.Item
                        name={[field.name, 'l3_channel_id']}
                        className="l3-acceptance-rule-row__channel"
                      >
                        <Select
                          allowClear
                          placeholder="選擇銷售通路"
                          options={[...optionMap.values()]}
                          disabled={isOrphan}
                          optionFilterProp="label"
                          showSearch
                        />
                      </Form.Item>
                      <div className="l3-acceptance-rule-row__actions">
                        <Button
                          type="text"
                          htmlType="button"
                          icon={<PlusOutlined />}
                          onClick={() => add(createEmptyL3AcceptanceFormRow())}
                          aria-label="新增銷售通路允收"
                        />
                        <Button
                          type="text"
                          htmlType="button"
                          icon={<MinusOutlined />}
                          onClick={() => handleRemoveRow(field.name, fields.length, remove)}
                          aria-label="刪除此列允收"
                        />
                      </div>
                    </div>

                    <AcceptanceRuleFields
                      title="國內商品"
                      namePath={[field.name, 'acceptance_domestic']}
                      watchPath={['l3_acceptance_rules', field.name, 'acceptance_domestic']}
                    />
                    <AcceptanceRuleFields
                      title="國外商品"
                      namePath={[field.name, 'acceptance_foreign']}
                      watchPath={['l3_acceptance_rules', field.name, 'acceptance_foreign']}
                    />
                  </div>
                );
              })
            : null
        }
      </Form.List>
    </div>
  );
}
