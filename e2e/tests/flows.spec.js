const { test, expect } = require('@playwright/test');
async function login(page, email, password = 'Demo1234!') {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
}
async function logout(page) { await page.getByRole('button', { name: 'Log out', exact: true }).click(); await expect(page).toHaveURL(/\/login$/); }
const tab = (page, name) => page.getByRole('navigation', { name: 'Çocuk paneli' }).getByRole('button', { name, exact: true }).click();

test('login rejects wrong password and restores the correct role on reload', async ({ page }) => {
  await login(page, 'parent@demo.test', 'wrong');
  await expect(page.getByRole('alert')).toHaveText('Invalid email or password');
  await login(page, 'parent@demo.test');
  await expect(page.getByRole('heading', { name: 'Parent dashboard', exact: true })).toBeVisible();
  await page.reload(); await expect(page).toHaveURL(/\/parent$/);
  await page.goto('/specialist'); await expect(page).toHaveURL(/\/parent$/);
});

test('Flow 1: parent links a specialist, unlink revokes the same specialist token', async ({ page, request }) => {
  const response = await request.post('http://localhost:3100/api/auth/login', { data: { email: 'psychologist@demo.test', password: 'Demo1234!' } });
  const { token } = await response.json();
  await login(page, 'parent@demo.test'); await tab(page, 'Uzman erişimi');
  await page.getByLabel('Specialist email', { exact: true }).fill('psychologist@demo.test');
  await page.getByLabel('Type', { exact: true }).selectOption('psychologist');
  await page.getByRole('button', { name: 'Link specialist', exact: true }).click();
  const row = page.getByRole('row').filter({ hasText: 'psychologist@demo.test' });
  await expect(row).toBeVisible();
  expect((await request.get('http://localhost:3100/api/children/1/tasks', { headers: { Authorization: `Bearer ${token}` } })).status()).toBe(200);
  await row.getByRole('button', { name: 'Unlink', exact: true }).click();
  await row.getByRole('button', { name: 'Yes, unlink', exact: true }).click();
  await expect(row).toHaveCount(0);
  expect((await request.get('http://localhost:3100/api/children/1/tasks', { headers: { Authorization: `Bearer ${token}` } })).status()).toBe(403);
});

test('Flow 2: specialist assigns a task, child completes it and specialist sees done', async ({ page }) => {
  await login(page, 'teacher@demo.test'); await tab(page, 'Takvim ve görevler');
  await page.getByLabel('Görev başlığı', { exact: true }).fill('E2E reading task');
  await page.getByLabel('Görev açıklaması', { exact: true }).fill('Synthetic reading exercise');
  await page.getByRole('button', { name: 'Assign task', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'E2E reading task', exact: true })).toBeVisible();
  await logout(page); await login(page, 'child@demo.test');
  const row = page.locator('.task-row').filter({ hasText: 'E2E reading task' });
  await row.getByRole('button', { name: 'Mark as done', exact: true }).click();
  await expect(row.getByText('Tamamlandı', { exact: true })).toBeVisible();
  await row.getByRole('button', { name: 'Undone · Yapılmadı', exact: true }).click();
  await expect(row.getByText('Bekliyor', { exact: true })).toBeVisible();
  await page.reload();
  await expect(row.getByText('Bekliyor', { exact: true })).toBeVisible();
  await row.getByRole('button', { name: 'Mark as done', exact: true }).click();
  await expect(row.getByText('Tamamlandı', { exact: true })).toBeVisible();
  await logout(page); await login(page, 'teacher@demo.test'); await tab(page, 'Atadığım görevler');
  await expect(page.locator('.task-row').filter({ hasText: 'E2E reading task' }).getByText('done', { exact: true })).toBeVisible();
});

test('Flow 3: mock summary has sources, source details, feedback and saved history', async ({ page }) => {
  await login(page, 'parent@demo.test'); await tab(page, 'AI özeti');
  await page.getByRole('button', { name: 'Özet oluştur', exact: true }).click();
  await expect(page.getByText('AI-generated · mock · parent', { exact: true })).toBeVisible();
  await page.locator('.source-list button').first().click();
  await expect(page.getByLabel('Kaynak kayıt', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Yararlı', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Yararlı', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.reload(); await tab(page, 'AI özeti');
  await expect(page.getByText('AI-generated · mock · parent', { exact: true })).toBeVisible();
});

test('calendar, document upload/download and statistics are connected to the child', async ({ page }) => {
  await login(page, 'parent@demo.test'); await tab(page, 'Takvim ve görevler');
  await expect(page.locator('.workspace-toolbar').getByLabel('Yıl', { exact: true })).toHaveCount(0);
  await expect(page.locator('.calendar-day')).toHaveCount(42);
  await page.getByRole('button', { name: 'Sonraki ay', exact: true }).click();
  await page.getByRole('button', { name: 'Önceki ay', exact: true }).click();
  await page.getByLabel('Etkinlik başlığı', { exact: true }).fill('E2E weekly activity');
  await page.getByRole('button', { name: 'Etkinliği kaydet', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'E2E weekly activity', exact: true })).toBeVisible();
  await expect(page.locator('.calendar-event').filter({ hasText: 'E2E weekly activity' })).toBeVisible();
  await tab(page, 'Belgeler');
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jLz8AAAAASUVORK5CYII=', 'base64');
  await page.getByLabel('PDF veya resim', { exact: true }).setInputFiles({ name: 'synthetic.png', mimeType: 'image/png', buffer: png });
  await page.getByRole('button', { name: 'Belge yükle', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'synthetic.png', exact: true })).toBeVisible();
  const popup = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Görüntüle', exact: true }).click();
  const preview = await popup;
  await expect(preview.locator('img')).toBeVisible();
  await preview.close();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'İndir', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('synthetic.png');
  await tab(page, 'Genel bakış'); await expect(page.getByRole('heading', { name: 'Haftalık istatistikler', exact: true })).toBeVisible();
});

test('admin previews actual role permissions and mobile layout stays within viewport', async ({ page }) => {
  await login(page, 'admin@admin.com', 'admin');
  const bar = page.getByRole('complementary', { name: 'Admin rol testi' });
  await bar.getByRole('button', { name: 'Çocuk', exact: true }).click(); await expect(page).toHaveURL(/\/child$/);
  await expect(page.getByRole('button', { name: 'Belgeler', exact: true })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await bar.getByRole('button', { name: 'Admin', exact: true }).click(); await expect(page).toHaveURL(/\/admin$/);
});

test('M5 specialist writes an evaluation and parent reads it in the selected week', async ({ page }) => {
  await login(page, 'teacher@demo.test'); await tab(page, 'Değerlendirmeler');
  await page.getByLabel('Değerlendirme', { exact: true }).fill('E2E synthetic weekly observation');
  await page.getByRole('button', { name: 'Değerlendirmeyi kaydet', exact: true }).click();
  await expect(page.locator('.evaluation-content').filter({ hasText: 'E2E synthetic weekly observation' })).toBeVisible();
  await logout(page); await login(page, 'parent@demo.test'); await tab(page, 'Değerlendirmeler');
  await expect(page.locator('.evaluation-content').filter({ hasText: 'E2E synthetic weekly observation' })).toBeVisible();
  await expect(page.locator('textarea')).toHaveCount(0);
  await page.getByLabel('Yıl', { exact: true }).fill('2025');
  await expect(page.getByText('Bu hafta için henüz değerlendirme yok.', { exact: true })).toBeVisible();
});

test('parent creates a child account and the child logs in to complete its assigned task', async ({ page }) => {
  await login(page, 'parent@demo.test');
  await page.locator('.add-child-disclosure > summary').click();
  await page.getByLabel('Çocuğun adı', { exact: true }).fill('Deniz');
  await page.getByLabel('Çocuğun soyadı', { exact: true }).fill('Demo');
  await page.getByLabel('Çocuğun e-postası', { exact: true }).fill('new-child@demo.test');
  await page.getByLabel('Çocuğun şifresi', { exact: true }).fill('ChildDemo123!');
  await page.getByRole('button', { name: 'Add child', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Deniz Demo ve giriş hesabı oluşturuldu.');
  await tab(page, 'Takvim ve görevler');
  await page.getByLabel('Görev başlığı', { exact: true }).fill('New child reading');
  await page.getByLabel('Görev açıklaması', { exact: true }).fill('Synthetic child account task');
  await page.getByRole('button', { name: 'Assign task', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'New child reading', exact: true })).toBeVisible();
  await logout(page);
  await login(page, 'new-child@demo.test', 'ChildDemo123!');
  await expect(page).toHaveURL(/\/child$/);
  const task = page.locator('.task-row').filter({ hasText: 'New child reading' });
  await task.getByRole('button', { name: 'Mark as done', exact: true }).click();
  await expect(task.getByText('Tamamlandı', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Belgeler', exact: true })).toHaveCount(0);
  await page.reload();
  await expect(task.getByText('Tamamlandı', { exact: true })).toBeVisible();
});
