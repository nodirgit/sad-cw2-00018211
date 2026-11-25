import { DomainError } from '../DomainError';
import { HeadCountCorrection } from './HeadCountCorrection';

function assertCount(n: number): void {
  if (!Number.isInteger(n) || n <= 0) throw new DomainError('Head count must be a whole number above 0.');
}

/**
 * FR-04: the crew's head count for one session, written down with a timestamp and
 * tied to the payment. Composition: owns its corrections (0..*).
 */
export class HeadCountRecord {
  private readonly reportedCount: number;
  private readonly ratePerHead: number;
  private readonly recordedAt: Date;
  private readonly corrections: HeadCountCorrection[];

  constructor(reportedCount: number, ratePerHead: number, recordedAt: Date, corrections: HeadCountCorrection[] = []) {
    assertCount(reportedCount);
    if (!(ratePerHead > 0)) throw new DomainError('Rate per head must be above 0.');
    this.reportedCount = reportedCount;
    this.ratePerHead = ratePerHead;
    this.recordedAt = recordedAt;
    this.corrections = [...corrections];
  }

  getReportedCount(): number {
    return this.reportedCount;
  }

  getRatePerHead(): number {
    return this.ratePerHead;
  }

  getRecordedAt(): Date {
    return this.recordedAt;
  }

  getCorrections(): readonly HeadCountCorrection[] {
    return this.corrections;
  }

  /** The latest correction wins; the original stays visible in the history. */
  effectiveCount(): number {
    const last = this.corrections[this.corrections.length - 1];
    return last ? last.getNewCount() : this.reportedCount;
  }

  /** NFR-04: the crew's pay, available the moment the count is entered. */
  crewPayment(): number {
    return this.effectiveCount() * this.ratePerHead;
  }

  correct(newCount: number, note: string, at: Date): HeadCountCorrection {
    assertCount(newCount);
    if (!note.trim()) throw new DomainError('A correction needs a note saying why.');
    if (newCount === this.effectiveCount()) throw new DomainError('That is already the current count.');
    const correction = new HeadCountCorrection(newCount, note.trim(), at);
    this.corrections.push(correction);
    return correction;
  }
}
