import { expect, test } from '@playwright/test';
import { answerOpen, axe, openTask, playWeek, start } from './helpers';

test('title screen loads with no serious accessibility violations', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Role of the HCM.' })).toBeVisible();
  await expect(page.getByText('Week of Oct 19, 2026', { exact: false })).toBeVisible();
  await expect(page.getByLabel('Run code')).toBeHidden();
  expect(await axe(page)).toEqual([]);
});

test('perfect week in 3D: every request right, every topic mastered, Ready, no pay day problems', async ({ page }) => {
  test.setTimeout(900_000);
  await start(page, { code: 'e2e-perfect' });
  await expect(page.locator('.scene canvas')).toBeVisible();
  await expect(page.locator('.hud-deadlines')).toContainText('HCM transaction cutoff');
  await expect(page.locator('.hud-deadlines')).toContainText('Time cards due');
  await playWeek(page, 'correct');
  await expect(page.getByRole('heading', { name: 'Checks are out.' })).toBeVisible();
  await expect(page.getByText('Pay day · Fri Oct 30')).toBeVisible();
  if (await page.getByRole('button', { name: 'Skip to debrief' }).count()) await page.getByRole('button', { name: 'Skip to debrief' }).click();
  else await page.getByTestId('next-beat').click();
  await expect(page.getByRole('heading', { name: 'Ready.' })).toBeVisible();
  await expect(page.locator('.pf-level')).toHaveText(Array(8).fill('Mastered'));
  await expect(page.locator('.g-letter')).toHaveText(['A', 'A', 'A', 'A']);
  await expect(page.getByText('No problems reached a paycheck.')).toBeVisible();
  await expect(page.getByText('No errors and nothing missed.')).toBeVisible();
  expect(await axe(page)).toEqual([]);
  await page.screenshot({ path: 'test-results/debrief-perfect.png', fullPage: true });
});

test('worst week: letting every deadline pass produces consequences, chains, and a review list', async ({ page }) => {
  test.setTimeout(300_000);
  await start(page, { mode: 'certification', code: 'e2e-worst' });
  for (let i = 0; i < 200 && !(await page.locator('.payday').count()); i++) {
    if (await page.getByTestId('start-day').count()) await page.getByTestId('start-day').click();
    else await page.getByTestId('skip').click();
  }
  await expect(page.getByRole('heading', { name: 'Checks are out.' })).toBeVisible();
  await page.getByRole('button', { name: 'Skip to debrief' }).click();
  await expect(page.getByRole('heading', { name: 'Keep practicing.' })).toBeVisible();
  expect(await page.locator('.chain').count()).toBeGreaterThan(4);
  await expect(page.locator('.dl-courses a').first()).toHaveAttribute('href', /HCM_Academy\//);
  await expect(page.locator('.decision-list .dl-missed').first()).toContainText('Better:');
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
  expect(seen).toEqual(expect.arrayContaining(['Your deadlines', 'What the symbols mean', 'Your controls', 'Try one']));
  await expect(page.locator('.hud-time')).toHaveText('8:00 AM');
  await page.getByTestId('tour-done').click();
  await expect(tour).toHaveCount(0);
  await page.getByTestId('help').click();
  const help = page.getByRole('dialog', { name: 'How to play.' });
  await expect(help.getByText('Wants to talk')).toBeVisible();
  await expect(help.getByText('Retro Change Cutoff')).toBeVisible();
  await expect(help.getByText('Zoom the 3D office out or in.')).toBeVisible();
  expect(await axe(page)).toEqual([]);
});

test('request panel: pinned Decide, meter changes in the feedback, and Next request', async ({ page }) => {
  await start(page);
  await openTask(page, 'calendar');
  expect(await axe(page)).toEqual([]);
  await answerOpen(page, 'correct');
  await expect(page.locator('.task .fb-deltas').first()).toContainText('Accuracy +2');
  await expect(page.locator('.task .feedback.is-good')).toHaveCount(3);
  // Nothing else is open at 8:15 on Monday, so the way out is back to the office.
  await expect(page.getByRole('button', { name: 'Back to the office' })).toBeFocused();
  await page.getByRole('button', { name: 'Back to the office' }).click();
  await openTask(page, 'start_early');
  await expect(page.locator('.task')).toContainText('Can Noor start Wednesday?');
});

test('phones: More holds the secondary tools, and time card tables read as cards', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await start(page);
  await expect(page.getByRole('button', { name: 'Binder' })).toBeHidden();
  await page.getByTestId('more').click();
  await expect(page.getByRole('button', { name: 'Binder' })).toBeVisible();
  await page.getByTestId('more').click();
  await openTask(page, 'calendar');
  const bg = await page.locator('.task').evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(bg).toBe('rgb(22, 22, 22)');
  expect(await axe(page)).toEqual([]);
});

test('list view: keyboard-only run of the first request', async ({ page }) => {
  await start(page, { view: '2d' });
  await expect(page.getByRole('heading', { name: 'People' })).toBeVisible();
  const item = page.locator('.inbox-item[data-step="calendar"]');
  await item.focus();
  await page.keyboard.press('Enter');
  const answers = ["This period's changes close Friday at 5:00 PM, and time cards Monday at noon", "Wednesday's Retro Change Cutoff, because the raise is backdated", "In November's monthly payroll, with retro pay for October"];
  for (const a of answers) {
    const option = page.getByLabel(a, { exact: true });
    await option.focus();
    await page.keyboard.press('Space');
    await page.locator('form.decision', { has: option }).getByRole('button', { name: 'Decide' }).focus();
    await page.keyboard.press('Enter');
  }
  await expect(page.locator('.task .feedback.is-good')).toHaveCount(3);
  await expect(page.getByRole('button', { name: 'Back to the office' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('.task')).toHaveCount(0);
  expect(await axe(page)).toEqual([]);
});
