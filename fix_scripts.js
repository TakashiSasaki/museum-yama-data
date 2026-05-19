const fs = require('fs');
let text = fs.readFileSync('scripts/validate.js', 'utf8');
text = text.replace("require('../.agents/skills/lib/gpx')", "require('../.agents/skills/lib/gpx')");
fs.writeFileSync('scripts/validate.js', text);
