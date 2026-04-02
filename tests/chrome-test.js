/**
 * Chrome DevTools Protocol 功能测试
 * 使用 Node.js + CDP 直接测试页面功能
 */

const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');

// 连接到 Chrome
const PAGE_ID = '920F9EB2E61844FFAE210866B392E5CD';
const WS_URL = `ws://127.0.0.1:9222/devtools/page/${PAGE_ID}`;

let ws;
let id = 0;

function connect() {
  return new Promise((res) => {
    ws = new WebSocket(WS_URL);
    ws.on('open', () => res());
    ws.on('error', (e) => console.error('WS error:', e.message));
  });
}

function send(method, params = {}) {
  return new Promise((res) => {
    const mid = ++id;
    const handler = (d) => {
      const r = JSON.parse(d);
      if (r.id === mid) {
        ws.off('message', handler);
        res(r);
      }
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
}

function screenshot(name) {
  return send('Page.captureScreenshot', { format: 'png' })
    .then(r => {
      const buf = Buffer.from(r.result.data, 'base64');
      fs.writeFileSync(`C:/tmp/test_${name}.png`, buf);
      console.log(`  📸 截图: test_${name}.png`);
      return buf;
    });
}

async function run() {
  console.log('🔌 连接 Chrome...');
  await connect();
  console.log('✅ 已连接\n');

  // 1. 打开页面
  console.log('📄 测试 1: 打开页面');
  await send('Page.navigate', { url: 'http://localhost:3000' });
  await new Promise(r => setTimeout(r, 2000));
  const title = await send('Runtime.evaluate', { expression: 'document.title' });
  console.log(`  标题: ${title.result.result.value}`);
  await screenshot('01_page_load');

  // 2. Tab 导航
  console.log('\n📑 测试 2: Tab 导航');
  const tabCount = await send('Runtime.evaluate', {
    expression: 'document.querySelectorAll("[class*=tab]").length'
  });
  console.log(`  Tab 数量: ${tabCount.result.result.value}`);

  // 点击语音合成 Tab
  await send('Runtime.evaluate', {
    expression: `(() => {
      const tabs = document.querySelectorAll('.tab-btn, [class*="tab"], button');
      for (const t of tabs) {
        if (t.textContent.includes('语音')) { t.click(); return true; }
      }
      return false;
    })()`
  });
  await new Promise(r => setTimeout(r, 500));
  const activeTab = await send('Runtime.evaluate', {
    expression: 'document.querySelector(".tab-btn.active, [class*="tab"][class*="active"]")?.textContent?.trim() || "unknown"'
  });
  console.log(`  当前激活 Tab: ${activeTab.result.result.value}`);
  await screenshot('02_tab_switch');

  // 3. 返回图片生成 Tab
  console.log('\n🎨 测试 3: 图片生成 Tab');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const tabs = document.querySelectorAll('button');
      for (const t of tabs) {
        if (t.textContent.includes('图片生成') || t.textContent.includes('生成图片')) { t.click(); return true; }
      }
      return false;
    })()`
  });
  await new Promise(r => setTimeout(r, 500));

  // 4. 点击风格卡片（自动填入 prompt）
  console.log('\n🎭 测试 4: 点击风格卡片自动填入 Prompt');
  await send('Runtime.evaluate', {
    expression: '(function(){var cards=document.querySelectorAll("[class*=card]"); if(cards[0]) cards[0].click();})()'
  });
  await new Promise(r => setTimeout(r, 800));
  const promptVal = await send('Runtime.evaluate', {
    expression: '(function(){var t=document.querySelector("textarea"); return t ? t.value.substring(0,60) : "NO TEXTAREA";})()'
  });
  console.log(`  Prompt 内容: ${promptVal.result.result.value}...`);
  const charCount = await send('Runtime.evaluate', {
    expression: '(function(){var spans=document.querySelectorAll("span");for(var i=0;i<spans.length;i++){var t=spans[i].textContent; if(t.match(/^\\d+\\s*\\/\\s*\\d+$/)) return t;}return "NOT FOUND";})()'
  });
  console.log(`  字符计数: ${charCount.result.result.value}`);
  await screenshot('04_card_filled_prompt');

  // 5. 风格参考上传区
  console.log('\n📷 测试 5: 风格参考区');
  await send('Runtime.evaluate', {expression: 'window.scrollTo(0, 0)'});
  await new Promise(r => setTimeout(r, 300));
  const styleArea = await send('Runtime.evaluate', {
    expression: '(function(){var el=document.querySelector("[class*=upload], [class*=style-ref], input[type=file]"); return el ? (el.className || "file exists") : "NOT FOUND";})()'
  });
  console.log(`  上传区: ${styleArea.result.result.value}`);

  // 6. 快速风格卡片
  console.log('\n🎭 测试 6: 快速风格卡片');
  const cardCount = await send('Runtime.evaluate', {
    expression: '(function(){return document.querySelectorAll("[class*=card]").length;})()'
  });
  console.log(`  卡片数量: ${cardCount.result.result.value}`);

  // 7. 生成按钮状态
  console.log('\n🔘 测试 7: 生成按钮');
  await send('Runtime.evaluate', {expression: 'window.scrollTo(0, document.body.scrollHeight)'});
  await new Promise(r => setTimeout(r, 500));
  const btnState = await send('Runtime.evaluate', {
    expression: '(function(){var btns=document.querySelectorAll("button"); for(var i=0;i<btns.length;i++){var t=btns[i].textContent.trim(); if(t.includes("生成图片")) return JSON.stringify({text:t, visible:btns[i].offsetParent!==null});} return "NOT FOUND";})()'
  });
  console.log(`  按钮: ${btnState.result.result.value}`);
  await screenshot('07_generate_btn');

  // 8. 历史记录区
  console.log('\n📜 测试 8: 历史记录');
  const historyArea = await send('Runtime.evaluate', {
    expression: `(() => {
      const el = document.querySelector('[class*="history"], #imgHistoryList');
      return el ? el.textContent.trim().substring(0, 50) : 'NOT FOUND';
    })()`
  });
  console.log(`  历史区: ${historyArea.result.result.value}`);

  // 9. 响应式检查（模拟手机）
  console.log('\n📱 测试 9: 移动端适配');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 375,
    height: 812,
    deviceScaleFactor: 3,
    mobile: true
  });
  await new Promise(r => setTimeout(r, 500));
  const mobileLayout = await send('Runtime.evaluate', {
    expression: `(() => {
      const sidebar = document.querySelector('.sidebar');
      const mobileNav = document.querySelector('.mobile-nav');
      return JSON.stringify({
        sidebarHidden: sidebar ? window.getComputedStyle(sidebar).display === 'none' : true,
        mobileNavVisible: mobileNav ? window.getComputedStyle(mobileNav).display !== 'none' : false
      });
    })()`
  });
  console.log(`  移动端: ${mobileLayout.result.result.value}`);
  await screenshot('09_mobile_view');

  // 恢复桌面尺寸
  await send('Emulation.clearDeviceMetricsOverride');

  console.log('\n✅ 测试完成！');
  console.log('截图保存在: C:/tmp/test_*.png');

  ws.close();
}

run().catch(e => {
  console.error('❌ 测试失败:', e.message);
  if (ws) ws.close();
  process.exit(1);
});
