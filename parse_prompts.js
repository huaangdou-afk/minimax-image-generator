const fs = require('fs');
const path = require('path');

const promptsDir = path.join(__dirname, 'prompts');
const outFile = path.join(__dirname, 'public', 'prompts.json');

// Better parser that handles the actual markdown format
function parseMarkdown(content) {
  const prompts = [];

  // Split by case headers: ## 案例 N：
  // Each part: [0] = before first case, [1+] = each case
  const parts = content.split(/(?=## 案例 \d+：)/);

  for (const part of parts) {
    const headerMatch = part.match(/^## 案例 (\d+)：(.+?)(?:\n|$)/);
    if (!headerMatch) continue;

    const num = parseInt(headerMatch[1]);
    const titleWithSource = headerMatch[2].trim();

    // Extract title (remove source link)
    const title = titleWithSource.replace(/\s*\(来源\s+\[.+?\]\(.+?\)\)/, '').trim();

    // Extract source
    const sourceMatch = titleWithSource.match(/来源\s+\[([^\]]+)\]/);
    const source = sourceMatch ? sourceMatch[1] : '';

    // Extract model
    const modelMatch = part.match(/模型[:：]\s*(.+?)(?:\n|<)/);
    const model = modelMatch ? modelMatch[1].trim() : '';

    // Find all code blocks (prompts)
    const codeBlockRegex = /```[\w]*\n([\s\S]*?)```/g;
    let match;
    const blocks = [];
    while ((match = codeBlockRegex.exec(part)) !== null) {
      const text = match[1].trim();
      if (text.length > 15 && text.length < 3000) {
        blocks.push(text);
      }
    }

    // First block = English prompt, second = Chinese prompt
    const promptEn = blocks[0] || '';
    const promptCn = blocks[1] || '';

    const prompt = promptCn || promptEn;
    if (!prompt || prompt.length < 15) continue;

    // Auto-categorize
    const text = (title + ' ' + prompt).toLowerCase();
    const categories = [];
    const catRules = [
      [/portrait|自拍|portrait|照片|写真|portrait photography/gi, 'portrait'],
      [/fashion|ootd|vogue|magazine|时尚|杂志封面/gi, 'fashion'],
      [/product|package|packaging|广告|产品摄影|包装/gi, 'product'],
      [/3d|render|cgi|isometric|建模|渲染|3d render/gi, '3d'],
      [/fantasy|digital art|concept art|奇幻|概念|魔幻/gi, 'fantasy'],
      [/anime|manga|漫画|动漫画|二次元/gi, 'anime'],
      [/landscape|nature|scenery|mountain|风景|自然|山水/gi, 'landscape'],
      [/logo|brand|品牌|标识|商标/gi, 'logo'],
      [/cyberpunk|neon|city|赛博朋克|霓虹/gi, 'cyberpunk'],
      [/vintage|retro|old|复古|怀旧/gi, 'vintage'],
      [/painting|oil|watercolor|油画|水彩/gi, 'painting'],
      [/steampunk|蒸汽朋克|机械|齿轮/gi, 'steampunk'],
      [/minimalist|极简|简约/gi, 'minimalist'],
      [/food|dish|meal|美食|料理/gi, 'food'],
      [/character|人物|角色|女孩|美女/gi, 'character'],
      [/manga|comic|comics|漫画/gi, 'comics'],
      [/chinese|国粹|京剧|水墨|中医|中式/gi, 'chinese'],
    ];
    catRules.forEach(([re, cat]) => {
      if (re.test(text)) categories.push(cat);
    });
    if (categories.length === 0) categories.push('other');

    prompts.push({
      id: num,
      title,
      prompt,
      promptEn,
      promptCn,
      model,
      source,
      categories: [...new Set(categories)],
    });
  }

  return prompts;
}

let allPrompts = [];

// Parse README.md (cases 1001-1145)
const readmeFile = path.join(promptsDir, 'README.md');
if (fs.existsSync(readmeFile)) {
  const readme = fs.readFileSync(readmeFile, 'utf8');
  // Find where actual prompts start (after the TOC links)
  const promptStart = readme.indexOf('## 案例 1145');
  if (promptStart !== -1) {
    const section = readme.substring(promptStart);
    const found = parseMarkdown(section);
    console.log('README.md (cases 1001-1145):', found.length, 'prompts');
    allPrompts = allPrompts.concat(found);
  }
}

// Parse numbered files
const files = ['100.md','200.md','300.md','400.md','500.md','600.md','700.md','800.md','900.md','1000.md'];
files.forEach(f => {
  const fp = path.join(promptsDir, f);
  if (!fs.existsSync(fp)) { console.log(f + ': NOT FOUND'); return; }
  const stat = fs.statSync(fp);
  if (stat.size < 50000) {
    console.log(f + ': SKIP (incomplete, ' + Math.round(stat.size/1024) + 'KB)');
    return;
  }
  const content = fs.readFileSync(fp, 'utf8');
  const prompts = parseMarkdown(content);
  allPrompts = allPrompts.concat(prompts);
  console.log(f + ':', prompts.length, 'prompts');
});

// Deduplicate by id
const seen = new Set();
const unique = allPrompts.filter(p => {
  if (seen.has(p.id)) return false;
  seen.add(p.id);
  return true;
});

// Sort by id descending
unique.sort((a, b) => b.id - a.id);

// Build search index (simple)
const categories = [...new Set(unique.flatMap(p => p.categories))].sort();

const result = {
  prompts: unique,
  categories,
  total: unique.length,
};

// Minify prompts for smaller file size
const minified = {
  ...result,
  prompts: unique.map(p => ({
    ...p,
    // Truncate long prompts for preview
    preview: p.prompt.substring(0, 200),
  })),
};

fs.writeFileSync(outFile, JSON.stringify(minified, null, 2));
const sizeKB = Math.round(fs.statSync(outFile).size / 1024);
console.log('\nTotal unique prompts:', unique.length);
console.log('Categories:', categories.join(', '));
console.log('Saved to', outFile, '(' + sizeKB + ' KB)');
