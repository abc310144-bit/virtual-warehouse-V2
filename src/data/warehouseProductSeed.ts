/**
 * 虛擬倉商品表格 mock（總倉 10 筆 + 各通路分組各 10 筆）
 */

import { buildHierarchyFromSeed } from './hierarchySeed';

export interface WarehouseProductRow {
  key: string;
  sku: string;
  productName: string;
  expiryBatch: string;
  allocatableQty: number;
  actualQty: number;
  viewScope?: 'channel';
  l2Id?: string;
  l3Id?: string;
}

const MAIN_WAREHOUSE_PRODUCTS: WarehouseProductRow[] = [
  {
    key: 'main-01',
    sku: '8809509455104',
    productName: '韓國Mizline 抽脂褲-黑',
    expiryBatch: '9999-12-31',
    allocatableQty: 0,
    actualQty: 150,
  },
  {
    key: 'main-02',
    sku: '4713025601072',
    productName: '[Daily Boost] 日卜力 麥片促冷杯 透露粉綠身',
    expiryBatch: '9999-12-31',
    allocatableQty: 463,
    actualQty: 463,
  },
  {
    key: 'main-03',
    sku: '3800233070026',
    productName: '保加利亞 Rice Up! 喜馬拉雅山岩鹽米餅 (120g)',
    expiryBatch: '2027-01-24_已抽標',
    allocatableQty: 2,
    actualQty: 2,
  },
  {
    key: 'main-04',
    sku: '8809509455184',
    productName: '[Daily Boost] 日卜力 麥片 巧克力 400g',
    expiryBatch: '2027-01-24',
    allocatableQty: 7,
    actualQty: 7,
  },
  {
    key: 'main-05',
    sku: '4711234567890',
    productName: 'MyProtein 乳清蛋白 巧克力 1kg',
    expiryBatch: '2027-06-15',
    allocatableQty: 88,
    actualQty: 120,
  },
  {
    key: 'main-06',
    sku: '4719876543210',
    productName: 'ON 金標乳清 雙倍巧克力 2.27kg',
    expiryBatch: '2027-03-10',
    allocatableQty: 35,
    actualQty: 42,
  },
  {
    key: 'main-07',
    sku: '8801234567890',
    productName: 'Nature Made 綜合維他命B群 100錠',
    expiryBatch: '2026-12-31',
    allocatableQty: 210,
    actualQty: 210,
  },
  {
    key: 'main-08',
    sku: '4715556667778',
    productName: 'Swanson 輔酶Q10 100mg 120粒',
    expiryBatch: '2027-08-20',
    allocatableQty: 56,
    actualQty: 80,
  },
  {
    key: 'main-09',
    sku: '4718889990001',
    productName: 'DHC 綜合維他命 60日份',
    expiryBatch: '2027-04-05',
    allocatableQty: 0,
    actualQty: 15,
  },
  {
    key: 'main-10',
    sku: '4712223334445',
    productName: 'GNC 綜合維他命 90錠',
    expiryBatch: '2027-11-30',
    allocatableQty: 142,
    actualQty: 142,
  },
];

const PRODUCT_TEMPLATES = [
  { sku: '8809509455104', name: '韓國Mizline 抽脂褲-黑' },
  { sku: '4713025601072', name: '[Daily Boost] 日卜力 麥片促冷杯' },
  { sku: '3800233070026', name: '保加利亞 Rice Up! 喜馬拉雅山岩鹽米餅 (120g)' },
  { sku: '8809509455184', name: '[Daily Boost] 日卜力 麥片 巧克力 400g' },
  { sku: '4711234567890', name: 'MyProtein 乳清蛋白 巧克力 1kg' },
  { sku: '4719876543210', name: 'ON 金標乳清 雙倍巧克力 2.27kg' },
  { sku: '8801234567890', name: 'Nature Made 綜合維他命B群 100錠' },
  { sku: '4715556667778', name: 'Swanson 輔酶Q10 100mg 120粒' },
  { sku: '4718889990001', name: 'DHC 綜合維他命 60日份' },
  { sku: '4712223334445', name: 'GNC 綜合維他命 90錠' },
] as const;

const EXPIRY_BATCHES = [
  '9999-12-31',
  '2027-01-24',
  '2027-06-15',
  '2027-03-10',
  '2026-12-31',
  '2027-01-24_已抽標',
  '2027-08-20',
  '2027-04-05',
  '2027-11-30',
  '2028-01-15',
] as const;

const PRODUCTS_PER_L2 = 10;

function buildChannelProducts(): WarehouseProductRow[] {
  const { l2Hubs, l3Channels } = buildHierarchyFromSeed();
  const rows: WarehouseProductRow[] = [];

  l2Hubs.forEach((l2, l2Index) => {
    const l3List = l3Channels.filter((channel) => channel.l2_hub_id === l2.id);

    for (let i = 0; i < PRODUCTS_PER_L2; i += 1) {
      const template = PRODUCT_TEMPLATES[i];
      const l3 = l3List.length > 0 ? l3List[i % l3List.length] : undefined;
      const seed = (l2Index + 1) * 100 + (i + 1) * 7;
      const actualQty = 12 + (seed % 480);
      const allocatableQty = Math.min(actualQty, Math.floor(actualQty * (0.55 + (i % 5) * 0.08)));

      rows.push({
        key: `ch-${l2.id}-p${String(i + 1).padStart(2, '0')}`,
        viewScope: 'channel',
        l2Id: l2.id,
        ...(l3 ? { l3Id: l3.id } : {}),
        sku: template.sku,
        productName: `${template.name}（${l2.name}）`,
        expiryBatch: EXPIRY_BATCHES[i],
        allocatableQty,
        actualQty,
      });
    }
  });

  return rows;
}

export function buildWarehouseProductMock(): WarehouseProductRow[] {
  return [...MAIN_WAREHOUSE_PRODUCTS, ...buildChannelProducts()];
}

/** 總倉 10 筆 + 17 個通路分組 × 10 筆 = 180 筆 */
export const WAREHOUSE_PRODUCT_MOCK = buildWarehouseProductMock();
