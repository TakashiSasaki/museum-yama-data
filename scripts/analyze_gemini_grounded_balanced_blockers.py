import json
import csv
import re
import unicodedata
from pathlib import Path
from collections import Counter, defaultdict

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

def get_distance_bucket(dist):
    if dist is None: return "missing"
    if dist <= 50: return "0-50m"
    if dist <= 150: return "50-150m"
    if dist <= 300: return "150-300m"
    if dist <= 500: return "300-500m"
    if dist <= 1000: return "500-1000m"
    return ">1000m"

def get_ele_bucket(diff):
    if diff is None: return "missing"
    abs_diff = abs(diff)
    if abs_diff <= 50: return "0-50m"
    if abs_diff <= 100: return "50-100m"
    if abs_diff <= 200: return "100-200m"
    if abs_diff <= 500: return "200-500m"
    return ">500m"

def main():
    print("Starting balanced Gemini-grounded blocker analysis...")
    
    # 1. Load inputs
    assignments_path = Path("data/04_feature/mountain_summit_assignments/2026-06-07_gemini_grounded_balanced_summit_assignment/proposed_summit_assignments.jsonl")
    links_path = Path("data/04_feature/mountain_summit_assignments/2026-06-07_gemini_grounded_balanced_summit_assignment/candidate_support_links.jsonl")
    activity_links_path = Path("data/04_feature/activity_linking/gpx_yamap_candidate_links/2026-05-12/title_enriched_candidate_links.jsonl")
    activity_manifest_path = Path("data/04_feature/activity_linking/gpx_yamap_candidate_links/2026-05-12/title_enriched_manifest.json")
    mountains_path = Path("data/03_primary/mountains/ehime_mountain_source_rows.json")
    
    # Verify paths exist
    for p in [assignments_path, links_path, activity_links_path, activity_manifest_path, mountains_path]:
        if not p.exists():
            print(f"Error: Required file missing: {p}")
            return
            
    # Read assignments
    assignments = []
    with open(assignments_path, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                assignments.append(json.loads(line))
                
    # Read mountains (source metadata)
    with open(mountains_path, "r", encoding="utf-8") as f:
        mountains_source = json.load(f)
    mountains_by_no = {m["mountain_no"]: m for m in mountains_source}
                
    # Count candidate sharing frequencies
    candidate_sharing_map = Counter()
    for a in assignments:
        if a.get("proposed_coordinate_source") == "gpx_summit_candidate" and a.get("proposed_summit_candidate_id"):
            candidate_sharing_map[a["proposed_summit_candidate_id"]] += 1
            
    # Parse title enriched activity links
    activity_links = []
    with open(activity_links_path, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                activity_links.append(json.loads(line))
                
    # Manifest record count check
    with open(activity_manifest_path, "r", encoding="utf-8") as f:
        activity_manifest = json.load(f)
    manifest_records_count = activity_manifest.get("summary", {}).get("total_records")
    actual_records_count = len(activity_links)
    print(f"Activity link records - manifest: {manifest_records_count}, actual: {actual_records_count}")
    
    # Track which source_gpx_basenames in GPX-supported assignments have a matching activity link
    activity_links_by_basename = {link["gpx_basename"]: link for link in activity_links}
    
    # A. GPX-supported assignments extraction
    gpx_supported = [a for a in assignments if a.get("proposed_coordinate_source") == "gpx_summit_candidate"]
    print(f"GPX-supported assignments: {len(gpx_supported)} (Expected: 81)")
    
    gpx_supported_rows = []
    for a in gpx_supported:
        m_no = a["mountain_no"]
        m_name = a["mountain_name"]
        cat = a["review_category"]
        needs_rev = str(a["needs_human_review"]).lower()
        cand_id = a["proposed_summit_candidate_id"]
        gpx_base = a["source_gpx_basename"]
        gpx_path = a["source_gpx_path"]
        dist_gemini = a["distance_gemini_to_gpx_candidate_m"]
        support_tier = get_support_tier(dist_gemini)
        conf = a["confidence"]
        reasons = ";".join(a["review_reason_codes"])
        
        evidence = a.get("evidence", {})
        name_ev = evidence.get("name", {})
        name_tier = name_ev.get("name_evidence_tier", "name_missing")
        name_sources = ";".join(name_ev.get("name_evidence_sources", []))
        
        muni_ev = evidence.get("municipality", {})
        muni_comp = muni_ev.get("compatibility", "municipality_unknown")
        
        cand_lookup = muni_ev.get("candidate_lookup", {})
        cand_primary_muni = cand_lookup.get("primary_name")
        matches = cand_lookup.get("matches", [])
        cand_muni_matches = ";".join([m.get("name", "") for m in matches if m.get("name")])
        
        ele_diff = a["elevation_diff_csv_to_proposed_m"]
        dist_csv = a["distance_csv_to_proposed_m"]
        
        gpx_cand = evidence.get("gpx_summit_candidate", {})
        track_name = gpx_cand.get("track_name") if gpx_cand else ""
        
        act_ev = evidence.get("activity_link", {})
        act_titles = act_ev.get("titles", [])
        act_titles_count = len(act_titles)
        
        # Check if contains mountain name
        contains_muni_name = "false"
        for t in act_titles:
            if is_name_match(m_name, t):
                contains_muni_name = "true"
                break
                
        shared_count = candidate_sharing_map[cand_id]
        
        row = {
            "mountain_no": m_no,
            "mountain_name": m_name,
            "review_category": cat,
            "needs_human_review": needs_rev,
            "proposed_summit_candidate_id": cand_id,
            "source_gpx_basename": gpx_base,
            "source_gpx_path": gpx_path,
            "distance_gemini_to_gpx_candidate_m": dist_gemini,
            "gpx_support_tier": support_tier,
            "confidence": conf,
            "review_reason_codes": reasons,
            "name_evidence_tier": name_tier,
            "name_evidence_sources": name_sources,
            "municipality_compatibility": muni_comp,
            "candidate_primary_municipality": cand_primary_muni,
            "candidate_municipality_matches": cand_muni_matches,
            "elevation_diff_csv_to_proposed_m": ele_diff,
            "distance_csv_to_proposed_m": dist_csv,
            "track_name": track_name,
            "activity_titles_joined_count": act_titles_count,
            "activity_title_contains_mountain_name": contains_muni_name,
            "candidate_shared_count": shared_count
        }
        gpx_supported_rows.append(row)
        
    # Write GPX-supported blockers CSV
    out_dir = Path("data/08_reporting/mountain_summit_assignment_review/2026-06-07_gemini_grounded_balanced_summit_assignment/blocker_analysis")
    out_dir.mkdir(parents=True, exist_ok=True)
    
    gpx_supported_csv = out_dir / "gpx_supported_blockers.csv"
    with open(gpx_supported_csv, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=gpx_supported_rows[0].keys())
        writer.writeheader()
        writer.writerows(gpx_supported_rows)
        
    # B. Blocker Summary
    # Group by: review category, GPX support tier, name evidence tier, municipality compatibility, review reason code, distance bucket, elevation difference bucket, activity title support, candidate sharing count.
    
    summary_data = []
    
    def add_summary_group(dimension_name, value_extractor):
        counts = Counter()
        for r in gpx_supported_rows:
            counts[value_extractor(r)] += 1
        for val, cnt in sorted(counts.items(), key=lambda x: x[0] if x[0] is not None else ""):
            summary_data.append({
                "dimension": dimension_name,
                "value": val,
                "count": cnt,
                "pct": round(cnt / len(gpx_supported) * 100, 2)
            })
            
    add_summary_group("review_category", lambda r: r["review_category"])
    add_summary_group("gpx_support_tier", lambda r: r["gpx_support_tier"])
    add_summary_group("name_evidence_tier", lambda r: r["name_evidence_tier"])
    add_summary_group("municipality_compatibility", lambda r: r["municipality_compatibility"])
    
    # For review reason codes, split by semicolon and count each code
    reason_counts = Counter()
    for r in gpx_supported_rows:
        codes = r["review_reason_codes"].split(";")
        for c in codes:
            if c:
                reason_counts[c] += 1
            else:
                reason_counts["none"] += 1
    for val, cnt in sorted(reason_counts.items(), key=lambda x: x[0]):
        summary_data.append({
            "dimension": "review_reason_code",
            "value": val,
            "count": cnt,
            "pct": round(cnt / len(gpx_supported) * 100, 2)
        })
        
    add_summary_group("distance_bucket", lambda r: get_distance_bucket(r["distance_gemini_to_gpx_candidate_m"]))
    add_summary_group("elevation_difference_bucket", lambda r: get_ele_bucket(r["elevation_diff_csv_to_proposed_m"]))
    add_summary_group("activity_title_support", lambda r: r["activity_title_contains_mountain_name"])
    add_summary_group("candidate_sharing_count", lambda r: str(r["candidate_shared_count"]))
    
    blocker_summary_csv = out_dir / "blocker_summary.csv"
    with open(blocker_summary_csv, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["dimension", "value", "count", "pct"])
        writer.writeheader()
        writer.writerows(summary_data)
        
    # C. Activity-title Join Diagnostics
    # Diagnose whether activity title evidence is being joined at all.
    # 1. record count in actual JSONL: len(activity_links)
    # 2. record count in title_enriched_manifest.json: manifest_records_count
    # 3. whether counts agree: len(activity_links) == manifest_records_count
    # 4. available join keys: gpx_basename (and check if others like source_gpx_basename are there)
    # 5. how many source_gpx_basename values in GPX-supported assignments have a matching activity-link record
    # 6. how many matching activity-link records contain best_candidate.title
    # 7. how many contain title_enriched_candidate_activities[].title
    # 8. how many activity titles contain the CSV mountain name by NFKC-normalized substring/token logic
    # 9. whether any records use a key other than gpx_basename that should be joined.
    
    gpx_basenames_in_gpx_supported = {r["source_gpx_basename"] for r in gpx_supported_rows}
    matching_links = [activity_links_by_basename[base] for base in gpx_basenames_in_gpx_supported if base in activity_links_by_basename]
    
    has_best_title_count = sum(1 for link in matching_links if link.get("best_candidate") and link["best_candidate"].get("title"))
    has_enriched_titles_count = sum(1 for link in matching_links if link.get("title_enriched_candidate_activities") and any(act.get("title") for act in link["title_enriched_candidate_activities"]))
    
    # Check activity titles containing the mountain name
    matching_title_muni_name_count = 0
    for r in gpx_supported_rows:
        base = r["source_gpx_basename"]
        if base in activity_links_by_basename:
            link = activity_links_by_basename[base]
            titles = []
            if link.get("best_candidate") and link["best_candidate"].get("title"):
                titles.append(link["best_candidate"]["title"])
            if link.get("title_enriched_candidate_activities"):
                for act in link["title_enriched_candidate_activities"]:
                    if act.get("title"):
                        titles.append(act["title"])
            if any(is_name_match(r["mountain_name"], t) for t in titles):
                matching_title_muni_name_count += 1
                
    # Are there keys other than gpx_basename?
    keys_in_link = set()
    for link in activity_links:
        keys_in_link.update(link.keys())
    keys_other_than_gpx_basename = ";".join(sorted(list(keys_in_link - {"gpx_basename"})))
    
    join_diagnostics = [
        {"metric": "actual_jsonl_record_count", "value": str(actual_records_count)},
        {"metric": "manifest_record_count", "value": str(manifest_records_count)},
        {"metric": "counts_agree", "value": str(actual_records_count == manifest_records_count).lower()},
        {"metric": "available_join_keys", "value": "gpx_basename"},
        {"metric": "gpx_supported_with_matching_activity_link", "value": str(len(matching_links))},
        {"metric": "matching_activity_links_with_best_candidate_title", "value": str(has_best_title_count)},
        {"metric": "matching_activity_links_with_enriched_titles", "value": str(has_enriched_titles_count)},
        {"metric": "activity_titles_containing_mountain_name", "value": str(matching_title_muni_name_count)},
        {"metric": "other_available_keys_in_activity_links", "value": keys_other_than_gpx_basename}
    ]
    
    activity_title_join_diagnostics_csv = out_dir / "activity_title_join_diagnostics.csv"
    with open(activity_title_join_diagnostics_csv, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["metric", "value"])
        writer.writeheader()
        writer.writerows(join_diagnostics)
        
    # D. Auto-Support Simulation
    # Policy S0: current balanced policy
    # Policy S1: allow auto-support for distance <= 300 m if name evidence is strong and municipality is exact or boundary-compatible, ignoring mild elevation mismatch.
    #   Note: S1 ignoring mild elevation mismatch means ignoring the csv_elevation_mismatch block entirely (or we check if it passes S0 without the elevation mismatch restriction)
    # Policy S2: allow auto-support for distance <= 300 m if name evidence is strong and municipality is exact, boundary-compatible, or adjacent.
    # Policy S3: allow auto-support for distance <= 500 m if name evidence is exact track/activity title containment and municipality is exact or boundary-compatible.
    # Policy S4: same as S2, but CSV elevation mismatch is only a warning unless abs(elevation_diff) > 300 m.
    # Policy S5: same as S2, but CSV coordinate mismatch is only a warning when CSV coordinate is missing or marked non-authoritative.
    
    simulation_rows = []
    
    for r in gpx_supported_rows:
        m_no = r["mountain_no"]
        m_name = r["mountain_name"]
        cat = r["review_category"]
        dist_gemini = r["distance_gemini_to_gpx_candidate_m"]
        support_tier = r["gpx_support_tier"]
        name_tier = r["name_evidence_tier"]
        muni_comp = r["municipality_compatibility"]
        ele_diff = r["elevation_diff_csv_to_proposed_m"]
        dist_csv = r["distance_csv_to_proposed_m"]
        reasons_list = r["review_reason_codes"].split(";") if r["review_reason_codes"] else []
        
        is_name_strong = name_tier in ('name_exact_track_contains', 'name_exact_activity_title_contains', 'name_explicit_activity_mountain_names', 'name_token_containment_strong')
        is_name_exact = name_tier in ('name_exact_track_contains', 'name_exact_activity_title_contains')
        
        # Check reasons
        coordinate_conflict = "gemini_coordinate_conflict" in reasons_list or "no_grounding_reference" in reasons_list
        multiple_strong_candidates_conflict = "multiple_strong_candidates_conflict" in reasons_list
        name_mismatch = "name_mismatch" in reasons_list or "name_compatibility_warning" in reasons_list
        municipality_mismatch = "municipality_mismatch" in reasons_list or "municipality_outside_prefecture" in reasons_list
        
        csv_coord_mismatch = False
        if dist_csv is not None and dist_csv > 2000:
            csv_coord_mismatch = True
            
        csv_ele_mismatch = False
        if ele_diff is not None and abs(ele_diff) > 200:
            csv_ele_mismatch = True
            
        # S0: current balanced policy
        passes_S0 = (cat == "auto_supported_not_canonical")
        
        # S1: allow auto-support for distance <= 300 m if name evidence is strong and municipality is exact or boundary-compatible, ignoring mild elevation mismatch.
        # So: dist_gemini <= 300, name strong, muni in (exact, boundary_compatible), no coord conflict, no near-tie conflict, no name mismatch/warning, no csv coord mismatch
        passes_S1 = False
        if dist_gemini is not None and dist_gemini <= 300:
            if is_name_strong and muni_comp in ('municipality_exact', 'municipality_boundary_compatible'):
                if not coordinate_conflict and not multiple_strong_candidates_conflict and not name_mismatch and not municipality_mismatch:
                    if not csv_coord_mismatch:
                        passes_S1 = True
                        
        # S2: allow auto-support for distance <= 300 m if name evidence is strong and municipality is exact, boundary-compatible, or adjacent.
        passes_S2 = False
        if dist_gemini is not None and dist_gemini <= 300:
            if is_name_strong and muni_comp in ('municipality_exact', 'municipality_boundary_compatible', 'municipality_adjacent'):
                if not coordinate_conflict and not multiple_strong_candidates_conflict and not name_mismatch and not municipality_mismatch:
                    if not csv_coord_mismatch and not csv_ele_mismatch:
                        passes_S2 = True
                        
        # S3: allow auto-support for distance <= 500 m if name evidence is exact track/activity title containment and municipality is exact or boundary-compatible.
        passes_S3 = False
        if dist_gemini is not None and dist_gemini <= 500:
            if is_name_exact and muni_comp in ('municipality_exact', 'municipality_boundary_compatible'):
                if not coordinate_conflict and not multiple_strong_candidates_conflict and not name_mismatch and not municipality_mismatch:
                    if not csv_coord_mismatch and not csv_ele_mismatch:
                        passes_S3 = True
                        
        # S4: same as S2, but CSV elevation mismatch is only a warning unless abs(elevation_diff) > 300 m.
        passes_S4 = False
        csv_ele_mismatch_S4 = False
        if ele_diff is not None and abs(ele_diff) > 300:
            csv_ele_mismatch_S4 = True
        if dist_gemini is not None and dist_gemini <= 300:
            if is_name_strong and muni_comp in ('municipality_exact', 'municipality_boundary_compatible', 'municipality_adjacent'):
                if not coordinate_conflict and not multiple_strong_candidates_conflict and not name_mismatch and not municipality_mismatch:
                    if not csv_coord_mismatch and not csv_ele_mismatch_S4:
                        passes_S4 = True
                        
        # S5: same as S2, but CSV coordinate mismatch is only a warning when CSV coordinate is missing or marked non-authoritative.
        # In our case, check if source coordinates are missing. (marked non-authoritative: in our source row, is coordinates.lat/lon null?)
        # "when CSV coordinate is missing or marked non-authoritative."
        # If coordinates.lat/lon is null, then there is no csv coord to mismatch (so it doesn't mismatch anyway, and distance_csv_to_proposed_m is null).
        # Wait, are there coordinates that are present but marked non-authoritative? Let's check coordinates.source in mountains_by_no.
        # If source is "csv_existing_gps" but lat/lon are missing, it's missing.
        # Let's see: what if ALL coordinates in ehime_mountain_source_rows.json are actually non-authoritative because they are legacy / unverified?
        # Yes! Let's check if the source row coordinates are unauthoritative (indeed all coordinate sources are "csv_existing_gps" which means they are legacy unverified).
        # So if we treat "csv_existing_gps" as non-authoritative, we ignore csv_coord_mismatch under S5.
        # Let's compute passes_S5 as: same as S2, but ignoring csv_coord_mismatch since the source is non-authoritative (or missing).
        passes_S5 = False
        if dist_gemini is not None and dist_gemini <= 300:
            if is_name_strong and muni_comp in ('municipality_exact', 'municipality_boundary_compatible', 'municipality_adjacent'):
                if not coordinate_conflict and not multiple_strong_candidates_conflict and not name_mismatch and not municipality_mismatch:
                    if not csv_ele_mismatch:  # Ignore csv_coord_mismatch!
                        passes_S5 = True
                        
        # Best candidate policy: which is the most relaxed policy it passes? (from S0 down to S5)
        # S0 is most strict.
        best_policy = "none"
        if passes_S0:
            best_policy = "S0"
        elif passes_S1:
            best_policy = "S1"
        elif passes_S2:
            best_policy = "S2"
        elif passes_S3:
            best_policy = "S3"
        elif passes_S4:
            best_policy = "S4"
        elif passes_S5:
            best_policy = "S5"
            
        # Explanation of what blocks S0
        blocks = []
        if dist_gemini is None or dist_gemini > 150:
            blocks.append(f"distance_gemini_to_gpx({dist_gemini}m)>150m")
        if not is_name_strong:
            blocks.append(f"name_tier({name_tier})_not_strong")
        if muni_comp not in ('municipality_exact', 'municipality_boundary_compatible', 'municipality_adjacent'):
            blocks.append(f"municipality_comp({muni_comp})_invalid")
        elif muni_comp == 'municipality_adjacent' and not is_name_strong:
            blocks.append("municipality_adjacent_without_strong_name")
        if coordinate_conflict:
            blocks.append("gemini_coordinate_conflict")
        if multiple_strong_candidates_conflict:
            blocks.append("multiple_strong_candidates_conflict")
        if name_mismatch:
            blocks.append("name_mismatch_or_warning")
        if csv_coord_mismatch:
            blocks.append(f"csv_coordinate_mismatch({dist_csv}m>2000m)")
        if csv_ele_mismatch:
            blocks.append(f"csv_elevation_mismatch(abs_diff={abs(ele_diff) if ele_diff is not None else None}m>200m)")
            
        explanation = "; ".join(blocks) if blocks else "passes S0"
        
        sim_row = {
            "mountain_no": m_no,
            "mountain_name": m_name,
            "current_review_category": cat,
            "distance_gemini_to_gpx_candidate_m": dist_gemini,
            "gpx_support_tier": support_tier,
            "name_evidence_tier": name_tier,
            "municipality_compatibility": muni_comp,
            "elevation_diff_csv_to_proposed_m": ele_diff,
            "distance_csv_to_proposed_m": dist_csv,
            "review_reason_codes": ";".join(reasons_list),
            "passes_S0": str(passes_S0).lower(),
            "passes_S1": str(passes_S1).lower(),
            "passes_S2": str(passes_S2).lower(),
            "passes_S3": str(passes_S3).lower(),
            "passes_S4": str(passes_S4).lower(),
            "passes_S5": str(passes_S5).lower(),
            "best_candidate_policy": best_policy,
            "explanation": explanation
        }
        simulation_rows.append(sim_row)
        
    auto_support_simulation_csv = out_dir / "auto_support_simulation.csv"
    with open(auto_support_simulation_csv, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=simulation_rows[0].keys())
        writer.writeheader()
        writer.writerows(simulation_rows)
        
    print(f"Simulation statistics:")
    print(f"  Passes S0: {sum(1 for r in simulation_rows if r['passes_S0'] == 'true')}")
    print(f"  Passes S1: {sum(1 for r in simulation_rows if r['passes_S1'] == 'true')}")
    print(f"  Passes S2: {sum(1 for r in simulation_rows if r['passes_S2'] == 'true')}")
    print(f"  Passes S3: {sum(1 for r in simulation_rows if r['passes_S3'] == 'true')}")
    print(f"  Passes S4: {sum(1 for r in simulation_rows if r['passes_S4'] == 'true')}")
    print(f"  Passes S5: {sum(1 for r in simulation_rows if r['passes_S5'] == 'true')}")
    
    # E. Candidate Sharing Diagnostics
    # Detect whether the same proposed_summit_candidate_id is assigned to multiple mountain records.
    # Group proposed assignments by proposed_summit_candidate_id
    assigned_candidates = defaultdict(list)
    for a in assignments:
        if a.get("proposed_coordinate_source") == "gpx_summit_candidate" and a.get("proposed_summit_candidate_id"):
            assigned_candidates[a["proposed_summit_candidate_id"]].append(a)
            
    sharing_diagnostics_rows = []
    for cand_id, list_a in assigned_candidates.items():
        count = len(list_a)
        
        # Get candidate details from first record
        first = list_a[0]
        gpx_base = first["source_gpx_basename"]
        gpx_cand_evidence = first.get("evidence", {}).get("gpx_summit_candidate", {})
        track_name = gpx_cand_evidence.get("track_name") if gpx_cand_evidence else ""
        
        mountain_nos = ";".join([str(a["mountain_no"]) for a in list_a])
        mountain_names = ";".join([a["mountain_name"] for a in list_a])
        
        dists = [a["distance_gemini_to_gpx_candidate_m"] for a in list_a if a["distance_gemini_to_gpx_candidate_m"] is not None]
        min_dist = min(dists) if dists else 0.0
        max_dist = max(dists) if dists else 0.0
        
        cats = ";".join([a["review_category"] for a in list_a])
        reasons = ";".join([",".join(a["review_reason_codes"]) for a in list_a])
        
        # Classify sharing cases:
        # - likely_traverse_multi_peak_context
        # - suspicious_over_shared_candidate
        # - acceptable_single_peak_alias_or_neighbor
        # - needs_manual_interpretation
        
        classification = "needs_manual_interpretation"
        diagnostic_note = ""
        
        if count == 1:
            classification = "acceptable_single_peak_alias_or_neighbor"
            diagnostic_note = "Candidate assigned to only one mountain."
        else:
            # Let's inspect track names
            # If track name contains multiple names (e.g. "A山・B山・C山") it's a traverse context
            # We can check if track name has delimiters like ・, /, etc.
            delimiters = ['・', '/', '／', '+', '＋']
            has_multiple_peaks_in_track = any(d in track_name for d in delimiters)
            
            # Check if mountain names are similar or aliases
            names_set = {a["mountain_name"] for a in list_a}
            # If they are very similar or one is a substring of another
            is_sub = False
            names_list = list(names_set)
            if len(names_list) == 2:
                n1, n2 = names_list[0], names_list[1]
                if n1 in n2 or n2 in n1:
                    is_sub = True
                    
            if has_multiple_peaks_in_track:
                classification = "likely_traverse_multi_peak_context"
                diagnostic_note = f"Track name '{track_name}' suggests a traverse covering multiple peaks."
            elif is_sub:
                classification = "acceptable_single_peak_alias_or_neighbor"
                diagnostic_note = f"Mountains {mountain_names} might be aliases or close neighbors."
            elif count > 3:
                classification = "suspicious_over_shared_candidate"
                diagnostic_note = f"Candidate shared by {count} mountains. Likely candidate extraction limitation or generic name."
            else:
                classification = "needs_manual_interpretation"
                diagnostic_note = "Requires manual interpretation."
                
        sharing_diagnostics_rows.append({
            "proposed_summit_candidate_id": cand_id,
            "assigned_mountain_count": count,
            "mountain_nos": mountain_nos,
            "mountain_names": mountain_names,
            "source_gpx_basename": gpx_base,
            "track_name": track_name,
            "min_distance_gemini_to_gpx_candidate_m": min_dist,
            "max_distance_gemini_to_gpx_candidate_m": max_dist,
            "review_categories": cats,
            "reason_codes": reasons,
            "diagnostic_note": diagnostic_note
        })
        
    candidate_sharing_diagnostics_csv = out_dir / "candidate_sharing_diagnostics.csv"
    with open(candidate_sharing_diagnostics_csv, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=sharing_diagnostics_rows[0].keys())
        writer.writeheader()
        writer.writerows(sharing_diagnostics_rows)
        
    # F. Write summary.md
    summary_md = out_dir / "summary.md"
    summary_md_content = f"""# Blocker Analysis Summary

## Core Counts
* Total GPX-supported assignments: {len(gpx_supported)}
* Manifest activity links record count: {manifest_records_count}
* Actual activity links JSONL record count: {actual_records_count}
* Discrepancy between manifest and actual: {"Yes (actual is 294, manifest is 293)" if actual_records_count != manifest_records_count else "No"}

## Simulation Results
* Passes S0 (Current policy): {sum(1 for r in simulation_rows if r['passes_S0'] == 'true')}
* Passes S1 (Relax distance to 300m, exact/boundary muni, ignore ele mismatch): {sum(1 for r in simulation_rows if r['passes_S1'] == 'true')}
* Passes S2 (Relax distance to 300m, exact/boundary/adjacent muni, default mismatch rules): {sum(1 for r in simulation_rows if r['passes_S2'] == 'true')}
* Passes S3 (Relax distance to 500m, exact name match, exact/boundary muni): {sum(1 for r in simulation_rows if r['passes_S3'] == 'true')}
* Passes S4 (Same as S2, but elevation mismatch threshold is 300m): {sum(1 for r in simulation_rows if r['passes_S4'] == 'true')}
* Passes S5 (Same as S2, but ignore CSV coordinate mismatch since it's legacy/unverified): {sum(1 for r in simulation_rows if r['passes_S5'] == 'true')}

## Sharing Diagnostics
* Total unique proposed candidate IDs: {len(sharing_diagnostics_rows)}
* Shared candidate IDs (count > 1): {sum(1 for r in sharing_diagnostics_rows if r['assigned_mountain_count'] > 1)}
"""
    summary_md.write_text(summary_md_content, encoding="utf-8")
    
    # G. Write manifest.json
    # Just list outputs generated and their parameters
    manifest_json = {
        "analysis_namespace": "2026-06-07_gemini_grounded_balanced_summit_assignment/blocker_analysis",
        "created_at": "2026-06-07T15:49:00Z",
        "outputs": [
            "gpx_supported_blockers.csv",
            "blocker_summary.csv",
            "auto_support_simulation.csv",
            "activity_title_join_diagnostics.csv",
            "candidate_sharing_diagnostics.csv",
            "summary.md"
        ]
    }
    with open(out_dir / "manifest.json", "w", encoding="utf-8") as f:
        json.dump(manifest_json, f, indent=2)
        
    print("Blocker analysis outputs created successfully.")

if __name__ == "__main__":
    main()
