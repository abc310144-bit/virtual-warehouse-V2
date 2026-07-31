import { Form, Input, Radio } from 'antd';
import type { AcceptanceFieldPrefix } from './acceptanceTypes';
import './AcceptanceRuleFields.css';

export type { AcceptanceFieldPrefix };
export { toFormAcceptance } from '../../utils/acceptanceRule';

interface AcceptanceRuleFieldsProps {
  title: string;
  prefix: AcceptanceFieldPrefix;
}

const TIER_FIELDS = [
  { name: 'tier_31_90', label: '31-90天' },
  { name: 'tier_91_365', label: '91-365天' },
  { name: 'tier_366_plus', label: '366天以上' },
] as const;

/** 允收天數設定（國內 / 國外） */
export function AcceptanceRuleFields({ title, prefix }: AcceptanceRuleFieldsProps) {
  return (
    <div className="acceptance-rule-fields">
      <div className="acceptance-rule-fields__heading">{title}</div>

      <div className="acceptance-rule-fields__toggle-row">
        <span className="acceptance-rule-fields__toggle-label">是否啟用總效期分級比例</span>
        <Form.Item name={[prefix, 'use_tier_ratio']} noStyle>
          <Radio.Group>
            <Radio value={true}>是</Radio>
            <Radio value={false}>否</Radio>
          </Radio.Group>
        </Form.Item>
      </div>

      <Form.Item
        noStyle
        shouldUpdate={(prev, cur) =>
          prev?.[prefix]?.use_tier_ratio !== cur?.[prefix]?.use_tier_ratio
        }
      >
        {({ getFieldValue }) => {
          const useTierRatio = getFieldValue([prefix, 'use_tier_ratio']);

          if (useTierRatio) {
            return (
              <div className="acceptance-rule-fields__tier-group">
                {TIER_FIELDS.map(({ name, label }) => (
                  <Form.Item
                    key={name}
                    name={[prefix, name]}
                    label={label}
                    className="acceptance-rule-fields__item"
                  >
                    <Input placeholder="例如：2/3、2/5、1/3" allowClear />
                  </Form.Item>
                ))}
              </div>
            );
          }

          return (
            <Form.Item
              name={[prefix, 'flat_value']}
              className="acceptance-rule-fields__item"
            >
              <Input placeholder="<30" allowClear />
            </Form.Item>
          );
        }}
      </Form.Item>
    </div>
  );
}
