const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const userId = process.argv[2];
if (!userId) {
    console.error("Please provide a User ID. Example: node fetch_user_activities.js 2437175");
    process.exit(1);
}

const OUT_FILE = path.join(process.cwd(), `yamap_user_${userId}_activities.txt`);

async function run() {
    console.log(`Starting extraction for User ID: ${userId}`);
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

    const allActivityIds = new Set();
    let pageNum = 1;
    let hasMore = true;

    while (hasMore) {
        console.log(`Fetching page ${pageNum}...`);
        const url = `https://yamap.com/users/${userId}?tab=activities&page=${pageNum}`;
        
        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            
            // Wait a bit for potential client-side rendering
            await new Promise(r => setTimeout(r, 2000));

            const idsOnPage = await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a[href*="/activities/"]'));
                const ids = [];
                for (const link of links) {
                    const match = link.getAttribute('href').match(/\/activities\/(\d+)/);
                    if (match) {
                        ids.push(match[1]);
                    }
                }
                return ids;
            });

            if (idsOnPage.length === 0) {
                console.log(`No activities found on page ${pageNum}. Assuming end of list.`);
                hasMore = false;
            } else {
                let addedAny = false;
                for (const id of idsOnPage) {
                    if (!allActivityIds.has(id)) {
                        allActivityIds.add(id);
                        addedAny = true;
                    }
                }
                
                // If we didn't add any NEW ids on this page, maybe we are looping or reached the end
                if (!addedAny) {
                    console.log(`No new activities on page ${pageNum}. Ending extraction.`);
                    hasMore = false;
                } else {
                    console.log(`Found ${idsOnPage.length} links on page ${pageNum}. Total unique so far: ${allActivityIds.size}`);
                    pageNum++;
                }
            }
        } catch (e) {
            console.error(`Error on page ${pageNum}: ${e.message}`);
            hasMore = false;
        }
    }

    await browser.close();

    const idsArray = Array.from(allActivityIds);
    fs.writeFileSync(OUT_FILE, idsArray.join('\n') + '\n');
    console.log(`Extraction complete. ${idsArray.length} unique activity IDs saved to ${OUT_FILE}`);
}

run();
