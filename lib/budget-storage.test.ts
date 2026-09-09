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
