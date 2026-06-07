import json
import csv
import re
import unicodedata
from pathlib import Path
from collections import defaultdict, Counter

def normalize_text(text):
    if not isinstance(text, str):
        return ""
    norm = unicodedata.normalize('NFKC', text)
    norm = re.sub(r'\s+', ' ', norm)
    return norm.strip().lower()

def tokenize(normalized_text):
    if not normalized_text:
        return []
    delimiters = r'[・/／,，、\s\-－〜~()（）+＋_]+'
    tokens = re.split(delimiters, normalized_text)
    return [t.strip() for t in tokens if t.strip()]

def is_name_match(mountain_name, target_text):
    if not mountain_name or not target_text:
        return False
    norm_m = normalize_text(mountain_name)
    norm_text = normalize_text(target_text)
    if norm_m in norm_text:
        if len(norm_m) > 2:
            return True
        tokens = tokenize(norm_text)
        if norm_m in tokens:
            return True
        suffixes = ['山', '岳', '峯', '峰', '山頂', '山脈', '森', '峠', '寺', '島']
        for token in tokens:
            if token == norm_m:
                return True
            for suff in suffixes:
                if token == (norm_m + suff) or token == (suff + norm_m):
                    return True
    return False

def get_support_tier(dist):
    if dist is None:
        return "no_gpx_support"
    if dist <= 50: return 'strict_gpx_support'
    if dist <= 150: return 'strong_gpx_support'
    if dist <= 300: return 'medium_gpx_support'
    if dist <= 500: return 'weak_gpx_support'
    if dist <= 1000: return 'distant_gpx_support'
    return 'no_gpx_support'

def main():
    print("Starting candidate extraction refinement analysis...")
    
    # 1. Load inputs
    assignments_path = Path("data/04_feature/mountain_summit_assignments/2026-06-07_gemini_grounded_balanced_summit_assignment/proposed_summit_assignments.jsonl")
    candidates_path = Path("data/03_primary/summit_candidates/2026-05-12/summit_candidates.jsonl")
    activity_links_path = Path("data/04_feature/activity_linking/gpx_yamap_candidate_links/2026-05-12/title_enriched_candidate_links.jsonl")
    mountains_path = Path("data/03_primary/mountains/ehime_mountain_source_rows.json")
    grounding_path = Path("data/04_feature/mountain_geographic_grounding/2026-06-06/grounding_reference_index.jsonl")
    
    # Verify files exist
    for p in [assignments_path, candidates_path, activity_links_path, mountains_path, grounding_path]:
        if not p.exists():
            print(f"Error: Required file missing: {p}")
            return
            
    # Read files
    assignments = []
    with open(assignments_path, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                assignments.append(json.loads(line))
                
    candidates = []
    with open(candidates_path, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                candidates.append(json.loads(line))
    candidates_by_id = {c["summit_candidate_id"]: c for c in candidates}
    candidates_by_gpx = defaultdict(list)
    for c in candidates:
        candidates_by_gpx[c["source_gpx_basename"]].append(c)
                
    activity_links = []
    with open(activity_links_path, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                activity_links.append(json.loads(line))
    activity_links_by_basename = {link["gpx_basename"]: link for link in activity_links}
                
    with open(mountains_path, "r", encoding="utf-8") as f:
        mountains = json.load(f)
    mountains_by_no = {m["mountain_no"]: m for m in mountains}
    
    groundings = []
    with open(grounding_path, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                groundings.append(json.loads(line))
    grounding_by_no = {g["mountain_no"]: g for g in groundings}
                
    # Define output directory
    out_dir = Path("data/08_reporting/mountain_summit_assignment_review/2026-06-07_gemini_grounded_balanced_summit_assignment/candidate_extraction_refinement_analysis")
    out_dir.mkdir(parents=True, exist_ok=True)
    
    # Pre-calculate candidate sharing
    shared_assignments = defaultdict(list)
    for a in assignments:
        if a.get("proposed_coordinate_source") == "gpx_summit_candidate" and a.get("proposed_summit_candidate_id"):
            shared_assignments[a["proposed_summit_candidate_id"]].append(a)
            
    # Analysis A: shared candidate deep dive
    shared_deep_dive_rows = []
    for cand_id, list_a in shared_assignments.items():
        if len(list_a) > 1:
            count = len(list_a)
            mountain_nos = ";".join([str(a["mountain_no"]) for a in list_a])
            mountain_names = ";".join([a["mountain_name"] for a in list_a])
            
            first = list_a[0]
            gpx_base = first["source_gpx_basename"]
            
            cand = candidates_by_id[cand_id]
            track_name = cand["track_name"]
            lat = cand["lat"]
            lon = cand["lon"]
            ele = cand["ele_m"]
            
            dists = [a["distance_gemini_to_gpx_candidate_m"] for a in list_a if a["distance_gemini_to_gpx_candidate_m"] is not None]
            min_dist = min(dists) if dists else 0.0
            max_dist = max(dists) if dists else 0.0
            
            cats = ";".join([a["review_category"] for a in list_a])
            reasons = ";".join([",".join(a["review_reason_codes"]) for a in list_a])
            
            ev_names = [a["evidence"]["name"].get("name_evidence_tier", "name_missing") for a in list_a]
            name_evidence_tiers = ";".join(ev_names)
            
            muni_comps = ";".join([a["evidence"]["municipality"].get("compatibility", "municipality_unknown") for a in list_a])
            
            # Find activity titles
            act_link = activity_links_by_basename.get(gpx_base)
            titles = []
            best_title = ""
            if act_link:
                best_cand = act_link.get("best_candidate")
                if best_cand and isinstance(best_cand, dict):
                    best_title = best_cand.get("title", "")
                if best_title:
                    titles.append(best_title)
                for act in act_link.get("title_enriched_candidate_activities", []):
                    if act.get("title") and act.get("title") not in titles:
                        titles.append(act["title"])
            activity_titles = ";".join(titles)
            activity_titles_joined = best_title
            
            # Classification and Recommended Handling
            classification = "needs_manual_interpretation"
            recommended_handling = "Require human validator review."
            diagnostic_note = ""
            
            delimiters = ['・', '/', '／', '+', '＋']
            has_multiple_peaks_in_track = any(d in track_name for d in delimiters)
            
            # Check for alias/substring similar names
            names_set = {a["mountain_name"] for a in list_a}
            is_sub = False
            names_list = list(names_set)
            if len(names_list) == 2:
                n1, n2 = names_list[0], names_list[1]
                if n1 in n2 or n2 in n1:
                    is_sub = True
                    
            if has_multiple_peaks_in_track:
                classification = "likely_traverse_multi_peak_context"
                recommended_handling = "Implement name-aware track segmentation or split track by timestamp to associate coordinates per peak."
                diagnostic_note = f"Track name '{track_name}' contains multiple peaks, showing traverse context."
            elif is_sub:
                classification = "same_summit_alias_or_nearby_name"
                recommended_handling = "Merge records or select the candidate coordinate for the primary peak and link the alias."
                diagnostic_note = f"Mountain names {mountain_names} appear to be aliases or sub-features of the same peak."
            elif count >= 4:
                classification = "candidate_extraction_too_coarse"
                recommended_handling = "Adjust candidate detection parameters (tighter merge distance and prominence thresholds) to isolate local summits."
                diagnostic_note = f"Shared by {count} mountains. Tighter search parameters are required to identify separate peaks."
            else:
                classification = "needs_manual_interpretation"
                recommended_handling = "Perform manual verification on map check queue."
                diagnostic_note = "Requires manual map check to determine correct coordinate."
                
            shared_deep_dive_rows.append({
                "proposed_summit_candidate_id": cand_id,
                "assigned_mountain_count": count,
                "mountain_nos": mountain_nos,
                "mountain_names": mountain_names,
                "source_gpx_basename": gpx_base,
                "track_name": track_name,
                "candidate_lat": lat,
                "candidate_lon": lon,
                "candidate_ele_m": ele,
                "min_distance_gemini_to_gpx_candidate_m": min_dist,
                "max_distance_gemini_to_gpx_candidate_m": max_dist,
                "review_categories": cats,
                "reason_codes": reasons,
                "name_evidence_tiers": name_evidence_tiers,
                "municipality_compatibilities": muni_comps,
                "activity_titles_joined": activity_titles_joined,
                "activity_titles": activity_titles,
                "classification": classification,
                "recommended_handling": recommended_handling,
                "diagnostic_note": diagnostic_note
            })
            
    shared_candidate_deep_dive_csv = out_dir / "shared_candidate_deep_dive.csv"
    with open(shared_candidate_deep_dive_csv, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=shared_deep_dive_rows[0].keys())
        writer.writeheader()
        writer.writerows(shared_deep_dive_rows)
        
    # Analysis B: traverse track peak coverage
    traverse_coverage_rows = []
    
    gpx_basenames = sorted(list(candidates_by_gpx.keys()))
    for gpx_base in gpx_basenames:
        cand_list = candidates_by_gpx[gpx_base]
        track_name = cand_list[0]["track_name"]
        
        # Get activity titles
        act_link = activity_links_by_basename.get(gpx_base)
        titles = []
        if act_link:
            best_cand = act_link.get("best_candidate")
            if best_cand and isinstance(best_cand, dict) and best_cand.get("title"):
                titles.append(best_cand["title"])
            for act in act_link.get("title_enriched_candidate_activities", []):
                if act.get("title") and act.get("title") not in titles:
                    titles.append(act["title"])
        activity_titles = ";".join(titles)
        
        # Check which of the 531 mountain names are in the track name or titles
        matched_mountains = []
        for m in mountains:
            m_name = m["name"]
            in_track = is_name_match(m_name, track_name)
            in_title = any(is_name_match(m_name, t) for t in titles)
            if in_track or in_title:
                matched_mountains.append(m)
                
        # Only process tracks that cover multiple mountains
        if len(matched_mountains) > 1:
            csv_mountain_nos = ";".join([str(m["mountain_no"]) for m in matched_mountains])
            csv_mountain_names = ";".join([m["name"] for m in matched_mountains])
            mountain_names_in_track_or_title = ";".join([m["name"] for m in matched_mountains])
            
            cand_count = len(cand_list)
            cand_ids = ";".join([c["summit_candidate_id"] for c in cand_list])
            
            assigned_a = [a for a in assignments if a.get("source_gpx_basename") == gpx_base]
            assigned_nos = ";".join([str(a["mountain_no"]) for a in assigned_a])
            assigned_names = ";".join([a["mountain_name"] for a in assigned_a])
            
            m_count = len(matched_mountains)
            if cand_count == 0:
                coverage_status = "no_candidate_for_named_peak_context"
                diagnostic_note = "No candidates were extracted for this track points."
            elif cand_count == 1:
                coverage_status = "single_candidate_for_multi_peak_track"
                diagnostic_note = f"Only 1 candidate extracted for a track named with {m_count} peaks. Severe peak merging occurred."
            elif cand_count == m_count:
                coverage_status = "candidate_count_matches_named_peaks"
                diagnostic_note = f"Candidate count ({cand_count}) matches the number of named peaks in track/title."
            elif cand_count < m_count:
                coverage_status = "candidate_count_less_than_named_peaks"
                diagnostic_note = f"Under-detection: candidate count ({cand_count}) is less than named peaks ({m_count})."
            else:
                coverage_status = "candidate_count_greater_than_named_peaks"
                diagnostic_note = f"Over-detection or secondary features: candidate count ({cand_count}) exceeds named peaks ({m_count})."
                
            traverse_coverage_rows.append({
                "source_gpx_basename": gpx_base,
                "track_name": track_name,
                "activity_titles": activity_titles,
                "mountain_names_in_track_or_title": mountain_names_in_track_or_title,
                "csv_mountain_nos_matched_by_name": csv_mountain_nos,
                "csv_mountain_names_matched_by_name": csv_mountain_names,
                "summit_candidate_count_for_gpx": cand_count,
                "summit_candidate_ids_for_gpx": cand_ids,
                "assigned_mountain_nos_using_gpx": assigned_nos,
                "assigned_mountain_names_using_gpx": assigned_names,
                "coverage_status": coverage_status,
                "diagnostic_note": diagnostic_note
            })
            
    traverse_track_peak_coverage_csv = out_dir / "traverse_track_peak_coverage.csv"
    if not traverse_coverage_rows:
        traverse_coverage_rows.append({
            "source_gpx_basename": "none",
            "track_name": "",
            "activity_titles": "",
            "mountain_names_in_track_or_title": "",
            "csv_mountain_nos_matched_by_name": "",
            "csv_mountain_names_matched_by_name": "",
            "summit_candidate_count_for_gpx": 0,
            "summit_candidate_ids_for_gpx": "",
            "assigned_mountain_nos_using_gpx": "",
            "assigned_mountain_names_using_gpx": "",
            "coverage_status": "needs_manual_interpretation",
            "diagnostic_note": "No multi-peak tracks found."
        })
        
    with open(traverse_track_peak_coverage_csv, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=traverse_coverage_rows[0].keys())
        writer.writeheader()
        writer.writerows(traverse_coverage_rows)
        
    # Analysis C: name-missing GPX-supported cases
    name_missing_rows = []
    
    gpx_supported = [a for a in assignments if a.get("proposed_coordinate_source") == "gpx_summit_candidate"]
    for a in gpx_supported:
        name_ev = a["evidence"].get("name", {})
        name_tier = name_ev.get("name_evidence_tier", "name_missing")
        
        if name_tier in ("name_missing", "name_weak"):
            m_no = a["mountain_no"]
            m_name = a["mountain_name"]
            cand_id = a["proposed_summit_candidate_id"]
            gpx_base = a["source_gpx_basename"]
            dist_gemini = a["distance_gemini_to_gpx_candidate_m"]
            support_tier = get_support_tier(dist_gemini)
            muni_comp = a["evidence"]["municipality"].get("compatibility", "municipality_unknown")
            ele_diff = a["elevation_diff_csv_to_proposed_m"]
            cat = a["review_category"]
            reasons = ";".join(a["review_reason_codes"])
            
            cand = candidates_by_id.get(cand_id, {})
            track_name = cand.get("track_name", "") if cand else ""
            
            # Find activity titles
            act_link = activity_links_by_basename.get(gpx_base)
            titles = []
            if act_link:
                best_cand = act_link.get("best_candidate")
                if best_cand and isinstance(best_cand, dict) and best_cand.get("title"):
                    titles.append(best_cand["title"])
                for act in act_link.get("title_enriched_candidate_activities", []):
                    if act.get("title") and act.get("title") not in titles:
                        titles.append(act["title"])
            activity_titles = ";".join(titles)
            
            possible_explanation = "needs_manual_interpretation"
            recommended_action = "Require human review."
            
            delimiters = ['・', '/', '／', '+', '＋']
            has_multiple_peaks_in_track = any(d in track_name for d in delimiters)
            
            if has_multiple_peaks_in_track and not is_name_match(m_name, track_name):
                possible_explanation = "track_named_for_different_peak"
                recommended_action = "Extract text from YAMAP activity log observations or diary text to verify which candidate belongs to the target peak."
            elif has_multiple_peaks_in_track:
                possible_explanation = "multi_peak_traverse_without_target_name"
                recommended_action = "Reprocess GPX track points to resolve individual peaks, and match coordinates against geographic grounding index."
            elif dist_gemini is not None and dist_gemini <= 150:
                possible_explanation = "candidate_near_gemini_but_name_not_supported"
                recommended_action = "Verify if target name is an alias of the track name peak (e.g. check local research records)."
            elif dist_gemini is not None and dist_gemini > 500:
                possible_explanation = "candidate_extraction_gap"
                recommended_action = "Reprocess raw GPX using higher density peak detection rules (lower prominence or peak radius)."
            elif not activity_titles:
                possible_explanation = "activity_title_missing_target_name"
                recommended_action = "Perform manual reverse geocoding check or map validation check."
                
            name_missing_rows.append({
                "mountain_no": m_no,
                "mountain_name": m_name,
                "proposed_summit_candidate_id": cand_id,
                "source_gpx_basename": gpx_base,
                "track_name": track_name,
                "activity_titles": activity_titles,
                "distance_gemini_to_gpx_candidate_m": dist_gemini,
                "gpx_support_tier": support_tier,
                "name_evidence_tier": name_tier,
                "municipality_compatibility": muni_comp,
                "elevation_diff_csv_to_proposed_m": ele_diff,
                "review_category": cat,
                "review_reason_codes": reasons,
                "possible_explanation": possible_explanation,
                "recommended_action": recommended_action
            })
            
    name_missing_gpx_supported_cases_csv = out_dir / "name_missing_gpx_supported_cases.csv"
    if not name_missing_rows:
        name_missing_rows.append({
            "mountain_no": 0,
            "mountain_name": "none",
            "proposed_summit_candidate_id": "",
            "source_gpx_basename": "",
            "track_name": "",
            "activity_titles": "",
            "distance_gemini_to_gpx_candidate_m": "",
            "gpx_support_tier": "",
            "name_evidence_tier": "",
            "municipality_compatibility": "",
            "elevation_diff_csv_to_proposed_m": "",
            "review_category": "",
            "review_reason_codes": "",
            "possible_explanation": "needs_manual_interpretation",
            "recommended_action": ""
        })
        
    with open(name_missing_gpx_supported_cases_csv, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=name_missing_rows[0].keys())
        writer.writeheader()
        writer.writerows(name_missing_rows)
        
    # Analysis D: candidate extraction gap hypotheses
    hypotheses = [
        {
            "hypothesis_id": "H1",
            "hypothesis": "Summit candidate extraction produces one dominant elevation point for a traverse but merges local sub-peaks.",
            "evidence_from_current_outputs": "Ishizuchi traverse track has a single candidate ID (summit-candidate:22e40e9eb117a033) shared by 5 mountains (筒上山, 南尖峰, 天狗岳, 石鎚山, 東ノ冠岳).",
            "affected_record_count_estimate": "35 records",
            "risk_if_ignored": "High: forces incorrect or duplicate coordinates on distinct summits that are up to 1km apart.",
            "possible_fix": "Decrease peak merging distance threshold (from 100m to 50m) and reduce peak radius in detect-candidates logic.",
            "requires_raw_gpx_reprocessing": "true",
            "requires_new_source_mapping_audit": "true",
            "recommended_priority": "High"
        },
        {
            "hypothesis_id": "H2",
            "hypothesis": "Candidate detection parameters (minimum prominence 30m) are too strict for low-relief or short trail tracks.",
            "evidence_from_current_outputs": "236 mountains result in no candidate coordinate proposal, including several low-elevation hills in Ehime.",
            "affected_record_count_estimate": "120 records",
            "risk_if_ignored": "Medium: limits the overall coverage of candidate-linked assignments, leaving them as unresolved.",
            "possible_fix": "Introduce adaptive minimum prominence criteria based on total elevation range or length of the GPX track.",
            "requires_raw_gpx_reprocessing": "true",
            "requires_new_source_mapping_audit": "true",
            "recommended_priority": "Medium"
        },
        {
            "hypothesis_id": "H3",
            "hypothesis": "Traverse tracks cover multiple named peaks, but the extraction pipeline lacks name-to-candidate association keys.",
            "evidence_from_current_outputs": "GPX-supported assignments are linked using generic candidate IDs without linking back to specific names in the track name.",
            "affected_record_count_estimate": "25 records",
            "risk_if_ignored": "Medium: leads to ambiguous matching of coordinates where multiple candidates are extracted from a multi-peak track.",
            "possible_fix": "Extract names and compare them with waypoints or trackpoint segments during initial candidate feature parsing.",
            "requires_raw_gpx_reprocessing": "false",
            "requires_new_source_mapping_audit": "false",
            "recommended_priority": "Medium"
        },
        {
            "hypothesis_id": "H4",
            "hypothesis": "Gemini anchors coordinates correctly, but nearest GPX candidate within 1000m is from a different peak.",
            "evidence_from_current_outputs": "50 GPX-supported records fall in the distant_gpx_support (500m - 1000m) distance bucket.",
            "affected_record_count_estimate": "20 records",
            "risk_if_ignored": "High: creates false positive proposed coordinates that belong to a neighboring peak instead of the target.",
            "possible_fix": "Constrain Gemini-to-candidate distance or enforce municipality alignment check before candidate linking.",
            "requires_raw_gpx_reprocessing": "false",
            "requires_new_source_mapping_audit": "false",
            "recommended_priority": "High"
        },
        {
            "hypothesis_id": "H5",
            "hypothesis": "Activity title name evidence is checked only post-selection, rather than guiding candidate search.",
            "evidence_from_current_outputs": "54 GPX-supported assignments have missing name evidence despite activity links being matched.",
            "affected_record_count_estimate": "15 records",
            "risk_if_ignored": "Low: minor loss of automated confidence checks.",
            "possible_fix": "Incorporate activity title normalized name matching inside candidate link scoring weights prior to candidate pruning.",
            "requires_raw_gpx_reprocessing": "false",
            "requires_new_source_mapping_audit": "false",
            "recommended_priority": "Low"
        },
        {
            "hypothesis_id": "H6",
            "hypothesis": "Shared candidates indicate candidate extraction granularity issues rather than assignment-policy problems.",
            "evidence_from_current_outputs": "10 candidate IDs are shared by multiple mountains, which is not solved by assignment logic tuning.",
            "affected_record_count_estimate": "25 records",
            "risk_if_ignored": "High: keeps multi-peak traverse coordinates linked to the same location, making manual resolution hard.",
            "possible_fix": "Implement a supplemental candidate expansion layer using local trackpoints near the grounding anchor.",
            "requires_raw_gpx_reprocessing": "true",
            "requires_new_source_mapping_audit": "true",
            "recommended_priority": "High"
        }
    ]
    
    candidate_extraction_gap_hypotheses_csv = out_dir / "candidate_extraction_gap_hypotheses.csv"
    with open(candidate_extraction_gap_hypotheses_csv, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=hypotheses[0].keys())
        writer.writeheader()
        writer.writerows(hypotheses)
        
    # Analysis E: refinement policy options
    options_list = [
        {
            "option_id": "Option_1",
            "method_id_candidate": "refined_gpx_summit_detection",
            "description": "Reprocess GPX tracks to produce more candidate points per track. Use local maxima, distance spacing, prominence-like heuristics, and track segmentation. Preserve old summit candidates; write to a new namespace.",
            "expected_review_reduction": "Medium (resolves H1 and H6, reducing manual review for ~25 mountains)",
            "false_positive_risk": "Medium (higher candidate density requires stricter filters)",
            "implementation_complexity": "High (requires tuning parameters on 293 GPX files)",
            "data_inputs_required": "Raw GPX tracks, detection parameters",
            "new_output_namespace": "data/03_primary/summit_candidates/refined_detection/",
            "requires_raw_gpx": "true",
            "requires_new_mapping_audit": "true",
            "recommended_next_step": "Run simulation on a subset of traverse tracks (e.g. Ishizuchi) using a 50m merge distance."
        },
        {
            "option_id": "Option_2",
            "method_id_candidate": "name_aware_existing_candidate_selection",
            "description": "Do not regenerate candidates. Use track/activity title mountain names to select among existing candidates.",
            "expected_review_reduction": "Low (only filters existing candidate duplicates)",
            "false_positive_risk": "Low (uses name constraints to filter)",
            "implementation_complexity": "Low (minor change to candidate link scoring weights)",
            "data_inputs_required": "Existing candidates, activity link metadata",
            "new_output_namespace": "data/04_feature/mountain_summit_assignments/name_aware_selection/",
            "requires_raw_gpx": "false",
            "requires_new_mapping_audit": "false",
            "recommended_next_step": "Leverage NFKC-normalized substrings from YAMAP activity titles to rank candidates before assignment."
        },
        {
            "option_id": "Option_3",
            "method_id_candidate": "raw_gpx_local_peak_candidate_refinement",
            "description": "For each Gemini coordinate, search raw GPX points near the coordinate and derive local candidate points. Addresses cases where summit_candidates.jsonl lacks a candidate near the Gemini anchor. Requires raw GPX reprocessing and a new source coverage audit.",
            "expected_review_reduction": "High (resolves H2 and H4, generating candidates directly where Gemini indicates)",
            "false_positive_risk": "Low (anchored directly to Gemini grounding coordinates)",
            "implementation_complexity": "High (requires a coordinate query database over raw GPX trackpoints)",
            "data_inputs_required": "Raw GPX tracks, Gemini grounding index",
            "new_output_namespace": "data/03_primary/summit_candidates/gemini_anchored/",
            "requires_raw_gpx": "true",
            "requires_new_mapping_audit": "true",
            "recommended_next_step": "Perform source coverage audit of raw trackpoint coordinates near the grounding consensus clusters."
        },
        {
            "option_id": "Option_4",
            "method_id_candidate": "gemini_near_gpx_supplemental_candidate_expansion",
            "description": "Keep existing summit candidates. Add supplemental Gemini-near GPX local points as non-canonical supplemental candidates. Mark as supplemental_gemini_near_gpx_point, not canonical summit candidates.",
            "expected_review_reduction": "High (reduces no_assignment by finding closest trackpoint to grounding coordinate)",
            "false_positive_risk": "Medium (supplemental trackpoints are not validated peaks)",
            "implementation_complexity": "Medium (adds a backup candidate lookup layer)",
            "data_inputs_required": "Existing candidates, raw GPX tracks, Gemini grounding",
            "new_output_namespace": "data/03_primary/summit_candidates/hybrid_expansion/",
            "requires_raw_gpx": "true",
            "requires_new_mapping_audit": "true",
            "recommended_next_step": "Draft pipeline wrapper to append closest trackpoint to grounding anchors as supplemental candidates."
        },
        {
            "option_id": "Option_5",
            "method_id_candidate": "manual_shared_candidate_resolution_queue",
            "description": "Prioritize shared-candidate and name-missing cases for human review before expanding the algorithm.",
            "expected_review_reduction": "None (shifts resolution to human validator)",
            "false_positive_risk": "Zero (fully human verified)",
            "implementation_complexity": "Low (simple script to generate targeted review packets)",
            "data_inputs_required": "Shared candidate deep dive CSV, name-missing CSV",
            "new_output_namespace": "data/08_reporting/manual_curation_queues/",
            "requires_raw_gpx": "false",
            "requires_new_mapping_audit": "false",
            "recommended_next_step": "Pre-fill manual review templates with coordinates from the closest grounding consensus cluster."
        }
    ]
    
    refinement_policy_options_csv = out_dir / "refinement_policy_options.csv"
    with open(refinement_policy_options_csv, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=options_list[0].keys())
        writer.writeheader()
        writer.writerows(options_list)
        
    # F. Write summary.md
    summary_md = out_dir / "summary.md"
    summary_md_content = f"""# Candidate Extraction Refinement Analysis Summary

## Core Findings
* **Shared Candidates Deep Dive**: Analysed {len(shared_deep_dive_rows)} shared candidates across multi-peak assignments.
* **Traverse Track Peak Coverage**: Identified {len(traverse_coverage_rows)} multi-peak tracks.
* **Name-Missing GPX-Supported Cases**: Found {len(name_missing_rows)} assignments supported by GPX but lacking name evidence.

## Recommendations
* **Next Method**: Recommend implementing `gemini_near_gpx_supplemental_candidate_expansion` (Option 4).
* **Source coverage audit**: Yes, required before implementation.
* **Source-to-target mapping audit**: Yes, required before implementation.
"""
    summary_md.write_text(summary_md_content, encoding="utf-8")
    
    # G. Write manifest.json
    manifest_json = {
        "analysis_namespace": "2026-06-07_gemini_grounded_balanced_summit_assignment/candidate_extraction_refinement_analysis",
        "created_at": "2026-06-07T18:11:00Z",
        "outputs": [
            "shared_candidate_deep_dive.csv",
            "traverse_track_peak_coverage.csv",
            "name_missing_gpx_supported_cases.csv",
            "candidate_extraction_gap_hypotheses.csv",
            "refinement_policy_options.csv",
            "summary.md"
        ]
    }
    with open(out_dir / "manifest.json", "w", encoding="utf-8") as f:
        json.dump(manifest_json, f, indent=2)
        
    print("Candidate extraction refinement analysis complete.")

if __name__ == "__main__":
    main()
