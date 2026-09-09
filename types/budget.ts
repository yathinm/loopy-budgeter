export const categoryIds = [
  'savings',
  'credit-card',
  'eating',
  'shopping',
] as const;
export type CategoryId = (typeof categoryIds)[number];

export type PayFrequency =
  | 'weekly'
  | 'biweekly'
  | 'semimonthly'
  | 'monthly'
  | 'one-time';
export type BudgetPreset =
  | 'balanced'
  | 'debt-focused'
  | 'savings-focused'
  | 'custom';

export type BudgetCategory = {
  id: CategoryId;
  amountCents: number;
  locked: boolean;
};

export type PaycheckBudget = {
  id: string;
  name: string;
  paycheckCents: number;
  payFrequency: PayFrequency;
  preset: BudgetPreset;
  categories: BudgetCategory[];
  createdAt: string;
  updatedAt: string;
};

export type BudgetPreferences = {
  lastPaycheckCents?: number;
  preferredPreset?: BudgetPreset;
  payFrequency?: PayFrequency;
};

export type StoredBudgetData = {
  version: 1;
  preferences: BudgetPreferences;
  currentDraft?: PaycheckBudget;
  budgets: PaycheckBudget[];
};
