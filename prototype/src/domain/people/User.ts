/**
 * NFR-03: who is logged in decides whether costs, revenue and profit are shown.
 * Generalization: Director and Worker override canViewFinancials() (polymorphism).
 */
export abstract class User {
  protected readonly id: string;
  protected readonly name: string;
  protected readonly pin: string;

  constructor(id: string, name: string, pin: string) {
    this.id = id;
    this.name = name;
    this.pin = pin;
  }

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  /** NFR-03: 4-digit PIN login on a shared farm phone. */
  checkPin(pin: string): boolean {
    return this.pin === pin;
  }

  abstract canViewFinancials(): boolean;

  abstract roleName(): string;
}
