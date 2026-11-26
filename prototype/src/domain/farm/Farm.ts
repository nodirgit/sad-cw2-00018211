import { DomainError } from '../DomainError';
import { ThresholdRange } from '../environment/ThresholdRange';
import { House } from './House';

/**
 * The farm (Nurota Halol Parranda MCHJ). Composition: Farm owns 1..* Houses.
 * NFR-05: houses are added by configuration (name, capacity), not by code.
 */
export class Farm {
  private readonly id: string;
  private readonly name: string;
  private readonly houses: House[];

  constructor(id: string, name: string, houses: House[] = []) {
    this.id = id;
    this.name = name;
    this.houses = [...houses];
  }

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getHouses(): readonly House[] {
    return this.houses;
  }

  findHouse(houseId: string): House | undefined {
    return this.houses.find((h) => h.getId() === houseId);
  }

  /** NFR-05: a new house is configuration — name + capacity — with a default normal range. */
  addHouse(name: string, capacity: number): House {
    this.checkNameFree(name);
    let n = this.houses.length + 1;
    while (this.findHouse(`house-${n}`)) n++;
    const house = new House(`house-${n}`, name, capacity, new ThresholdRange(18, 32, 50, 70));
    this.houses.push(house);
    return house;
  }

  /** NFR-05: change a house's name and capacity. */
  editHouse(houseId: string, name: string, capacity: number): House {
    const house = this.requireHouse(houseId);
    this.checkNameFree(name, houseId);
    house.setCapacity(capacity);
    house.rename(name);
    return house;
  }

  /**
   * NFR-05: remove a house (e.g. added by mistake or taken out of use).
   * Not while it has an open batch, and the farm keeps at least one house.
   */
  removeHouse(houseId: string): void {
    const house = this.requireHouse(houseId);
    if (house.currentBatch()) throw new DomainError(`${house.getName()} has an open batch. Close the batch first.`);
    if (this.houses.length === 1) throw new DomainError('The farm needs at least one house.');
    this.houses.splice(this.houses.indexOf(house), 1);
  }

  private requireHouse(houseId: string): House {
    const house = this.findHouse(houseId);
    if (!house) throw new DomainError('Unknown house.');
    return house;
  }

  private checkNameFree(name: string, exceptHouseId?: string): void {
    const clash = this.houses.find((h) => h.getId() !== exceptHouseId && h.getName().toLowerCase() === name.trim().toLowerCase());
    if (clash) throw new DomainError(`There is already a house called "${name.trim()}".`);
  }
}
