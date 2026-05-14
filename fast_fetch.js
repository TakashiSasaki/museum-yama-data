const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const ids = process.argv.slice(2);
const OUT_DIR = path.join(process.cwd(), 'yamap');

if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function run() {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    // Block unnecessary resources to speed up
    await page.setRequestInterception(true);
    page.on('request', req => {
        const type = req.resourceType();
        if (['image', 'stylesheet', 'font', 'media'].includes(type)) {
            req.abort();
        } else {
            req.continue();
        }
    });

    let firstFetchDone = false;

    for (const id of ids) {
        const filePath = path.join(OUT_DIR, `${id}.md`);
        if (fs.existsSync(filePath)) {
            console.log(`ID ${id} is already fetched (or failed previously). Skipping.`);
            continue;
        }

        if (firstFetchDone) {
            console.log(`Waiting for 10 seconds before next fetch to avoid overloading the server...`);
            await new Promise(resolve => setTimeout(resolve, 10000));
        }

        console.log(`Fetching ID: ${id}`);
        try {
            const res = await page.goto(`https://yamap.com/activities/${id}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
            
            if (res.status() === 404 || res.status() === 403 || page.url().includes('login') || page.url().includes('error')) {
                console.log(`ID ${id} is private or not found.`);
                fs.writeFileSync(filePath, `# Activity ${id}\n- **Status**: Private / Forbidden or Not Found\n- **Link**: https://yamap.com/activities/${id}\n`);
                firstFetchDone = true;
                continue;
            }

            // Wait for main content to load
            await page.waitForSelector('.ActivityDetailTabLayout__Title', { timeout: 10000 }).catch(() => {});
            
            const data = await page.evaluate(() => {
                const getText = (selector) => {
                    const el = document.querySelector(selector);
                    return el ? el.innerText.trim() : '';
                };
                const getTexts = (selector) => {
                    return Array.from(document.querySelectorAll(selector)).map(e => e.innerText.trim()).filter(t => t);
                };

                const title = getText('h1') || getText('.ActivityDetailTabLayout__Title');
                const date = getText('.ActivityDetailTabLayout__Middle__Date');
                
                const statNodes = Array.from(document.querySelectorAll('.ActivityDetailTabLayout__SummaryItem'));
                let distance = '', time = '', up = '', down = '';
                statNodes.forEach(node => {
                    const text = node.innerText;
                    if (text.includes('距離')) distance = text.replace('距離', '').trim();
                    if (text.includes('タイム')) time = text.replace('タイム', '').trim();
                    if (text.includes('のぼり')) up = text.replace('のぼり', '').trim();
                    if (text.includes('くだり')) down = text.replace('くだり', '').trim();
                });

                const routeName = getText('.ActivityDetailTabLayout__MapNameLink');
                const mountains = getTexts('.ActivityDetailTabLayout__MountainLink').join(', ');
                const tags = getTexts('.ActivityDetailTabLayout__TagItem').join(', ');
                
                const description = getText('.ActivityDetailTabLayout__Description');
                
                const timelineNodes = Array.from(document.querySelectorAll('.CourseTimeItem'));
                const timeline = timelineNodes.map(node => {
                    const timeEl = node.querySelector('.CourseTimeItem__PassedPoint__Time');
                    const nameEl = node.querySelector('.CourseTimeItem__PassedPoint__Name');
                    if (timeEl && nameEl) {
                        return `- ${timeEl.innerText.trim()} ${nameEl.innerText.trim()}`;
                    } else if (nameEl) {
                        return `- ${nameEl.innerText.trim()}`;
                    }
                    return null;
                }).filter(t => t).join('\n');

                return { title, date, distance, time, up, down, routeName, mountains, tags, description, timeline };
            });

            if (!data.title && !data.distance) {
                console.log(`ID ${id} failed to extract data. Setting as failed.`);
                fs.writeFileSync(filePath, `# Activity ${id}\n- **Status**: Failed extraction\n- **Link**: https://yamap.com/activities/${id}\n`);
                firstFetchDone = true;
                continue;
            }

            const md = `# Activity ${id}
- **Title**: ${data.title || ''}
- **Date**: ${data.date || ''}
- **Distance**: ${data.distance || ''}
- **Time**: ${data.time || ''}
- **Elevation Gain**: ${data.up || ''}
- **Elevation Loss**: ${data.down || ''}
- **Route Name**: ${data.routeName || ''}
- **Mountains**: ${data.mountains || ''}
- **Tags**: ${data.tags || ''}
- **Link**: https://yamap.com/activities/${id}

## 活動詳細
${data.description || '(活動詳細の記述なし。写真ギャラリーのみ。)'}

## Course Timeline
${data.timeline || ''}
`;
            fs.writeFileSync(filePath, md);
            console.log(`Saved ID ${id}.`);
            firstFetchDone = true;

        } catch (e) {
            console.error(`Error fetching ID ${id}: ${e.message}`);
        }
    }
    await browser.close();
}

run();
