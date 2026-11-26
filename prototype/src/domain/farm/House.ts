import { DomainError } from '../DomainError';
import { ThresholdRange } from '../environment/ThresholdRange';
import { Batch } from './Batch';

/**
 * A poultry house. Composition: a House creates and owns its Batches (0..*)
 * and its normal-range setting.
 */
export class House {
  private readonly id: string;
  private name: string;
  private capacity: number;
  private lightOn: boolean;
  private thresholds: ThresholdRange;
  private readonly batches: Batch[];

  constructor(id: string, name: string, capacity: number, thresholds: ThresholdRange, lightOn = false, batches: Batch[] = []) {
    if (!name.trim()) throw new DomainError('A house needs a name.');
    if (!Number.isInteger(capacity) || capacity <= 0) throw new DomainError('Capacity must be a whole number above 0.');
    this.id = id;
    this.name = name.trim();
    this.capacity = capacity;
    this.thresholds = thresholds;
    this.lightOn = lightOn;
    this.batches = [...batches];
  }

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getCapacity(): number {
    return this.capacity;
  }

  isLightOn(): boolean {
    return this.lightOn;
  }

  getThresholds(): ThresholdRange {
    return this.thresholds;
  }

  getBatches(): readonly Batch[] {
    return this.batches;
  }

  /** FR-02 / FR-03: the batch new records go to. Houses run on their own schedules. */
  currentBatch(): Batch | undefined {
    return this.batches.find((b) => b.isOpen());
  }

  findBatch(batchId: string): Batch | undefined {
    return this.batches.find((b) => b.getId() === batchId);
  }

  /** Places a new flock. Only one open batch per house at a time. */
  placeBatch(batchId: string, startDate: Date, chicksPlaced: number): Batch {
    if (this.currentBatch()) throw new DomainError(`${this.name} already has an open batch.`);
    if (chicksPlaced > this.capacity) throw new DomainError(`${this.name} holds at most ${this.capacity.toLocaleString('en-US')} birds.`);
    const batch = new Batch(batchId, this.id, startDate, chicksPlaced);
    this.batches.push(batch);
    return batch;
  }

  /** NFR-05: the director corrects the name (uniqueness is checked by the Farm). */
  rename(name: string): void {
    if (!name.trim()) throw new DomainError('A house needs a name.');
    this.name = name.trim();
  }

  /** NFR-05: capacity is configuration too, but never below the birds already placed. */
  setCapacity(capacity: number): void {
    if (!Number.isInteger(capacity) || capacity <= 0) throw new DomainError('Capacity must be a whole number above 0.');
    const open = this.currentBatch();
    if (open && open.getChicksPlaced() > capacity) {
      throw new DomainError(`${this.name} already holds a batch of ${open.getChicksPlaced().toLocaleString('en-US')} chicks.`);
    }
    this.capacity = capacity;
  }

  /** Correct the open batch's chicks placed and start date (never above capacity). */
  correctBatch(chicksPlaced: number, startDate: Date): Batch {
    const batch = this.currentBatch();
    if (!batch) throw new DomainError(`${this.name} has no open batch.`);
    if (chicksPlaced > this.capacity) throw new DomainError(`${this.name} holds at most ${this.capacity.toLocaleString('en-US')} birds.`);
    batch.correctPlacement(chicksPlaced, startDate);
    return batch;
  }

  /** Reopen the most recent batch if it was closed by mistake. */
  reopenLastBatch(): Batch {
    if (this.currentBatch()) throw new DomainError(`${this.name} already has an open batch.`);
    const last = this.batches[this.batches.length - 1];
    if (!last) throw new DomainError(`${this.name} has no batch to reopen.`);
    last.reopen();
    return last;
  }

  /** FR-08: only called once the light controller has confirmed the change. */
  setLight(on: boolean): void {
    this.lightOn = on;
  }

  /** FR-07: the director sets what is "abnormal" for this house. */
  setThresholds(range: ThresholdRange): void {
    this.thresholds = range;
  }
}
