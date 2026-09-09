import type {
  BudgetCategory,
  BudgetPreset,
  CategoryId,
  PaycheckBudget,
} from '@/types/budget';

export const BASIS_POINTS_TOTAL = 10_000;

export const categoryConfig: Record<
  CategoryId,
  {
    name: string;
    shortName: string;
    description: string;
    color: string;
  }
> = {
  savings: {
    name: 'Savings',
    shortName: 'Savings',
    description: 'Build your cushion or move a future goal closer.',
    color: '#c97882',
  },
  'credit-card': {
    name: 'Credit card payment',
    shortName: 'Credit card',
    description: 'Bring down your balance and make debt feel lighter.',
    color: '#55142f',
  },
  eating: {
    name: 'Eating',
    shortName: 'Eating',
    description: 'Cover groceries, coffee, and meals out.',
    color: '#e89aa5',
  },
  shopping: {
    name: 'Shopping',
    shortName: 'Shopping',
    description: 'Set aside guilt-free room for wants and extras.',
    color: '#d95f5f',
  },
};

export const presetBasisPoints: Record<
  Exclude<BudgetPreset, 'custom'>,
  Record<CategoryId, number>
> = {
  balanced: {
    savings: 3000,
    'credit-card': 3000,
    eating: 2500,
    shopping: 1500,
  },
  'debt-focused': {
    savings: 2000,
    'credit-card': 5000,
    eating: 2000,
    shopping: 1000,
  },
  'savings-focused': {
    savings: 5000,
    'credit-card': 2500,
    eating: 1500,
    shopping: 1000,
  },
};

export const presetLabels: Record<
  BudgetPreset,
  { name: string; description: string }
> = {
  balanced: {
    name: 'Balanced',
    description: 'An even mix for today and tomorrow.',
  },
  'debt-focused': {
    name: 'Debt focused',
    description: 'Put more power toward your card balance.',
  },
  'savings-focused': {
    name: 'Savings focused',
    description: 'Move half your check toward future goals.',
  },
  custom: { name: 'Custom', description: 'Choose every percentage yourself.' },
};

export function parseCurrencyToCents(value: string): number | null {
  const normalized = value.replace(/[$,\s]/g, '');
  if (!/^\d+(?:\.\d{0,2})?$/.test(normalized)) return null;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * 100);
}

export function formatCurrency(
  cents: number,
  options: { compact?: boolean } = {},
): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: options.compact && cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatPercentage(basisPoints: number): string {
  const percentage = basisPoints / 100;
  return Number.isInteger(percentage)
    ? String(percentage)
    : percentage.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

export function percentageForAmount(
  amountCents: number,
  paycheckCents: number,
): number {
  if (paycheckCents <= 0) return 0;
  return Math.round((amountCents / paycheckCents) * BASIS_POINTS_TOTAL);
}

export function amountForPercentage(
  paycheckCents: number,
  basisPoints: number,
): number {
  return Math.round((paycheckCents * basisPoints) / BASIS_POINTS_TOTAL);
}

export function allocatePreset(
  paycheckCents: number,
  preset: Exclude<BudgetPreset, 'custom'>,
): BudgetCategory[] {
  const entries = Object.entries(presetBasisPoints[preset]) as [
    CategoryId,
    number,
  ][];
  const raw = entries.map(([id, basisPoints]) => ({
    id,
    amount: (paycheckCents * basisPoints) / BASIS_POINTS_TOTAL,
  }));
  const categories = raw.map(({ id, amount }) => ({
    id,
    amountCents: Math.floor(amount),
    locked: false,
  }));
  const remainder =
    paycheckCents -
    categories.reduce((sum, category) => sum + category.amountCents, 0);
  const ranked = raw
    .map(({ id, amount }, index) => ({
      id,
      index,
      fraction: amount - Math.floor(amount),
    }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);

  for (let index = 0; index < remainder; index += 1) {
    categories[ranked[index % ranked.length].index].amountCents += 1;
  }
  return categories;
}

export function totalAllocated(categories: BudgetCategory[]): number {
  return categories.reduce(
    (total, category) => total + category.amountCents,
    0,
  );
}

export function remainingAmount(
  budget: Pick<PaycheckBudget, 'paycheckCents' | 'categories'>,
): number {
  return budget.paycheckCents - totalAllocated(budget.categories);
}

export function isBudgetSavable(budget: PaycheckBudget): boolean {
  const remaining = remainingAmount(budget);
  return (
    budget.paycheckCents > 0 &&
    remaining >= 0 &&
    (budget.preset !== 'custom' || remaining === 0)
  );
}

export function createBudget(
  paycheckCents: number,
  payFrequency: PaycheckBudget['payFrequency'],
  preset: BudgetPreset,
): PaycheckBudget {
  const now = new Date().toISOString();
  const basePreset = preset === 'custom' ? 'balanced' : preset;
  return {
    id: crypto.randomUUID(),
    name: `Paycheck plan · ${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date())}`,
    paycheckCents,
    payFrequency,
    preset,
    categories: allocatePreset(paycheckCents, basePreset),
    createdAt: now,
    updatedAt: now,
  };
}
