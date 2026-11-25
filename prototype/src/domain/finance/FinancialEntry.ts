import { DomainError } from '../DomainError';

/**
 * FR-03: every money movement is tagged to one batch.
 * Abstract: Expense and Sale decide their own sign (polymorphism), so profit is just a sum.
 */
export abstract class FinancialEntry {
  protected readonly id: string;
  protected readonly batchId: string;
  protected readonly date: Date;
  protected readonly amount: number;

  constructor(id: string, batchId: string, date: Date, amount: number) {
    if (!(amount > 0)) throw new DomainError('Amount must be above 0.');
    this.id = id;
    this.batchId = batchId;
    this.date = date;
    this.amount = Math.round(amount);
  }

  getId(): string {
    return this.id;
  }

  getBatchId(): string {
    return this.batchId;
  }

  getDate(): Date {
    return this.date;
  }

  getAmount(): number {
    return this.amount;
  }

  /** Negative for money out, positive for money in. */
  abstract signedAmount(): number;

  /** A short line for the profit screen. */
  abstract describe(): string;
}
