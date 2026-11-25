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
    if (this.houses.some((h) => h.getName().toLowerCase() === name.trim().toLowerCase())) {
      throw new DomainError(`There is already a house called "${name.trim()}".`);
    }
    let n = this.houses.length + 1;
    while (this.findHouse(`house-${n}`)) n++;
    const house = new House(`house-${n}`, name, capacity, new ThresholdRange(18, 32, 50, 70));
    this.houses.push(house);
    return house;
  }
}
