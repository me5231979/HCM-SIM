import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from './axe';
import { openTask, start } from './helpers';

const OUTCOME = {
  outcome: 'pay', explained_overtime_rule: true, suggested_conduct_conversation: true, hcm_edit: false, tone: 'respectful',
  summary: 'You told Dana the hours stay as worked and suggested she talk with Priya about approval.',
};

/**
 * Stand-in for the ElevenLabs conversation socket, speaking its event format, so the typed conversation
 * runs in CI without a network call. The real service is exercised on the deployed site.
 */
async function fakeAgent(page: Page, opts: { fail?: boolean } = {}) {
  const sent: string[] = [];
  await page.routeWebSocket(/api\.elevenlabs\.io\/v1\/convai\/conversation/, (ws) => {
    if (opts.fail) { ws.close({ code: 1008, reason: 'Daily limit reached' }); return; }
    let event = 1;
    const say = (text: string) => ws.send(JSON.stringify({ type: 'agent_response', agent_response_event: { agent_response: text, event_id: event++ } }));
    ws.onMessage((raw) => {
      const msg = JSON.parse(String(raw)) as { type: string; text?: string };
      sent.push(msg.type);
      if (msg.type === 'conversation_initiation_client_data') {
        ws.send(JSON.stringify({ type: 'conversation_initiation_metadata', conversation_initiation_metadata_event: { conversation_id: 'conv_test', agent_output_audio_format: 'pcm_16000', user_input_audio_format: 'pcm_16000' } }));
        say('Hi, thanks for coming by. Priya put down 44 hours in week 1, and I never approved overtime. Can I just change her time to 40?');
      }
      if (msg.type === 'user_message') {
        ws.send(JSON.stringify({ type: 'user_transcript', user_transcription_event: { user_transcript: msg.text, event_id: event++ } }));
        say("Okay — I'll leave it as worked and talk to Priya about checking with me first. Thanks.");
        ws.send(JSON.stringify({ type: 'client_tool_call', client_tool_call: { tool_name: 'record_outcome', tool_call_id: 'call_1', parameters: OUTCOME, expects_response: false } }));
      }
    });
  });
  return sent;
}

test('character voices: the briefing speaks, captions stay, and Voices turns it off', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('pp_settings', JSON.stringify({ view: '2d', reducedMotion: true, speed: 'manual', voices: true })));
  await page.goto('/');
  await page.getByTestId('start').click();
  const brief = page.locator('.briefing');
  await expect(brief.locator('.brief-line')).toContainText("It's Monday, Oct 19");
  await expect(brief.getByRole('button', { name: 'Stop' })).toBeVisible();
  await expect(brief.locator('.speaker.is-speaking')).toHaveCount(1);
  await brief.getByRole('button', { name: 'Stop' }).click();
  await expect(brief.getByRole('button', { name: 'Replay' })).toBeVisible();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Next' }).click();
  await page.getByTestId('begin').click();

  // List view: say hello to someone with nothing waiting.
  await page.locator('.lv-person', { hasText: 'Sam Okafor' }).click();
  await expect(page.locator('.bubble')).toContainText('Let me know if you need anything copied or filed.');

  // A request opens with a voice note; turning voices off keeps the caption and hides playback.
  await openTask(page, 'calendar');
  await expect(page.locator('.quote--note blockquote')).toContainText('Three payroll calendars run this week');
  const withVoices = await new AxeBuilder(page).analyze();
  expect(withVoices.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
  await page.getByTestId('voices').click();
  await expect(page.getByTestId('voices')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.quote--note .voice-btn')).toHaveCount(0);
  await expect(page.locator('.quote--note blockquote')).toBeVisible();
});

test('live conversation: consent, typed talk with Dana, outcome recorded with coaching', async ({ page }) => {
  const sent = await fakeAgent(page);
  await start(page, { view: '2d' });
  await openTask(page, 'timecards');
  const offer = page.locator('.live-offer');
  await expect(offer).toContainText('Talk it through with Dana');
  await offer.getByTestId('live-text').click();

  // Consent comes first and names what is shared.
  const dialog = page.getByRole('dialog', { name: /Talk it through, live/ });
  await expect(dialog).toContainText('Audio is not recorded or kept.');
  const a11y = await new AxeBuilder(page).analyze();
  expect(a11y.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
  await dialog.getByTestId('live-agree').click();

  const talk = page.getByRole('dialog', { name: /Talk it through with Dana/ });
  await expect(talk.locator('.msg--agent').first()).toContainText('Can I just change her time to 40?');
  await expect(page.locator('.hud-note')).toHaveText('Clock paused while you talk');
  await talk.getByTestId('live-input').fill('The 44 hours stay as worked and the 4 overtime hours get paid. Talk with Priya about checking first.');
  await talk.getByTestId('live-input').press('Enter');

  // The typed line shows once (the server echo is dropped), dashes are tidied, and the outcome arrives.
  await expect(talk.locator('.msg--user')).toHaveCount(1);
  await expect(talk.locator('.msg--agent').nth(1)).toHaveText(/Okay, I'll leave it as worked/);
  const result = talk.getByTestId('live-result');
  await expect(result).toContainText(OUTCOME.summary);
  await expect(result).toContainText('Keep the 44 hours as worked, and pay 4 of them as overtime');
  await expect(result.locator('.live-notes li.is-good')).toHaveCount(3);
  await result.getByTestId('live-record').click();

  // Recorded through the normal decision path, with the recap under the feedback.
  await expect(page.getByRole('dialog', { name: /Dana/ })).toHaveCount(0);
  const done = page.locator('.decision.is-done', { hasText: 'Priya Nair, week 1' });
  await expect(done).toContainText('Good call');
  await expect(done.locator('.live-recap')).toContainText('From your live conversation');
  expect(sent).toContain('conversation_initiation_client_data');
  expect(sent).toContain('user_message');
});

test('live conversation: a refused connection falls back to the options', async ({ page }) => {
  await fakeAgent(page, { fail: true });
  await page.addInitScript(() => localStorage.setItem('pp_settings', JSON.stringify({ view: '2d', reducedMotion: true, speed: 'manual', voices: false, liveConsent: true })));
  await page.goto('/');
  await page.getByTestId('start').click();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Next' }).click();
  await page.getByTestId('begin').click();
  await openTask(page, 'timecards');
  await page.getByTestId('live-text').click();
  const alert = page.getByRole('alert');
  await expect(alert).toContainText("Live practice isn't available right now");
  await expect(alert).toContainText("today's limit");
  await alert.getByRole('button', { name: 'Back to the options' }).click();
  await expect(page.locator('.task').getByLabel('Keep the 44 hours as worked, and pay 4 of them as overtime', { exact: true })).toBeVisible();
});

test('live conversations can be switched off in Settings', async ({ page }) => {
  await start(page, { view: '2d' });
  await page.getByRole('button', { name: 'Settings' }).click();
  const settingsA11y = await new AxeBuilder(page).analyze();
  expect(settingsA11y.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
  await page.getByLabel('Offer live conversations').uncheck();
  await page.getByRole('button', { name: 'Done' }).click();
  await openTask(page, 'timecards');
  await expect(page.locator('.quote--decision')).toContainText('Can I just change her time to 40?');
  await expect(page.locator('.live-offer')).toHaveCount(0);
});

test('answer out loud: a spoken option number selects it, and Decide still confirms', async ({ page }) => {
  // Stand-in for the browser's speech recognizer: hears "option two" (with a worse alternative first).
  await page.addInitScript(() => {
    class FakeRecognition {
      lang = ''; interimResults = false; maxAlternatives = 1; continuous = false;
      onresult: ((e: unknown) => void) | null = null; onerror: ((e: unknown) => void) | null = null; onend: (() => void) | null = null;
      start() {
        setTimeout(() => {
          this.onresult?.({ resultIndex: 0, results: { length: 1, 0: Object.assign([{ transcript: 'auction to' }, { transcript: 'option two' }], { isFinal: true }) } });
          this.onend?.();
        }, 50);
      }
      stop() {} abort() {}
    }
    (window as unknown as { SpeechRecognition: unknown }).SpeechRecognition = FakeRecognition;
    localStorage.setItem('pp_settings', JSON.stringify({ view: '2d', reducedMotion: true, speed: 'manual', voices: false, speakBack: true }));
  });
  await page.goto('/');
  await page.getByTestId('start').click();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Next' }).click();
  await page.getByTestId('begin').click();
  await openTask(page, 'calendar');
  const panel = page.locator('.task');
  await expect(panel.locator('.opt-num').first()).toHaveText('1');
  await panel.getByTestId('say-answer').first().click();
  await expect(panel.locator('.say-status').first()).toContainText('Option 2 is selected. Press Decide to confirm.');
  await expect(panel.locator('.option').nth(1).locator('input')).toBeChecked();
  await expect(panel.locator('.decision.is-done')).toHaveCount(0);
  await panel.getByRole('button', { name: 'Decide' }).first().click();
  await expect(panel.locator('.decision.is-done')).toHaveCount(1);
});
