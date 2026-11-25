import { DomainError } from '../DomainError';

/** FR-07: the director-set normal range for one house. */
export class ThresholdRange {
  private readonly minTempC: number;
  private readonly maxTempC: number;
  private readonly minHumidityPct: number;
  private readonly maxHumidityPct: number;

  constructor(minTempC: number, maxTempC: number, minHumidityPct: number, maxHumidityPct: number) {
    if (!(minTempC < maxTempC) || !(minHumidityPct < maxHumidityPct)) {
      throw new DomainError('Each minimum must be below its maximum.');
    }
    this.minTempC = minTempC;
    this.maxTempC = maxTempC;
    this.minHumidityPct = minHumidityPct;
    this.maxHumidityPct = maxHumidityPct;
  }

  getMinTempC(): number {
    return this.minTempC;
  }

  getMaxTempC(): number {
    return this.maxTempC;
  }

  getMinHumidityPct(): number {
    return this.minHumidityPct;
  }

  getMaxHumidityPct(): number {
    return this.maxHumidityPct;
  }

  containsTemperature(c: number): boolean {
    return c >= this.minTempC && c <= this.maxTempC;
  }

  containsHumidity(pct: number): boolean {
    return pct >= this.minHumidityPct && pct <= this.maxHumidityPct;
  }
}
