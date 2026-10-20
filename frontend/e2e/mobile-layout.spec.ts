import { expect, test, type Page } from '@playwright/test'

/**
 * 375x812 layout against the real stack: bottom navigation, no horizontal scroll,
 * content not hidden behind fixed bars, controls actually receive taps,
 * and no console errors or failed API requests on any section.
 */

const PAGES = [
  '/', '/path', '/lessons/a1-m01-l1', '/vocabulary', '/review', '/grammar', '/listening',
  '/speaking', '/writing', '/tests', '/stats', '/settings', '/reading', '/tutor',
]

test.skip(({ isMobile }) => !isMobile, 'mobile viewport only (project mobile-375)')

function watchProblems(page: Page): string[] {
  const problems: string[] = []
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text()}`) })
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`))
  page.on('response', (r) => {
    if (r.url().includes('/api/') && r.status() >= 400) problems.push(`${r.status()} ${r.request().method()} ${r.url()}`)
  })
  page.on('requestfailed', (r) => {
    // navigation away cancels in-flight requests; that is not a failure
    if (!r.failure()?.errorText.includes('ERR_ABORTED')) problems.push(`failed: ${r.url()} ${r.failure()?.errorText}`)
  })
  return problems
}

async function signUp(page: Page) {
  const email = `m375-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`
  const reg = await page.request.post('/api/auth/register', { data: { email, password: 'm375-parol-12345', display_name: 'Mobil' } })
  expect(reg.status()).toBe(201)
  const settings = await (await page.request.get('/api/settings')).json()
  const put = await page.request.put('/api/settings', { data: { ...settings, onboarding_done: true } })
  expect(put.ok()).toBeTruthy()
}

/** Controls whose centre point is covered by another element (e.g. a fixed bar). */
async function coveredControls(page: Page, mode: 'centre' | 'in-view') {
  return page.evaluate((m) => {
    const sel = 'main button, main a[href], main input:not([type=hidden]), main select, main textarea, main [role=button]'
    const out: string[] = []
    for (const el of Array.from(document.querySelectorAll<HTMLElement>(sel)).slice(0, 80)) {
      const box = el.getBoundingClientRect()
      if (box.width < 2 || box.height < 2 || getComputedStyle(el).visibility === 'hidden') continue
      if (m === 'centre') el.scrollIntoView({ block: 'center' })
      // a link wrapped over two lines has a bounding-box centre on someone else's text; test its first line box
      const r = el.getClientRects()[0] ?? el.getBoundingClientRect()
      // controls half-scrolled under the sticky top header are just mid-scroll; the bottom bar is what we check
      const top = m === 'in-view' ? (document.querySelector('header')?.getBoundingClientRect().bottom ?? 0) : 0
      if (r.top < top || r.top >= innerHeight) continue
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
      // a wrapping <label> or the control's own children count as the control
      if (hit && (el === hit || el.contains(hit) || hit.contains(el) || (hit as HTMLLabelElement).control === el)) continue
      out.push(`${el.tagName.toLowerCase()} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 40)}" covered by ${hit?.tagName.toLowerCase()}.${(hit as HTMLElement | null)?.className?.toString().slice(0, 50)}`)
    }
    return out
  }, mode)
}

test('375x812: every section fits, nothing hidden behind the bottom bar, no errors', async ({ page }) => {
  const problems = watchProblems(page)
  await signUp(page)
  const nav = page.getByRole('navigation', { name: 'Pastki navigatsiya' })

  for (const path of PAGES) {
    await page.goto(path)
    await expect(page.locator('main h1').first(), path).toBeVisible()
    await page.waitForLoadState('networkidle')

    await expect(nav, path).toBeVisible()
    const navBox = (await nav.boundingBox())!
    expect(navBox.y + navBox.height, `${path}: bottom bar inside viewport`).toBeLessThanOrEqual(812 + 1)

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow, `${path}: horizontal overflow (px)`).toBeLessThanOrEqual(0)

    expect(await coveredControls(page, 'centre'), `${path}: controls covered at centre`).toEqual([])

    // At the very end of the page the last content must sit above the bar, and visible controls must take taps.
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    const lastBottom = await page.evaluate(() => {
      const kids = Array.from(document.querySelectorAll('main > * *')).filter((e) => (e as HTMLElement).offsetParent !== null)
      return Math.max(...kids.map((e) => e.getBoundingClientRect().bottom))
    })
    expect(lastBottom, `${path}: last content bottom vs bar top`).toBeLessThanOrEqual(navBox.y + 1)
    expect(await coveredControls(page, 'in-view'), `${path}: controls covered at page end`).toEqual([])
  }

  expect(problems, 'console errors / failed API requests').toEqual([])
})

test('375x812: bottom tabs and "Ko\'proq" menu navigate and are large enough to tap', async ({ page }) => {
  const problems = watchProblems(page)
  await signUp(page)
  await page.goto('/')
  const nav = page.getByRole('navigation', { name: 'Pastki navigatsiya' })

  for (const [label, url] of [["Yo'l", /\/path$/], ['Takrorlash', /\/review$/], ["Lug'at", /\/vocabulary$/], ['Bosh', /\/$/]] as const) {
    const tab = nav.getByRole('link', { name: label, exact: true })
    const box = (await tab.boundingBox())!
    expect(box.height, `${label} tap height`).toBeGreaterThanOrEqual(44)
    expect(box.width, `${label} tap width`).toBeGreaterThanOrEqual(44)
    await tab.click()
    await expect(page).toHaveURL(url)
    await expect(tab).toHaveAttribute('aria-current', 'page')
  }

  const more = nav.getByRole('button', { name: "Ko'proq" })
  expect((await more.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  await more.click()
  await expect(more).toHaveAttribute('aria-expanded', 'true')
  const menu = page.locator('#more-menu')
  await expect(menu).toBeVisible()
  const menuBox = (await menu.boundingBox())!
  const navBox = (await nav.boundingBox())!
  expect(menuBox.y + menuBox.height, 'menu must not overlap the bottom bar').toBeLessThanOrEqual(navBox.y + 1)
  await menu.getByRole('link', { name: 'Grammatika' }).click()
  await expect(page).toHaveURL(/\/grammar$/)
  await expect(menu).toBeHidden()
  await expect(more).toHaveAttribute('aria-expanded', 'false')

  expect(problems, 'console errors / failed API requests').toEqual([])
})
