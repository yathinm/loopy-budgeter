import { z } from 'zod';

import type { PaycheckBudget, StoredBudgetData } from '@/types/budget';

const STORAGE_KEY = 'pocket-plan:data';

const categorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  amountCents: z.number().int().nonnegative(),
  locked: z.boolean(),
});

const budgetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  paycheckCents: z.number().int().positive(),
  payFrequency: z.enum([
    'weekly',
    'biweekly',
    'semimonthly',
    'monthly',
    'one-time',
  ]),
  preset: z.enum(['balanced', 'debt-focused', 'savings-focused', 'custom']),
  categories: z.array(categorySchema).min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const storedDataSchema = z.object({
  version: z.literal(1),
  preferences: z.object({
    lastPaycheckCents: z.number().int().positive().optional(),
    preferredPreset: z
      .enum(['balanced', 'debt-focused', 'savings-focused', 'custom'])
      .optional(),
    payFrequency: z
      .enum(['weekly', 'biweekly', 'semimonthly', 'monthly', 'one-time'])
      .optional(),
  }),
  currentDraft: budgetSchema.optional(),
  budgets: z.array(budgetSchema),
});

export const emptyStoredData: StoredBudgetData = {
  version: 1,
  preferences: {},
  budgets: [],
};

export function loadBudgetData(): StoredBudgetData {
  if (typeof window === 'undefined') return emptyStoredData;
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (!value) return emptyStoredData;
    const parsed = storedDataSchema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : emptyStoredData;
  } catch {
    return emptyStoredData;
  }
}

export function saveBudgetData(data: StoredBudgetData): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function upsertBudget(
  data: StoredBudgetData,
  budget: PaycheckBudget,
): StoredBudgetData {
  const existingIndex = data.budgets.findIndex((item) => item.id === budget.id);
  const budgets = [...data.budgets];
  if (existingIndex >= 0) budgets[existingIndex] = budget;
  else budgets.unshift(budget);
  return { ...data, budgets };
}
