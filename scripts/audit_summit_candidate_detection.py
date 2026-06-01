import os
import glob
import csv
import math
import xml.etree.ElementTree as ET
from datetime import datetime

# --- Utility Functions ---

def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371000
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * \
        math.sin(delta_lambda / 2.0) ** 2

    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def smooth(data, window):
    if not data:
        return []
    half = window // 2
    smoothed = []
    n = len(data)
    for i in range(n):
        start = max(0, i - half)
        end = min(n - 1, i + half)
        window_data = data[start:end + 1]
        smoothed.append(sum(window_data) / len(window_data))
    return smoothed

def calculate_prominence(elevations, peak_idx):
    peak_elev = elevations[peak_idx]
    left_min = peak_elev
    right_min = peak_elev

    for i in range(peak_idx - 1, -1, -1):
        if elevations[i] > peak_elev:
            break
        left_min = min(left_min, elevations[i])

    for i in range(peak_idx + 1, len(elevations)):
        if elevations[i] > peak_elev:
            break
        right_min = min(right_min, elevations[i])

    key_col = max(left_min, right_min)
    return peak_elev - key_col

def merge_nearby_peaks(peaks, merge_distance):
    if len(peaks) <= 1:
        return peaks

    # Sort by elevation descending
    sorted_peaks = sorted(peaks, key=lambda p: p['ele'], reverse=True)
    merged = []
    used = set()

    for peak in sorted_peaks:
        if peak['index'] in used:
            continue

        for other in sorted_peaks:
            if other['index'] == peak['index']:
                continue
            if other['index'] in used:
                continue
            dist = haversine_distance(peak['lat'], peak['lon'], other['lat'], other['lon'])
            if dist < merge_distance:
                used.add(other['index'])

        merged.append(peak)

    # Return sorted by original index
    return sorted(merged, key=lambda p: p['index'])

# --- Detection Logic ---

def detect_peaks(points, smooth_window, peak_radius, min_prominence, merge_distance):
    valid_points = [p for p in points if p['ele'] is not None]
    if len(valid_points) < 3:
        return []

    elevations = [p['ele'] for p in valid_points]
    smoothed = smooth(elevations, smooth_window)
    candidates = []
    radius = min(peak_radius, len(valid_points) // 3)

    for i in range(radius, len(valid_points) - radius):
        is_max = True
        for j in range(1, radius + 1):
            if smoothed[i] <= smoothed[i - j] or smoothed[i] <= smoothed[i + j]:
                is_max = False
                break
        if is_max:
            candidate = dict(valid_points[i])
            candidate['index'] = i
            candidate['smoothedEle'] = smoothed[i]
            candidates.append(candidate)

    if smoothed:
        max_idx = 0
        for i in range(1, len(smoothed)):
            if smoothed[i] > smoothed[max_idx]:
                max_idx = i

        max_already_included = any(abs(c['index'] - max_idx) < radius for c in candidates)
        if not max_already_included:
            candidate = dict(valid_points[max_idx])
            candidate['index'] = max_idx
            candidate['smoothedEle'] = smoothed[max_idx]
            candidates.append(candidate)

    peaks = []
    for candidate in candidates:
        prominence = calculate_prominence(smoothed, candidate['index'])
        if prominence >= min_prominence:
            candidate['prominence'] = prominence
            peaks.append(candidate)

    return merge_nearby_peaks(peaks, merge_distance)

# --- GPX Parsing ---

def strip_namespace(tag):
    if tag.startswith('{'):
        return tag.split('}', 1)[1]
    return tag

def parse_gpx(filepath):
    try:
        tree = ET.parse(filepath)
        root = tree.getroot()

        points = []
        track_name = ""

        for elem in root.iter():
            tag = strip_namespace(elem.tag)
            if tag == 'name' and not track_name:
                # Get the first name (usually track name)
                track_name = elem.text.strip() if elem.text else ""

            if tag == 'trkpt':
                lat = float(elem.attrib.get('lat', 0))
                lon = float(elem.attrib.get('lon', 0))
                ele = None
                time_str = ""

                for child in elem:
                    child_tag = strip_namespace(child.tag)
                    if child_tag == 'ele':
                        try:
                            ele = float(child.text)
                        except (ValueError, TypeError):
                            pass
                    elif child_tag == 'time':
                        time_str = child.text.strip() if child.text else ""

                points.append({
                    'lat': lat,
                    'lon': lon,
                    'ele': ele,
                    'time': time_str
                })

        return points, track_name, None
    except Exception as e:
        return [], "", str(e)

# --- Main Audit Logic ---

def run_audit():
    gpx_dir = "gpx/raw"
    gpx_files = glob.glob(os.path.join(gpx_dir, "*.gpx"))

    if not gpx_files:
        print("No GPX files found in gpx/raw/")
        return

    # Baseline configuration
    baseline_config = {
        'smooth_window': 5,
        'peak_radius': 10,
        'min_prominence': 30,
        'merge_distance': 100
    }

    baseline_results = []

    # Run baseline
    print("Running baseline audit...")
    for filepath in gpx_files:
        points, track_name, err = parse_gpx(filepath)

        if err:
            baseline_results.append({
                'gpx_path': filepath,
                'trackpoint_count': 0,
                'valid_elevation_point_count': 0,
                'first_time_utc': "",
                'last_time_utc': "",
                'track_name': "",
                'candidate_count_default': 0,
                'max_elevation': "",
                'min_elevation': "",
                'elevation_range': "",
                'has_missing_elevation': False,
                'notes': f"Parse error: {err}"
            })
            continue

        valid_points = [p for p in points if p['ele'] is not None]
        has_missing = len(valid_points) < len(points)

        if not valid_points:
            baseline_results.append({
                'gpx_path': filepath,
                'trackpoint_count': len(points),
                'valid_elevation_point_count': 0,
                'first_time_utc': points[0]['time'] if points else "",
                'last_time_utc': points[-1]['time'] if points else "",
                'track_name': track_name,
                'candidate_count_default': 0,
                'max_elevation': "",
                'min_elevation': "",
                'elevation_range': "",
                'has_missing_elevation': has_missing,
                'notes': "No valid elevation points"
            })
            continue

        elevations = [p['ele'] for p in valid_points]
        max_ele = max(elevations)
        min_ele = min(elevations)
        ele_range = max_ele - min_ele

        candidates = detect_peaks(
            points,
            baseline_config['smooth_window'],
            baseline_config['peak_radius'],
            baseline_config['min_prominence'],
            baseline_config['merge_distance']
        )

        baseline_results.append({
            'gpx_path': filepath,
            'trackpoint_count': len(points),
            'valid_elevation_point_count': len(valid_points),
            'first_time_utc': points[0]['time'] if points else "",
            'last_time_utc': points[-1]['time'] if points else "",
            'track_name': track_name,
            'candidate_count_default': len(candidates),
            'max_elevation': round(max_ele, 2),
            'min_elevation': round(min_ele, 2),
            'elevation_range': round(ele_range, 2),
            'has_missing_elevation': has_missing,
            'notes': ""
        })

    # Write baseline summary
    baseline_csv_path = "docs/migration/summit_candidate_detection_baseline_summary.csv"
    with open(baseline_csv_path, 'w', newline='', encoding='utf-8') as f:
        fieldnames = ['gpx_path', 'trackpoint_count', 'valid_elevation_point_count',
                      'first_time_utc', 'last_time_utc', 'track_name',
                      'candidate_count_default', 'max_elevation', 'min_elevation',
                      'elevation_range', 'has_missing_elevation', 'notes']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(baseline_results)

    print(f"Wrote baseline summary to {baseline_csv_path}")

    # Parameter sensitivity variants
    variants = [
        {'id': 'baseline', 'smooth': 5, 'radius': 10, 'min_prominence': 30, 'merge_distance': 100},
        {'id': 'lower_prominence', 'smooth': 5, 'radius': 10, 'min_prominence': 20, 'merge_distance': 100},
        {'id': 'higher_prominence', 'smooth': 5, 'radius': 10, 'min_prominence': 50, 'merge_distance': 100},
        {'id': 'smaller_merge_distance', 'smooth': 5, 'radius': 10, 'min_prominence': 30, 'merge_distance': 50},
        {'id': 'larger_merge_distance', 'smooth': 5, 'radius': 10, 'min_prominence': 30, 'merge_distance': 200}
    ]

    sensitivity_results = []

    print("Running parameter sensitivity audit...")
    for variant in variants:
        variant_counts = []
        files_scanned = 0
        total_candidates = 0
        zero_count = 0
        one_count = 0
        multiple_count = 0

        for filepath in gpx_files:
            points, _, err = parse_gpx(filepath)
            if err:
                continue

            files_scanned += 1
            candidates = detect_peaks(
                points,
                variant['smooth'],
                variant['radius'],
                variant['min_prominence'],
                variant['merge_distance']
            )
            count = len(candidates)
            variant_counts.append(count)
            total_candidates += count

            if count == 0:
                zero_count += 1
            elif count == 1:
                one_count += 1
            else:
                multiple_count += 1

        # Calculate median manually
        variant_counts.sort()
        n = len(variant_counts)
        if n == 0:
            median = 0
        elif n % 2 == 1:
            median = variant_counts[n // 2]
        else:
            median = (variant_counts[n // 2 - 1] + variant_counts[n // 2]) / 2.0

        max_candidates = max(variant_counts) if variant_counts else 0

        sensitivity_results.append({
            'variant_id': variant['id'],
            'smooth_window': variant['smooth'],
            'peak_radius': variant['radius'],
            'min_prominence': variant['min_prominence'],
            'merge_distance': variant['merge_distance'],
            'gpx_files_scanned': files_scanned,
            'total_candidates': total_candidates,
            'files_with_zero_candidates': zero_count,
            'files_with_one_candidate': one_count,
            'files_with_multiple_candidates': multiple_count,
            'median_candidates_per_file': median,
            'max_candidates_per_file': max_candidates,
            'notes': ""
        })

    # Write parameter sensitivity summary
    sensitivity_csv_path = "docs/migration/summit_candidate_detection_parameter_sensitivity.csv"
    with open(sensitivity_csv_path, 'w', newline='', encoding='utf-8') as f:
        fieldnames = ['variant_id', 'smooth_window', 'peak_radius', 'min_prominence', 'merge_distance',
                      'gpx_files_scanned', 'total_candidates', 'files_with_zero_candidates',
                      'files_with_one_candidate', 'files_with_multiple_candidates',
                      'median_candidates_per_file', 'max_candidates_per_file', 'notes']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(sensitivity_results)

    print(f"Wrote parameter sensitivity summary to {sensitivity_csv_path}")

if __name__ == "__main__":
    run_audit()
