import { DomainError } from '../DomainError';
import { HeadCountRecord } from './HeadCountRecord';
import { WeightTally } from './WeightTally';

export enum SessionKind {
  THINNING = 'THINNING',
  MAIN = 'MAIN',
}

export const SESSION_KIND_LABEL: Record<SessionKind, string> = {
  [SessionKind.THINNING]: 'Thinning',
  [SessionKind.MAIN]: 'Main slaughter',
};

/**
 * One overnight slaughter session for a batch (1,000–1,200 birds).
 * Composition: the session creates and owns its HeadCountRecord and WeightTally.
 */
export class SlaughterSession {
  private readonly id: string;
  private readonly batchId: string;
  private readonly date: Date;
  private readonly kind: SessionKind;
  private headCount: HeadCountRecord | null;
  private readonly tally: WeightTally;
  private saleId: string | null;

  constructor(
    id: string,
    batchId: string,
    date: Date,
    kind: SessionKind,
    headCount: HeadCountRecord | null = null,
    tally: WeightTally = new WeightTally(),
    saleId: string | null = null,
  ) {
    this.id = id;
    this.batchId = batchId;
    this.date = date;
    this.kind = kind;
    this.headCount = headCount;
    this.tally = tally;
    this.saleId = saleId;
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

  getKind(): SessionKind {
    return this.kind;
  }

  getHeadCount(): HeadCountRecord | null {
    return this.headCount;
  }

  getTally(): WeightTally {
    return this.tally;
  }

  getSaleId(): string | null {
    return this.saleId;
  }

  /** FR-04: the count is written down once; later changes go through correctHeadCount(). */
  recordHeadCount(count: number, ratePerHead: number, at: Date): HeadCountRecord {
    if (this.headCount) throw new DomainError('The count is already recorded. Use "Correct count" with a note.');
    this.headCount = new HeadCountRecord(count, ratePerHead, at);
    return this.headCount;
  }

  correctHeadCount(newCount: number, note: string, at: Date): HeadCountRecord {
    if (!this.headCount) throw new DomainError('Record the head count first.');
    this.headCount.correct(newCount, note, at);
    return this.headCount;
  }

  isSold(): boolean {
    return this.saleId !== null;
  }

  /** Undo a sale recorded by mistake; the weights stay. */
  clearSale(): void {
    this.saleId = null;
  }

  markSold(saleId: string): void {
    if (this.saleId) throw new DomainError('A sale is already recorded for this session.');
    this.saleId = saleId;
  }
}
