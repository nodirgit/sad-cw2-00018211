/** FR-04 edge case: a later recount, kept next to the original — never a silent overwrite. */
export class HeadCountCorrection {
  private readonly newCount: number;
  private readonly note: string;
  private readonly at: Date;

  constructor(newCount: number, note: string, at: Date) {
    this.newCount = newCount;
    this.note = note;
    this.at = at;
  }

  getNewCount(): number {
    return this.newCount;
  }

  getNote(): string {
    return this.note;
  }

  getAt(): Date {
    return this.at;
  }
}
