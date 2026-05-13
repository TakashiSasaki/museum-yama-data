const fs = require('fs');
const path = require('path');

const ROOT_DIR = 'c:/Users/takas/Desktop/yama-museum';
const YAMAP_DIR = path.join(ROOT_DIR, 'yamap');
const LINKS_FILE = path.join(ROOT_DIR, 'unique_links.txt');

if (!fs.existsSync(YAMAP_DIR)) fs.mkdirSync(YAMAP_DIR);

const links = fs.readFileSync(LINKS_FILE, 'utf8').split('\n').filter(l => l.trim());

console.log(`Starting metadata extraction for ${links.length} activities...`);

// For this task, we will provide a template and the agent will fill it.
// Since I (the script) cannot directly call tools, I will output a list of commands
// or instructions for the agent to execute in batches.

links.slice(0, 10).forEach(id => {
    console.log(`Pending: ${id}`);
});
