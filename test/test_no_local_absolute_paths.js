'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

function runTests() {
    console.log('--- Running Local Absolute Path Leakage Tests ---');

    const rootDir = path.resolve(__dirname, '../../../../');
    const scanTargets = ['docs', '.agents', 'README.md', 'data'];

    // Avoid scanning binary files and huge datasets
    const excludedExtensions = ['.zip', '.shp', '.shx', '.dbf', '.png', '.jpg', '.jpeg', '.gif', '.ico'];
    const excludedDirs = ['.git', 'node_modules'];
    
    // We only scan files under 1MB to avoid slowing down the test suite on huge GeoJSON/XML files
    const MAX_FILE_SIZE = 1024 * 1024;

    // Regex patterns to detect absolute/local path leaks
    const leakPatterns = [
        { regex: /[a-zA-Z]:\\Users/i, name: 'Windows Users path' },
        { regex: /[a-zA-Z]:\/Users/i, name: 'Windows Unix-style Users path' },
        { regex: /file:\/\/\/[a-zA-Z]:/i, name: 'Local file URL with drive letter' },
        { regex: /\/home\/[a-zA-Z0-9_-]+\//i, name: 'Linux home directory path' },
        { regex: /\/Users\/[a-zA-Z0-9_-]+\//i, name: 'Mac Users path' },
        { regex: /\/mnt\/data/i, name: 'Mounted data path leak' },
        { regex: /\.gemini[\\/]/i, name: 'Gemini app data folder' },
        { regex: /antigravity-ide[\\/]/i, name: 'Antigravity IDE path leak' }
    ];

    const leaks = [];

    function scanFile(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        if (excludedExtensions.includes(ext)) return;

        // Exemptions:
        // 1. Ignore test files (which have mock absolute paths for testing)
        // 2. Ignore immutable historical Stage 30 outputs
        // 3. Ignore historical documentation files discussing path issues/blocker analysis
        if (filePath.includes('test_') || 
            filePath.includes('path_leak_check.js') || 
            filePath.includes('2026-06-07_gemini_near_gpx_supplemental_candidate_expansion') ||
            filePath.includes('gemini_near_gpx_supplemental_candidate_expansion_followup_policy.md') ||
            filePath.includes('mountain_summit_assignment_gemini_grounded_balanced_blocker_analysis.md')) {
            return;
        }


        try {
            const stat = fs.statSync(filePath);
            if (stat.size > MAX_FILE_SIZE) return;

            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split(/\r?\n/);
            lines.forEach((line, idx) => {
                for (const pattern of leakPatterns) {
                    if (pattern.regex.test(line)) {
                        const rel = path.relative(rootDir, filePath).replace(/\\/g, '/');
                        leaks.push({
                            file: rel,
                            line: idx + 1,
                            patternName: pattern.name,
                            content: line.trim()
                        });
                    }
                }
            });
        } catch (e) {
            // Ignore unreadable files
        }
    }

    function scanDir(dirPath) {
        const items = fs.readdirSync(dirPath);
        for (const item of items) {
            if (excludedDirs.includes(item)) continue;
            const full = path.join(dirPath, item);
            const stat = fs.statSync(full);
            if (stat.isDirectory()) {
                scanDir(full);
            } else {
                scanFile(full);
            }
        }
    }

    scanTargets.forEach(target => {
        const full = path.join(rootDir, target);
        if (!fs.existsSync(full)) return;
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
            scanDir(full);
        } else {
            scanFile(full);
        }
    });

    if (leaks.length > 0) {
        console.error(`❌ Found ${leaks.length} absolute path leakages:`);
        leaks.forEach(leak => {
            console.error(`  - ${leak.file}:${leak.line} (${leak.patternName}): ${leak.content}`);
        });
        throw new Error(`Path leakage validation failed: found ${leaks.length} leaks`);
    } else {
        console.log('✅ No absolute path leaks detected in repository files.');
    }
}

module.exports = { runTests };
if (require.main === module) {
    runTests();
}
