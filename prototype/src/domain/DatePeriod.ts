import { DomainError } from './DomainError';

/** A span of whole days (value object), used to show only the records of a time period. */
export class DatePeriod {
  private readonly from: Date | null;
  private readonly to: Date | null;

  private constructor(from: Date | null, to: Date | null) {
    if (from && to && from.getTime() > to.getTime()) throw new DomainError('The start date is after the end date.');
    this.from = from;
    this.to = to;
  }

  /** Today and the (days − 1) days before it. */
  static lastDays(days: number, now: Date = new Date()): DatePeriod {
    const from = startOfDay(now);
    from.setDate(from.getDate() - (days - 1));
    return new DatePeriod(from, endOfDay(now));
  }

  /** From the start of one day to the end of another. */
  static between(from: Date, to: Date): DatePeriod {
    return new DatePeriod(startOfDay(from), endOfDay(to));
  }

  /** No limit. */
  static allTime(): DatePeriod {
    return new DatePeriod(null, null);
  }

  contains(date: Date): boolean {
    const t = date.getTime();
    return (this.from === null || t >= this.from.getTime()) && (this.to === null || t <= this.to.getTime());
  }

  getFrom(): Date | null {
    return this.from;
  }

  getTo(): Date | null {
    return this.to;
  }
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
