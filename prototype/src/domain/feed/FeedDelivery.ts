import { DomainError } from '../DomainError';
import { Supplier } from '../partners/Supplier';

/**
 * FR-02: one feed delivery tied to its supplier and to the batch it was delivered for,
 * so the director can later compare meat quality by feed factory.
 * Aggregation: FeedDelivery ◇— Supplier (the supplier exists without the delivery).
 */
export class FeedDelivery {
  private readonly id: string;
  private readonly batchId: string;
  private readonly supplier: Supplier;
  private readonly date: Date;
  private readonly quantityKg: number;
  /** null when a Worker recorded it: the cost is the Director's to add (NFR-03). */
  private readonly cost: number | null;

  constructor(id: string, batchId: string, supplier: Supplier, date: Date, quantityKg: number, cost: number | null) {
    if (!(quantityKg > 0)) throw new DomainError('Quantity must be above 0 kg.');
    if (cost !== null && !(cost > 0)) throw new DomainError('Cost must be above 0.');
    this.id = id;
    this.batchId = batchId;
    this.supplier = supplier;
    this.date = date;
    this.quantityKg = quantityKg;
    this.cost = cost;
  }

  getId(): string {
    return this.id;
  }

  getBatchId(): string {
    return this.batchId;
  }

  getSupplier(): Supplier {
    return this.supplier;
  }

  getDate(): Date {
    return this.date;
  }

  getQuantityKg(): number {
    return this.quantityKg;
  }

  getCost(): number | null {
    return this.cost;
  }

  hasCost(): boolean {
    return this.cost !== null;
  }
}
