import { DomainError } from '../DomainError';
import { User } from '../people/User';

/**
 * FR-01: a chick death logged by the worker who found it, tagged to house and batch.
 * Association: each record knows the User who logged it.
 */
export class MortalityRecord {
  private readonly id: string;
  private readonly batchId: string;
  private readonly houseId: string;
  private readonly timestamp: Date;
  private count: number;
  private readonly loggedBy: User;
  private flaggedDuplicate: boolean;

  constructor(id: string, batchId: string, houseId: string, timestamp: Date, count: number, loggedBy: User, flaggedDuplicate = false) {
    this.id = id;
    this.batchId = batchId;
    this.houseId = houseId;
    this.timestamp = timestamp;
    this.count = count;
    this.loggedBy = loggedBy;
    this.flaggedDuplicate = flaggedDuplicate;
  }

  getId(): string {
    return this.id;
  }

  getBatchId(): string {
    return this.batchId;
  }

  getHouseId(): string {
    return this.houseId;
  }

  getTimestamp(): Date {
    return this.timestamp;
  }

  getCount(): number {
    return this.count;
  }

  getLoggedBy(): User {
    return this.loggedBy;
  }

  isFlaggedDuplicate(): boolean {
    return this.flaggedDuplicate;
  }

  /** Flagged records are kept for the audit trail but not added to the death total. */
  isCounted(): boolean {
    return !this.flaggedDuplicate;
  }

  /**
   * FR-01 edge case: the same death reported twice (two workers, or a double tap) —
   * same house, same count, logged within the time window of a counted record.
   */
  looksLikeDuplicateOf(other: MortalityRecord, windowMs: number): boolean {
    return (
      other.id !== this.id &&
      other.isCounted() &&
      other.houseId === this.houseId &&
      other.count === this.count &&
      Math.abs(other.timestamp.getTime() - this.timestamp.getTime()) <= windowMs
    );
  }

  /** Correct a mistyped count. */
  changeCount(count: number): void {
    if (!Number.isInteger(count) || count <= 0) throw new DomainError('Count must be a whole number above 0.');
    this.count = count;
  }

  flagAsDuplicate(): void {
    this.flaggedDuplicate = true;
  }

  /** The person confirms it really was a different bird, so it is counted. */
  confirmSeparate(): void {
    this.flaggedDuplicate = false;
  }
}
