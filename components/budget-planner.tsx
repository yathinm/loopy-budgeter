'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import Image from 'next/image';
import {
  Check,
  Copy,
  CreditCard,
  Lock,
  LockOpen,
  Pencil,
  PiggyBank,
  Plus,
  RotateCcw,
  Save,
  ShoppingBag,
  Sparkles,
  Trash2,
  Utensils,
  WalletCards,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Pie, PieChart, Tooltip } from 'recharts';
import { z } from 'zod';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import {
  amountForPercentage,
  categoryConfig,
  createBudget,
  formatCurrency,
  formatPercentage,
  isBudgetSavable,
  parseCurrencyToCents,
  percentageForAmount,
  presetBasisPoints,
  presetLabels,
  remainingAmount,
  totalAllocated,
} from '@/lib/budget';
import {
  emptyStoredData,
  loadBudgetData,
  saveBudgetData,
  upsertBudget,
} from '@/lib/budget-storage';
import type {
  BudgetCategory,
  BudgetPreset,
  CategoryId,
  PayFrequency,
  PaycheckBudget,
  StoredBudgetData,
} from '@/types/budget';

const setupSchema = z.object({
  paycheck: z.string().refine((value) => {
    const cents = parseCurrencyToCents(value);
    return cents !== null && cents > 0 && cents <= 100_000_000;
  }, 'Enter a take-home paycheck between $0.01 and $1,000,000.'),
  frequency: z.enum([
    'weekly',
    'biweekly',
    'semimonthly',
    'monthly',
    'one-time',
  ]),
  preset: z.enum(['balanced', 'debt-focused', 'savings-focused', 'custom']),
});
type SetupValues = z.infer<typeof setupSchema>;

const icons: Record<CategoryId, typeof PiggyBank> = {
  savings: PiggyBank,
  'credit-card': CreditCard,
  eating: Utensils,
  shopping: ShoppingBag,
};
const frequencies: { value: PayFrequency; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every two weeks' },
  { value: 'semimonthly', label: 'Twice monthly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'one-time', label: 'One-time' },
];
const presetOrder: BudgetPreset[] = [
  'balanced',
  'debt-focused',
  'savings-focused',
  'custom',
];

function AllocationCard({
  budget,
  category,
  onChange,
  onToggleLock,
}: {
  budget: PaycheckBudget;
  category: BudgetCategory;
  onChange: (amount: number) => void;
  onToggleLock: () => void;
}) {
  const config = categoryConfig[category.id];
  const Icon = icons[category.id];
  const basisPoints = percentageForAmount(
    category.amountCents,
    budget.paycheckCents,
  );
  return (
    <article className="rounded-[24px] border border-plum/8 bg-white/75 p-5 shadow-[0_12px_38px_rgba(85,20,47,0.06)] transition hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className="grid size-11 place-items-center rounded-2xl text-white"
            style={{ backgroundColor: config.color }}
          >
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h3 className="font-semibold text-plum">{config.name}</h3>
            <p className="text-sm text-ink/45">
              {formatPercentage(basisPoints)}% of paycheck
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onToggleLock}
          aria-label={`${category.locked ? 'Unlock' : 'Lock'} ${config.name}`}
          aria-pressed={category.locked}
          className="rounded-full text-plum/55"
        >
          {category.locked ? <Lock /> : <LockOpen />}
        </Button>
      </div>
      <p className="mt-4 min-h-10 text-sm leading-5 text-ink/55">
        {config.description}
      </p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <label
          htmlFor={`${category.id}-amount`}
          className="text-sm font-semibold text-plum"
        >
          Amount
          <span className="relative mt-1.5 block">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40">
              $
            </span>
            <Input
              id={`${category.id}-amount`}
              type="number"
              min="0"
              step="0.01"
              value={(category.amountCents / 100).toFixed(2)}
              disabled={category.locked}
              onChange={(event) => {
                const cents = parseCurrencyToCents(event.target.value);
                if (cents !== null) onChange(cents);
              }}
              aria-label={`${config.name} amount in dollars`}
              className="h-11 rounded-xl bg-cream pl-7 font-semibold text-plum"
            />
          </span>
        </label>
        <label
          htmlFor={`${category.id}-percentage`}
          className="text-sm font-semibold text-plum"
        >
          Percent
          <span className="relative mt-1.5 block">
            <Input
              id={`${category.id}-percentage`}
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={formatPercentage(basisPoints)}
              disabled={category.locked}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (Number.isFinite(value) && value >= 0 && value <= 100)
                  onChange(
                    amountForPercentage(
                      budget.paycheckCents,
                      Math.round(value * 100),
                    ),
                  );
              }}
              aria-label={`${config.name} percentage`}
              className="h-11 rounded-xl bg-cream pr-8 font-semibold text-plum"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40">
              %
            </span>
          </span>
        </label>
      </div>
      <Slider
        className="mt-5 [&_[data-slot=slider-range]]:bg-[var(--category-color)] [&_[data-slot=slider-thumb]]:border-[var(--category-color)]"
        style={{ '--category-color': config.color } as CSSProperties}
        min={0}
        max={100}
        step={1}
        value={[Math.min(100, basisPoints / 100)]}
        disabled={category.locked}
        onValueChange={(values) => {
          const value = typeof values === 'number' ? values : values[0];
          onChange(
            amountForPercentage(budget.paycheckCents, Math.round(value * 100)),
          );
        }}
        aria-label={`${config.name} allocation percentage`}
      />
    </article>
  );
}

function BudgetChart({ budget }: { budget: PaycheckBudget }) {
  const data = budget.categories
    .filter((item) => item.amountCents > 0)
    .map((item) => ({
      id: item.id,
      name: categoryConfig[item.id].shortName,
      value: item.amountCents,
      color: categoryConfig[item.id].color,
      fill: categoryConfig[item.id].color,
    }));
  return (
    <figure
      className="relative mx-auto h-64 w-full max-w-sm"
      aria-label={data
        .map((item) => `${item.name}: ${formatCurrency(item.value)}`)
        .join(', ')}
    >
      <div className="grid h-full place-items-center">
        <PieChart width={256} height={256}>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={72}
            outerRadius={105}
            paddingAngle={2}
            stroke="none"
            isAnimationActive={false}
          />
          <Tooltip
            formatter={(value) => formatCurrency(Number(value))}
            contentStyle={{ borderRadius: 14, borderColor: '#e7d9dc' }}
          />
        </PieChart>
      </div>
      <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/40">
          Paycheck
        </span>
        <strong className="mt-1 text-2xl text-plum">
          {formatCurrency(budget.paycheckCents, { compact: true })}
        </strong>
      </div>
    </figure>
  );
}

function SavedBudgets({
  data,
  openBudget,
  renameBudget,
  duplicateBudget,
  deleteBudget,
  clearBudgets,
}: {
  data: StoredBudgetData;
  openBudget: (item: PaycheckBudget) => void;
  renameBudget: (item: PaycheckBudget) => void;
  duplicateBudget: (item: PaycheckBudget) => void;
  deleteBudget: (id: string) => void;
  clearBudgets: () => void;
}) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            className="h-10 rounded-full border-plum/15 bg-white/70 px-5 text-plum"
          />
        }
      >
        <WalletCards /> My budgets{' '}
        {data.budgets.length > 0 && (
          <span className="rounded-full bg-rose-soft px-1.5 text-xs">
            {data.budgets.length}
          </span>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-[24px] p-6 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-plum">
            My budgets
          </DialogTitle>
          <DialogDescription>
            Reopen a plan or make a copy to try something new.
          </DialogDescription>
        </DialogHeader>
        {data.budgets.length === 0 ? (
          <div className="my-6 rounded-2xl border border-dashed border-plum/15 bg-cream p-8 text-center">
            <PiggyBank className="mx-auto text-primary" />
            <p className="mt-3 font-semibold text-plum">No saved budgets yet</p>
            <p className="mt-1 text-sm text-ink/50">
              Your saved paycheck plans will show up here.
            </p>
          </div>
        ) : (
          <div className="my-4 grid gap-3">
            {data.budgets.map((item) => (
              <article
                key={item.id}
                className="flex flex-col gap-3 rounded-2xl border border-plum/10 bg-cream/70 p-4 sm:flex-row sm:items-center"
              >
                <button
                  type="button"
                  onClick={() => openBudget(item)}
                  className="min-w-0 flex-1 text-left focus-visible:outline-2"
                >
                  <strong className="block truncate text-plum">
                    {item.name}
                  </strong>
                  <span className="mt-1 block text-sm text-ink/50">
                    {formatCurrency(item.paycheckCents)} ·{' '}
                    {presetLabels[item.preset].name}
                  </span>
                </button>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => renameBudget(item)}
                    aria-label={`Rename ${item.name}`}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => duplicateBudget(item)}
                    aria-label={`Duplicate ${item.name}`}
                  >
                    <Copy />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete ${item.name}`}
                          className="text-destructive"
                        />
                      }
                    >
                      <Trash2 />
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this budget?</AlertDialogTitle>
                        <AlertDialogDescription>
                          “{item.name}” will be permanently removed from this
                          browser.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep it</AlertDialogCancel>
                        <AlertDialogAction
                          variant="destructive"
                          onClick={() => deleteBudget(item.id)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </article>
            ))}
          </div>
        )}
        {data.budgets.length > 0 && (
          <DialogFooter>
            <AlertDialog>
              <AlertDialogTrigger render={<Button variant="destructive" />}>
                Clear all saved budgets
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear every saved budget?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This cannot be undone. Your current draft will stay open.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={clearBudgets}
                  >
                    Clear all
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function BudgetPlanner() {
  const [budget, setBudget] = useState<PaycheckBudget>(() =>
    createBudget(200_000, 'biweekly', 'balanced'),
  );
  const [storage, setStorage] = useState<StoredBudgetData>(emptyStoredData);
  const [ready, setReady] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [budgetName, setBudgetName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const form = useForm<SetupValues>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      paycheck: '2000',
      frequency: 'biweekly',
      preset: 'balanced',
    },
  });
  const watchedPreset = form.watch('preset');

  useEffect(() => {
    const loaded = loadBudgetData();
    setStorage(loaded);
    if (loaded.currentDraft) {
      setBudget(loaded.currentDraft);
      form.reset({
        paycheck: (loaded.currentDraft.paycheckCents / 100).toFixed(2),
        frequency: loaded.currentDraft.payFrequency,
        preset: loaded.currentDraft.preset,
      });
    }
    setReady(true);
  }, [form]);
  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(
      () => saveBudgetData({ ...storage, currentDraft: budget }),
      250,
    );
    return () => window.clearTimeout(timer);
  }, [budget, ready, storage]);

  useEffect(() => {
    const context =
      typeof document === 'undefined' ? undefined : document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(
      context.registerTool(
        {
          name: 'create_paycheck_budget',
          title: 'Create paycheck budget',
          description:
            'Create a visible paycheck budget from a take-home dollar amount, pay frequency, and planning style.',
          inputSchema: {
            type: 'object',
            properties: {
              paycheck: {
                type: 'number',
                exclusiveMinimum: 0,
                maximum: 1000000,
              },
              frequency: {
                type: 'string',
                enum: frequencies.map((item) => item.value),
              },
              preset: { type: 'string', enum: presetOrder },
            },
            required: ['paycheck', 'frequency', 'preset'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          execute(input: unknown) {
            const raw = input as Record<string, unknown>;
            const parsed = setupSchema.safeParse({
              paycheck:
                typeof raw.paycheck === 'number' ? String(raw.paycheck) : '',
              frequency: raw.frequency,
              preset: raw.preset,
            });
            if (!parsed.success)
              throw new Error('Invalid paycheck budget input.');
            const created = createBudget(
              parseCurrencyToCents(parsed.data.paycheck)!,
              parsed.data.frequency,
              parsed.data.preset,
            );
            setBudget(created);
            form.reset(parsed.data);
            return {
              paycheck: created.paycheckCents / 100,
              preset: created.preset,
              remaining: 0,
            };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => undefined);
    return () => lifecycle.abort();
  }, [form]);

  const allocated = totalAllocated(budget.categories);
  const remaining = budget.paycheckCents - allocated;
  const allocationPercent =
    Math.round((allocated / budget.paycheckCents) * 10_000) / 100;
  const legend = useMemo(
    () =>
      budget.categories.map((item) => ({
        ...item,
        config: categoryConfig[item.id],
      })),
    [budget.categories],
  );
  const persist = (next: StoredBudgetData) => {
    setStorage(next);
    saveBudgetData(next);
  };
  const createFromForm = (values: SetupValues) => {
    const cents = parseCurrencyToCents(values.paycheck)!;
    const created = createBudget(cents, values.frequency, values.preset);
    setBudget(created);
    persist({
      ...storage,
      preferences: {
        lastPaycheckCents: cents,
        preferredPreset: values.preset,
        payFrequency: values.frequency,
      },
      currentDraft: created,
    });
    setNotice('Your new paycheck plan is ready.');
  };
  const changeCategory = (id: CategoryId, amountCents: number) =>
    setBudget((current) => ({
      ...current,
      categories: current.categories.map((item) =>
        item.id === id ? { ...item, amountCents } : item,
      ),
      updatedAt: new Date().toISOString(),
    }));
  const allocateRemaining = (id: CategoryId) =>
    setBudget((current) => {
      const amount = remainingAmount(current);
      return amount <= 0
        ? current
        : {
            ...current,
            categories: current.categories.map((item) =>
              item.id === id
                ? { ...item, amountCents: item.amountCents + amount }
                : item,
            ),
            updatedAt: new Date().toISOString(),
          };
    });
  const saveCurrent = () => {
    const name = budgetName.trim();
    if (!name || !isBudgetSavable(budget)) return;
    const saved = { ...budget, name, updatedAt: new Date().toISOString() };
    setBudget(saved);
    persist(upsertBudget(storage, saved));
    setSaveOpen(false);
    setNotice('Budget saved in this browser.');
  };
  const commitRename = () => {
    const name = budgetName.trim();
    if (!name || !editingId) return;
    persist({
      ...storage,
      budgets: storage.budgets.map((item) =>
        item.id === editingId
          ? { ...item, name, updatedAt: new Date().toISOString() }
          : item,
      ),
    });
    if (budget.id === editingId) setBudget((current) => ({ ...current, name }));
    setSaveOpen(false);
    setEditingId(null);
    setNotice('Budget renamed.');
  };

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-8 lg:px-10">
        <a
          href="#planner"
          className="flex items-center gap-2.5 font-semibold tracking-tight text-plum"
        >
          <Image
            src="/loopy-budgeter-logo.png"
            alt=""
            width="44"
            height="44"
            className="size-11 rounded-[15px] border border-plum/10 object-cover shadow-sm"
          />
          <span className="text-lg">Loopy Budgeter</span>
        </a>
        <SavedBudgets
          data={storage}
          openBudget={(item) => {
            setBudget(item);
            form.reset({
              paycheck: (item.paycheckCents / 100).toFixed(2),
              frequency: item.payFrequency,
              preset: item.preset,
            });
            setNotice(`${item.name} opened.`);
          }}
          renameBudget={(item) => {
            setEditingId(item.id);
            setBudgetName(item.name);
            setSaveOpen(true);
          }}
          duplicateBudget={(item) => {
            const now = new Date().toISOString();
            const copy = {
              ...item,
              id: crypto.randomUUID(),
              name: `${item.name} copy`,
              createdAt: now,
              updatedAt: now,
            };
            persist(upsertBudget(storage, copy));
            setNotice('Budget duplicated.');
          }}
          deleteBudget={(id) => {
            persist({
              ...storage,
              budgets: storage.budgets.filter((item) => item.id !== id),
            });
            setNotice('Budget deleted.');
          }}
          clearBudgets={() => {
            persist({ ...storage, budgets: [] });
            setNotice('Saved budgets cleared.');
          }}
        />
      </header>
      <section
        id="planner"
        className="mx-auto max-w-7xl px-5 pb-20 pt-7 sm:px-8 lg:px-10 lg:pt-12"
      >
        <div className="max-w-3xl">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-rose-soft px-3 py-1.5 text-sm font-semibold text-plum">
            <Sparkles className="size-4" /> A fresh plan for this payday
          </p>
          <h1 className="font-heading text-5xl font-semibold leading-[0.98] tracking-[-0.05em] text-plum sm:text-6xl">
            Make every paycheck count.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-ink/65">
            Split your take-home pay into a simple plan for saving, debt, food,
            and a little fun.
          </p>
        </div>
        <div className="mt-10 grid items-start gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-10">
          <form
            onSubmit={form.handleSubmit(createFromForm)}
            className="rounded-[28px] border border-plum/10 bg-white/78 p-5 shadow-[0_20px_60px_rgba(85,20,47,0.08)] sm:p-7 lg:sticky lg:top-5"
          >
            <label
              htmlFor="paycheck"
              className="text-sm font-semibold text-plum"
            >
              How much was your paycheck?
            </label>
            <div className="relative mt-2">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-semibold text-plum/45">
                $
              </span>
              <Input
                id="paycheck"
                inputMode="decimal"
                {...form.register('paycheck')}
                aria-invalid={Boolean(form.formState.errors.paycheck)}
                aria-describedby="paycheck-help paycheck-error"
                className="h-16 rounded-2xl bg-cream px-10 text-2xl font-semibold text-plum"
              />
            </div>
            <p id="paycheck-help" className="mt-2 text-sm text-ink/50">
              Use your take-home amount after taxes.
            </p>
            {form.formState.errors.paycheck && (
              <p
                id="paycheck-error"
                className="mt-2 text-sm font-medium text-destructive"
              >
                {form.formState.errors.paycheck.message}
              </p>
            )}
            <label
              htmlFor="frequency"
              className="mt-6 block text-sm font-semibold text-plum"
            >
              How often are you paid?
            </label>
            <select
              id="frequency"
              {...form.register('frequency')}
              className="mt-2 h-11 w-full rounded-xl border border-plum/15 bg-cream px-3 text-sm font-medium text-plum"
            >
              {frequencies.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <fieldset className="mt-6">
              <legend className="text-sm font-semibold text-plum">
                Choose your focus
              </legend>
              <div className="mt-3 grid gap-2">
                {presetOrder.map((option) => (
                  <label
                    key={option}
                    className="cursor-pointer rounded-2xl border p-3 data-[active=true]:border-primary data-[active=true]:bg-rose-soft/35"
                    data-active={watchedPreset === option}
                  >
                    <input
                      type="radio"
                      value={option}
                      {...form.register('preset')}
                      className="sr-only"
                    />
                    <span className="flex items-center justify-between gap-3">
                      <span>
                        <strong className="block text-sm text-plum">
                          {presetLabels[option].name}
                        </strong>
                        <span className="text-sm text-ink/50">
                          {presetLabels[option].description}
                        </span>
                      </span>
                      {watchedPreset === option && (
                        <span className="grid size-6 place-items-center rounded-full bg-primary text-white">
                          <Check className="size-3.5" />
                        </span>
                      )}
                    </span>
                    {option !== 'custom' && (
                      <span className="mt-2 flex gap-1" aria-hidden="true">
                        {(
                          Object.entries(presetBasisPoints[option]) as [
                            CategoryId,
                            number,
                          ][]
                        ).map(([id, bps]) => (
                          <span
                            key={id}
                            className="h-1.5 rounded-full"
                            style={{
                              width: `${bps / 100}%`,
                              backgroundColor: categoryConfig[id].color,
                            }}
                          />
                        ))}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </fieldset>
            <Button
              type="submit"
              className="mt-7 h-13 w-full rounded-full bg-plum text-base hover:bg-plum/90"
            >
              Create my budget
            </Button>
            <p className="mt-4 text-center text-xs text-ink/45">
              Planning suggestions only—not professional financial advice.
            </p>
          </form>
          <div className="min-w-0 space-y-5">
            <section className="rounded-[30px] border border-white/80 bg-white/72 p-5 shadow-[0_24px_80px_rgba(85,20,47,0.1)] sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-ink/50">Your paycheck plan</p>
                  <h2 className="mt-1 text-3xl font-semibold text-plum">
                    {formatCurrency(budget.paycheckCents)}
                  </h2>
                  <p className="mt-1 text-sm text-ink/45">
                    {presetLabels[budget.preset].name} ·{' '}
                    {
                      frequencies.find(
                        (item) => item.value === budget.payFrequency,
                      )?.label
                    }
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold text-white ${remaining < 0 ? 'bg-destructive' : 'bg-plum'}`}
                >
                  {allocationPercent}% planned
                </span>
              </div>
              <div className="mt-4 grid items-center gap-3 md:grid-cols-[1fr_0.8fr]">
                <BudgetChart budget={budget} />
                <div className="grid gap-3">
                  <div className="rounded-2xl bg-cream p-4">
                    <p className="text-sm text-ink/45">Allocated</p>
                    <strong className="mt-1 block text-xl text-plum">
                      {formatCurrency(allocated)}
                    </strong>
                  </div>
                  <div className="rounded-2xl bg-cream p-4">
                    <p className="text-sm text-ink/45">Remaining</p>
                    <strong
                      className={`mt-1 block text-xl ${remaining < 0 ? 'text-destructive' : 'text-plum'}`}
                    >
                      {formatCurrency(remaining)}
                    </strong>
                  </div>
                  <ul className="grid gap-2">
                    {legend.map((item) => (
                      <li
                        key={item.id}
                        className="flex justify-between text-sm"
                      >
                        <span className="flex items-center gap-2 text-ink/60">
                          <span
                            className="size-2.5 rounded-full"
                            style={{ backgroundColor: item.config.color }}
                          />
                          {item.config.shortName}
                        </span>
                        <strong className="text-plum">
                          {formatCurrency(item.amountCents, { compact: true })}
                        </strong>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
            <section
              className={`rounded-[22px] p-5 text-white ${remaining < 0 ? 'bg-destructive' : 'bg-plum'}`}
              aria-live="polite"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-white/70">
                    {remaining < 0
                      ? 'Over budget'
                      : remaining === 0
                        ? 'Fully allocated'
                        : 'Still to assign'}
                  </p>
                  <p className="mt-1 text-sm">
                    {remaining < 0
                      ? `Reduce your plan by ${formatCurrency(Math.abs(remaining))}.`
                      : remaining === 0
                        ? 'Your whole paycheck has a job.'
                        : 'Choose where the rest should go.'}
                  </p>
                </div>
                <strong className="text-2xl">
                  {formatCurrency(Math.abs(remaining))}
                </strong>
              </div>
              {remaining > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {budget.categories
                    .filter((item) => !item.locked)
                    .map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => allocateRemaining(item.id)}
                        className="rounded-full bg-white/15 px-3 py-2 text-sm font-semibold"
                      >
                        <Plus className="mr-1 inline size-3.5" />
                        {categoryConfig[item.id].shortName}
                      </button>
                    ))}
                </div>
              )}
            </section>
            <section>
              <div className="mb-4">
                <p className="text-sm font-semibold uppercase tracking-[0.1em] text-primary">
                  Your categories
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-plum">
                  Fine-tune the split
                </h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {budget.categories.map((item) => (
                  <AllocationCard
                    key={item.id}
                    budget={budget}
                    category={item}
                    onChange={(amount) => changeCategory(item.id, amount)}
                    onToggleLock={() =>
                      setBudget((current) => ({
                        ...current,
                        categories: current.categories.map((category) =>
                          category.id === item.id
                            ? { ...category, locked: !category.locked }
                            : category,
                        ),
                      }))
                    }
                  />
                ))}
              </div>
            </section>
            <div className="sticky bottom-4 z-20 flex items-center justify-between gap-3 rounded-[22px] border border-plum/10 bg-white/92 p-3 shadow-[0_16px_48px_rgba(85,20,47,.14)] backdrop-blur">
              <Button
                type="button"
                variant="ghost"
                onClick={() => createFromForm(form.getValues())}
                className="h-11 rounded-full text-plum"
              >
                <RotateCcw /> Reset
              </Button>
              <div className="flex items-center gap-2">
                <output className="hidden text-sm text-plum sm:block">
                  {notice}
                </output>
                <Button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setBudgetName(budget.name);
                    setSaveOpen(true);
                  }}
                  disabled={!isBudgetSavable(budget)}
                  className="h-11 rounded-full bg-plum px-5"
                >
                  <Save /> Save budget
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="rounded-[22px] p-6 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold text-plum">
              {editingId ? 'Rename budget' : 'Save this budget'}
            </DialogTitle>
            <DialogDescription>
              Give this plan a name you’ll recognize later.
            </DialogDescription>
          </DialogHeader>
          <label
            htmlFor="budget-name"
            className="mt-2 text-sm font-semibold text-plum"
          >
            Budget name
          </label>
          <Input
            id="budget-name"
            value={budgetName}
            onChange={(event) => setBudgetName(event.target.value)}
            maxLength={80}
            className="h-11"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={editingId ? commitRename : saveCurrent}
              disabled={!budgetName.trim()}
              className="bg-plum"
            >
              {editingId ? 'Rename' : 'Save budget'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

declare global {
  interface Document {
    readonly modelContext?: {
      registerTool: (
        tool: {
          name: string;
          title?: string;
          description: string;
          inputSchema: object;
          annotations?: {
            readOnlyHint?: boolean;
            untrustedContentHint?: boolean;
          };
          execute: (input: unknown) => unknown;
        },
        options?: { signal?: AbortSignal },
      ) => void | Promise<void>;
    };
  }
}
