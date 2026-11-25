import { SensorReading } from '../../domain/environment/SensorReading';
import { ThresholdRange } from '../../domain/environment/ThresholdRange';
import { SensorProvider } from '../ports/SensorProvider';
import { FarmService } from './FarmService';

export interface HouseEnvironment {
  houseId: string;
  reading: SensorReading;
  range: ThresholdRange;
  abnormal: boolean;
  problems: string[];
}

/** FR-07: live temperature and humidity per house, flagged against the director's range. */
export class MonitoringService {
  private readonly sensors: SensorProvider;
  private readonly farm: FarmService;

  constructor(sensors: SensorProvider, farm: FarmService) {
    this.sensors = sensors;
    this.farm = farm;
  }

  check(houseId: string): HouseEnvironment {
    const range = this.farm.house(houseId).getThresholds();
    const reading = this.sensors.latest(houseId);
    const problems = reading.problems(range);
    return { houseId, reading, range, abnormal: reading.isAbnormal(range), problems };
  }

  alerts(): HouseEnvironment[] {
    return this.farm
      .houses()
      .map((h) => this.check(h.getId()))
      .filter((e) => e.abnormal);
  }
}
