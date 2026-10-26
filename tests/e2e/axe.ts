import type { Page } from '@playwright/test';
import { createRequire } from 'node:module';

/** Minimal axe-core runner: inject the bundled script and run against the page. */
const require = createRequire(import.meta.url);
const source: string = require('fs').readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

interface Violation { id: string; impact: string | null; help: string; nodes: { target: string[] }[] }
export default class AxeBuilder {
  constructor(private page: Page) {}
  async analyze(): Promise<{ violations: Violation[] }> {
    await this.page.addScriptTag({ content: source });
    return this.page.evaluate(async () => {
      // @ts-expect-error injected global
      const r = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } });
      return { violations: r.violations.map((v: Violation) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.map((n) => ({ target: n.target })) })) };
    });
  }
}
