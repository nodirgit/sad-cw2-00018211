import { describe, expect, it } from 'vitest';
import { ExpenseCategory } from '../src/domain/finance/Expense';
import { RuleBasedVoiceParser } from '../src/infrastructure/voice/RuleBasedVoiceParser';

const today = new Date('2026-11-25T10:00:00');
const parser = new RuleBasedVoiceParser();

describe('FR-06 RuleBasedVoiceParser', () => {
  it('reads an Uzbek cost with amount, date, category and reason', () => {
    const e = parser.parse('Kecha veterinarga 150 ming, dori uchun', today);
    expect(e.getAmount().getValue()).toBe(150_000);
    expect(e.getDate().getValue()?.getDate()).toBe(24);
    expect(e.getCategory().getValue()).toBe(ExpenseCategory.VET);
    expect(e.getReason().getValue()).toMatch(/veterinarga/i);
    expect(e.needsConfirmation()).toBe(false);
  });

  it('reads millions, a house number and "bugun"', () => {
    const e = parser.parse('Bugun 2-xona uchun 1,5 mln yem', today);
    expect(e.getAmount().getValue()).toBe(1_500_000);
    expect(e.getHouseNumber().getValue()).toBe(2);
    expect(e.getCategory().getValue()).toBe(ExpenseCategory.FEED);
    expect(e.getDate().isConfident()).toBe(true);
  });

  it('reads English and digit groups', () => {
    const e = parser.parse('Paid the driver 200 000 yesterday', today);
    expect(e.getAmount().getValue()).toBe(200_000);
    expect(e.getCategory().getValue()).toBe(ExpenseCategory.DRIVER);
  });

  it('flags what it cannot read instead of guessing', () => {
    const e = parser.parse('Bir narsa oldim', today);
    expect(e.flaggedFields()).toEqual(expect.arrayContaining(['amount', 'date', 'category']));
    expect(e.getAmount().getValue()).toBeNull();
  });

  it('flags a bare small number (150 could be 150 thousand)', () => {
    const e = parser.parse('bugun svet uchun 150', today);
    expect(e.getAmount().isConfident()).toBe(false);
    expect(e.getCategory().getValue()).toBe(ExpenseCategory.OTHER);
  });

  it('flags two categories in one sentence', () => {
    const e = parser.parse('bugun yem va dori 300 ming', today);
    expect(e.getCategory().isConfident()).toBe(false);
  });
});
