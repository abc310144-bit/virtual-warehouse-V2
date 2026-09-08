import { Modal } from 'antd';
import { WAREHOUSE_PRODUCT_MOCK, type WarehouseProductRow } from '../data/warehouseProductSeed';

function rowHasStock(row: WarehouseProductRow): boolean {
  return (row.actualQty ?? 0) > 0 || (row.allocatableQty ?? 0) > 0;
}

/** 通路分組本身或其下任一銷售通路仍有商品 */
export function hasL2RemainingProducts(
  l2Id: string,
  rows: WarehouseProductRow[] = WAREHOUSE_PRODUCT_MOCK,
): boolean {
  return rows.some((row) => row.l2Id === l2Id && rowHasStock(row));
}

/** 指定銷售通路仍有商品 */
export function hasL3RemainingProducts(
  l3Id: string,
  rows: WarehouseProductRow[] = WAREHOUSE_PRODUCT_MOCK,
): boolean {
  return rows.some((row) => row.l3Id === l3Id && rowHasStock(row));
}

export function hasAnyL3RemainingProducts(
  l3Ids: string[],
  rows: WarehouseProductRow[] = WAREHOUSE_PRODUCT_MOCK,
): boolean {
  return l3Ids.some((id) => hasL3RemainingProducts(id, rows));
}

export function warnMustReturnStockBeforeDelete(scope: 'l2' | 'l3'): void {
  Modal.warning({
    title:
      scope === 'l2'
        ? '需先將所有商品配回至總倉'
        : '需先將所有商品配回至總倉或所屬通路分組',
    okText: '確定',
  });
}
