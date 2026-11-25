import { ThresholdRange } from './ThresholdRange';

/** FR-07: one live temperature + humidity reading from a house. */
export class SensorReading {
  private readonly houseId: string;
  private readonly temperatureC: number;
  private readonly humidityPct: number;
  private readonly timestamp: Date;

  constructor(houseId: string, temperatureC: number, humidityPct: number, timestamp: Date) {
    this.houseId = houseId;
    this.temperatureC = temperatureC;
    this.humidityPct = humidityPct;
    this.timestamp = timestamp;
  }

  getHouseId(): string {
    return this.houseId;
  }

  getTemperatureC(): number {
    return this.temperatureC;
  }

  getHumidityPct(): number {
    return this.humidityPct;
  }

  getTimestamp(): Date {
    return this.timestamp;
  }

  /** FR-07 edge case: a reading outside the director-set range is flagged. */
  isAbnormal(range: ThresholdRange): boolean {
    return this.problems(range).length > 0;
  }

  problems(range: ThresholdRange): string[] {
    const out: string[] = [];
    if (!range.containsTemperature(this.temperatureC)) {
      out.push(this.temperatureC > range.getMaxTempC() ? `Too hot (max ${range.getMaxTempC()} °C)` : `Too cold (min ${range.getMinTempC()} °C)`);
    }
    if (!range.containsHumidity(this.humidityPct)) {
      out.push(this.humidityPct > range.getMaxHumidityPct() ? `Too humid (max ${range.getMaxHumidityPct()} %)` : `Too dry (min ${range.getMinHumidityPct()} %)`);
    }
    return out;
  }
}
