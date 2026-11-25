import { SensorProvider } from '../../application/ports/SensorProvider';
import { SensorReading } from '../../domain/environment/SensorReading';

export interface Baseline {
  temperatureC: number;
  humidityPct: number;
}

/**
 * SIMULATED SENSOR (prototype only). Realizes SensorProvider with a small random walk
 * around a baseline per house. Real IoT sensors would implement the same interface (FR-07).
 */
export class SimulatedSensorProvider implements SensorProvider {
  private readonly baselines: Record<string, Baseline>;
  private readonly fallback: Baseline = { temperatureC: 24, humidityPct: 60 };
  private readonly state = new Map<string, Baseline>();

  constructor(baselines: Record<string, Baseline>) {
    this.baselines = baselines;
  }

  latest(houseId: string): SensorReading {
    const base = this.baselines[houseId] ?? this.fallback;
    const prev = this.state.get(houseId) ?? base;
    const next = {
      temperatureC: SimulatedSensorProvider.walk(prev.temperatureC, base.temperatureC, 0.15, 0.5),
      humidityPct: SimulatedSensorProvider.walk(prev.humidityPct, base.humidityPct, 0.6, 2.5),
    };
    this.state.set(houseId, next);
    return new SensorReading(houseId, Math.round(next.temperatureC * 10) / 10, Math.round(next.humidityPct), new Date());
  }

  private static walk(value: number, base: number, step: number, maxDrift: number): number {
    const moved = value + (Math.random() * 2 - 1) * step;
    return Math.min(base + maxDrift, Math.max(base - maxDrift, moved));
  }
}
