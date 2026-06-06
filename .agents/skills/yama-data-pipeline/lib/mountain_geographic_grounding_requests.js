'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function sha256Buffer(buf) {
    return crypto.createHash('sha256').update(buf).digest('hex');
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
        if (v.includes(',') || v.includes('"') || v.includes('\n') || v.includes('\r')) {
            return `"${v.replace(/"/g, '""')}"`;
        }
        return v;
    }).join(',');
}

function normalizeText(value) {
    if (value == null) return '';
    const s = String(value).trim();
    if (!s || s === 'undefined' || s === 'null' || s === 'N/A') return '';
    return s;
}

function getMountainName(mountain, fallback = {}) {
    return normalizeText(mountain?.name)
        || normalizeText(mountain?.mountain_name)
        || normalizeText(fallback?.mountain_name)
        || normalizeText(fallback?.name)
        || 'UNKNOWN_MOUNTAIN_NAME';
}

function selectMountain(mountainNo, links, csvLinkMap) {
    // Find the top-1 link based on the CSV row rank
    const top1Link = links.find(l => {
        const csvRow = csvLinkMap.get(`${mountainNo}:${l.summit_candidate_id}`);
        // Support both old Nominatim and new location-stability column names
        return csvRow && (csvRow.location_stability_refined_rank_for_mountain === '1' || csvRow.location_refined_rank_for_mountain === '1');
    }) || links[0]; // fallback to first link if top1 not in CSV
    
    if (!top1Link) {
        return { select: false, reasons: [] };
    }
    
    const csvRow = csvLinkMap.get(`${mountainNo}:${top1Link.summit_candidate_id}`) || {};
    
    const bucket = csvRow.review_bucket || top1Link.review_bucket || '';
    const priority = csvRow.compact_review_priority || top1Link.compact_review_priority || '';
    const mutualTop1 = csvRow.mutual_top1 || (top1Link.mutual_top1 !== undefined ? String(top1Link.mutual_top1) : '');
    const compReason = csvRow.compact_review_reason_codes || '';
    const prioReason = csvRow.review_priority_reason_codes || '';
    
    const stabBucket = top1Link.evidence?.location_stability?.location_stability_bucket;
    const stabLevel = top1Link.location_stability_bucket || stabBucket || '';
    const stabMuni = top1Link.evidence?.location_stability?.candidate_municipality_stability || '';
    
    const isAccept = bucket === 'accept_candidate_after_map_check' || bucket === 'low_priority' || bucket === 'deprioritized';
    
    const reasons = [];
    
    if (['resolve_conflict', 'check_close_alternatives', 'check_location_warning'].includes(bucket)) {
        reasons.push(`review_bucket_${bucket}`);
    }
    if (priority === 'high') {
        reasons.push('compact_review_priority_high');
    }
    if (mutualTop1 === 'false') {
        reasons.push('mutual_top1_false');
    }
    if (compReason.includes('shared_candidate')) {
        reasons.push('compact_reason_shared_candidate');
    }
    if (compReason.includes('not_mutual_top1')) {
        reasons.push('compact_reason_not_mutual_top1');
    }
    if (prioReason.includes('top_candidate_for_multiple_mountains')) {
        reasons.push('prio_reason_shared_top');
    }
    
    // weak reasons only apply if it's not a clear accept/low priority case
    if (!isAccept) {
        if (prioReason.includes('top_1_but_ambiguous')) {
            reasons.push('prio_reason_top_ambiguous');
        }
        if (stabMuni === 'near_boundary') {
            reasons.push('municipality_stability_near_boundary');
        }
    }
    
    // stability incompatibility/uncertainty indicators
    if ([
        'municipality_incompatible_strong',
        'adjacent_but_deep_inside',
        'location_uncertain_keep',
        'boundary_plausible'
    ].includes(stabLevel)) {
        reasons.push(`stability_level_${stabLevel}`);
    }
    if ([
        'boundary_ambiguous',
        'outside_prefecture'
    ].includes(stabMuni)) {
        reasons.push(`municipality_stability_${stabMuni}`);
    }
    
    const uniqueReasons = Array.from(new Set(reasons));
    return {
        select: uniqueReasons.length > 0 && !['low_priority', 'deprioritized'].includes(bucket),
        reasons: uniqueReasons
    };
}

const EXPECTED_OUTPUT_SCHEMA = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "GeographicGroundingResult",
    "type": "object",
    "properties": {
        "mountain_no": { "type": "integer" },
        "mountain_name": { "type": "string" },
        "grounding_status": {
            "type": "string",
            "enum": [
                "grounded_verified",
                "grounded_plausible_alternative",
                "ambiguous_homonymous",
                "insufficient_evidence",
                "no_candidate_matches"
            ]
        },
        "grounded_lat": { "type": ["number", "null"] },
        "grounded_lon": { "type": ["number", "null"] },
        "grounded_elevation_m": { "type": ["number", "null"] },
        "grounded_municipality": { "type": ["string", "null"] },
        "confidence_score": { "type": "number", "minimum": 0, "maximum": 1 },
        "explanation": { "type": "string" },
        "evidence_links": {
            "type": "array",
            "items": { "type": "string" }
        }
    },
    "required": [
        "mountain_no",
        "mountain_name",
        "grounding_status",
        "confidence_score",
        "explanation",
        "evidence_links"
    ]
};

function generateGroundingRequests({
    mountainsData,
    refinedLinks,
    top1Rows,
    top3Rows,
    conflictsRows,
    conflictGroupsByGpx,
    conflictGroupsBySummitCandidate,
    featureOutDir,
    reportingOutDir
}) {
    // Index CSV Link Rows
    const csvLinkMap = new Map();
    const addCsvRow = (row) => {
        csvLinkMap.set(`${row.mountain_no}:${row.summit_candidate_id}`, row);
    };
    top1Rows.forEach(addCsvRow);
    top3Rows.forEach(addCsvRow);
    conflictsRows.forEach(addCsvRow);

    // Group links by mountain
    const linksByMountain = new Map();
    refinedLinks.forEach(link => {
        const mNo = String(link.mountain_no).trim();
        if (!linksByMountain.has(mNo)) {
            linksByMountain.set(mNo, []);
        }
        linksByMountain.get(mNo).push(link);
    });

    // Group links by summit candidate to find candidate sharing
    const linksByCandidate = new Map();
    refinedLinks.forEach(link => {
        const cId = link.summit_candidate_id;
        if (!linksByCandidate.has(cId)) {
            linksByCandidate.set(cId, []);
        }
        linksByCandidate.get(cId).push(link);
    });

    // Index summit candidate conflict groups
    const candidateConflictMap = new Map();
    conflictGroupsBySummitCandidate.forEach(group => {
        candidateConflictMap.set(group.summit_candidate_id, group);
    });

    // Index GPX group rows
    const gpxGroupMap = new Map();
    conflictGroupsByGpx.forEach(group => {
        gpxGroupMap.set(group.source_gpx_basename, group);
    });

    const selectedMountains = [];
    const excludedMountains = [];
    const selectionReasonsSummary = {};
    const reviewBucketCountsSummary = {};

    mountainsData.forEach(m => {
        const mNoStr = String(m.mountain_no).trim();
        const links = linksByMountain.get(mNoStr) || [];
        const top1Csv = top1Rows.find(r => String(r.mountain_no).trim() === mNoStr);
        
        const evaluation = selectMountain(mNoStr, links, csvLinkMap);
        
        if (evaluation.select) {
            selectedMountains.push({
                mountain: m,
                links,
                reasons: evaluation.reasons,
                top1Csv
            });
            evaluation.reasons.forEach(r => {
                selectionReasonsSummary[r] = (selectionReasonsSummary[r] || 0) + 1;
            });
            
            // Track buckets among selected
            const buckets = new Set();
            links.forEach(l => {
                const csvRow = csvLinkMap.get(`${mNoStr}:${l.summit_candidate_id}`);
                const bucket = csvRow?.review_bucket || l.review_bucket;
                if (bucket) buckets.add(bucket);
            });
            buckets.forEach(b => {
                reviewBucketCountsSummary[b] = (reviewBucketCountsSummary[b] || 0) + 1;
            });
        } else {
            excludedMountains.push(m);
        }
    });

    // Sort selected mountains by mountain_no
    selectedMountains.sort((a, b) => Number(a.mountain.mountain_no) - Number(b.mountain.mountain_no));

    // Staging buffers
    const requestPacketsJsonlLines = [];
    const selectionJsonlLines = [];
    const markdownPacketsMap = new Map(); // filename -> content
    const submissionQueueRows = [];

    selectedMountains.forEach(({ mountain, links, reasons, top1Csv }) => {
        const mNo = mountain.mountain_no;
        const mNoStr = String(mNo).trim();
        const mNoPadded = String(mNo).padStart(6, '0');
        const mountainName = getMountainName(mountain, top1Csv);
        if (mountainName === 'UNKNOWN_MOUNTAIN_NAME') {
            console.warn(`[WARN] Mountain No ${mNoStr} name is unknown, using placeholder.`);
        }
        
        // Generate grounding_request_id
        const hashContext = `${mNoStr}:${mountainName}`;
        const hash = sha256Buffer(Buffer.from(hashContext)).substring(0, 16);
        const grounding_request_id = `req-grounding-${mNoPadded}-${hash}`;
        
        // Build Selection Object
        const sourceBuckets = Array.from(new Set(links.map(l => {
            const csvRow = csvLinkMap.get(`${mNoStr}:${l.summit_candidate_id}`);
            return csvRow?.review_bucket || l.review_bucket;
        }).filter(Boolean)));
        
        const sourcePriorities = Array.from(new Set(links.map(l => {
            const csvRow = csvLinkMap.get(`${mNoStr}:${l.summit_candidate_id}`);
            return csvRow?.compact_review_priority || l.compact_review_priority;
        }).filter(Boolean)));
        
        const selection = {
            selected_for_grounding: true,
            selection_reason_codes: reasons,
            source_review_buckets: sourceBuckets,
            source_compact_review_priorities: sourcePriorities,
            source_files: [
                'location_stability_refined_candidate_links.jsonl',
                'compact_review_queue_top1.csv',
                'compact_review_queue_top3.csv',
                'compact_review_queue_conflicts.csv'
            ]
        };

        // Source Mountain Object
        const source_mountain = {
            mountain_no: mNo,
            mountain_name: mountainName,
            municipality_or_island: mountain.location?.municipality_or_island || '',
            municipality: mountain.location?.municipality || '',
            island: mountain.location?.island || '',
            elevation_m: mountain.elevation_m != null ? Number(mountain.elevation_m) : null,
            csv_lat: mountain.coordinates?.lat != null ? Number(mountain.coordinates.lat) : null,
            csv_lon: mountain.coordinates?.lon != null ? Number(mountain.coordinates.lon) : null,
            yamap_url: mountain.yamap_url || ''
        };

        // Top-1 Candidate Object
        let top1_candidate = null;
        if (top1Csv) {
            const top1Link = links.find(l => l.summit_candidate_id === top1Csv.summit_candidate_id) || {};
            const stabBucket = top1Link.evidence?.location_stability?.location_stability_bucket;
            const stabLevel = top1Link.location_stability_bucket || stabBucket || null;
            const stabMuni = top1Link.evidence?.location_stability?.candidate_municipality_stability || null;
            const muniRel = top1Link.evidence?.location_stability?.municipality_relation || null;
            const muniAdj = top1Link.evidence?.location_stability?.reason_codes || null;

            top1_candidate = {
                summit_candidate_id: top1Csv.summit_candidate_id,
                source_gpx_basename: top1Csv.source_gpx_basename,
                track_name: top1Csv.track_name,
                candidate_lat: top1Link.candidate_lat != null ? Number(top1Link.candidate_lat) : null,
                candidate_lon: top1Link.candidate_lon != null ? Number(top1Link.candidate_lon) : null,
                candidate_ele_m: top1Link.candidate_ele_m != null ? Number(top1Link.candidate_ele_m) : null,
                elevation_diff_m: top1Csv.elevation_diff_m != null ? Number(top1Csv.elevation_diff_m) : null,
                location_stability_refined_candidate_score: top1Link.location_stability_refined_candidate_score != null ? Number(top1Link.location_stability_refined_candidate_score) : null,
                location_stability_rank_for_mountain: top1Link.location_stability_refined_rank_for_mountain != null ? Number(top1Link.location_stability_refined_rank_for_mountain) : null,
                location_stability_rank_for_summit_candidate: top1Link.location_stability_refined_rank_for_summit_candidate != null ? Number(top1Link.location_stability_refined_rank_for_summit_candidate) : null,
                mutual_top1: top1Csv.mutual_top1 === 'true',
                mutual_top3: top1Csv.mutual_top3 === 'true',
                review_bucket: top1Csv.review_bucket || null,
                compact_review_priority: top1Csv.compact_review_priority || null,
                location_stability_level: stabLevel,
                municipality_match_status: muniRel,
                municipality_adjacency_status: muniAdj,
                municipality_incompatibility_status: stabLevel,
                nearest_display_name: top1Csv.nearest_display_name || null,
                matched_terms: top1Csv.matched_terms || null,
                review_reason_codes: top1Csv.review_reason_codes || null,
                compact_review_reason_codes: top1Csv.compact_review_reason_codes || null
            };
        }

        // Top-3 Candidates Array
        const top3CsvsForMountain = top3Rows.filter(r => String(r.mountain_no).trim() === mNoStr);
        const top3_candidates = top3CsvsForMountain.map(csvRow => {
            const link = links.find(l => l.summit_candidate_id === csvRow.summit_candidate_id) || {};
            const stabBucket = link.evidence?.location_stability?.location_stability_bucket;
            const stabLevel = link.location_stability_bucket || stabBucket || null;
            return {
                summit_candidate_id: csvRow.summit_candidate_id,
                source_gpx_basename: csvRow.source_gpx_basename,
                track_name: csvRow.track_name,
                candidate_lat: link.candidate_lat != null ? Number(link.candidate_lat) : null,
                candidate_lon: link.candidate_lon != null ? Number(link.candidate_lon) : null,
                candidate_ele_m: link.candidate_ele_m != null ? Number(link.candidate_ele_m) : null,
                elevation_diff_m: csvRow.elevation_diff_m != null ? Number(csvRow.elevation_diff_m) : null,
                score: link.location_stability_refined_candidate_score != null ? Number(link.location_stability_refined_candidate_score) : null,
                rank_for_mountain: link.location_stability_refined_rank_for_mountain != null ? Number(link.location_stability_refined_rank_for_mountain) : null,
                mutual_top1: csvRow.mutual_top1 === 'true',
                review_bucket: csvRow.review_bucket || null,
                location_stability_level: stabLevel
            };
        });

        // GPX Context
        const gpxBasenames = Array.from(new Set(links.map(l => l.source_gpx_basename).filter(Boolean)));
        const gpx_context = gpxBasenames.map(bn => {
            const group = gpxGroupMap.get(bn) || {};
            return {
                source_gpx_basename: bn,
                track_name: group.track_name || '',
                mountain_count_in_group: group.mountain_count_in_group ? Number(group.mountain_count_in_group) : null,
                summit_candidate_count_in_group: group.summit_candidate_count_in_group ? Number(group.summit_candidate_count_in_group) : null
            };
        });

        // Summit Candidate Conflict Context
        const summit_candidate_conflict_context = [];
        links.forEach(l => {
            const group = candidateConflictMap.get(l.summit_candidate_id);
            if (group) {
                summit_candidate_conflict_context.push({
                    summit_candidate_id: l.summit_candidate_id,
                    top1_mountain_count: group.top1_mountain_count ? Number(group.top1_mountain_count) : null,
                    top3_mountain_count: group.top3_mountain_count ? Number(group.top3_mountain_count) : null,
                    top1_mountain_nos: group.top1_mountain_nos || '',
                    top1_mountain_names: group.top1_mountain_names || '',
                    top3_mountain_nos: group.top3_mountain_nos || '',
                    top3_mountain_names: group.top3_mountain_names || ''
                });
            }
        });

        // Conflict Summary Narrative
        const sharedCandidates = [];
        links.forEach(l => {
            const shared = linksByCandidate.get(l.summit_candidate_id) || [];
            if (shared.length > 1) {
                sharedCandidates.push({
                    candidate_id: l.summit_candidate_id,
                    gpx: l.source_gpx_basename,
                    mountains: shared.map(s => `#${s.mountain_no} ${s.mountain_name}`)
                });
            }
        });
        
        let conflict_summary = '';
        if (sharedCandidates.length > 0) {
            conflict_summary = `Mountain shares candidates with other mountains:\n` +
                sharedCandidates.map(sc => `- Candidate ${sc.candidate_id} on ${sc.gpx} is linked to: ${sc.mountains.join(', ')}`).join('\n');
        } else {
            conflict_summary = 'No candidate sharing conflicts detected. Location warnings or close alternatives may still be present.';
        }

        // Context narrative for the prompt
        const candidateDetails = top3_candidates.map((c, idx) => {
            return `Candidate #${idx + 1}: ${c.summit_candidate_id}
  Coordinates: (${c.candidate_lat}, ${c.candidate_lon})
  GPX Track: ${c.source_gpx_basename} ("${c.track_name}")
  Elevation: ${c.candidate_ele_m}m (Diff from target: ${c.elevation_diff_m}m)
  Score: ${c.score}, Rank: ${c.rank_for_mountain}, Mutual Top-1: ${c.mutual_top1}
  Stability level: ${c.location_stability_level || 'unknown'}`;
        }).join('\n\n');

        const prompt_text = `You are a geographic grounding agent. Your task is to verify and resolve the correct geographic location of mountain "${mountainName}" (No. ${mNoStr}) in Ehime Prefecture, Japan.

Official Mountain Details:
- Name: ${mountainName}
- Official Elevation: ${mountain.elevation_m}m
- Source Municipality/Island: ${mountain.location?.municipality_or_island || 'Unknown'}
- Known CSV Coordinates: (${mountain.coordinates?.lat || 'None'}, ${mountain.coordinates?.lon || 'None'})
${mountain.yamap_url ? `- YAMAP URL: ${mountain.yamap_url}\n` : ''}
Existing Summit Candidate matches in GPX track files:
${candidateDetails}

Conflicts & Ambiguity Context:
${conflict_summary}

Please search geographical references (such as YAMAP diary entries, GSI maps, or other Ehime mountain databases) to determine:
1. The true summit coordinates of "${mountainName}".
2. Which, if any, of the GPX summit candidates represents the true summit.
3. If no candidate matches, or if evidence is insufficient, classify the status accordingly.

Your output must be JSON ONLY matching the requested schema. Do not guess coordinates when evidence is insufficient.`;

        // Assemble JSONL request packet
        const requestPacket = {
            grounding_request_id,
            mountain_no: mNo,
            mountain_name: mountainName,
            source_row_no: mountain.source_row_no,
            selection,
            source_mountain,
            top1_candidate,
            top3_candidates,
            conflict_context: {
                shared_candidate_count: sharedCandidates.length,
                conflict_summary
            },
            gpx_context,
            summit_candidate_conflict_context,
            external_agent_task: {
                instruction: `Resolve correct geographic coordinates for mountain "${mountainName}" (#${mNoStr}).`,
                prompt_text
            },
            expected_output_schema: EXPECTED_OUTPUT_SCHEMA
        };
        requestPacketsJsonlLines.push(JSON.stringify(requestPacket));

        // Assemble selection log line
        const selectionLog = {
            mountain_no: mNo,
            mountain_name: mountainName,
            selected_for_grounding: true,
            selection_reason_codes: reasons,
            source_review_buckets: sourceBuckets,
            top1_summit_candidate_id: top1Csv ? top1Csv.summit_candidate_id : null,
            source_gpx_basename: top1Csv ? top1Csv.source_gpx_basename : null,
            review_packet_path: `review_required_request_packets/mountain_${mNoPadded}.md`,
            grounding_request_id
        };
        selectionJsonlLines.push(JSON.stringify(selectionLog));

        // Assemble Markdown packet
        const packetPath = `data/08_reporting/mountain_geographic_grounding/2026-05-12/review_required_request_packets/mountain_${mNoPadded}.md`;
        
        const candidateMdList = top3_candidates.map((c, idx) => {
            return `### Alternative Candidate #${idx + 1}: \`${c.summit_candidate_id}\`
- **GPX File**: \`${c.source_gpx_basename}\`
- **Track Name**: ${c.track_name || 'N/A'}
- **Coordinates**: (${c.candidate_lat}, ${c.candidate_lon})
- **Elevation**: ${c.candidate_ele_m}m (Diff: ${c.elevation_diff_m}m)
- **Score / Rank**: Score = ${c.score}, Rank = ${c.rank_for_mountain}
- **Mutual Top-1**: ${c.mutual_top1}
- **Stability Level**: \`${c.location_stability_level || 'N/A'}\``;
        }).join('\n\n');

        const mdContent = `# Geographic grounding request: mountain_${mNoPadded}

## Target mountain
- **Mountain No**: ${mNoStr}
- **Mountain Name**: ${mountainName}
- **Prefecture**: Ehime Prefecture
- **Municipality / Island**: ${mountain.location?.municipality_or_island || 'N/A'}
- **Municipality**: ${mountain.location?.municipality || 'N/A'}
- **Island**: ${mountain.location?.island || 'N/A'}
- **Official Elevation**: ${mountain.elevation_m} m
- **Known CSV Coordinates**: (${mountain.coordinates?.lat || 'N/A'}, ${mountain.coordinates?.lon || 'N/A'})
- **YAMAP URL**: ${mountain.yamap_url ? `[YAMAP Page](${mountain.yamap_url})` : 'N/A'}

## Why this mountain was selected
- **Selection Reason Codes**: \`${reasons.join(', ')}\`
- **Review Buckets Involved**: \`${sourceBuckets.join(', ')}\`
- **Compact Review Priorities**: \`${sourcePriorities.join(', ')}\`

### Conflict/Warning Summary:
${conflict_summary}

## Existing project context
${top1_candidate ? `
### Top-1 Suggested Candidate: \`${top1_candidate.summit_candidate_id}\`
- **GPX Basename**: \`${top1_candidate.source_gpx_basename}\`
- **Track Name**: ${top1_candidate.track_name || 'N/A'}
- **Coordinates**: (${top1_candidate.candidate_lat}, ${top1_candidate.candidate_lon})
- **Elevation**: ${top1_candidate.candidate_ele_m}m (Diff: ${top1_candidate.elevation_diff_m}m)
- **Stability Level**: \`${top1_candidate.location_stability_level || 'N/A'}\`
- **Municipality Match Status**: \`${top1_candidate.municipality_match_status || 'N/A'}\`
- **Nearest Geocoded Place**: ${top1_candidate.nearest_display_name || 'N/A'}
` : 'No top-1 candidate available.'}

### Alternatives Overview:
${candidateMdList}

## Known ambiguity
- **Shared summit candidate conflicts**: ${sharedCandidates.length > 0 ? 'Yes' : 'No'}
- **Close alternatives**: ${sourceBuckets.includes('check_close_alternatives') ? 'Yes' : 'No'}
- **Location warning**: ${sourceBuckets.includes('check_location_warning') ? 'Yes' : 'No'}
- **Boundary ambiguity**: ${reasons.some(r => r.includes('boundary_ambiguous') || r.includes('near_boundary')) ? 'Yes' : 'No'}

## Task for geographic grounding agent
\`\`\`text
${prompt_text}
\`\`\`

## Requested output format
JSON schema only:
\`\`\`json
${JSON.stringify(EXPECTED_OUTPUT_SCHEMA, null, 2)}
\`\`\`
`;
        markdownPacketsMap.set(`mountain_${mNoPadded}.md`, mdContent);

        // Add to Submission Queue Row
        submissionQueueRows.push({
            grounding_request_id,
            mountain_no: mNoStr,
            mountain_name: mountainName,
            municipality: mountain.location?.municipality || '',
            island: mountain.location?.island || '',
            selection_reason_codes: reasons.join('|'),
            review_buckets: sourceBuckets.join('|'),
            top1_summit_candidate_id: top1Csv ? top1Csv.summit_candidate_id : '',
            source_gpx_basename: top1Csv ? top1Csv.source_gpx_basename : '',
            packet_markdown_path: `review_required_request_packets/mountain_${mNoPadded}.md`,
            machine_packet_jsonl_path: `review_required_grounding_request_packets.jsonl`,
            submission_status: 'pending',
            submitted_at: '',
            external_agent_name: '',
            raw_response_id: '',
            notes: ''
        });
    });

    // Build Index Markdown
    const indexPaddedLines = selectedMountains.map(({ mountain, top1Csv }) => {
        const mNoPadded = String(mountain.mountain_no).padStart(6, '0');
        const mountainName = getMountainName(mountain, top1Csv);
        return `- [mountain_${mNoPadded}](mountain_${mNoPadded}.md): ${mountainName}`;
    }).join('\n');

    const indexMdContent = `# Review Required Geographic Grounding Request Packets Index

This index lists all geographic grounding request packets generated for mountains requiring additional external geographic evidence.

- **Total Selected Mountains**: ${selectedMountains.length}
- **Machine-readable JSONL**: \`review_required_grounding_request_packets.jsonl\`
- **Submission Queue CSV**: [\`review_required_grounding_submission_queue.csv\`](../review_required_grounding_submission_queue.csv)

> [!NOTE]
> These grounding request packets are review aids and research queries only. They do not constitute final accepted summit coordinates or decisions.

---

## Generated Grounding Packets

${indexPaddedLines}
`;

    // Build Summary Markdown
    const summaryMdContent = `# Review Required Geographic Grounding Summary

This summary captures the counts and outcomes of the Stage 20 preparation stage for the external geographic grounding agent.

- **Selected Mountains**: ${selectedMountains.length}
- **Excluded Mountains**: ${excludedMountains.length}

## Selection Reasons Breakdown

| Reason Code | Count |
|---|---|
${Object.entries(selectionReasonsSummary).map(([code, count]) => `| \`${code}\` | ${count} |`).join('\n')}

## Review Buckets Breakdown among Selected

| Review Bucket | Count |
|---|---|
${Object.entries(reviewBucketCountsSummary).map(([b, count]) => `| \`${b}\` | ${count} |`).join('\n')}

## Generated Output Files

- Machine-readable packets JSONL: \`data/04_feature/mountain_geographic_grounding/2026-05-12/review_required_grounding_request_packets.jsonl\`
- Selection log JSONL: \`data/04_feature/mountain_geographic_grounding/2026-05-12/review_required_grounding_request_selection.jsonl\`
- Packets Index Markdown: \`data/08_reporting/mountain_geographic_grounding/2026-05-12/review_required_request_packets/index.md\`
- Submission Queue CSV: \`data/08_reporting/mountain_geographic_grounding/2026-05-12/review_required_grounding_submission_queue.csv\`
- Summary Markdown: \`data/08_reporting/mountain_geographic_grounding/2026-05-12/review_required_grounding_summary.md\`

## Next Steps

1. Review the submission queue CSV and decide which packets to submit.
2. Submit the packets to the external grounding agent and retrieve raw response files.
3. Save the raw response files to \`data/01_raw/external_geographic_grounding/\`.
`;

    return {
        requestPacketsJsonlLines,
        selectionJsonlLines,
        markdownPacketsMap,
        indexMdContent,
        summaryMdContent,
        submissionQueueRows,
        selectedCount: selectedMountains.length,
        excludedCount: excludedMountains.length,
        selectionReasonsSummary,
        reviewBucketCountsSummary
    };
}

module.exports = {
    parseCsv,
    toCsvLine,
    selectMountain,
    generateGroundingRequests,
    EXPECTED_OUTPUT_SCHEMA,
    getMountainName,
    normalizeText
};
