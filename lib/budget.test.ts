import { describe, expect, it } from 'vitest';

import {
  allocatePreset,
  amountForPercentage,
  createBudget,
  formatCurrency,
  isBudgetSavable,
  parseCurrencyToCents,
  percentageForAmount,
  remainingAmount,
  totalAllocated,
} from '@/lib/budget';

describe('currency helpers', () => {
  it.each([
    ['2,000.25', 200025],
    ['$0.01', 1],
    ['40', 4000],
    ['40.5', 4050],
  ])('parses %s into cents', (input, expected) =>
    expect(parseCurrencyToCents(input)).toBe(expected),
  );
  it.each(['', '-1', '1.234', 'money', '1.2.3'])(
    'rejects invalid currency %s',
    (input) => expect(parseCurrencyToCents(input)).toBeNull(),
  );
  it('formats cents as US dollars', () =>
    expect(formatCurrency(200025)).toBe('$2,000.25'));
});

describe('budget allocation', () => {
  it.each(['balanced', 'debt-focused', 'savings-focused'] as const)(
    'allocates every cent for %s',
    (preset) => {
      for (const paycheck of [1, 2, 3, 99, 10001, 200025, 99999999])
        expect(totalAllocated(allocatePreset(paycheck, preset))).toBe(paycheck);
    },
  );
  it('uses the balanced percentages', () =>
    expect(
      allocatePreset(200000, 'balanced').map((item) => item.amountCents),
    ).toEqual([60000, 60000, 50000, 30000]));
  it('converts between amounts and percentages', () => {
    expect(amountForPercentage(200000, 2550)).toBe(51000);
    expect(percentageForAmount(51000, 200000)).toBe(2550);
  });
  it('tracks under and over allocation', () => {
    const budget = createBudget(10000, 'weekly', 'balanced');
    budget.categories[0].amountCents = 2000;
    expect(remainingAmount(budget)).toBe(1000);
    expect(isBudgetSavable(budget)).toBe(true);
    budget.categories[0].amountCents = 4000;
    expect(remainingAmount(budget)).toBe(-1000);
    expect(isBudgetSavable(budget)).toBe(false);
  });
  it('requires custom plans to be fully allocated before saving', () => {
    const budget = createBudget(10000, 'weekly', 'custom');
    budget.categories[0].amountCents -= 1;
    expect(isBudgetSavable(budget)).toBe(false);
    budget.categories[0].amountCents += 1;
    expect(isBudgetSavable(budget)).toBe(true);
  });
});
