import { DomainError } from '../DomainError';

export enum CrossCheckStatus {
  PENDING = 'PENDING',
  MATCH = 'MATCH',
  MISMATCH = 'MISMATCH',
}

/**
 * FR-05: the two independent kg totals for one session at the bazaar —
 * the Bazaar Agent's (from his Telegram photo) and the Trusted Representative's.
 */
export class WeightTally {
  /** Totals within this many kg are treated as the same figure. */
  static readonly TOLERANCE_KG = 0.5;

  private agentKg?: number;
  private representativeKg?: number;

  constructor(agentKg?: number, representativeKg?: number) {
    this.agentKg = agentKg;
    this.representativeKg = representativeKg;
  }

  getAgentKg(): number | undefined {
    return this.agentKg;
  }

  getRepresentativeKg(): number | undefined {
    return this.representativeKg;
  }

  enterAgentKg(kg: number): void {
    this.agentKg = WeightTally.valid(kg);
  }

  enterRepresentativeKg(kg: number): void {
    this.representativeKg = WeightTally.valid(kg);
  }

  /** FR-05 edge case: with only one figure the check stays PENDING. */
  status(): CrossCheckStatus {
    if (this.agentKg === undefined || this.representativeKg === undefined) return CrossCheckStatus.PENDING;
    return Math.abs(this.agentKg - this.representativeKg) <= WeightTally.TOLERANCE_KG ? CrossCheckStatus.MATCH : CrossCheckStatus.MISMATCH;
  }

  difference(): number | undefined {
    if (this.agentKg === undefined || this.representativeKg === undefined) return undefined;
    return this.agentKg - this.representativeKg;
  }

  /** The kg a sale may be calculated from — only once both figures agree. */
  confirmedKg(): number {
    if (this.status() !== CrossCheckStatus.MATCH || this.representativeKg === undefined) {
      throw new DomainError('No confirmed total yet.');
    }
    return this.representativeKg;
  }

  private static valid(kg: number): number {
    if (!(kg > 0)) throw new DomainError('Kg must be above 0.');
    return kg;
  }
}
