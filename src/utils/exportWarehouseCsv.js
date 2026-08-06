/**
 * 依虛擬倉篩選層級匯出 CSV（當前列表資料）
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
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function resolveExportMode(filter) {
  if (filter.viewMode === 'main') return 'main';
  if (filter.l3Id) return 'l3';
  if (filter.l2Id) return 'l2';
  return 'main';
}

/**
 * @param {object} params
 * @param {Array} params.rows 當前頁面／列表資料
 * @param {object} params.filter 階層篩選
 * @param {Array} params.l2Hubs
 * @param {Array} params.l3Channels
 */
export function exportWarehouseTableCsv({ rows, filter, l2Hubs, l3Channels }) {
  const mode = resolveExportMode(filter);
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');

  if (mode === 'main') {
    downloadCsv(
      `虛擬倉-總倉-${stamp}.csv`,
      ['SKU', '商品名稱', '效期_批號', '總倉', '當前可配數', '實際倉庫數量'],
      rows.map((row) => [
        row.sku,
        row.productName,
        row.expiryBatch,
        '總倉',
        row.allocatableQty,
        row.actualQty,
      ]),
    );
    return;
  }

  if (mode === 'l3') {
    const filterL3Name =
      l3Channels.find((channel) => channel.id === filter.l3Id)?.name ?? '';
    downloadCsv(
      `虛擬倉-銷售通路-${stamp}.csv`,
      [
        'SKU',
        '商品名稱',
        '效期_批號',
        '銷售通路',
        '總倉當前可配數',
        '當前可配數',
        '實際倉庫數量',
      ],
      rows.map((row) => [
        row.sku,
        row.productName,
        row.expiryBatch,
        row.l3Name ??
          l3Channels.find((channel) => channel.id === row.l3Id)?.name ??
          filterL3Name,
        row.mainAllocatableQty ?? '',
        row.allocatableQty,
        row.actualQty,
      ]),
    );
    return;
  }

  const l2Name = l2Hubs.find((hub) => hub.id === filter.l2Id)?.name ?? '';
  downloadCsv(
    `虛擬倉-通路分組-${stamp}.csv`,
    [
      'SKU',
      '商品名稱',
      '效期_批號',
      '通路分組',
      '總倉當前可配數',
      '當前可配數',
      '實際倉庫數量',
    ],
    rows.map((row) => [
      row.sku,
      row.productName,
      row.expiryBatch,
      l2Name,
      row.mainAllocatableQty ?? '',
      row.allocatableQty,
      row.actualQty,
    ]),
  );
}
