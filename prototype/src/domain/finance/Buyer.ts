import { Partner } from '../partners/Partner';

/** The groups of partners the farm sells meat to (Farm Facts: none of them are employees). */
export enum BuyerGroup {
  /** Middleman at Navoi bazaar; sends kg totals as a Telegram photo, so his figure is checked (FR-05). */
  BAZAAR_AGENT = 'BAZAAR_AGENT',
  /** e.g. the seller at Nurata. */
  RESELLER = 'RESELLER',
  /** The shop at the Director's house. */
  SHOP = 'SHOP',
  /** Small orders of 50–100 birds slaughtered on the farm. */
  CLIENT = 'CLIENT',
}

export const BUYER_GROUP_LABEL: Record<BuyerGroup, string> = {
  [BuyerGroup.BAZAAR_AGENT]: 'Bazaar agents',
  [BuyerGroup.RESELLER]: 'Resellers',
  [BuyerGroup.SHOP]: 'Shop',
  [BuyerGroup.CLIENT]: 'Clients',
};

/** A partner the meat is sold to. Its group decides whether its weights must be cross-checked first (FR-05). */
export class Buyer extends Partner {
  private readonly group: BuyerGroup;

  constructor(id: string, name: string, group: BuyerGroup, active = true) {
    super(id, name, active);
    this.group = group;
  }

  getGroup(): BuyerGroup {
    return this.group;
  }

  /** FR-05: only a Bazaar agent's figure needs the Trusted Representative's to match before a sale. */
  requiresCrossCheck(): boolean {
    return this.group === BuyerGroup.BAZAAR_AGENT;
  }

  groupLabel(): string {
    return BUYER_GROUP_LABEL[this.group];
  }
}
