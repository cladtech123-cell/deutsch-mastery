import { expect, test, type Locator, type Page } from '@playwright/test'

/**
 * Real user flow against the running stack (request §23):
 * register → onboarding → open lesson → answer exercises → final test → review session → dashboard progress.
 * Uses the seeded lesson content/a1/m01/l1.json.
 */

const LESSON = 'a1-m01-l1'

const card = (scope: Page | Locator, question: string) => scope.locator('.card', { hasText: question }).first()

test('register → onboarding → lesson → final test → review → dashboard', async ({ page }) => {
  const email = `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`

  // Register
  await page.goto('/register')
  await page.getByLabel('Ismingiz').fill('E2E Foydalanuvchi')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Parol (kamida 8 belgi)').fill('e2e-parol-12345')
  await page.getByRole('button', { name: "Ro'yxatdan o'tish" }).click()

  // Onboarding
  await expect(page).toHaveURL(/\/onboarding$/)
  await page.getByLabel('Mutlaqo boshlovchiman').check()
  await page.getByLabel('30 daqiqa').check()
  await page.getByLabel('Asosiy maqsadingiz').selectOption('living')
  await page.getByLabel("Haftalik maqsad: haftada necha kun o'qiysiz?").selectOption('5')
  await page.getByRole('button', { name: 'Davom etish' }).click()
  await page.getByRole('button', { name: 'Testsiz, noldan boshlash' }).click()
  await expect(page.getByRole('heading', { name: 'Bosh sahifa' })).toBeVisible()

  // Lesson: sections and exercises
  await page.goto(`/lessons/${LESSON}`)
  await expect(page.getByRole('heading', { level: 1, name: 'Salomlashish va xayrlashish' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Xatolar tahlili' })).toBeVisible()

  const practice = page.getByRole('region', { name: 'Mashqlar' })
  const mc = card(practice, 'Ishxonada hamkasbingiz bilan qanday salomlashasiz?')
  await mc.getByLabel('Guten Morgen!').check()
  await mc.getByRole('button', { name: 'Tekshirish' }).click()
  await expect(mc.getByText("To'g'ri!")).toBeVisible()

  // Wrong answer → explanation and mistake analysis
  const tr = card(practice, 'Nemis tiliga tarjima qiling: "Rahmat!"')
  await tr.getByLabel('Javobingiz').fill('Hallo')
  await tr.getByRole('button', { name: 'Tekshirish' }).click()
  await expect(tr.getByText("Noto'g'ri")).toBeVisible()
  await expect(tr.getByText("To'g'ri javob:")).toBeVisible()
  await expect(page.getByRole('region', { name: 'Xatolar tahlili' }).getByText('Nemis tiliga tarjima qiling: "Rahmat!"')).toBeVisible()

  // order_words in the grammar section: answer is sent as list[str]
  const grammar = page.getByRole('region', { name: 'Grammatika' })
  const order = card(grammar, "So'zlarni to'g'ri tartibda joylashtiring")
  for (const w of ['Ich', 'bin', 'Tom']) await order.getByRole('group', { name: "So'zlar" }).getByRole('button', { name: w, exact: true }).click()
  await order.getByRole('button', { name: 'Tekshirish' }).click()
  await expect(order.getByText("To'g'ri!")).toBeVisible()

  // Final test (all correct)
  const final = page.getByRole('region', { name: 'Yakuniy test' })
  await card(final, "Do'konga kirdingiz").getByLabel('Guten Abend!').check()
  await card(final, '___ bin Lena.').getByLabel('Javobingiz').fill('Ich')
  await card(final, "O'zbek tiliga tarjima qiling").getByLabel('Javobingiz').fill('Rahmat')
  await card(final, 'Anna nima qilyapti?').getByLabel('Xayrlashyapti').check()
  await card(final, 'Shifokor bilan qanday xayrlashasiz?').getByLabel('Auf Wiedersehen!').check()
  const match = card(final, 'Iborani kunning vaqti bilan juftlang.')
  await match.getByLabel('Guten Morgen', { exact: true }).selectOption('ertalab')
  await match.getByLabel('Guten Tag', { exact: true }).selectOption('kunduzi')
  await match.getByLabel('Guten Abend', { exact: true }).selectOption('kechqurun')
  await match.getByLabel('Gute Nacht', { exact: true }).selectOption('uxlashdan oldin')
  await final.getByRole('button', { name: 'Testni yakunlash' }).click()
  await expect(final.getByText(/Tabriklaymiz, dars tugallandi!/)).toBeVisible()

  // Progress survives a reload (stored in the database)
  await page.reload()
  await expect(page.getByText(/tugallangan/).first()).toBeVisible()

  // Review session: passed lesson words are now cards
  await page.goto('/review')
  const reveal = page.getByRole('button', { name: "Javobni ko'rsatish" })
  await expect(reveal).toBeVisible()
  for (let i = 0; i < 30 && (await reveal.isVisible()); i++) {
    await reveal.click()
    await page.getByRole('button', { name: /^Yaxshi/ }).click()
    await expect(page.getByText('Seans tugadi!').or(reveal)).toBeVisible()
  }
  await expect(page.getByText('Seans tugadi!')).toBeVisible()

  // Dashboard reflects the progress
  await page.goto('/')
  const course = page.getByRole('region', { name: 'Joriy daraja va kurs' })
  await expect(course).toContainText(/1 \/ \d+ dars tugallangan/)
  await expect(page.getByRole('region', { name: "So'nggi natijalar" })).not.toContainText('Hali test topshirilmagan.')
  await expect(page.getByRole('region', { name: 'Haftalik faollik' })).toContainText('Ketma-ketlik: 1 kun')
})
