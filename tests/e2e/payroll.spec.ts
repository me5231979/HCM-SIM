import { expect, test } from '@playwright/test';
import { axe, openTask, perfectRun, start } from './helpers';

test('title screen loads with no serious accessibility violations', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Pay Period.' })).toBeVisible();
  await expect(page.getByText('Pay period 22, Oct 11 to Oct 24')).toBeVisible();
  await expect(page.getByLabel('Run code')).toBeHidden();
  expect(await axe(page)).toEqual([]);
});

test('perfect run in 3D ends Ready with all meters A and no pay day problems', async ({ page }) => {
  test.setTimeout(300_000);
  await start(page, { code: 'e2e-perfect' });
  await expect(page.locator('.scene canvas')).toBeVisible();
  await expect(page.locator('.hud-deadlines')).toContainText('HCM transaction cutoff');
  await expect(page.locator('.hud-deadlines')).toContainText('Time cards due');
  await perfectRun(page);
  await expect(page.getByRole('heading', { name: 'Checks are out.' })).toBeVisible();
  await expect(page.getByText('Pay day · Fri Oct 30')).toBeVisible();
  if (await page.getByRole('button', { name: 'Skip to debrief' }).count()) await page.getByRole('button', { name: 'Skip to debrief' }).click();
  else await page.getByTestId('next-beat').click();
  await expect(page.getByRole('heading', { name: 'Ready.' })).toBeVisible();
  await expect(page.locator('.g-letter')).toHaveText(['A', 'A', 'A', 'A']);
  await expect(page.getByText('No problems reached a paycheck.')).toBeVisible();
  expect(await axe(page)).toEqual([]);
  await page.screenshot({ path: 'test-results/debrief-perfect.png', fullPage: true });
});

test('worst run: letting the deadlines pass produces consequences and root cause chains', async ({ page }) => {
  await start(page, { mode: 'certification', code: 'e2e-worst' });
  for (let i = 0; i < 30 && !(await page.locator('.payday').count()); i++) await page.getByTestId('skip').click();
  await expect(page.getByRole('heading', { name: 'Checks are out.' })).toBeVisible();
  await page.getByRole('button', { name: 'Skip to debrief' }).click();
  await expect(page.getByRole('heading', { name: 'Keep practicing.' })).toBeVisible();
  expect(await page.locator('.chain').count()).toBeGreaterThan(4);
  await expect(page.locator('.courses a').first()).toHaveAttribute('href', /HCM_Academy\/courses\//);
  await page.locator('.tl-mark.m-missed').first().click();
  await expect(page.getByRole('region', { name: 'Decision detail' })).toContainText('Better choice');
});

test('guided tour: spotlights, legends, practice, and the clock stays still', async ({ page }) => {
  await start(page, { tour: true });
  const tour = page.getByTestId('tour');
  await expect(tour.getByRole('heading', { name: 'Welcome to your office' })).toBeVisible();
  expect(await axe(page)).toEqual([]);
  const seen: string[] = [];
  for (let i = 0; i < 12; i++) {
    seen.push((await tour.locator('h2').textContent()) ?? '');
    if (await tour.getByText('Practice: where deadlines live').count()) {
      await tour.getByLabel('The payroll calendar, every period').check();
      await tour.getByRole('button', { name: 'Decide' }).click();
      await expect(tour.getByText('Good call')).toBeVisible();
    }
    if (await page.getByTestId('tour-done').count()) break;
    await page.getByTestId('tour-next').click();
  }
  expect(seen).toEqual(expect.arrayContaining(['Your two deadlines', 'What the symbols mean', 'Your controls', 'Try one']));
  await expect(page.locator('.hud-time')).toHaveText('8:00 AM');
  await page.getByTestId('tour-done').click();
  await expect(tour).toHaveCount(0);
  await page.getByTestId('help').click();
  const help = page.getByRole('dialog', { name: 'How to play.' });
  await expect(help.getByText('Wants to talk')).toBeVisible();
  await expect(help.getByText('Time card issue', { exact: true })).toBeVisible();
  await expect(help.getByText('Zoom the 3D office out or in.')).toBeVisible();
  expect(await axe(page)).toEqual([]);
});

test('task panel and inbox pass axe while playing', async ({ page }) => {
  await start(page);
  await openTask(page, 'Weekly time card check');
  expect(await axe(page)).toEqual([]);
});

test('list view: keyboard-only run of the first task', async ({ page }) => {
  await start(page, { view: '2d' });
  await expect(page.getByRole('heading', { name: 'People' })).toBeVisible();
  const item = page.locator('.inbox-item', { hasText: 'Read the payroll calendar' });
  await item.focus();
  await page.keyboard.press('Enter');
  const option = page.getByLabel("Transactions, like a raise, must be entered and approved by Friday's HCM transaction cutoff", { exact: false });
  await option.focus();
  await page.keyboard.press('Space');
  await page.getByRole('button', { name: 'Decide' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Good call')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Back to the office' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('.task')).toHaveCount(0);
  expect(await axe(page)).toEqual([]);
});
