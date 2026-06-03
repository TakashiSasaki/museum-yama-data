const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const yaml = require('js-yaml');

// Regular expressions for validation
const SLUG_REGEX = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Recursively find all files in a directory
function walkSync(dir, filelist = []) {
    if (!fs.existsSync(dir)) return filelist;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filepath = path.join(dir, file);
        if (fs.statSync(filepath).isDirectory()) {
            walkSync(filepath, filelist);
        } else {
            filelist.push(filepath);
        }
    }
    return filelist;
}

function calculateChecksum(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
}

function parseManifest(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        // Handle yaml inside markdown blocks or raw yaml
        const yamlMatch = content.match(/```yaml\n([\s\S]*?)\n```/);
        const yamlContent = yamlMatch ? yamlMatch[1] : content;
        return yaml.load(yamlContent);
    } catch (err) {
        return null;
    }
}

function validateProviderReceived(inputPath, manifestDir) {
    const findings = [];
    const stats = {
        provider_file_count: 0,
        provider_directory_count: 0,
        missing_manifest_count: 0,
        invalid_layout_count: 0,
        checksum_mismatch_count: 0,
        manifests_found: 0,
        unmatched_files: 0,
        unmatched_manifest_entries: 0
    };

    const scanResult = {
        ignored_docs: [],
        slugs: new Set(),
        dates: new Set(),
        files: []
    };

    const files = walkSync(inputPath);

    // Check files and layout
    for (const filePath of files) {
        const relativePath = path.relative(inputPath, filePath).replace(/\\/g, '/');

        // Ignore README.md at root
        if (relativePath === 'README.md') {
            scanResult.ignored_docs.push(relativePath);
            continue;
        }

        const parts = relativePath.split('/');

        // Basic layout validation: slug/date/filename...
        if (parts.length < 3) {
            findings.push({ status: 'WARN', message: `File at unexpected depth: ${relativePath}` });
            stats.invalid_layout_count++;
            scanResult.files.push(relativePath);
            stats.provider_file_count++;
            continue;
        }

        const slug = parts[0];
        const dateStr = parts[1];
        const originalFilename = parts.slice(2).join('/');
        const basename = path.basename(filePath);

        scanResult.slugs.add(slug);
        scanResult.dates.add(dateStr);
        scanResult.files.push(relativePath);
        stats.provider_file_count++;

        if (!SLUG_REGEX.test(slug)) {
            findings.push({ status: 'WARN', message: `Invalid provider slug: ${slug} (file: ${relativePath})` });
        }
        if (!DATE_REGEX.test(dateStr)) {
            findings.push({ status: 'WARN', message: `Invalid received date: ${dateStr} (file: ${relativePath})` });
        }

        if (!originalFilename || originalFilename === '.' || originalFilename === '..') {
             findings.push({ status: 'WARN', message: `Invalid original filename: ${originalFilename}` });
        }
    }

    // Identify distinct directories (provider_slug / date)
    const dirs = new Set();
    for (const f of scanResult.files) {
         const parts = f.split('/');
         if (parts.length >= 2) {
             dirs.add(parts[0] + '/' + parts[1]);
         }
    }
    stats.provider_directory_count = dirs.size;

    let manifestCheckSkipped = false;
    let manifestData = [];

    if (!manifestDir) {
        manifestCheckSkipped = true;
    } else if (!fs.existsSync(manifestDir)) {
        findings.push({ status: 'WARN', message: `Manifest directory missing: ${manifestDir}` });
    } else {
        const manifestFiles = walkSync(manifestDir).filter(f => f.endsWith('.md') && !f.endsWith('README.md'));
        stats.manifests_found = manifestFiles.length;

        for (const mf of manifestFiles) {
            const data = parseManifest(mf);
            if (data && data.stored_files) {
                for (const sf of data.stored_files) {
                    manifestData.push({ ...sf, manifest_file: path.basename(mf) });
                }
            }
        }

        // Cross-reference files with manifests
        for (const relativePath of scanResult.files) {
            // we expect stored_path to end with relativePath, or be an exact match if relative path includes base
            const fullPath = path.join(inputPath, relativePath).replace(/\\/g, '/');
            const match = manifestData.find(m => m.stored_path.replace(/\\/g, '/').endsWith(relativePath));

            if (!match) {
                findings.push({ status: 'WARN', message: `Provider file lacks manifest entry: ${relativePath}` });
                stats.missing_manifest_count++;
                stats.unmatched_files++;
            } else {
                // Verify checksum
                const checksum = calculateChecksum(fullPath);
                if (match.checksum && match.checksum !== checksum) {
                    findings.push({ status: 'FAIL', message: `Checksum mismatch for ${relativePath}. Expected ${match.checksum}, got ${checksum}` });
                    stats.checksum_mismatch_count++;
                }

                // Verify original filename
                const basename = path.basename(fullPath);
                if (match.original_filename && match.original_filename !== path.basename(match.stored_path)) {
                     findings.push({ status: 'WARN', message: `Manifest original_filename (${match.original_filename}) does not match basename of stored_path (${match.stored_path})` });
                }

                match.verified = true;
            }
        }

        // Check for unmatched manifest entries
        for (const m of manifestData) {
            if (!m.verified) {
                findings.push({ status: 'WARN', message: `Manifest entry points to missing file: ${m.stored_path}` });
                stats.unmatched_manifest_entries++;
            }
        }
    }

    if (stats.provider_file_count === 0) {
        findings.push({ status: 'PASS', message: 'No provider files currently present.' });
    }

    const hasFailures = findings.some(f => f.status === 'FAIL');
    const hasWarnings = findings.some(f => f.status === 'WARN');

    let overall_status = 'PASS';
    if (hasFailures) overall_status = 'FAIL';
    else if (hasWarnings) overall_status = 'PASS_WITH_WARNINGS';

    return {
        overall_status,
        input_path: inputPath,
        manifest_dir: manifestDir || null,
        manifest_check_skipped: manifestCheckSkipped,
        stats,
        scanResult,
        findings
    };
}

function generateReport(result) {
    const lines = [];
    lines.push('# Provider Received Inventory Report');
    lines.push('');
    lines.push('## Summary');
    lines.push(`- **overall_status**: ${result.overall_status}`);
    lines.push(`- **input_path**: ${result.input_path}`);
    lines.push(`- **manifest_dir**: ${result.manifest_dir || 'Not specified'}`);
    lines.push(`- **provider_file_count**: ${result.stats.provider_file_count}`);
    lines.push(`- **provider_directory_count**: ${result.stats.provider_directory_count}`);
    lines.push(`- **missing_manifest_count**: ${result.stats.missing_manifest_count}`);
    lines.push(`- **invalid_layout_count**: ${result.stats.invalid_layout_count}`);
    lines.push(`- **checksum_mismatch_count**: ${result.stats.checksum_mismatch_count}`);
    lines.push('');

    lines.push('## Intake Directory Scan');
    if (result.scanResult.ignored_docs.length > 0) {
        lines.push('- **documentation files ignored**: ' + result.scanResult.ignored_docs.join(', '));
    } else {
        lines.push('- **documentation files ignored**: None');
    }
    lines.push('- **provider slugs found**: ' + (result.scanResult.slugs.size > 0 ? Array.from(result.scanResult.slugs).join(', ') : 'None'));
    lines.push('- **received dates found**: ' + (result.scanResult.dates.size > 0 ? Array.from(result.scanResult.dates).join(', ') : 'None'));
    lines.push('- **files found**: ' + result.stats.provider_file_count);
    lines.push('');

    lines.push('## Manifest Coverage');
    if (result.manifest_check_skipped) {
        lines.push('- Manifest validation was not requested (no `--manifest-dir` provided).');
    } else {
        lines.push(`- **manifest directory status**: ${fs.existsSync(result.manifest_dir) ? 'Exists' : 'Missing'}`);
        lines.push(`- **manifest files found**: ${result.stats.manifests_found}`);
        lines.push(`- **unmatched files**: ${result.stats.unmatched_files}`);
        lines.push(`- **unmatched manifest entries**: ${result.stats.unmatched_manifest_entries}`);
    }
    lines.push('');

    lines.push('## Validation Findings');
    if (result.findings.length === 0) {
        lines.push('- No findings.');
    } else {
        for (const f of result.findings) {
            lines.push(`- [${f.status}] ${f.message}`);
        }
    }
    lines.push('');

    lines.push('## Conclusions');
    if (result.stats.provider_file_count === 0) {
        lines.push('- Intake scaffold is ready, but currently contains no provider data.');
    } else {
        lines.push('- Real provider files are present.');
    }

    if (!result.manifest_check_skipped) {
        if (result.stats.unmatched_files === 0 && result.stats.unmatched_manifest_entries === 0 && result.stats.provider_file_count > 0) {
             lines.push('- Manifest coverage is complete for all files.');
        } else if (result.stats.provider_file_count > 0) {
             lines.push('- Manifest coverage is incomplete or has discrepancies.');
        }
    }

    if (result.overall_status === 'FAIL') {
        lines.push('- There are blockers (FAIL findings) that need to be resolved.');
    } else {
        lines.push('- No strict blockers before accepting future provider files.');
    }

    return lines.join('\n') + '\n';
}

module.exports = {
    validateProviderReceived,
    generateReport
};
