// 截图脚本：用已安装的 Chrome 跑 headless，捕获多个 UI 状态。
import puppeteer from 'puppeteer-core';
import { setTimeout as sleep } from 'node:timers/promises';
import { mkdirSync } from 'node:fs';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL = 'http://localhost:5173/';
const OUT = 'docs';
mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: [
    '--use-gl=angle', '--use-angle=swiftshader',
    '--enable-webgl', '--ignore-gpu-blocklist',
    '--no-sandbox', '--window-size=1320,1000',
  ],
});

const page = await browser.newPage();
await page.setViewport({ width: 1320, height: 1000, deviceScaleFactor: 2 });
await page.goto(URL, { waitUntil: 'networkidle0' });
await page.waitForSelector('canvas');
await sleep(1500); // 等 Three.js 首帧

// 按钮文字点击工具
async function clickByText(text) {
  const handle = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button')];
    return els.find((b) => b.textContent.includes(t)) || null;
  }, text);
  const el = handle.asElement();
  if (el) { await el.click(); return true; }
  return false;
}

// 1. 初始界面（3 阶还原态 + 使用说明）
await page.screenshot({ path: `${OUT}/01-home.png` });
console.log('shot 01-home');

// 2. 3 阶打乱后
await clickByText('打乱');
await sleep(3500); // 等打乱动画跑完
await page.screenshot({ path: `${OUT}/02-scrambled.png` });
console.log('shot 02-scrambled');

// 3. 还原引导 + 走几步显示公式/原理面板
await clickByText('还原引导');
await sleep(600);
for (let i = 0; i < 6; i++) { await clickByText('下一步'); await sleep(700); }
await page.screenshot({ path: `${OUT}/03-guide.png` });
console.log('shot 03-guide');

// 4. 切到 2 阶并打乱
await clickByText('复位');
await sleep(400);
await clickByText('2 阶');
await sleep(800);
await clickByText('打乱');
await sleep(2500);
await page.screenshot({ path: `${OUT}/04-2x2.png` });
console.log('shot 04-2x2');

await browser.close();
console.log('done');
