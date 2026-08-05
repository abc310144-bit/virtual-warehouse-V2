/** standalone 用商品 mock（與 src/data/warehouseProductSeed.ts 同步） */

/** demo：先以 SKU 標記即期品 */
const NEAR_EXPIRY_SKUS = new Set([
  '3800233070026', // 保加利亞 Rice Up!
  '8801234567890', // Nature Made 綜合維他命B群
  '4718889990001', // DHC 綜合維他命
]);

function isNearExpirySku(sku) {
  return NEAR_EXPIRY_SKUS.has(sku);
}

const MAIN_WAREHOUSE_PRODUCTS = [
  { key: 'main-01', sku: '8809509455104', productName: '韓國Mizline 抽脂褲-黑', expiryBatch: '9999-12-31', allocatableQty: 0, actualQty: 150 },
  { key: 'main-02', sku: '4713025601072', productName: '[Daily Boost] 日卜力 麥片促冷杯 透露粉綠身', expiryBatch: '9999-12-31', allocatableQty: 463, actualQty: 463 },
  { key: 'main-03', sku: '3800233070026', productName: '保加利亞 Rice Up! 喜馬拉雅山岩鹽米餅 (120g)', expiryBatch: '2027-01-24_已抽標', allocatableQty: 2, actualQty: 2, isNearExpiry: true },
  { key: 'main-04', sku: '8809509455184', productName: '[Daily Boost] 日卜力 麥片 巧克力 400g', expiryBatch: '2027-01-24', allocatableQty: 7, actualQty: 7 },
  { key: 'main-05', sku: '4711234567890', productName: 'MyProtein 乳清蛋白 巧克力 1kg', expiryBatch: '2027-06-15', allocatableQty: 88, actualQty: 120 },
  { key: 'main-06', sku: '4719876543210', productName: 'ON 金標乳清 雙倍巧克力 2.27kg', expiryBatch: '2027-03-10', allocatableQty: 35, actualQty: 42 },
  { key: 'main-07', sku: '8801234567890', productName: 'Nature Made 綜合維他命B群 100錠', expiryBatch: '2026-12-31', allocatableQty: 210, actualQty: 210, isNearExpiry: true },
  { key: 'main-08', sku: '4715556667778', productName: 'Swanson 輔酶Q10 100mg 120粒', expiryBatch: '2027-08-20', allocatableQty: 56, actualQty: 80 },
  { key: 'main-09', sku: '4718889990001', productName: 'DHC 綜合維他命 60日份', expiryBatch: '2027-04-05', allocatableQty: 0, actualQty: 15, isNearExpiry: true },
  { key: 'main-10', sku: '4712223334445', productName: 'GNC 綜合維他命 90錠', expiryBatch: '2027-11-30', allocatableQty: 142, actualQty: 142 },
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
];

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
];

const PRODUCTS_PER_L2 = 10;

function getMainAllocatableQty(sku) {
  const main = MAIN_WAREHOUSE_PRODUCTS.find((row) => row.sku === sku);
  return main?.allocatableQty ?? 0;
}

function buildChannelProducts() {
  const { l2Hubs, l3Channels } = buildHierarchyFromSeed();
  const rows = [];

  l2Hubs.forEach((l2, l2Index) => {
    const l3List = l3Channels.filter((channel) => channel.l2_hub_id === l2.id);

    for (let i = 0; i < PRODUCTS_PER_L2; i += 1) {
      const template = PRODUCT_TEMPLATES[i];
      const seed = (l2Index + 1) * 100 + (i + 1) * 7;
      const actualQty = 12 + (seed % 480);
      const l2AllocatableQty = Math.min(actualQty, Math.floor(actualQty * (0.55 + (i % 5) * 0.08)));
      const nearExpiry = isNearExpirySku(template.sku) ? { isNearExpiry: true } : {};

      rows.push({
        key: `ch-${l2.id}-p${String(i + 1).padStart(2, '0')}`,
        viewScope: 'channel',
        l2Id: l2.id,
        sku: template.sku,
        productName: `${template.name}（${l2.name}）`,
        expiryBatch: EXPIRY_BATCHES[i],
        allocatableQty: l2AllocatableQty,
        actualQty,
        mainAllocatableQty: getMainAllocatableQty(template.sku),
        ...nearExpiry,
      });

      l3List.forEach((l3, l3Index) => {
        let allocatableQty = Math.min(
          actualQty,
          Math.floor(actualQty * (0.35 + ((i + l3Index) % 5) * 0.1)),
        );
        if (l2.name === '線上2C' && l3.name === 'B2C-PChome' && i === 0) {
          allocatableQty = 120;
        }

        rows.push({
          key: `ch-${l2.id}-p${String(i + 1).padStart(2, '0')}-${l3.id}`,
          viewScope: 'channel',
          l2Id: l2.id,
          l3Id: l3.id,
          l3Name: l3.name,
          sku: template.sku,
          productName: template.name,
          expiryBatch: EXPIRY_BATCHES[i],
          allocatableQty,
          actualQty: Math.max(allocatableQty, Math.floor(allocatableQty * 1.1)),
          mainAllocatableQty: getMainAllocatableQty(template.sku),
          ...nearExpiry,
        });
      });
    }
  });

  return rows;
}

function buildWarehouseProductMock() {
  return [...MAIN_WAREHOUSE_PRODUCTS, ...buildChannelProducts()];
}

const WAREHOUSE_PRODUCT_MOCK = buildWarehouseProductMock();
