'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');

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

async function loadStabilityRefinedLinksMap(jsonlPath) {
    const map = new Map();
    const fileStream = fs.createReadStream(jsonlPath);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    for await (const line of rl) {
        if (!line.trim()) continue;
        const rec = JSON.parse(line);
        if (rec.summit_candidate_id) {
            // Store stability-specific details and coordinates
            const ev = rec.evidence?.location_stability || {};
            map.set(rec.summit_candidate_id, {
                lat: rec.candidate_lat,
                lon: rec.candidate_lon,
                ele_m: rec.candidate_ele_m,
                candidate_municipality_stability: ev.candidate_municipality_stability || 'invalid_coordinate',
                all_cardinal_1km_same: ev.all_cardinal_1km_same ? 'true' : 'false',
                distance_stable_interior: ev.distance_stable_interior ? 'true' : 'false',
                center_distance_to_boundary_m: ev.center_distance_to_boundary_m != null ? ev.center_distance_to_boundary_m : '',
                candidate_center_municipality: ev.candidate_center_municipality || '',
                mountain_source_municipality: ev.mountain_source_municipality || '',
                municipality_relation: ev.municipality_relation || '',
                location_stability_bucket: ev.location_stability_bucket || '',
                reason_codes: (ev.reason_codes || []).join(';'),
                review_reason_codes: (rec.review_reason_codes || []).join(';')
            });
        }
    }
    return map;
}

async function generateStabilityReviewPackets(options) {
    const {
        top1Path,
        top3Path,
        conflictsPath,
        gpxGroupsPath,
        summitConflictsPath,
        refinedLinksPath,
        outDir,
        decisionTemplatePath,
        stagedDir
    } = options;

    // Output dirs inside staging area
    const stagedGpxDir = path.join(stagedDir, 'gpx_groups');
    const stagedSummitDir = path.join(stagedDir, 'summit_candidate_groups');
    const stagedMountainDir = path.join(stagedDir, 'mountain_groups');
    
    fs.mkdirSync(stagedGpxDir, { recursive: true });
    fs.mkdirSync(stagedSummitDir, { recursive: true });
    fs.mkdirSync(stagedMountainDir, { recursive: true });

    // Parse compact review queue CSV files
    const top1Rows = parseCsv(fs.readFileSync(top1Path, 'utf8'));
    const top3Rows = parseCsv(fs.readFileSync(top3Path, 'utf8'));
    const conflictsRows = parseCsv(fs.readFileSync(conflictsPath, 'utf8'));
    const gpxGroupsRows = parseCsv(fs.readFileSync(gpxGroupsPath, 'utf8'));
    const summitConflictsRows = parseCsv(fs.readFileSync(summitConflictsPath, 'utf8'));

    // Load detailed coordinates & stability details from refinedLinks JSONL
    const stabilityInfoMap = await loadStabilityRefinedLinksMap(refinedLinksPath);

    // Helper to get stability details or defaults for a candidate
    function getCandidateDetails(candId) {
        if (!candId) return {};
        return stabilityInfoMap.get(candId) || {
            lat: '', lon: '', ele_m: '',
            candidate_municipality_stability: 'invalid_coordinate',
            all_cardinal_1km_same: 'false', distance_stable_interior: 'false',
            center_distance_to_boundary_m: '', candidate_center_municipality: '',
            mountain_source_municipality: '', municipality_relation: '',
            location_stability_bucket: 'location_uncertain_keep',
            reason_codes: '', review_reason_codes: ''
        };
    }

    // 1. Generate GPX Group review packets
    const gpxPackets = [];
    const gpxFileToPacketMap = new Map();

    gpxGroupsRows.forEach((gpxRow, idx) => {
        const order = parseInt(gpxRow.suggested_review_order, 10) || (idx + 1);
        const packetId = `gpx_group_${padZero(order)}`;
        const gpxBasename = gpxRow.source_gpx_basename;
        const safeBasename = sanitizeFilename(gpxBasename.replace(/\.gpx$/, ''));
        const fileName = `${packetId}_${safeBasename}.md`;
        const relPath = `location_stability_review_packets/gpx_groups/${fileName}`;

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

        let mdContent = `# GPX Group Review Packet (Location-Stability Refined): ${packetId}

> [!WARNING]
> These review packets are human-review aids only. Candidate links shown here are NOT final and must be verified by a map check. No candidate is automatically accepted.

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

| Rank | Candidate ID | Score | Elev Diff (m) | Location Stability Bucket | Municipality Relation | Candidate Municipality | Stability Status | Boundary Dist (m) | Cardinal Same? | Interior? | Priority |
|---|---|---|---|---|---|---|---|---|---|---|---|
`;
            links.forEach(l => {
                const candId = l.summit_candidate_id;
                const d = getCandidateDetails(candId);
                const score = l.location_refined_candidate_score || '';
                const diff = l.elevation_diff_m || '';
                const bucket = d.location_stability_bucket || l.location_refinement_level || '';
                const rel = d.municipality_relation || l.matched_terms || '';
                const mun = d.candidate_center_municipality || l.nearest_display_name || '';
                const status = d.candidate_municipality_stability || '';
                const dist = d.center_distance_to_boundary_m !== undefined ? d.center_distance_to_boundary_m : '';
                const cardSame = d.all_cardinal_1km_same || 'false';
                const interior = d.distance_stable_interior || 'false';

                mdContent += `| ${l.location_refined_rank_for_mountain} | \`${candId}\` | ${score} | ${diff} | \`${bucket}\` | \`${rel}\` | \`${mun}\` | \`${status}\` | ${dist} | ${cardSame} | ${interior} | **${l.compact_review_priority}** |\n`;
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
*Generated by generate-location-stability-review-packets as part of Stage 19 human-review preparation.*
`;

        const fullStagedPath = path.join(stagedGpxDir, fileName);
        fs.writeFileSync(fullStagedPath, mdContent, 'utf-8');

        const packetInfo = {
            packet_id: packetId,
            source_gpx_basename: gpxBasename,
            rel_path: relPath,
            fileName: fileName
        };
        gpxPackets.push(packetInfo);
        gpxFileToPacketMap.set(gpxBasename, packetInfo);
    });

    // 2. Generate Summit Candidate Conflict packets
    const summitPackets = [];
    const summitToPacketMap = new Map();

    summitConflictsRows.forEach((summitRow, idx) => {
        const order = idx + 1;
        const packetId = `summit_candidate_${padZero(order)}`;
        const candidateId = summitRow.summit_candidate_id;
        const safeId = sanitizeFilename(candidateId.replace(/^summit-candidate:/, ''));
        const fileName = `${packetId}_${safeId}.md`;
        const relPath = `location_stability_review_packets/summit_candidate_groups/${fileName}`;

        // Get all links pointing to this candidate in top-3
        const contestedLinks = top3Rows.filter(r => r.summit_candidate_id === candidateId);
        const d = getCandidateDetails(candidateId);

        let mdContent = `# Summit Candidate Conflict Packet (Location-Stability Refined): ${packetId}

> [!WARNING]
> These review packets are human-review aids only. Candidate links shown here are NOT final and must be verified by a map check. No candidate is automatically accepted.

- **Summit Candidate ID**: \`${candidateId}\`
- **Source GPX**: \`${summitRow.source_gpx_basename}\`
- **Track Name**: ${summitRow.track_name}
- **Candidate Coordinates**:
  - Latitude: \`${summitRow.candidate_lat}\`
  - Longitude: \`${summitRow.candidate_lon}\`
  - Elevation: \`${summitRow.candidate_ele_m}\`m
- **Location Stability Properties**:
  - Municipality Stability: \`${d.candidate_municipality_stability || 'invalid_coordinate'}\`
  - Candidate Center Municipality: \`${d.candidate_center_municipality || 'unknown'}\`
  - Boundary distance: \`${d.center_distance_to_boundary_m !== '' ? d.center_distance_to_boundary_m + ' m' : 'N/A'}\`
  - All cardinal 1km same: \`${d.all_cardinal_1km_same || 'false'}\`
  - Distance stable interior: \`${d.distance_stable_interior || 'false'}\`
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

| Mountain No | Mountain Name | Rank for Mountain | Score | Elev Diff (m) | Location Stability Bucket | Priority | Mutual Top-1? |
|---|---|---|---|---|---|---|---|
`;

        contestedLinks.forEach(l => {
            const score = l.location_refined_candidate_score || '';
            const diff = l.elevation_diff_m || '';
            const bucket = l.location_refinement_level || '';
            const priority = l.compact_review_priority || '';
            const mutual = l.mutual_top1 || '';
            mdContent += `| ${l.mountain_no} | ${l.mountain_name} | ${l.location_refined_rank_for_mountain} | ${score} | ${diff} | \`${bucket}\` | **${priority}** | ${mutual} |\n`;
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
*Generated by generate-location-stability-review-packets as part of Stage 19 human-review preparation.*
`;

        const fullStagedPath = path.join(stagedSummitDir, fileName);
        fs.writeFileSync(fullStagedPath, mdContent, 'utf-8');

        const packetInfo = {
            packet_id: packetId,
            summit_candidate_id: candidateId,
            rel_path: relPath,
            fileName: fileName
        };
        summitPackets.push(packetInfo);
        summitToPacketMap.set(candidateId, packetInfo);
    });

    // 3. Generate Mountain Packets
    const mountainPackets = [];
    const mountainToPacketMap = new Map();

    // Group top3 candidate links by mountain
    const linksByMountain = new Map();
    top3Rows.forEach(link => {
        if (!linksByMountain.has(link.mountain_no)) {
            linksByMountain.set(link.mountain_no, []);
        }
        linksByMountain.get(link.mountain_no).push(link);
    });

    for (const [mNo, links] of linksByMountain.entries()) {
        const mName = links[0].mountain_name;
        const mEle = links[0].mountain_elevation_m;
        const order = parseInt(mNo, 10);
        const packetId = `mountain_${padZero(order, 3)}`;
        const fileName = `${packetId}.md`;
        const relPath = `location_stability_review_packets/mountain_groups/${fileName}`;

        let mdContent = `# Mountain Review Packet (Location-Stability Refined): ${packetId}

> [!WARNING]
> These review packets are human-review aids only. Candidate links shown here are NOT final and must be verified by a map check. No candidate is automatically accepted.

- **Mountain Number**: #${mNo}
- **Mountain Name**: ${mName}
- **Expected Elevation**: ${mEle}m
- **Expected Expected Municipality**: ${links[0].csv_municipality || 'unknown'}

---

## Plausible Summit Candidates

| Rank | Candidate ID | Score | Elev Diff (m) | Coordinates (Lat, Lon) | Location Stability Bucket | Municipality Relation | Candidate Municipality | Stability Status | Priority |
|---|---|---|---|---|---|---|---|---|---|
`;

        links.forEach(l => {
            const candId = l.summit_candidate_id;
            if (candId) {
                const d = getCandidateDetails(candId);
                const score = l.location_refined_candidate_score || '';
                const diff = l.elevation_diff_m || '';
                const lat = d.lat || '';
                const lon = d.lon || '';
                const bucket = d.location_stability_bucket || l.location_refinement_level || '';
                const rel = d.municipality_relation || l.matched_terms || '';
                const mun = d.candidate_center_municipality || l.nearest_display_name || '';
                const status = d.candidate_municipality_stability || '';
                const priority = l.compact_review_priority || '';

                mdContent += `| ${l.location_refined_rank_for_mountain} | \`${candId}\` | ${score} | ${diff} | (${lat}, ${lon}) | \`${bucket}\` | \`${rel}\` | \`${mun}\` | \`${status}\` | **${priority}** |\n`;
            } else {
                mdContent += `| N/A | *No summit candidate linked* | | | | | | | | |\n`;
            }
        });

        mdContent += `
---

## Decision Checklist
Select the correct summit coordinate candidate, or flag for further checks:

- [ ] Accept candidate: \`${links[0].summit_candidate_id || 'N/A'}\`
- [ ] Reject all candidates
- [ ] Needs GIS/External map check
- [ ] Needs redetection
- [ ] Mark as unresolved

Notes / Decision Basis:
______________________________________________________________________

---
*Generated by generate-location-stability-review-packets as part of Stage 19 human-review preparation.*
`;

        const fullStagedPath = path.join(stagedMountainDir, fileName);
        fs.writeFileSync(fullStagedPath, mdContent, 'utf-8');

        const packetInfo = {
            packet_id: packetId,
            mountain_no: mNo,
            rel_path: relPath,
            fileName: fileName
        };
        mountainPackets.push(packetInfo);
        mountainToPacketMap.set(mNo, packetInfo);
    }

    // 4. Generate Packets Index
    const indexFileName = 'index.md';
    let indexMd = `# Mountain Summit Candidate Location-Stability Review Packets Index

This index lists all location-stability-based human-review packets and conflict groups.

- **Total GPX Group Packets (Traverses)**: ${gpxPackets.length}
- **Total Summit Candidate Conflict Packets**: ${summitPackets.length}
- **Total Mountain Packets**: ${mountainPackets.length}
- **Decision Template CSV**: [\`location_stability_review_decisions_template.csv\`](../location_stability_review_decisions_template.csv)

> [!NOTE]
> These review packets are human-review aids only. They do not contain final decisions, resolve mountain identities, or establish final accepted coordinates.

---

## Recommended Review Order & GPX Packets (Traverses)

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

    indexMd += `
---

## Individual Mountain Packets

| Mountain No | Mountain Name | Expected Municipality | Action |
|---|---|---|---|
`;

    mountainPackets.sort((a, b) => parseInt(a.mountain_no, 10) - parseInt(b.mountain_no, 10));
    mountainPackets.forEach(p => {
        const row = linksByMountain.get(p.mountain_no)[0] || {};
        indexMd += `| #${p.mountain_no} | ${row.mountain_name || ''} | ${row.csv_municipality || ''} | [Open Packet](mountain_groups/${p.fileName}) |\n`;
    });

    fs.writeFileSync(path.join(stagedDir, indexFileName), indexMd, 'utf-8');

    // 5. Generate Decision Template
    const decisionHeaders = [
        'mountain_no',
        'mountain_name',
        'suggested_summit_candidate_id',
        'suggested_candidate_score',
        'suggested_candidate_confidence',
        'suggested_location_stability_bucket',
        'suggested_municipality_relation',
        'suggested_candidate_municipality',
        'source_mountain_municipality',
        'accepted_summit_candidate_id',
        'decision_status',
        'decision_reason',
        'reviewer_notes',
        'needs_followup',
        'map_checked',
        'packet_path',
        'top3_candidate_ids',
        'conflict_group_ids',
        'created_from_stage'
    ];

    const decisionRows = top1Rows.map(top1Row => {
        const mNo = top1Row.mountain_no;
        const candId = top1Row.summit_candidate_id || '';
        const d = getCandidateDetails(candId);
        
        // Find top-3 candidates
        const mTop3 = top3Rows.filter(r => r.mountain_no === mNo && r.summit_candidate_id);
        const top3Ids = mTop3.map(r => r.summit_candidate_id).join('|');

        // Find GPX group packet
        const gpx = top1Row.source_gpx_basename;
        const gpxPacket = gpx ? gpxFileToPacketMap.get(gpx) : null;
        
        // Find summit conflict packets for top3 candidates
        const conflictPacketIds = [];
        if (gpxPacket) {
            conflictPacketIds.push(gpxPacket.packet_id);
        }
        
        mTop3.forEach(t3 => {
            const conflictPacket = summitToPacketMap.get(t3.summit_candidate_id);
            if (conflictPacket) {
                conflictPacketIds.push(conflictPacket.packet_id);
            }
        });

        // Add mountain packet ID
        const mPacket = mountainToPacketMap.get(mNo);
        if (mPacket) {
            conflictPacketIds.push(mPacket.packet_id);
        }

        const conflictGroupsJoined = conflictPacketIds.filter((v, i, a) => a.indexOf(v) === i).join('|');

        return {
            mountain_no: mNo,
            mountain_name: top1Row.mountain_name,
            suggested_summit_candidate_id: candId,
            suggested_candidate_score: top1Row.location_refined_candidate_score || '',
            suggested_candidate_confidence: top1Row.confidence || '',
            suggested_location_stability_bucket: d.location_stability_bucket || top1Row.location_refinement_level || '',
            suggested_municipality_relation: d.municipality_relation || top1Row.matched_terms || '',
            suggested_candidate_municipality: d.candidate_center_municipality || top1Row.nearest_display_name || '',
            source_mountain_municipality: d.mountain_source_municipality || top1Row.csv_municipality || '',
            accepted_summit_candidate_id: '',
            decision_status: 'pending_review',
            decision_reason: '',
            reviewer_notes: '',
            needs_followup: 'false',
            map_checked: 'false',
            packet_path: gpxPacket ? gpxPacket.rel_path : (mPacket ? mPacket.rel_path : ''),
            top3_candidate_ids: top3Ids,
            conflict_group_ids: conflictGroupsJoined,
            created_from_stage: 'location_stability_review_packets'
        };
    });

    // Integrity check
    const distinctMNos = new Set(decisionRows.map(r => r.mountain_no));
    if (distinctMNos.size !== 531 || decisionRows.length !== 531) {
        throw new Error(`Integrity check failed: Expected 531 distinct mountains in decision template, got ${distinctMNos.size} (length ${decisionRows.length})`);
    }

    const decisionCsv = buildCsvContent(decisionHeaders, decisionRows);
    fs.writeFileSync(path.join(stagedDir, 'location_stability_review_decisions_template.csv'), decisionCsv, 'utf8');

    return {
        gpxPackets,
        summitPackets,
        mountainPackets,
        decisionRows
    };
}

module.exports = {
    generateStabilityReviewPackets,
    parseCsv,
    parseCsvLine
};
