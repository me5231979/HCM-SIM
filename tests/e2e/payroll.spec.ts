import { expect, test } from '@playwright/test';
import { axe, openTask, perfectRun, start } from './helpers';

test('title screen loads with no serious accessibility violations', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Pay Period.' })).toBeVisible();
  expect(await axe(page)).toEqual([]);
});

test('perfect run in 3D ends Ready with all meters A and no pay day problems', async ({ page }) => {
  test.setTimeout(300_000);
  await start(page, { seed: 'e2e-perfect' });
  await perfectRun(page);
  await expect(page.getByRole('heading', { name: /Checks are out/ })).toBeVisible();
  await page.getByRole('button', { name: 'Skip to debrief' }).click().catch(() => {});
  if (await page.getByTestId('next-beat').count()) await page.getByTestId('next-beat').click();
  await expect(page.getByRole('heading', { name: 'Ready.' })).toBeVisible();
  await expect(page.locator('.g-letter')).toHaveText(['A', 'A', 'A', 'A']);
  await expect(page.getByText('No problems reached a paycheck.')).toBeVisible();
  expect(await axe(page)).toEqual([]);
  await page.screenshot({ path: 'test-results/debrief-perfect.png', fullPage: true });
});

test('worst run: letting cutoff pass produces consequences and root cause chains', async ({ page }) => {
  await start(page, { mode: 'certification', seed: 'e2e-worst' });
  for (let i = 0; i < 20 && !(await page.locator('.payday').count()); i++) await page.getByTestId('skip').click();
  await expect(page.getByRole('heading', { name: /Cutoff passed/ })).toBeVisible();
  await page.getByRole('button', { name: 'Skip to debrief' }).click();
  await expect(page.getByRole('heading', { name: 'Keep practicing.' })).toBeVisible();
  expect(await page.locator('.chain').count()).toBeGreaterThan(4);
  await expect(page.locator('.courses a').first()).toHaveAttribute('href', /HCM_Academy\/courses\//);
  await page.locator('.tl-mark.m-missed').first().click();
  await expect(page.getByRole('region', { name: 'Decision detail' })).toContainText('Better choice');
});

test('task panel and inbox pass axe while playing', async ({ page }) => {
  await start(page);
  await openTask(page, 'Review timecard exceptions');
  expect(await axe(page)).toEqual([]);
});

test('list view: keyboard-only run of the first tasks', async ({ page }) => {
  await start(page, { view: '2d' });
  await expect(page.getByRole('heading', { name: 'People' })).toBeVisible();
  const item = page.locator('.inbox-item', { hasText: 'Read the payroll calendar' });
  await item.focus();
  await page.keyboard.press('Enter');
  const option = page.getByLabel('Payroll cutoff, Fri Oct 16', { exact: false });
  await option.focus();
  await page.keyboard.press('Space');
  await page.getByRole('button', { name: 'Decide' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Good call')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.task')).toHaveCount(0);
  expect(await axe(page)).toEqual([]);
});
