import { LightController, LightResult } from '../../application/ports/LightController';

/**
 * SIMULATED LIGHT RELAY (prototype only). Realizes LightController with a short delay.
 * Every 4th command "loses the connection" and returns unconfirmed, to show the FR-08 edge case.
 */
export class SimulatedLightController implements LightController {
  private commands = 0;
  private readonly delayMs: number;

  constructor(delayMs = 700) {
    this.delayMs = delayMs;
  }

  async setLight(_houseId: string, on: boolean): Promise<LightResult> {
    this.commands++;
    await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    if (this.commands % 4 === 0) return { confirmed: false, lightOn: null };
    return { confirmed: true, lightOn: on };
  }
}
