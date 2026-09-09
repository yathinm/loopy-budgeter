import { beforeEach, describe, expect, it } from 'vitest';

import { createBudget } from '@/lib/budget';
import {
  emptyStoredData,
  loadBudgetData,
  saveBudgetData,
  upsertBudget,
} from '@/lib/budget-storage';

describe('budget storage', () => {
  beforeEach(() => localStorage.clear());
  it('round trips valid data', () => {
    const data = upsertBudget(
      emptyStoredData,
      createBudget(12345, 'monthly', 'savings-focused'),
    );
    saveBudgetData(data);
    expect(loadBudgetData()).toEqual(data);
  });
  it('round trips user-created categories', () => {
    const budget = createBudget(12345, 'monthly', 'custom');
    budget.categories.push({
      id: 'custom-rent',
      name: 'Rent',
      color: '#8f5d78',
      amountCents: 0,
      locked: false,
    });
    const data = upsertBudget(emptyStoredData, budget);
    saveBudgetData(data);
    expect(loadBudgetData().budgets[0].categories.at(-1)).toEqual(
      budget.categories.at(-1),
    );
  });
  it('returns defaults for corrupt data', () => {
    localStorage.setItem('pocket-plan:data', '{broken');
    expect(loadBudgetData()).toEqual(emptyStoredData);
  });
  it('updates without duplicating', () => {
    const budget = createBudget(10000, 'weekly', 'balanced');
    const second = upsertBudget(upsertBudget(emptyStoredData, budget), {
      ...budget,
      name: 'Renamed',
    });
    expect(second.budgets).toHaveLength(1);
    expect(second.budgets[0].name).toBe('Renamed');
  });
});
