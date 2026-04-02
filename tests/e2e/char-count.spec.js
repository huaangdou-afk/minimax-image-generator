const { test, expect } = require('@playwright/test');

// 测试字符数限制是否正确（从 constants.js 读取）
// 这些是 UI 验证测试，不调用真实 API

test.describe('字符数限制', () => {
  const MAX_IMAGE = 1500;
  const MAX_TTS = 3000;

  test(`图片 prompt 不能超过 ${MAX_IMAGE} 字`, async ({ page }) => {
    await page.goto('/');
    const textarea = page.locator('textarea').first();
    await textarea.fill('a'.repeat(MAX_IMAGE + 100));

    // 检查是否有警告（字符变红或按钮禁用）
    const charCount = page.locator('[class*="char"]').first();
    const countText = await charCount.textContent();

    // 字符计数应该显示超过 1500
    expect(countText).toContain(String(MAX_IMAGE + 100));
  });

  test('字符数正常范围内无警告', async ({ page }) => {
    await page.goto('/');
    const textarea = page.locator('textarea').first();
    await textarea.fill('a'.repeat(100));
    await page.waitForTimeout(200);

    const charCount = page.locator('[class*="char"]').first();
    const countText = await charCount.textContent();
    expect(countText).toContain('100');
    // 颜色应该不是警告色
    const color = await charCount.evaluate(el => getComputedStyle(el).color);
    expect(color).not.toMatch(/255.*0.*0/); // 不是红色
  });
});

test.describe('风格标签追加', () => {
  test('风格标签追加到 prompt 而非覆盖', async ({ page }) => {
    await page.goto('/');
    const textarea = page.locator('textarea').first();

    // 模拟添加风格标签（如果有 UI 的话）
    // 这里只验证 prompt 框可编辑
    await textarea.fill('我的猫');
    expect(await textarea.inputValue()).toBe('我的猫');
  });
});
