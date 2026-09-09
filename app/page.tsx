'use client';

import { useMemo, useState } from 'react';
import { ArrowRight, Landmark, ShoppingBag, Sparkles, Utensils } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const presets = {
  balanced: [30, 30, 25, 15],
  debt: [20, 50, 20, 10],
  savings: [50, 25, 15, 10],
} as const;

const categories = [
  { name: 'Savings', icon: Sparkles, color: '#c97882' },
  { name: 'Credit card', icon: Landmark, color: '#55142f' },
  { name: 'Eating', icon: Utensils, color: '#e89aa5' },
  { name: 'Shopping', icon: ShoppingBag, color: '#d95f5f' },
] as const;

export default function Home() {
  const [paycheck, setPaycheck] = useState('2000');
  const [preset, setPreset] = useState<keyof typeof presets>('balanced');
  const value = Math.max(0, Number(paycheck) || 0);
  const allocations = useMemo(
    () => categories.map((category, index) => ({
      ...category,
      percentage: presets[preset][index],
      amount: value * presets[preset][index] / 100,
    })),
    [preset, value],
  );

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-8 lg:px-10">
        <a href="#planner" className="flex items-center gap-2.5 font-semibold tracking-tight text-plum">
          <span className="grid size-10 place-items-center rounded-[15px] bg-primary text-white shadow-sm">
            <span aria-hidden="true" className="text-xl">↗</span>
          </span>
          <span className="text-lg">Pocket Plan</span>
        </a>
        <Button variant="outline" className="h-10 rounded-full border-plum/15 bg-white/70 px-5 text-plum">
          My budgets
        </Button>
      </header>

      <section id="planner" className="mx-auto grid max-w-7xl gap-8 px-5 pb-16 pt-8 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14 lg:px-10 lg:pt-16">
        <div className="max-w-xl">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-rose-soft px-3 py-1.5 text-sm font-semibold text-plum">
            <Sparkles className="size-4" /> A fresh plan for this payday
          </p>
          <h1 className="font-heading text-5xl font-semibold leading-[0.98] tracking-[-0.05em] text-plum sm:text-6xl">
            Make every paycheck count.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-ink/65">
            Split your take-home pay into a simple plan for saving, debt, food, and a little fun.
          </p>

          <div className="mt-10 rounded-[28px] border border-plum/10 bg-white/75 p-5 shadow-[0_20px_60px_rgba(85,20,47,0.08)] backdrop-blur sm:p-7">
            <label htmlFor="paycheck" className="text-sm font-semibold text-plum">How much was your paycheck?</label>
            <div className="relative mt-2">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-semibold text-plum/45">$</span>
              <Input
                id="paycheck"
                inputMode="decimal"
                value={paycheck}
                onChange={(event) => setPaycheck(event.target.value)}
                className="h-16 rounded-2xl border-plum/15 bg-cream px-10 text-2xl font-semibold text-plum focus-visible:border-primary"
                aria-describedby="paycheck-help"
              />
            </div>
            <p id="paycheck-help" className="mt-2 text-sm text-ink/50">Use your take-home amount after taxes.</p>

            <fieldset className="mt-7">
              <legend className="text-sm font-semibold text-plum">Choose your focus</legend>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {Object.keys(presets).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setPreset(option as keyof typeof presets)}
                    className="rounded-xl border px-2 py-3 text-sm font-semibold capitalize transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary data-[active=true]:border-primary data-[active=true]:bg-primary data-[active=true]:text-white"
                    data-active={preset === option}
                    aria-pressed={preset === option}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </fieldset>

            <Button className="mt-7 h-13 w-full rounded-full bg-plum px-6 text-base hover:bg-plum/90">
              Create my budget <ArrowRight className="ml-1 size-4" />
            </Button>
          </div>
        </div>

        <section aria-labelledby="preview-title" className="relative self-center">
          <div aria-hidden="true" className="absolute -right-32 -top-24 size-72 rounded-full bg-rose-soft/70 blur-3xl" />
          <div className="relative rounded-[34px] border border-white/80 bg-white/70 p-5 shadow-[0_28px_90px_rgba(85,20,47,0.12)] backdrop-blur sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-ink/50">Your paycheck plan</p>
                <h2 id="preview-title" className="mt-1 text-3xl font-semibold tracking-tight text-plum">
                  {value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                </h2>
              </div>
              <span className="rounded-full bg-plum px-3 py-1.5 text-xs font-semibold text-white">100% planned</span>
            </div>

            <div className="mt-8 flex h-4 overflow-hidden rounded-full bg-muted" aria-hidden="true">
              {allocations.map((item) => <span key={item.name} style={{ width: `${item.percentage}%`, background: item.color }} />)}
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {allocations.map(({ name, icon: Icon, color, percentage, amount }) => (
                <article key={name} className="rounded-[20px] border border-plum/8 bg-cream/65 p-4">
                  <div className="flex items-center justify-between">
                    <span className="grid size-9 place-items-center rounded-xl text-white" style={{ background: color }}><Icon className="size-4" /></span>
                    <span className="text-sm font-semibold text-ink/45">{percentage}%</span>
                  </div>
                  <p className="mt-5 text-sm font-medium text-ink/55">{name}</p>
                  <p className="mt-1 text-2xl font-semibold tracking-tight text-plum">
                    {amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                  </p>
                </article>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between rounded-2xl bg-plum px-5 py-4 text-white">
              <span className="text-sm text-white/70">Still to assign</span>
              <strong className="text-lg">$0.00</strong>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
