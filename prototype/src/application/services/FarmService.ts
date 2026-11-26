import { DomainError } from '../../domain/DomainError';
import { ThresholdRange } from '../../domain/environment/ThresholdRange';
import { Batch } from '../../domain/farm/Batch';
import { Farm } from '../../domain/farm/Farm';
import { House } from '../../domain/farm/House';
import { User } from '../../domain/people/User';
import { newId } from '../ids';
import { Repository } from '../ports/Repository';
import { AccessPolicy } from './AccessPolicy';

export const FARM_ID = 'main';

/** Houses and batches: finding the right open batch, and NFR-05 configuration. */
export class FarmService {
  private readonly farms: Repository<Farm>;
  private readonly policy: AccessPolicy;

  constructor(farms: Repository<Farm>, policy: AccessPolicy) {
    this.farms = farms;
    this.policy = policy;
  }

  farm(): Farm {
    const farm = this.farms.findById(FARM_ID);
    if (!farm) throw new DomainError('Farm data missing. Reset demo data in Settings.');
    return farm;
  }

  houses(): readonly House[] {
    return this.farm().getHouses();
  }

  house(houseId: string): House {
    const house = this.farm().findHouse(houseId);
    if (!house) throw new DomainError('Unknown house.');
    return house;
  }

  /** FR-02 / FR-03 edge case: every record goes to the batch open in *that* house. */
  openBatch(houseId: string): Batch {
    const house = this.house(houseId);
    const batch = house.currentBatch();
    if (!batch) throw new DomainError(`${house.getName()} has no open batch.`);
    return batch;
  }

  batch(batchId: string): Batch | undefined {
    for (const house of this.houses()) {
      const b = house.findBatch(batchId);
      if (b) return b;
    }
    return undefined;
  }

  houseOfBatch(batchId: string): House | undefined {
    return this.houses().find((h) => h.findBatch(batchId));
  }

  /** NFR-05: a new house by configuration (name, capacity) — no code change. */
  addHouse(name: string, capacity: number, user: User): House {
    this.policy.requireDirector(user);
    const house = this.farm().addHouse(name, capacity);
    this.save();
    return house;
  }

  /** NFR-05: rename a house or change its capacity. */
  editHouse(houseId: string, name: string, capacity: number, user: User): House {
    this.policy.requireDirector(user);
    const house = this.farm().editHouse(houseId, name, capacity);
    this.save();
    return house;
  }

  /** NFR-05: remove a house with no open batch. */
  removeHouse(houseId: string, user: User): void {
    this.policy.requireDirector(user);
    this.farm().removeHouse(houseId);
    this.save();
  }

  startBatch(houseId: string, chicksPlaced: number, startDate: Date, user: User): Batch {
    this.policy.requireDirector(user);
    const batch = this.house(houseId).placeBatch(newId('batch'), startDate, chicksPlaced);
    this.save();
    return batch;
  }

  closeBatch(houseId: string, user: User): void {
    this.policy.requireDirector(user);
    this.openBatch(houseId).close();
    this.save();
  }

  /** Correct the open batch's chicks placed and start date. */
  editBatch(houseId: string, chicksPlaced: number, startDate: Date, user: User): Batch {
    this.policy.requireDirector(user);
    const batch = this.house(houseId).correctBatch(chicksPlaced, startDate);
    this.save();
    return batch;
  }

  /** Undo a close made by mistake. */
  reopenBatch(houseId: string, user: User): Batch {
    this.policy.requireDirector(user);
    const batch = this.house(houseId).reopenLastBatch();
    this.save();
    return batch;
  }

  /** FR-07: the director decides what counts as abnormal for each house. */
  setThresholds(houseId: string, range: ThresholdRange, user: User): void {
    this.policy.requireDirector(user);
    this.house(houseId).setThresholds(range);
    this.save();
  }

  /** Persist after a House or Batch changed (they are parts of the Farm aggregate). */
  save(): void {
    this.farms.save(this.farm());
  }
}
