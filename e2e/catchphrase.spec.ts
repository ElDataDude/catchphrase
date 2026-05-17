import { expect, type Page, test } from '@playwright/test';

const imageDataUrl =
  'data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%201200%20675%22%3E%3Crect%20width=%221200%22%20height=%22675%22%20fill=%22%2306b6d4%22/%3E%3Ctext%20x=%22600%22%20y=%22360%22%20font-size=%2290%22%20text-anchor=%22middle%22%20fill=%22white%22%3ESmoke%3C/text%3E%3C/svg%3E';

const sampleQuizName = 'Release Candidate Night';

const expectNoHorizontalOverflow = async (page: Page, tolerancePx = 2) => {
  const overflow = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth
  }));

  expect(overflow.scrollWidth, JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.clientWidth + tolerancePx);
  expect(overflow.bodyScrollWidth, JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.clientWidth + tolerancePx);
};

const expectInteractiveControlsDoNotOverlap = async (page: Page) => {
  const overlaps = await page.evaluate(() => {
    const controls = Array.from(
      document.querySelectorAll('button, input, select, textarea, a[href], [role="button"]')
    )
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        const label =
          element.getAttribute('aria-label') ||
          element.textContent?.trim() ||
          element.getAttribute('placeholder') ||
          element.tagName.toLowerCase();

        return {
          label,
          rect: {
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            left: rect.left,
            width: rect.width,
            height: rect.height
          },
          visible:
            rect.width > 0 &&
            rect.height > 0 &&
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            Number(style.opacity) !== 0
        };
      })
      .filter((item) => item.visible);

    const failures = [];
    for (let index = 0; index < controls.length; index += 1) {
      for (let otherIndex = index + 1; otherIndex < controls.length; otherIndex += 1) {
        const left = controls[index];
        const right = controls[otherIndex];
        const width = Math.max(0, Math.min(left.rect.right, right.rect.right) - Math.max(left.rect.left, right.rect.left));
        const height = Math.max(0, Math.min(left.rect.bottom, right.rect.bottom) - Math.max(left.rect.top, right.rect.top));
        const area = width * height;
        const smallestArea = Math.min(left.rect.width * left.rect.height, right.rect.width * right.rect.height);
        if (area > 4 && smallestArea > 0 && area / smallestArea > 0.15) {
          failures.push(`${left.label} overlaps ${right.label}`);
        }
      }
    }

    return failures;
  });

  expect(overlaps).toEqual([]);
};

const expectResponsiveSafe = async (page: Page, options: { overflowTolerancePx?: number } = {}) => {
  await expectNoHorizontalOverflow(page, options.overflowTolerancePx);
  await expectInteractiveControlsDoNotOverlap(page);
};

const createQuizAndRun = async (page: Page) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Create Quiz' })).toBeVisible();
  await expectResponsiveSafe(page);

  await page.getByRole('button', { name: 'Create Quiz' }).click();
  await expect(page).toHaveURL(/\/quiz\/new$/);
  await expect(page.getByRole('heading', { name: 'Untitled quiz' })).toBeVisible();
  await expectResponsiveSafe(page);

  await page.getByLabel('Profile').fill('qa-host');
  await page.getByLabel('Quiz Name').fill(sampleQuizName);
  await page.getByLabel('Title').fill('Picture One');
  await page.getByLabel('Answer').fill('Smoke Answer');
  await page.getByLabel('Category').fill('General');
  await page.getByLabel('Round').fill('Round 1');
  await page.getByLabel('Media URL').fill(imageDataUrl);

  await page.getByRole('button', { name: 'Save & Run' }).click();
  await expect(page).toHaveURL(/\/quiz\/[^/]+\?view=controller$/);
  await expect(page.getByRole('heading', { name: sampleQuizName })).toBeVisible();
  await expect(page.getByText(/Scene:\s+title/)).toBeVisible();
  await expectResponsiveSafe(page);

  return page.url();
};

test('creates, saves, runs, and displays a quiz', async ({ page, context }) => {
  const controllerUrl = await createQuizAndRun(page);

  await page.getByRole('button', { name: 'Next' }).first().click();
  await expect(page.getByText(/Scene:\s+question/)).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).first().click();
  await expect(page.getByText('8 hidden')).toBeVisible();
  await page.getByRole('button', { name: 'Answer' }).click();
  await expect(page.getByText(/Scene:\s+answer/)).toBeVisible();

  const display = await context.newPage();
  await display.goto(controllerUrl.replace('view=controller', 'view=display'));
  await expect(display.getByRole('img', { name: 'Picture One' })).toBeVisible();
  await expect(display.getByText('Smoke Answer')).toBeVisible();
  await expectNoHorizontalOverflow(display);
});

test('remote display accepts a version-zero relay snapshot without local storage', async ({ browser }) => {
  const quizId = 'quiz_remote_display_v0';
  const context = await browser.newContext();
  const display = await context.newPage();
  let allowRelayState = false;

  await context.route(`**/api/realtime?quizId=${quizId}`, async (route, request) => {
    if (request.method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Cache-Control': 'no-store, max-age=0' },
        body: JSON.stringify({
          ok: true,
          version: 0,
          updatedAt: 0,
          presence: { controller: 1, display: 1 },
          state: null
        })
      });
      return;
    }

    const state = !allowRelayState
      ? null
      : {
          id: quizId,
          schemaVersion: 2,
          username: 'remote-host',
          name: 'Remote Relay Smoke',
          createdAt: '2026-05-17T18:00:00.000Z',
          updatedAt: '2026-05-17T18:00:00.000Z',
          settings: {
            theme: 'studio',
            gridSize: 3,
            defaultTimerMs: 5000,
            revealAnimation: 'flip',
            preflightRequired: true,
            showLowerThird: true
          },
          questions: [
            {
              id: 'q_remote',
              title: 'Remote Picture',
              answer: 'Remote Answer',
              category: 'Relay',
              roundLabel: 'Round 1',
              hostNotes: '',
              media: { kind: 'image', src: imageDataUrl, startTime: 0, duration: 10, fitMode: 'cover' },
              reveal: { sequence: null, revealedSquares: [], revealHistory: [] },
              assetStatus: { state: 'idle', message: null, checkedAt: null }
            }
          ],
          liveState: {
            currentQuestionIndex: 0,
            scene: 'title',
            syncVersion: 0,
            timer: { enabled: true, intervalMs: 5000, isRunning: false, startedAt: null }
          }
        };

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Cache-Control': 'no-store, max-age=0' },
      body: JSON.stringify({
        ok: true,
        version: state ? 1 : 0,
        updatedAt: state ? Date.now() : 0,
        presence: { controller: 1, display: 1 },
        state
      })
    });
  });

  await display.goto(`/quiz/${quizId}?view=display`);
  await expect(display.getByText('Waiting for controller...')).toBeVisible();
  allowRelayState = true;
  await expect(display.getByText('Remote Picture')).toBeVisible();
  await expectNoHorizontalOverflow(display);

  await context.close();
});
