export enum SupplierType {
  CHICKS = 'CHICKS',
  FEED = 'FEED',
}

/** A chick or feed supplier. Lives independently of any delivery (aggregation). */
export class Supplier {
  private readonly id: string;
  private readonly name: string;
  private readonly type: SupplierType;

  constructor(id: string, name: string, type: SupplierType) {
    this.id = id;
    this.name = name;
    this.type = type;
  }

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getType(): SupplierType {
    return this.type;
  }
}
