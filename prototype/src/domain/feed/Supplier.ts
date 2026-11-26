import { DomainError } from '../DomainError';

export enum SupplierType {
  CHICKS = 'CHICKS',
  FEED = 'FEED',
}

export const SUPPLIER_TYPE_LABEL: Record<SupplierType, string> = {
  [SupplierType.CHICKS]: 'Chicks',
  [SupplierType.FEED]: 'Feed',
};

/**
 * A chick or feed supplier. Lives independently of any delivery (aggregation).
 * A supplier that is removed is archived, not erased: past deliveries still name it.
 */
export class Supplier {
  private readonly id: string;
  private name: string;
  private readonly type: SupplierType;
  private active: boolean;

  constructor(id: string, name: string, type: SupplierType, active = true) {
    if (!name.trim()) throw new DomainError('A supplier needs a name.');
    this.id = id;
    this.name = name.trim();
    this.type = type;
    this.active = active;
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

  /** false once removed from the list; kept so the history stays readable. */
  isActive(): boolean {
    return this.active;
  }

  rename(name: string): void {
    if (!name.trim()) throw new DomainError('A supplier needs a name.');
    this.name = name.trim();
  }

  archive(): void {
    this.active = false;
  }
}
