/** FR-08: what the house's light relay reported back. */
export interface LightResult {
  /** false when the connection dropped and the relay did not confirm the change. */
  confirmed: boolean;
  /** The state the relay reports; null when unknown. */
  lightOn: boolean | null;
}

/** FR-08: remote lighting (simulated in the prototype, a smart relay later). */
export interface LightController {
  setLight(houseId: string, on: boolean): Promise<LightResult>;
}
