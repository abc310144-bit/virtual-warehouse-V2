import { useEffect, useState } from 'react';
import { Form, InputNumber, Radio } from 'antd';
import type { AcceptanceFieldPrefix } from './acceptanceTypes';
import './AcceptanceRuleFields.css';

export type { AcceptanceFieldPrefix };
export { toFormAcceptance } from '../../utils/acceptanceRule';

interface AcceptanceRuleFieldsProps {
  title: string;
  /** Form.Item 欄位路徑（在 Form.List 內為相對路徑） */
  namePath: Array<string | number>;
  /** useWatch 用的完整路徑；未傳則與 namePath 相同 */
  watchPath?: Array<string | number>;
}

const TIER_FIELDS = [
  { name: 'tier_0_30', label: '0-30天' },
  { name: 'tier_31_90', label: '31-90天' },
  { name: 'tier_91_365', label: '91-365天' },
  { name: 'tier_366_plus', label: '366天以上' },
] as const;

function parseRatio(value?: string): { numerator: number | null; denominator: number | null } {
  if (!value) return { numerator: null, denominator: null };
  const match = String(value).trim().match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!match) return { numerator: null, denominator: null };
  return {
    numerator: Number(match[1]),
    denominator: Number(match[2]),
  };
}

function formatRatio(numerator: number | null, denominator: number | null): string {
  if (numerator == null || denominator == null) return '';
  return `${numerator}/${denominator}`;
}

function parseFlatDays(value?: string): number | null {
  if (!value) return null;
  const match = String(value).trim().match(/^<\s*(\d+)\s*天?$/);
  if (!match) return null;
  return Number(match[1]);
}

function formatFlatDays(days: number | null): string {
  if (days == null) return '';
  return `<${days}天`;
}

/** 防呆比例輸入：左分子／右分母，對外仍以 "2/3" 字串與表單同步 */
function RatioInput({
  value,
  onChange,
}: {
  value?: string;
  onChange?: (value: string) => void;
}) {
  const parsed = parseRatio(value);
  const [numerator, setNumerator] = useState<number | null>(parsed.numerator);
  const [denominator, setDenominator] = useState<number | null>(parsed.denominator);

  useEffect(() => {
    const next = parseRatio(value);
    setNumerator(next.numerator);
    setDenominator(next.denominator);
  }, [value]);

  const emit = (nextNumerator: number | null, nextDenominator: number | null) => {
    onChange?.(formatRatio(nextNumerator, nextDenominator));
  };

  return (
    <div className="acceptance-ratio-input">
      <InputNumber
        className="acceptance-ratio-input__box"
        min={1}
        precision={0}
        controls={false}
        value={numerator}
        onChange={(next) => {
          const num = typeof next === 'number' ? next : null;
          setNumerator(num);
          emit(num, denominator);
        }}
      />
      <span className="acceptance-ratio-input__slash" aria-hidden>
        /
      </span>
      <InputNumber
        className="acceptance-ratio-input__box"
        min={1}
        precision={0}
        controls={false}
        value={denominator}
        onChange={(next) => {
          const den = typeof next === 'number' ? next : null;
          setDenominator(den);
          emit(numerator, den);
        }}
      />
    </div>
  );
}

/** 防呆天數輸入：固定「< 數字 天」 */
function FlatDaysInput({
  value,
  onChange,
}: {
  value?: string;
  onChange?: (value: string) => void;
}) {
  const [days, setDays] = useState<number | null>(() => parseFlatDays(value));

  useEffect(() => {
    setDays(parseFlatDays(value));
  }, [value]);

  return (
    <div className="acceptance-flat-days-input">
      <span className="acceptance-flat-days-input__prefix" aria-hidden>
        &lt;
      </span>
      <InputNumber
        className="acceptance-ratio-input__box"
        min={1}
        precision={0}
        controls={false}
        value={days}
        onChange={(next) => {
          const num = typeof next === 'number' ? next : null;
          setDays(num);
          onChange?.(formatFlatDays(num));
        }}
      />
      <span className="acceptance-flat-days-input__suffix">天</span>
    </div>
  );
}

/** 允收天數設定（國內 / 國外） */
export function AcceptanceRuleFields({ title, namePath, watchPath }: AcceptanceRuleFieldsProps) {
  const form = Form.useFormInstance();
  const valuePath = watchPath ?? namePath;
  const useTierRatio = Form.useWatch([...valuePath, 'use_tier_ratio'], form);

  return (
    <div className="acceptance-rule-fields">
      <div className="acceptance-rule-fields__heading">{title}</div>

      <div className="acceptance-rule-fields__toggle-row">
        <span className="acceptance-rule-fields__toggle-label">是否啟用總效期分級比例</span>
        <Form.Item name={[...namePath, 'use_tier_ratio']} noStyle>
          <Radio.Group>
            <Radio value={true}>是</Radio>
            <Radio value={false}>否</Radio>
          </Radio.Group>
        </Form.Item>
      </div>

      {useTierRatio ? (
        <div className="acceptance-rule-fields__tier-group">
          {TIER_FIELDS.map(({ name, label }) => (
            <Form.Item
              key={name}
              name={[...namePath, name]}
              label={label}
              className="acceptance-rule-fields__item"
            >
              <RatioInput />
            </Form.Item>
          ))}
        </div>
      ) : (
        <Form.Item
          name={[...namePath, 'flat_value']}
          className="acceptance-rule-fields__item"
        >
          <FlatDaysInput />
        </Form.Item>
      )}
    </div>
  );
}
