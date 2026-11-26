import { Partner } from '../partners/Partner';

export enum SupplierType {
  CHICKS = 'CHICKS',
  FEED = 'FEED',
}

export const SUPPLIER_TYPE_LABEL: Record<SupplierType, string> = {
  [SupplierType.CHICKS]: 'Chicks',
  [SupplierType.FEED]: 'Feed',
};

/**
 * A partner the farm buys chicks or feed from. Lives independently of any delivery (aggregation).
 */
export class Supplier extends Partner {
  private readonly type: SupplierType;

  constructor(id: string, name: string, type: SupplierType, active = true) {
    super(id, name, active);
    this.type = type;
  }

  getType(): SupplierType {
    return this.type;
  }

  groupLabel(): string {
    return this.type === SupplierType.FEED ? 'Feed suppliers' : 'Chick suppliers';
  }
}
