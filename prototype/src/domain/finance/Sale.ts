import { DomainError } from '../DomainError';
import { Buyer } from './Buyer';
import { FinancialEntry } from './FinancialEntry';

/** Money in, against one batch (FR-03). Association: the Buyer it was sold to. */
export class Sale extends FinancialEntry {
  private readonly buyer: Buyer;
  private readonly kg: number;
  private readonly pricePerKg: number;

  constructor(id: string, batchId: string, date: Date, buyer: Buyer, kg: number, pricePerKg: number) {
    if (!(kg > 0) || !(pricePerKg > 0)) throw new DomainError('Kg and price per kg must be above 0.');
    super(id, batchId, date, kg * pricePerKg);
    this.buyer = buyer;
    this.kg = kg;
    this.pricePerKg = pricePerKg;
  }

  getBuyer(): Buyer {
    return this.buyer;
  }

  getKg(): number {
    return this.kg;
  }

  getPricePerKg(): number {
    return this.pricePerKg;
  }

  signedAmount(): number {
    return this.amount;
  }

  describe(): string {
    return `${this.buyer.typeLabel()} — ${this.kg.toLocaleString('en-US')} kg × ${this.pricePerKg.toLocaleString('en-US')}`;
  }
}
