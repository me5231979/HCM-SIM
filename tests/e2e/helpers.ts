import { readFileSync } from 'node:fs';
import { expect, type Page } from '@playwright/test';
import AxeBuilder from './axe';
import type { MissionT, GameEventT, StepT, EventStepT, PersonT } from '../../content/schemas';

const read = <T,>(p: string) => JSON.parse(readFileSync(new URL(`../../content/${p}`, import.meta.url), 'utf8')) as T;
const week = read<MissionT>('week.json');
const events = read<{ events: GameEventT[] }>('events.json').events;
const people = read<{ people: PersonT[] }>('employees.json').people;
/** Every request in the week, so a run can answer whatever opens, in any order. */
const steps = new Map<string, StepT | EventStepT>([...week.steps, ...events.filter((e) => e.status === 'live' && e.step).map((e) => e.step!)].map((s) => [s.id, s]));

export async function start(page: Page, opts: { view?: '3d' | '2d'; mode?: 'training' | 'certification'; code?: string; tour?: boolean; voices?: boolean } = {}) {
  await page.addInitScript(([view, voices]) => {
    localStorage.setItem('pp_settings', JSON.stringify({ view, reducedMotion: true, speed: 'manual', voices }));
  }, [opts.view ?? '3d', opts.voices ?? false] as const);
  await page.goto('/');
  if (opts.mode === 'certification') await page.getByText('Certification', { exact: true }).click();
  if (opts.code) {
    await page.getByText('Running a group session?').click();
    await page.getByTestId('run-code').fill(opts.code);
  }
  await page.getByTestId('start').click();
  for (let i = 0; i < week.briefing.length - 1; i++) await page.getByRole('button', { name: 'Next', exact: false }).click();
  await page.getByTestId(opts.tour ? 'tour' : 'begin').click();
}

/** Open a request from the inbox, skipping the clock ahead until it has arrived. */
export async function openTask(page: Page, stepId: string) {
  for (let i = 0; i < 150; i++) {
    await dismissDay(page);
    if (!(await page.locator('.listview').count()) && !(await page.locator('.drawer--left').count())) await page.getByTestId('inbox').click();
    const item = page.locator(`.inbox-item[data-step="${stepId}"]`);
    if (await item.count()) { await item.first().click(); return; }
    if (await page.locator('.drawer--left').count()) await page.locator('.drawer--left').getByRole('button', { name: 'Close' }).click();
    await page.getByTestId('skip').click();
  }
  throw new Error(`Request never arrived: ${stepId}`);
}

/** A new workday's recap waits for Start the day. */
async function dismissDay(page: Page) {
  const b = page.getByTestId('start-day');
  if (await b.count()) await b.click();
}

/** Answer every decision on the open request with its right choice (or the first wrong one). */
export async function answerOpen(page: Page, pick: 'correct' | 'wrong' = 'correct') {
  const panel = page.locator('.task');
  const id = await panel.locator('[data-step]').first().getAttribute('data-step');
  const step = steps.get(id!)!;
  const choiceFor = (d: StepT['decisions'][number]) => (pick === 'correct' ? d.choices.find((c) => c.correct)! : d.choices.find((c) => !c.correct && !c.hidden)!);
  if (step.type === 'form') {
    const form = panel.locator('form.sim-form');
    for (const d of step.decisions) {
      const field = form.getByLabel(d.prompt, { exact: true });
      if (!(await field.count())) continue;
      if (d.kind === 'number') await field.fill(pick === 'correct' ? String(d.expected) : '1');
      else await field.selectOption({ label: choiceFor(d).text });
    }
    await form.locator('button[type=submit]').click();
    return;
  }
  if (step.type === 'review') {
    const anomalies = step.review!.rows.filter((r) => r.anomaly).map((r) => r.employeeId);
    if (pick === 'correct') {
      for (const r of anomalies) await panel.getByLabel(`Flag ${people.find((p) => p.id === r)!.name}`).check();
      await panel.getByRole('button', { name: /Submit \d flagged row/ }).click();
    } else {
      await panel.getByRole('button', { name: 'Everything looks right' }).click();
    }
  }
  // Choice decisions, including ones that appear after an earlier answer.
  for (let pass = 0; pass < 3; pass++) {
    for (const d of step.decisions) {
      if (step.type === 'review' && d.id === 'flag') continue;
      const c = choiceFor(d);
      const option = panel.getByLabel(c.text, { exact: true });
      if (!(await option.count())) continue;
      await option.check();
      await option.locator('xpath=ancestor::form[1]').getByRole('button', { name: 'Decide' }).click();
    }
  }
}

/** Play the whole week from the inbox: open each request as it arrives, answer it, move on. */
export async function playWeek(page: Page, pick: 'correct' | 'wrong' = 'correct') {
  for (let guard = 0; guard < 600; guard++) {
    if (await page.locator('.payday').count()) return;
    await dismissDay(page);
    if (await page.locator('.task').count()) {
      await answerOpen(page, pick);
      const next = page.getByTestId('next-request');
      if (await next.count()) await next.click();
      else await page.getByRole('button', { name: 'Back to the office' }).click();
      continue;
    }
    const fyi = page.getByRole('button', { name: 'Got it' });
    if (await fyi.count()) { await fyi.click(); continue; }
    if (!(await page.locator('.listview').count()) && !(await page.locator('.drawer--left').count())) await page.getByTestId('inbox').click();
    const open = page.locator('.inbox-item[data-kind="task"][data-status="open"]');
    if (await open.count()) { await open.first().click(); continue; }
    if (await page.locator('.drawer--left').count()) await page.locator('.drawer--left').getByRole('button', { name: 'Close' }).click();
    const finish = page.getByTestId('finish');
    if (await finish.count()) { await finish.click(); continue; }
    await page.getByTestId('skip').click();
  }
  throw new Error('The week never reached pay day');
}

export async function axe(page: Page) {
  const r = await new AxeBuilder(page).analyze();
  return r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
}

export { expect };
