import { LightController } from '../ports/LightController';
import { FarmService } from './FarmService';

export type LightCommandStatus = 'CONFIRMED' | 'UNCONFIRMED';

export interface LightCommandOutcome {
  status: LightCommandStatus;
  /** The state the app now believes the house is in. */
  lightOn: boolean;
}

/** FR-08: switch a house's lights from the phone and say whether it really happened. */
export class LightingService {
  private readonly controller: LightController;
  private readonly farm: FarmService;

  constructor(controller: LightController, farm: FarmService) {
    this.controller = controller;
    this.farm = farm;
  }

  /**
   * FR-08 edge case: if the connection drops mid-command the relay cannot confirm,
   * so the stored state is NOT changed and the user is told to check / retry.
   */
  async switchLight(houseId: string, on: boolean): Promise<LightCommandOutcome> {
    const house = this.farm.house(houseId);
    const result = await this.controller.setLight(houseId, on);
    if (result.confirmed && result.lightOn !== null) {
      house.setLight(result.lightOn);
      this.farm.save();
      return { status: 'CONFIRMED', lightOn: result.lightOn };
    }
    return { status: 'UNCONFIRMED', lightOn: house.isLightOn() };
  }
}
