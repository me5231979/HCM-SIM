import { expect, type Page } from '@playwright/test';
import AxeBuilder from './axe';

export async function start(page: Page, opts: { view?: '3d' | '2d'; mode?: 'training' | 'certification'; code?: string; tour?: boolean } = {}) {
  await page.addInitScript(([view]) => {
    localStorage.setItem('pp_settings', JSON.stringify({ view, reducedMotion: true, speed: 'manual' }));
  }, [opts.view ?? '3d']);
  await page.goto('/');
  if (opts.mode === 'certification') await page.getByText('Certification', { exact: true }).click();
  if (opts.code) {
    await page.getByText('Running a group session?').click();
    await page.getByTestId('run-code').fill(opts.code);
  }
  await page.getByTestId('start').click();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Next' }).click();
  await page.getByTestId(opts.tour ? 'tour' : 'begin').click();
}

/** Open a task from the inbox, skipping the clock ahead until it has arrived. */
export async function openTask(page: Page, subject: string) {
  for (let i = 0; i < 16; i++) {
    const inList = page.locator('.inbox-item', { hasText: subject });
    if (await page.locator('.listview').count()) {
      if (await inList.count()) { await inList.first().click(); return; }
    } else {
      if (!(await page.locator('.drawer--left').count())) await page.getByTestId('inbox').click();
      if (await inList.count()) { await inList.first().click(); return; }
      await page.getByRole('button', { name: 'Close' }).click();
    }
    await page.getByTestId('skip').click();
  }
  throw new Error(`Task never arrived: ${subject}`);
}

export async function choose(page: Page, label: string) {
  const panel = page.locator('.task');
  await panel.getByLabel(label, { exact: false }).check();
  await panel.getByRole('button', { name: 'Decide' }).first().click();
}

export async function back(page: Page) {
  await page.getByRole('button', { name: 'Back to the office' }).click();
}

export async function perfectRun(page: Page) {
  await openTask(page, 'Read the payroll calendar');
  await choose(page, "Transactions, like a raise, must be entered and approved by Friday's HCM transaction cutoff");
  await back(page);

  await openTask(page, 'Send the time card reminder');
  await page.getByLabel('When should the reminder go out?').selectOption({ label: 'Today, Thursday, so people can fix gaps before the weekend' });
  await page.getByLabel('Who should get it?').selectOption({ label: 'Non-exempt employees and their managers' });
  await page.getByRole('button', { name: 'Send reminder' }).click();
  await back(page);

  await openTask(page, 'Weekly time card check');
  await choose(page, 'Send Marcus the details');
  await choose(page, 'The 4 hours must be paid as overtime');
  await choose(page, 'Let Dana know non-exempt PTO goes in 4-hour increments');
  await back(page);

  await openTask(page, 'Enter a retro pay increase');
  await page.getByLabel('Effective date').selectOption({ label: 'Sun Sep 27' });
  await page.getByLabel('New hourly rate').fill('24.50');
  await page.getByRole('button', { name: 'Save and submit' }).click();
  await back(page);

  await openTask(page, 'Headcount report in one hour');
  await choose(page, 'Reply now: offer a quick count');
  await back(page);

  await openTask(page, 'Chase late approvals');
  await choose(page, 'Email Marcus the three names');
  await back(page);

  await openTask(page, 'Final time card check');
  await page.getByLabel('Flag Lena Kowalski').check();
  await page.getByRole('button', { name: /Submit 1 flagged row/ }).click();
  await choose(page, 'Tell Dana. She removes her approval');
  await back(page);

  await openTask(page, 'Marcus is out today');
  await choose(page, "Send the three names, the pay period, and the noon deadline to Marcus's backup approver");
  await back(page);

  await expect(page.getByText("That's everything for pay period 22.")).toBeVisible();
  await page.getByTestId('finish').click();
}

export async function axe(page: Page) {
  const r = await new AxeBuilder(page).analyze();
  return r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
}
