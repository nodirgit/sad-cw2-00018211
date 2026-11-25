import { SensorReading } from '../../domain/environment/SensorReading';

/** FR-07: where live readings come from (simulated in the prototype, IoT sensors later). */
export interface SensorProvider {
  latest(houseId: string): SensorReading;
}
