import { DomainError } from '../DomainError';
import { BatchStatus } from './BatchStatus';

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * One flock in one house, from chick placement to an empty house (~60 days).
 * FR-02 / FR-03: feed, costs and sales are tagged to a Batch, never to a shared pool.
 */
export class Batch {
  private readonly id: string;
  private readonly houseId: string;
  private readonly startDate: Date;
  private readonly chicksPlaced: number;
  private status: BatchStatus;

  constructor(id: string, houseId: string, startDate: Date, chicksPlaced: number, status: BatchStatus = BatchStatus.OPEN) {
    if (!Number.isInteger(chicksPlaced) || chicksPlaced <= 0) {
      throw new DomainError('Chicks placed must be a whole number above 0.');
    }
    this.id = id;
    this.houseId = houseId;
    this.startDate = startDate;
    this.chicksPlaced = chicksPlaced;
    this.status = status;
  }

  getId(): string {
    return this.id;
  }

  getHouseId(): string {
    return this.houseId;
  }

  getStartDate(): Date {
    return this.startDate;
  }

  getChicksPlaced(): number {
    return this.chicksPlaced;
  }

  getStatus(): BatchStatus {
    return this.status;
  }

  /** Bird age; placement day is day 0. */
  ageInDays(today: Date = new Date()): number {
    return Math.max(0, Math.round((startOfDay(today) - startOfDay(this.startDate)) / DAY_MS));
  }

  /** A batch accepts records until it is closed (slaughtering still counts as open). */
  isOpen(): boolean {
    return this.status !== BatchStatus.CLOSED;
  }

  startSlaughter(): void {
    if (this.status === BatchStatus.OPEN) {
      this.status = BatchStatus.SLAUGHTERING;
    }
  }

  close(): void {
    this.status = BatchStatus.CLOSED;
  }
}
