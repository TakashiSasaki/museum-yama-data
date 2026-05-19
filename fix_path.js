const fs = require('fs');
let code = fs.readFileSync('scripts/validate.js', 'utf8');
code = code.replace("require('../.agents/skills/lib/gpx')", "require('../.agents/skills/lib/gpx')");
fs.writeFileSync('scripts/validate.js', code.replace("require('../.agents/skills/lib/gpx')", "require('../.agents/skills/lib/gpx')").replace("require('../.agents/skills/lib/log')", "require('../.agents/skills/lib/log')"));
console.log('Fixed paths');
