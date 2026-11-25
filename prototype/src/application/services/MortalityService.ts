import { DomainError } from '../../domain/DomainError';
import { Batch } from '../../domain/farm/Batch';
import { MortalityRecord } from '../../domain/farm/MortalityRecord';
import { User } from '../../domain/people/User';
import { newId } from '../ids';
import { Repository } from '../ports/Repository';
import { FarmService } from './FarmService';

export interface DeathLogResult {
  record: MortalityRecord;
  /** Set when the new record was flagged as a likely duplicate of this one. */
  duplicateOf?: MortalityRecord;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** FR-01 + NFR-02: any worker logs a death directly, from either house, at the moment it is found. */
export class MortalityService {
  /** Two reports of the same count in the same house within 2 minutes look like one death. */
  static readonly DUPLICATE_WINDOW_MS = 2 * 60 * 1000;

  private readonly records: Repository<MortalityRecord>;
  private readonly farm: FarmService;
  private readonly clock: () => Date;

  constructor(records: Repository<MortalityRecord>, farm: FarmService, clock: () => Date = () => new Date()) {
    this.records = records;
    this.farm = farm;
    this.clock = clock;
  }

  /** FR-01: house-tagged, batch-tagged, timestamped; NFR-02: entries from both houses stay separate. */
  logDeath(houseId: string, count: number, user: User): DeathLogResult {
    if (!Number.isInteger(count) || count <= 0) throw new DomainError('Count must be a whole number above 0.');
    const batch = this.farm.openBatch(houseId);
    const record = new MortalityRecord(newId('death'), batch.getId(), houseId, this.clock(), count, user);
    // FR-01 edge case: flag a likely duplicate instead of counting it twice.
    const duplicateOf = this.records.findAll().find((r) => record.looksLikeDuplicateOf(r, MortalityService.DUPLICATE_WINDOW_MS));
    if (duplicateOf) record.flagAsDuplicate();
    this.records.save(record);
    return { record, duplicateOf };
  }

  /** The person confirms the flagged record was a different bird: count it. */
  countSeparately(recordId: string): MortalityRecord {
    const record = this.records.findById(recordId);
    if (!record) throw new DomainError('Record not found.');
    record.confirmSeparate();
    this.records.save(record);
    return record;
  }

  recordsForBatch(batchId: string): MortalityRecord[] {
    return this.records
      .findAll()
      .filter((r) => r.getBatchId() === batchId)
      .sort((a, b) => b.getTimestamp().getTime() - a.getTimestamp().getTime());
  }

  totalDeaths(batchId: string): number {
    return this.recordsForBatch(batchId)
      .filter((r) => r.isCounted())
      .reduce((sum, r) => sum + r.getCount(), 0);
  }

  deathsToday(batchId: string): number {
    const today = this.clock();
    return this.recordsForBatch(batchId)
      .filter((r) => r.isCounted() && sameDay(r.getTimestamp(), today))
      .reduce((sum, r) => sum + r.getCount(), 0);
  }

  /** Chicks placed minus counted deaths. */
  birdsAlive(batch: Batch): number {
    return Math.max(0, batch.getChicksPlaced() - this.totalDeaths(batch.getId()));
  }
}
