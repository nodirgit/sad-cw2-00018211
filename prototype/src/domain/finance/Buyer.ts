/**
 * Who the meat is sold to (none are employees). Generalization: each buyer type
 * says whether its weights must be cross-checked before a sale is recorded (FR-05).
 */
export abstract class Buyer {
  protected readonly name: string;

  constructor(name: string) {
    this.name = name;
  }

  getName(): string {
    return this.name;
  }

  abstract requiresCrossCheck(): boolean;

  abstract typeLabel(): string;
}

/** Middleman at Navoi bazaar; sends kg totals as a Telegram photo, so his figure is checked. */
export class BazaarAgent extends Buyer {
  requiresCrossCheck(): boolean {
    return true;
  }

  typeLabel(): string {
    return 'Bazaar Agent';
  }
}

export class NurataSeller extends Buyer {
  requiresCrossCheck(): boolean {
    return false;
  }

  typeLabel(): string {
    return 'Nurata Seller';
  }
}

export class ShopCustomer extends Buyer {
  requiresCrossCheck(): boolean {
    return false;
  }

  typeLabel(): string {
    return 'Shop Customer';
  }
}

/** Small orders of 50–100 birds slaughtered on the farm. */
export class Client extends Buyer {
  requiresCrossCheck(): boolean {
    return false;
  }

  typeLabel(): string {
    return 'Client';
  }
}
