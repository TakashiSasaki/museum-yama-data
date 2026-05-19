const fs = require('fs');

const path = 'scripts/validate.js';
let content = fs.readFileSync(path, 'utf8');
content = content.replace("const { parseGpx, extractTrackPoints } = require(path.join(ROOT_DIR, '.agents/skills/lib/gpx'));", "const ROOT_DIR = process.cwd();\nconst { parseGpx, extractTrackPoints } = require(path.join(ROOT_DIR, '.agents/skills/lib/gpx'));");
content = content.replace("const ROOT_DIR = process.cwd();\nconst GPX_DIR", "const GPX_DIR");
fs.writeFileSync(path, content);
