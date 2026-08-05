/**
 * 依虛擬倉篩選狀態過濾表格資料（demo 用）
 * - 只選 L2：回傳 L2 父列，並附上 l3Breakdown 供展開
 * - 有選 L3：回傳該 L3 明細列
 */
export function filterWarehouseTableData(data, filter) {
  if (filter.viewMode === 'main') {
    return data.filter((row) => row.viewScope !== 'channel');
  }

  if (!filter.l2Id) return [];

  const inL2 = data.filter(
    (row) => row.viewScope === 'channel' && row.l2Id === filter.l2Id,
  );

  if (filter.l3Id) {
    return inL2.filter((row) => row.l3Id === filter.l3Id);
  }

  const parents = inL2.filter((row) => !row.l3Id);
  const details = inL2.filter((row) => row.l3Id);

  return parents.map((parent) => ({
    ...parent,
    l3Breakdown: details.filter(
      (row) => row.sku === parent.sku && row.expiryBatch === parent.expiryBatch,
    ),
  }));
}
