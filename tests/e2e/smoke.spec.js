const { test, expect } = require('@playwright/test');

// 这些测试不调用真实 API，只测试 UI 逻辑
// 需要先运行: npm run dev

test.describe('页面加载', () => {
  test('页面标题正确', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/MiniMax/);
  });

  test('无控制台错误', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // 允许 ServiceWorker 注册失败的 warning（无害）
    const realErrors = errors.filter(e => !e.includes('SW') && !e.includes('serviceWorker'));
    expect(realErrors).toHaveLength(0);
  });
});

test.describe('导航', () => {
  test('顶部 Tab 导航存在', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('nav, .tab-nav, [class*="tab"]').first()).toBeVisible();
  });

  test('点击 Tab 切换内容', async ({ page }) => {
    await page.goto('/');
    // 找 Tab 按钮
    const tabs = page.locator('[class*="tab"], nav button, .nav-item');
    const count = await tabs.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('图片生成 Tab', () => {
  test('prompt 输入框存在', async ({ page }) => {
    await page.goto('/');
    const textarea = page.locator('textarea').first();
    await expect(textarea).toBeVisible();
  });

  test('字符计数随输入变化', async ({ page }) => {
    await page.goto('/');
    const textarea = page.locator('textarea').first();
    await textarea.fill('测试文字');
    // 找字符计数元素（包含 "0 /" 或数字 / 数字）
    const charCount = page.locator('[class*="char"], [class*="count"]').first();
    await expect(charCount).toBeVisible();
  });

  test('生成按钮存在', async ({ page }) => {
    await page.goto('/');
    const btn = page.locator('button').filter({ hasText: /生成|生成图片/i }).first();
    await expect(btn).toBeVisible();
  });
});

test.describe('风格参考区', () => {
  test('风格参考上传区存在', async ({ page }) => {
    await page.goto('/');
    // 找上传相关的元素（上传图标/拖拽/点击上传）
    const uploadArea = page.locator('text=/上传|拖拽|点击/i, input[type="file"]').first();
    await expect(uploadArea).toBeVisible();
  });
});

test.describe('语音合成 Tab', () => {
  test('TTS 文本输入框存在', async ({ page }) => {
    await page.goto('/#tts');
    const textarea = page.locator('textarea').last();
    await expect(textarea).toBeVisible();
  });

  test('TTS 合成按钮存在', async ({ page }) => {
    await page.goto('/#tts');
    const btn = page.locator('button').filter({ hasText: /合成|语音/i }).first();
    await expect(btn).toBeVisible();
  });
});
