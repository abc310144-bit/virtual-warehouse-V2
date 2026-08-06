/**
 * 虛擬倉列表 CSV 匯出（依篩選層級輸出不同欄位）
 */

function escapeCsvCell(value) {
  const text = value == null ? '' : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function downloadCsv(filename, headers, rows) {
  const lines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row) => row.map(escapeCsvCell).join(',')),
  ];
  const blob = new Blob([`\uFEFF${lines.join('\n')}`], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function buildTimestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

/**
 * @param {object} params
 * @param {Array} params.rows 當前頁面／列表資料
 * @param {{ viewMode: string, l2Id: string|null, l3Id: string|null }} params.filter
 * @param {Array<{ id: string, name: string }>} params.l2Hubs
 * @param {Array<{ id: string, name: string }>} params.l3Channels
 */
export function exportWarehouseTableCsv({ rows, filter, l2Hubs, l3Channels }) {
  if (!rows?.length) {
    return { success: false, message: '目前沒有可匯出的資料' };
  }

  const l2NameById = new Map(l2Hubs.map((hub) => [hub.id, hub.name]));
  const l3NameById = new Map(l3Channels.map((channel) => [channel.id, channel.name]));

  let headers;
  let csvRows;
  let scope;

  if (filter.viewMode === 'main') {
    scope = '總倉';
    headers = ['SKU', '商品名稱', '效期_批號', '位置', '當前可配數', '實際倉庫數量'];
    csvRows = rows.map((row) => [
      row.sku,
      row.productName,
      row.expiryBatch,
      '總倉',
      row.allocatableQty,
      row.actualQty,
    ]);
  } else if (filter.l3Id) {
    scope = '銷售通路';
    headers = [
      'SKU',
      '商品名稱',
      '效期_批號',
      '銷售通路',
      '總倉當前可配數',
      '當前可配數',
      '實際倉庫數量',
    ];
    csvRows = rows.map((row) => [
      row.sku,
      row.productName,
      row.expiryBatch,
      row.l3Name || l3NameById.get(row.l3Id) || filter.l3Id,
      row.mainAllocatableQty ?? '',
      row.allocatableQty,
      row.actualQty,
    ]);
  } else if (filter.l2Id) {
    scope = '通路分組';
    headers = [
      'SKU',
      '商品名稱',
      '效期_批號',
      '通路分組',
      '總倉當前可配數',
      '當前可配數',
      '實際倉庫數量',
    ];
    csvRows = rows.map((row) => [
      row.sku,
      row.productName,
      row.expiryBatch,
      l2NameById.get(row.l2Id) || l2NameById.get(filter.l2Id) || filter.l2Id,
      row.mainAllocatableQty ?? '',
      row.allocatableQty,
      row.actualQty,
    ]);
  } else {
    return { success: false, message: '請先選擇虛擬倉篩選條件後再匯出' };
  }

  const filename = `虛擬倉匯出_${scope}_${buildTimestamp()}.csv`;
  downloadCsv(filename, headers, csvRows);
  return { success: true, filename, count: csvRows.length };
}
