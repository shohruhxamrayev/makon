// Screenshots of the live site for the user guide (runs in GitHub Actions, which has a normal browser + internet)
import { chromium } from "playwright";
import fs from "node:fs";
const B = "https://makon-khaki.vercel.app/";
const out = "shots"; fs.mkdirSync(out, { recursive: true });
const wait = ms => new Promise(r => setTimeout(r, ms));
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
async function page(vp) {
  const ctx = await browser.newContext(vp === "phone" ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => { try { localStorage.setItem("makon_guide", "1"); localStorage.setItem("makon_coach3d", "1"); } catch (e) {} });
  return ctx.newPage();
}
const shot = async (p, name) => { await p.screenshot({ path: `${out}/${name}.jpg`, type: "jpeg", quality: 78 }); console.log("shot", name); };
const safe = async (name, fn) => { try { await fn(); } catch (e) { console.log("FAIL", name, e.message); } };

await safe("hero", async () => {
  const p = await page("desk"); await p.goto(B, { waitUntil: "load" }); await wait(20000);
  await p.evaluate(() => { const a = document.querySelector(".announce, .ann, [class*=announce] button"); if (a && a.click) a.click(); });
  await shot(p, "01-hero");
  await p.click(".style-chips [data-style=noir]"); await wait(12000); await shot(p, "02-hero-noir");
  await p.click(".style-chips [data-style=uzbek]"); await wait(12000); await shot(p, "02b-hero-uzbek");
  await p.evaluate(() => document.querySelector("#tap").scrollIntoView()); await wait(4000);
  await p.evaluate(() => scrollBy(0, 330)); await wait(1500);
  await p.click(".tap-dot >> nth=1"); await wait(2500); await shot(p, "03-tap");
  await p.evaluate(() => document.querySelector(".quizband").scrollIntoView({ block: "center" })); await wait(1500); await shot(p, "06-quizband");
});
await safe("decor", async () => {
  const p = await page("desk"); await p.goto(B + "decor.html", { waitUntil: "load" }); await wait(3000);
  await p.evaluate(() => document.querySelector("#d-grid").scrollIntoView()); await p.evaluate(() => scrollBy(0, -90)); await wait(4000);
  for (let i = 0; i < 3; i++) await p.click("#d-grid .d-heart >> nth=" + i);
  await wait(600); await shot(p, "04-decor");
  await p.click("#d-grid .d-ar >> nth=0"); await wait(15000); await shot(p, "05-ar-desk");
  await p.goto(B + "board.html", { waitUntil: "load" }); await wait(3500); await shot(p, "07-board");
});
await safe("quiz", async () => {
  const p = await page("desk"); await p.goto(B + "style-quiz.html", { waitUntil: "load" }); await wait(3500); await shot(p, "08-quiz");
  for (let i = 0; i < 6; i++) { await p.click(".qz-opt >> nth=" + (i % 2)); await wait(900); }
  await wait(2500); await shot(p, "09-quiz-result");
});
await safe("studio", async () => {
  const p = await page("desk"); await p.goto(B + "studio.html?add=tablelamp,pendant,arclamp,art", { waitUntil: "load" }); await wait(9000);
  const st = p.getByRole("button", { name: /^start$/i }); if (await st.count()) await st.first().click();
  await wait(14000); await shot(p, "10-studio-placement");
});
await safe("phone", async () => {
  const p = await page("phone"); await p.goto(B, { waitUntil: "load" }); await wait(20000); await shot(p, "11-phone-hero");
  await p.goto(B + "decor.html?ar=lounge", { waitUntil: "load" }); await wait(16000); await shot(p, "12-phone-ar");
});
await browser.close();
