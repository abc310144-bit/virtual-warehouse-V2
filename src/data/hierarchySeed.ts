/**
 * 虛擬倉 2.0 — L2/L3 階層種子資料（來源：業務對照表）
 */

import type { AcceptanceRuleSettings } from '../types/virtualWarehouse';
import { getAllCatalogChannelNames } from './partnerChannelCatalog';

export interface L2SeedGroup {
  name: string;
  l3Names: string[];
  acceptance_domestic?: AcceptanceRuleSettings;
  acceptance_foreign?: AcceptanceRuleSettings;
}

const TIER_STANDARD: AcceptanceRuleSettings = {
  use_tier_ratio: true,
  tier_31_90: '2/3',
  tier_91_365: '2/5',
  tier_366_plus: '1/3',
};

function flatRatio(value: string): AcceptanceRuleSettings {
  return { use_tier_ratio: false, flat_value: value };
}

function flatDomesticForeign(
  domestic: string,
  foreign: string,
): Pick<L2SeedGroup, 'acceptance_domestic' | 'acceptance_foreign'> {
  return {
    acceptance_domestic: flatRatio(domestic),
    acceptance_foreign: flatRatio(foreign),
  };
}

export const HIERARCHY_SEED: L2SeedGroup[] = [
  {
    name: '境外通路',
    acceptance_domestic: TIER_STANDARD,
    acceptance_foreign: TIER_STANDARD,
    l3Names: [
      '跨境- Cool Cool Trading (International) Limited',
      '跨境-Choosing global group Limited',
      '跨境-Couz-Nutri',
      '跨境-Max Key Limited',
      '跨境-Smart Supplement Limited',
      '跨境-Supp',
      '跨境-SuppHK',
      '跨境-同人辦館',
      '跨境-晨唏公司',
      '其他-15807662 Canada Inc.',
    ],
  },
  {
    name: '線上2C',
    acceptance_domestic: flatRatio('< 30天'),
    acceptance_foreign: flatRatio('< 30天'),
    l3Names: [
      'B2C-PChome',
      'B2C-誠品',
      'B2C-寶雅EC',
      'B2C-康是美',
      'B2C-日本樂天',
      'B2C-家樂福線上',
      'B2C-迪卡儂',
      'B2C-Line 禮物',
      'B2C-蝦皮轉單',
    ],
  },
  {
    name: '線上2B',
    acceptance_foreign: TIER_STANDARD,
    l3Names: ['B2B-Yahoo', 'B2B-博客來', 'B2B-PChome', 'B2C-酷澎(新)'],
  },
  {
    name: 'B2C-UrMart',
    acceptance_domestic: flatRatio('N'),
    acceptance_foreign: flatRatio('N'),
    l3Names: [],
  },
  {
    name: 'B2B-MOMO',
    acceptance_domestic: TIER_STANDARD,
    acceptance_foreign: TIER_STANDARD,
    l3Names: [],
  },
  {
    name: 'B2B-蝦皮寄倉',
    acceptance_domestic: TIER_STANDARD,
    acceptance_foreign: TIER_STANDARD,
    l3Names: [],
  },
  {
    name: 'B2C-好市多',
    acceptance_domestic: flatRatio('N'),
    acceptance_foreign: flatRatio('N'),
    l3Names: [],
  },
  {
    name: '其他實體',
    ...flatDomesticForeign('2/3', '1/2'),
    l3Names: ['實體-citysuper', '實體-PW健身工廠', '實體-PX健身工廠', '實體-屈臣氏'],
  },
  {
    name: 'B2B-寶雅',
    ...flatDomesticForeign('2/3', '1/2'),
    l3Names: [],
  },
  {
    name: 'B2B-大全聯',
    ...flatDomesticForeign('2/3', '1/2'),
    l3Names: [],
  },
  {
    name: '實體-711',
    ...flatDomesticForeign('1/2', '1/2'),
    l3Names: [],
  },
  {
    name: '實體-全聯',
    ...flatDomesticForeign('2/3', '1/2'),
    l3Names: [],
  },
  {
    name: '實體-好市多',
    ...flatDomesticForeign('2/3', '2/3'),
    l3Names: [],
  },
  {
    name: '實體-萊爾富超商股份有限公司',
    ...flatDomesticForeign('2/3', '1/2'),
    l3Names: [],
  },
  {
    name: '實體-迪卡儂',
    ...flatDomesticForeign('2/3', '2/3'),
    l3Names: [],
  },
  {
    name: '實體-家樂福',
    ...flatDomesticForeign('2/3', '1/2'),
    l3Names: [],
  },
  {
    name: '國內經銷',
    l3Names: [
      '經銷商-海克力斯國際有限公司',
      '經銷商-馬拉松世界',
      '經銷商-捷茜商號',
      '經銷商-雪典乳清小商店',
      '經銷商-凱思國際貿易有限公司',
      '經銷商-絢綻國際企業社',
      '經銷商-逸璇商行',
      '經銷商-新芊肌有限公司',
      '經銷商-學生營養股份有限公司',
      '經銷商-戩崎企業有限公司',
      '經銷商-CUPPY',
      '經銷商-Leon',
      '經銷商-Sunny營養中心',
      '實體-唐吉訶德',
      '實體-板橋遠百',
    ],
  },
];

export function buildHierarchyFromSeed() {
  const l2Hubs: Array<{
    id: string;
    name: string;
    acceptance_domestic?: AcceptanceRuleSettings;
    acceptance_foreign?: AcceptanceRuleSettings;
    status: 'active' | 'inactive';
    created_at: string;
  }> = [];
  const l3Channels: Array<{
    id: string;
    name: string;
    l2_hub_id: string;
    status: 'active' | 'inactive';
  }> = [];

  HIERARCHY_SEED.forEach((group, l2Index) => {
    const l2Id = `l2-${String(l2Index + 1).padStart(3, '0')}`;
    l2Hubs.push({
      id: l2Id,
      name: group.name,
      acceptance_domestic: group.acceptance_domestic,
      acceptance_foreign: group.acceptance_foreign,
      status: 'active',
      created_at: `2026-01-${String(Math.min(l2Index + 1, 28)).padStart(2, '0')}T08:00:00Z`,
    });
    group.l3Names.forEach((l3Name, l3Index) => {
      l3Channels.push({
        id: `l3-${String(l2Index + 1).padStart(3, '0')}-${String(l3Index + 1).padStart(2, '0')}`,
        name: l3Name,
        l2_hub_id: l2Id,
        status: 'active',
      });
    });
  });

  const existingNames = new Set(l3Channels.map((channel) => channel.name));
  let catalogIndex = l3Channels.length;
  getAllCatalogChannelNames().forEach((name) => {
    if (existingNames.has(name)) return;
    catalogIndex += 1;
    l3Channels.push({
      id: `l3-cat-${String(catalogIndex).padStart(4, '0')}`,
      name,
      l2_hub_id: null,
      status: 'active',
    });
  });

  return { l2Hubs, l3Channels };
}
