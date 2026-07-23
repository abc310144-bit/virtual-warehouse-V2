/**
 * 依虛擬倉篩選狀態過濾表格資料（demo 用）
 */
export function filterWarehouseTableData(data, filter) {
  if (filter.viewMode === 'main') {
    return data.filter((row) => row.viewScope !== 'channel');
  }

  if (!filter.l2Id) return [];

  let rows = data.filter((row) => row.l2Id === filter.l2Id);
  if (filter.l3Id) {
    rows = rows.filter((row) => row.l3Id === filter.l3Id);
  }
  return rows;
}
