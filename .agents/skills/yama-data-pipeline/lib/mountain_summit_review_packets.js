'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function sha256Buffer(buf) {
    return crypto.createHash('sha256').update(buf).digest('hex');
}

function sha256File(filePath) {
    return sha256Buffer(fs.readFileSync(filePath));
}

function parseCsvLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result;
}

function parseCsv(content) {
    const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length === 0) return [];
    
    const headers = parseCsvLine(lines[0]);
    const rows = [];
    
    for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]);
        const row = {};
        headers.forEach((h, idx) => {
            row[h] = cols[idx] || '';
        });
        rows.push(row);
    }
    return rows;
}

function toCsvLine(headers, row) {
    return headers.map(h => {
        const v = row[h] != null ? String(row[h]) : '';
        if (v.includes(',') || v.includes('"') || v.includes('\n')) {
            return '"' + v.replace(/"/g, '""') + '"';
        }
        return v;
    }).join(',');
}

function buildCsvContent(headers, rows) {
    const lines = [headers.join(',')];
    for (const row of rows) {
        lines.push(toCsvLine(headers, row));
    }
    return lines.join('\n') + '\n';
}

function sanitizeFilename(name) {
    return name.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
}

function padZero(num, size = 4) {
    let s = String(num);
    while (s.length < size) s = '0' + s;
    return s;
}

function generateReviewPackets(options) {
    const {
        reviewDir,
        outDir,
        decisionTemplatePath,
        manifestPath,
        reportPath,
        stagedDir
    } = options;

    // Output dirs inside staging area
    const stagedGpxDir = path.join(stagedDir, 'gpx_groups');
    const stagedSummitDir = path.join(stagedDir, 'summit_candidate_groups');
    fs.mkdirSync(stagedGpxDir, { recursive: true });
    fs.mkdirSync(stagedSummitDir, { recursive: true });

    // Load CSV inputs
    const top1Path = path.join(reviewDir, 'compact_review_queue_top1.csv');
    const top3Path = path.join(reviewDir, 'compact_review_queue_top3.csv');
    const conflictsPath = path.join(reviewDir, 'compact_review_queue_conflicts.csv');
    const gpxGroupsPath = path.join(reviewDir, 'conflict_groups_by_gpx.csv');
    const summitConflictsPath = path.join(reviewDir, 'conflict_groups_by_summit_candidate.csv');

    for (const p of [top1Path, top3Path, conflictsPath, gpxGroupsPath, summitConflictsPath]) {
        if (!fs.existsSync(p)) {
            throw new Error(`Required input CSV not found: ${p}`);
        }
    }

    const top1Rows = parseCsv(fs.readFileSync(top1Path, 'utf8'));
    const top3Rows = parseCsv(fs.readFileSync(top3Path, 'utf8'));
    const conflictsRows = parseCsv(fs.readFileSync(conflictsPath, 'utf8'));
    const gpxGroupsRows = parseCsv(fs.readFileSync(gpxGroupsPath, 'utf8'));
    const summitConflictsRows = parseCsv(fs.readFileSync(summitConflictsPath, 'utf8'));

    // 1. Generate GPX Group review packets
    const gpxPackets = [];
    gpxGroupsRows.forEach((gpxRow, idx) => {
        const order = parseInt(gpxRow.suggested_review_order, 10) || (idx + 1);
        const packetId = `gpx_group_${padZero(order)}`;
        const gpxBasename = gpxRow.source_gpx_basename;
        const safeBasename = sanitizeFilename(gpxBasename.replace(/\.gpx$/, ''));
        const fileName = `${packetId}_${safeBasename}.md`;
        const relPath = `review_packets/gpx_groups/${fileName}`;

        // Get all top-3 candidate links for this GPX file
        const linksInGpx = top3Rows.filter(r => r.source_gpx_basename === gpxBasename);
        
        // Group links by mountain_no
        const mountainMap = new Map();
        linksInGpx.forEach(link => {
            if (!mountainMap.has(link.mountain_no)) {
                mountainMap.set(link.mountain_no, []);
            }
            mountainMap.get(link.mountain_no).push(link);
        });

        let mdContent = `# GPX Group Review Packet: ${packetId}

- **GPX File**: \`${gpxBasename}\`
- **Track Name**: ${gpxRow.track_name}
- **Suggested Review Priority Order**: ${order}
- **Overview**:
  - Mountains associated: ${gpxRow.mountain_count_in_group}
  - Summit candidates detected: ${gpxRow.summit_candidate_count_in_group}
  - Top-1 candidate links: ${gpxRow.top1_link_count}
  - Conflict candidate links: ${gpxRow.conflict_count}

---

## Recommended Review Action
Review this packet to resolve summits along the GPX traverse track. Grouped manual review helps verify coordinate decisions along the same ridge line.

---

## Mountains & Candidates in this Group

`;

        // Print each mountain and its candidate links
        for (const [mNo, links] of mountainMap.entries()) {
            const mName = links[0].mountain_name;
            const mEle = links[0].mountain_elevation_m;
            
            mdContent += `### Mountain #${mNo}: ${mName} (Elevation: ${mEle}m)

| Rank | Candidate ID | Score | Elev Diff (m) | Location Refinement | Priority | Bucket | Mutual Top1? |
|---|---|---|---|---|---|---|---|
`;
            links.forEach(l => {
                const locLevel = l.location_refinement_level || 'none';
                mdContent += `| ${l.location_refined_rank_for_mountain} | \`${l.summit_candidate_id}\` | ${l.location_refined_candidate_score} | ${l.elevation_diff_m} | \`${locLevel}\` | **${l.compact_review_priority}** | \`${l.review_bucket}\` | ${l.mutual_top1} |\n`;
            });

            mdContent += `
#### Decision Checklist for #${mNo} ${mName}:
- [ ] Accept suggested candidate: \`${links[0].summit_candidate_id}\`
- [ ] Reject all candidates
- [ ] Needs GIS/External map check
- [ ] Needs redetection
- [ ] Mark as unresolved

Notes / Decision Basis:
______________________________________________________________________

`;
        }

        mdContent += `
---
*Generated by generate-mountain-summit-review-packets as part of Stage 12 human-review preparation.*
`;

        const fullStagedPath = path.join(stagedGpxDir, fileName);
        fs.writeFileSync(fullStagedPath, mdContent, 'utf8');

        gpxPackets.push({
            packet_id: packetId,
            source_gpx_basename: gpxBasename,
            rel_path: relPath,
            fileName: fileName
        });
    });

    // 2. Generate Summit Candidate Conflict packets
    const summitPackets = [];
    summitConflictsRows.forEach((summitRow, idx) => {
        const order = idx + 1;
        const packetId = `summit_candidate_${padZero(order)}`;
        const candidateId = summitRow.summit_candidate_id;
        const safeId = sanitizeFilename(candidateId.replace(/^summit-candidate:/, ''));
        const fileName = `${packetId}_${safeId}.md`;
        const relPath = `review_packets/summit_candidate_groups/${fileName}`;

        // Get all links pointing to this candidate in top-3
        const contestedLinks = top3Rows.filter(r => r.summit_candidate_id === candidateId);

        let mdContent = `# Summit Candidate Conflict Packet: ${packetId}

- **Summit Candidate ID**: \`${candidateId}\`
- **Source GPX**: \`${summitRow.source_gpx_basename}\`
- **Track Name**: ${summitRow.track_name}
- **Candidate Coordinates**:
  - Latitude: \`${summitRow.candidate_lat}\`
  - Longitude: \`${summitRow.candidate_lon}\`
  - Elevation: \`${summitRow.candidate_ele_m}\`m
- **Overview**:
  - Contested top-1 mountain count: ${summitRow.top1_mountain_count}
  - Contested top-3 mountain count: ${summitRow.top3_mountain_count}
  - Maximum link score: ${summitRow.max_score}
  - Score spread: ${summitRow.score_spread}

---

## Conflict Explanation
This summit candidate is contested by multiple mountains. Human review must determine which mountain (if any) corresponds to this peak.

---

## Contesting Mountains

| Mountain No | Mountain Name | Rank for Mountain | Score | Elev Diff (m) | Bucket | Priority | Mutual Top-1? |
|---|---|---|---|---|---|---|---|
`;

        contestedLinks.forEach(l => {
            mdContent += `| ${l.mountain_no} | ${l.mountain_name} | ${l.location_refined_rank_for_mountain} | ${l.location_refined_candidate_score} | ${l.elevation_diff_m} | \`${l.review_bucket}\` | **${l.compact_review_priority}** | ${l.mutual_top1} |\n`;
        });

        mdContent += `
---

## Decision Checklist
Select the correct mountain for this summit candidate, or flag for further checks:

`;

        contestedLinks.forEach(l => {
            mdContent += `- [ ] Accept for Mountain #${l.mountain_no} (${l.mountain_name})\n`;
        });

        mdContent += `- [ ] Reject for all contesting mountains
- [ ] Needs GIS/External map check
- [ ] Needs redetection
- [ ] Mark as unresolved

Notes / Decision Basis:
______________________________________________________________________

---
*Generated by generate-mountain-summit-review-packets as part of Stage 12 human-review preparation.*
`;

        const fullStagedPath = path.join(stagedSummitDir, fileName);
        fs.writeFileSync(fullStagedPath, mdContent, 'utf8');

        summitPackets.push({
            packet_id: packetId,
            summit_candidate_id: candidateId,
            rel_path: relPath,
            fileName: fileName
        });
    });

    // 3. Generate Index
    const indexFileName = 'index.md';
    let indexMd = `# Mountain Summit Candidate Review Packets Index

This index lists all human-review packets and conflict groups prepared for validating coordinate decisions.

- **Total GPX Group Packets (Traverses)**: ${gpxPackets.length}
- **Total Summit Candidate Conflict Packets**: ${summitPackets.length}
- **Decision Template CSV**: [\`review_decisions_template.csv\`](../review_decisions_template.csv)

> [!NOTE]
> These review packets are human-review aids only. They do not contain final decisions, resolve mountain identities, or establish final accepted coordinates.

---

## Recommended Review Order & GPX Packets

Grouped review of GPX tracks makes it easier to resolve traverses and verify multiple mountain matches along a ridge together.

| Packet ID | GPX File | Track Name | Action |
|---|---|---|---|
`;

    gpxPackets.forEach(p => {
        const row = gpxGroupsRows.find(r => r.source_gpx_basename === p.source_gpx_basename) || {};
        indexMd += `| [${p.packet_id}](gpx_groups/${p.fileName}) | \`${p.source_gpx_basename}\` | ${row.track_name || ''} | [Open Packet](gpx_groups/${p.fileName}) |\n`;
    });

    indexMd += `
---

## Summit Candidate Conflict Packets

Review these conflict groups when a single detected peak is claimed as a candidate by multiple mountains.

| Packet ID | Summit Candidate ID | Contesting Mountains (Top-1) | Action |
|---|---|---|---|
`;

    summitPackets.forEach(p => {
        const row = summitConflictsRows.find(r => r.summit_candidate_id === p.summit_candidate_id) || {};
        indexMd += `| [${p.packet_id}](summit_candidate_groups/${p.fileName}) | \`${p.summit_candidate_id}\` | ${row.top1_mountain_names || ''} | [Open Packet](summit_candidate_groups/${p.fileName}) |\n`;
    });

    fs.writeFileSync(path.join(stagedDir, indexFileName), indexMd, 'utf8');

    // 4. Generate Decision Template
    // Maps GPX basename to packet info
    const gpxPacketMap = new Map();
    gpxPackets.forEach(p => gpxPacketMap.set(p.source_gpx_basename, p));

    const decisionHeaders = [
        'decision_row_id', 'mountain_no', 'mountain_name', 'suggested_summit_candidate_id',
        'source_gpx_basename', 'track_name', 'candidate_ele_m', 'mountain_elevation_m',
        'elevation_diff_m', 'location_refined_candidate_score', 'review_bucket',
        'compact_review_priority', 'review_packet_id', 'review_packet_path',
        'decision_status', 'accepted_summit_candidate_id', 'rejected_summit_candidate_ids',
        'needs_external_map_check', 'needs_redetection', 'decision_basis',
        'reviewer_note', 'reviewed_at', 'reviewer'
    ];

    const decisionRows = top1Rows.map(top1Row => {
        const mNo = top1Row.mountain_no;
        const gpx = top1Row.source_gpx_basename;
        const packet = gpx ? gpxPacketMap.get(gpx) : null;

        return {
            decision_row_id: `dec-${padZero(mNo)}`,
            mountain_no: mNo,
            mountain_name: top1Row.mountain_name,
            suggested_summit_candidate_id: top1Row.summit_candidate_id || '',
            source_gpx_basename: gpx || '',
            track_name: top1Row.track_name || '',
            candidate_ele_m: top1Row.candidate_ele_m || '',
            mountain_elevation_m: top1Row.mountain_elevation_m || '',
            elevation_diff_m: top1Row.elevation_diff_m || '',
            location_refined_candidate_score: top1Row.location_refined_candidate_score || '',
            review_bucket: top1Row.review_bucket || '',
            compact_review_priority: top1Row.compact_review_priority || '',
            review_packet_id: packet ? packet.packet_id : '',
            review_packet_path: packet ? packet.rel_path : '',
            
            // Blank decision fields
            decision_status: 'pending_review',
            accepted_summit_candidate_id: '',
            rejected_summit_candidate_ids: '',
            needs_external_map_check: '',
            needs_redetection: '',
            decision_basis: '',
            reviewer_note: '',
            reviewed_at: '',
            reviewer: ''
        };
    });

    // Ensure 531 rows exist and are unique by mountain_no
    const distinctMNos = new Set(decisionRows.map(r => r.mountain_no));
    if (distinctMNos.size !== 531) {
        throw new Error(`Integrity check failed: Expected 531 distinct mountains in decision template, got ${distinctMNos.size}`);
    }
    if (decisionRows.length !== 531) {
        throw new Error(`Integrity check failed: Expected 531 rows in decision template, got ${decisionRows.length}`);
    }

    const decisionCsv = buildCsvContent(decisionHeaders, decisionRows);
    fs.writeFileSync(path.join(stagedDir, 'review_decisions_template.csv'), decisionCsv, 'utf8');

    return {
        gpxPackets,
        summitPackets,
        decisionRows,
        stagedGpxDir,
        stagedSummitDir
    };
}

module.exports = {
    generateReviewPackets,
    parseCsv,
    parseCsvLine
};
