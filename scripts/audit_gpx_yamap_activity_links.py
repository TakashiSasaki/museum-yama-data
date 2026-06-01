import os
import glob
import re
import csv
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from collections import defaultdict
import unicodedata

# Define namespaces typically found in GPX
NS = {
    'gpx': 'http://www.topografix.com/GPX/1/1',
    'gpx10': 'http://www.topografix.com/GPX/1/0'
}

def normalize_text(text):
    if not text:
        return ""
    text = unicodedata.normalize('NFKC', text)
    text = re.sub(r'\s+', '', text).strip()
    return text

def parse_gpx_filename_timestamp(filename):
    basename = os.path.basename(filename)
    match = re.match(r'yamap_(\d{4}-\d{2}-\d{2}_\d{2}_\d{2})\.gpx', basename)
    if match:
        try:
            return datetime.strptime(match.group(1), '%Y-%m-%d_%H_%M')
        except ValueError:
            pass
    return None

def parse_gpx_time(time_str):
    if not time_str:
        return None
    # Typically: 2022-01-14T23:17:28Z
    try:
        if time_str.endswith('Z'):
            dt = datetime.strptime(time_str, '%Y-%m-%dT%H:%M:%SZ')
            return dt.replace(tzinfo=timezone.utc)
        else:
            return datetime.fromisoformat(time_str)
    except Exception:
        return None

def scan_gpx_file(filepath):
    try:
        tree = ET.parse(filepath)
        root = tree.getroot()
    except Exception as e:
        return {'filepath': filepath, 'error': str(e)}

    # Determine namespace prefix
    tag_prefix = ''
    if root.tag.startswith('{'):
        tag_prefix = root.tag.split('}')[0] + '}'

    def find_all(tag):
        return root.findall(f'.//{tag_prefix}{tag}')

    creator = root.attrib.get('creator', '')

    trk_names = find_all('name')
    first_track_name = trk_names[0].text if trk_names else ''

    trkpts = find_all('trkpt')
    trackpoint_count = len(trkpts)

    first_time_utc = None
    last_time_utc = None
    if trackpoint_count > 0:
        time_elem_first = trkpts[0].find(f'{tag_prefix}time')
        if time_elem_first is not None:
            first_time_utc = parse_gpx_time(time_elem_first.text)

        time_elem_last = trkpts[-1].find(f'{tag_prefix}time')
        if time_elem_last is not None:
            last_time_utc = parse_gpx_time(time_elem_last.text)

    # Convert to JST (UTC+9)
    jst = timezone(timedelta(hours=9))
    first_time_jst = first_time_utc.astimezone(jst) if first_time_utc else None
    last_time_jst = last_time_utc.astimezone(jst) if last_time_utc else None

    # Search for YAMAP links/IDs
    xml_content = ET.tostring(root, encoding='unicode')
    contains_yamap_com = 'yamap.com' in xml_content
    yamap_activity_id_match = re.search(r'yamap\.com/activities/(\d+)', xml_content)
    contains_yamap_activities = bool(yamap_activity_id_match)
    direct_activity_id = yamap_activity_id_match.group(1) if yamap_activity_id_match else ''

    has_links = len(find_all('link')) > 0
    has_extensions = len(find_all('extensions')) > 0

    return {
        'filepath': filepath,
        'filename_timestamp': parse_gpx_filename_timestamp(filepath),
        'creator': creator,
        'first_track_name': first_track_name,
        'trackpoint_count': trackpoint_count,
        'first_time_utc': first_time_utc,
        'first_time_jst': first_time_jst,
        'last_time_utc': last_time_utc,
        'last_time_jst': last_time_jst,
        'contains_yamap_com': contains_yamap_com,
        'contains_yamap_activities': contains_yamap_activities,
        'direct_activity_id': direct_activity_id,
        'has_links': has_links,
        'has_extensions': has_extensions,
    }

def parse_yamap_markdown(filepath):
    basename = os.path.basename(filepath)
    activity_id = os.path.splitext(basename)[0]

    metadata = {
        'filepath': filepath,
        'activity_id': activity_id,
        'title': '',
        'date': '',
        'distance': '',
        'time': '',
        'elevation_gain': '',
        'elevation_loss': '',
        'link': ''
    }

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line.startswith('- **Title**:'):
                    metadata['title'] = line.replace('- **Title**:', '').strip()
                elif line.startswith('- **Date**:'):
                    metadata['date'] = line.replace('- **Date**:', '').strip()
                elif line.startswith('- **Distance**:'):
                    metadata['distance'] = line.replace('- **Distance**:', '').strip()
                elif line.startswith('- **Time**:'):
                    metadata['time'] = line.replace('- **Time**:', '').strip()
                elif line.startswith('- **Elevation Gain**:'):
                    metadata['elevation_gain'] = line.replace('- **Elevation Gain**:', '').strip()
                elif line.startswith('- **Elevation Loss**:'):
                    metadata['elevation_loss'] = line.replace('- **Elevation Loss**:', '').strip()
                elif line.startswith('- **Link**:'):
                    metadata['link'] = line.replace('- **Link**:', '').strip()
    except Exception as e:
        pass

    return metadata

def main():
    print("Starting GPX-to-YAMAP Activity Linking Audit...")

    gpx_files = glob.glob('gpx/raw/*.gpx')
    yamap_files = glob.glob('yamap/*.md')

    print(f"Found {len(gpx_files)} GPX files and {len(yamap_files)} YAMAP Markdown files.")

    gpx_data_list = []
    direct_ids_found = 0
    for f in gpx_files:
        data = scan_gpx_file(f)
        if data.get('direct_activity_id'):
            direct_ids_found += 1
        gpx_data_list.append(data)

    yamap_data_list = []
    for f in yamap_files:
        yamap_data_list.append(parse_yamap_markdown(f))

    # Match candidates
    candidates_rows = []

    match_counts = {
        'direct_id_match': 0,
        'single_high_confidence_candidate': 0,
        'multiple_candidates': 0,
        'needs_review': 0,
        'no_candidate': 0
    }

    for gpx in gpx_data_list:
        gpx_path = gpx['filepath']

        # Check direct match first
        direct_id = gpx.get('direct_activity_id')
        if direct_id:
            matching_yamap = next((y for y in yamap_data_list if y['activity_id'] == direct_id), None)
            if matching_yamap:
                row = create_candidate_row(gpx, matching_yamap, 'direct_id_match')
                candidates_rows.append(row)
                match_counts['direct_id_match'] += 1
                continue

        # Time-based matching
        gpx_date_str = None
        if gpx.get('first_time_jst'):
            gpx_date_str = gpx['first_time_jst'].strftime('%Y-%m-%d')
        elif gpx.get('filename_timestamp'):
            gpx_date_str = gpx['filename_timestamp'].strftime('%Y-%m-%d')

        gpx_title_norm = normalize_text(gpx.get('first_track_name'))

        plausible_candidates = []
        needs_review_candidates = []

        for yamap in yamap_data_list:
            yamap_date_str = yamap.get('date', '').replace('/', '-') # Normalize YAMAP date format if needed (e.g. 2022/01/15)
            # just take YYYY-MM-DD
            m = re.search(r'(\d{4})[-\/年](\d{2})[-\/月](\d{2})日?', yamap_date_str)
            if m:
                yamap_date_str = f"{m.group(1)}-{m.group(2)}-{m.group(3)}"

            yamap_title_norm = normalize_text(yamap.get('title'))

            # Primary rule: Same date and matching title
            if gpx_date_str and gpx_date_str == yamap_date_str and gpx_title_norm and gpx_title_norm == yamap_title_norm:
                plausible_candidates.append(yamap)
            elif gpx_date_str and gpx_date_str == yamap_date_str:
                needs_review_candidates.append((yamap, 'date match, title mismatch'))
            elif gpx_title_norm and gpx_title_norm == yamap_title_norm:
                # check if dates are within +-1 day
                if gpx_date_str and yamap_date_str:
                    try:
                        g_d = datetime.strptime(gpx_date_str, '%Y-%m-%d')
                        y_d = datetime.strptime(yamap_date_str, '%Y-%m-%d')
                        if abs((g_d - y_d).days) <= 1:
                            needs_review_candidates.append((yamap, 'title match, date off by 1 day'))
                    except:
                        pass

        if len(plausible_candidates) == 1:
            row = create_candidate_row(gpx, plausible_candidates[0], 'single_high_confidence_candidate')
            candidates_rows.append(row)
            match_counts['single_high_confidence_candidate'] += 1
        elif len(plausible_candidates) > 1:
            for y in plausible_candidates:
                row = create_candidate_row(gpx, y, 'multiple_candidates')
                candidates_rows.append(row)
            match_counts['multiple_candidates'] += 1
        elif len(needs_review_candidates) > 0:
            for y, reason in needs_review_candidates:
                row = create_candidate_row(gpx, y, 'needs_review', notes=reason)
                candidates_rows.append(row)
            match_counts['needs_review'] += 1
        else:
            row = create_candidate_row(gpx, None, 'no_candidate')
            candidates_rows.append(row)
            match_counts['no_candidate'] += 1

    # Write CSV
    os.makedirs('docs/migration', exist_ok=True)
    csv_path = 'docs/migration/gpx_yamap_activity_link_candidates.csv'
    with open(csv_path, 'w', newline='', encoding='utf-8') as f:
        fieldnames = [
            'gpx_path', 'gpx_filename_timestamp', 'gpx_first_time_utc', 'gpx_first_time_jst',
            'gpx_track_name', 'candidate_yamap_activity_id', 'candidate_markdown_path',
            'yamap_date', 'yamap_title', 'time_delta_seconds', 'title_exact_match',
            'match_status', 'notes'
        ]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(candidates_rows)

    print(f"Saved candidate CSV to {csv_path}")

    # Write report
    report_path = 'docs/migration/gpx_yamap_activity_linking_audit.md'
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write("# GPX-to-YAMAP Activity Linking Audit\n\n")
        f.write("## Purpose\n")
        f.write("To verify at repository scale whether raw GPX XML files embed YAMAP activity IDs directly, and to evaluate evidence for linking `gpx/raw/*.gpx` to `yamap/*.md`.\n\n")
        f.write("## Methodology\n")
        f.write("A Python script (`scripts/audit_gpx_yamap_activity_links.py`) was used to scan all files in `gpx/raw/` and `yamap/`. The script is read-only. It parsed GPX metadata (creator, track names, trackpoint timestamps, links, extensions) and searched for explicit activity URLs/IDs. It then compared GPX track times and names against scraped YAMAP Markdown titles and dates to assess a candidate linking strategy.\n\n")
        f.write("## Direct GPX XML Activity ID Scan Result\n")
        if direct_ids_found > 0:
            f.write(f"The read-only inspection found {direct_ids_found} embedded YAMAP activity IDs in the scanned GPX XML files.\n\n")
        else:
            f.write("Read-only inspection did not find embedded YAMAP activity IDs in the scanned GPX XML files. GPX-to-YAMAP linking should therefore be implemented as an explicit pipeline stage using filename timestamps, GPX track times, track names, and YAMAP Markdown metadata.\n\n")

        f.write("## Summary Counts\n")
        f.write(f"- GPX files scanned: {len(gpx_files)}\n")
        f.write(f"- YAMAP Markdown files parsed: {len(yamap_files)}\n")
        f.write(f"- Direct activity IDs found in GPX XML: {direct_ids_found}\n")
        f.write(f"- `single_high_confidence_candidate`: {match_counts['single_high_confidence_candidate']}\n")
        f.write(f"- `multiple_candidates`: {match_counts['multiple_candidates']}\n")
        f.write(f"- `needs_review`: {match_counts['needs_review']}\n")
        f.write(f"- `no_candidate`: {match_counts['no_candidate']}\n\n")

        f.write("## Candidate Linking Strategy\n")
        f.write("The proposed linking strategy uses the following evidence:\n")
        f.write("- GPX filename timestamp or GPX first trackpoint time (converted to JST)\n")
        f.write("- GPX first track name (normalized)\n")
        f.write("- YAMAP Markdown date\n")
        f.write("- YAMAP Markdown title (normalized)\n")
        f.write("Matches are classified into direct matches (if any), single high-confidence matches (exact date and title), multiple candidates, needs review, or no candidate.\n\n")

        f.write("## Limitations\n")
        f.write("- YAMAP Markdown dates are generally only precise to the day, so exact time deltas cannot be computed reliably.\n")
        f.write("- GPX timezone boundaries (UTC vs JST) can cause date mismatches if not handled properly.\n")
        f.write("- The candidate CSV does not contain full trackpoint geometry, adhering to data model policies.\n\n")

        f.write("## Next Recommended Pipeline Stage\n")
        f.write("Introduce an explicit pipeline stage (e.g., `link_gpx_to_yamap_activity`) that implements this candidate linking strategy, creating a separate links table rather than rewriting source files.\n")

    print(f"Saved audit report to {report_path}")

def create_candidate_row(gpx, yamap, status, notes=''):
    gpx_title = normalize_text(gpx.get('first_track_name', ''))
    yamap_title = normalize_text(yamap.get('title', '')) if yamap else ''
    title_exact_match = (gpx_title == yamap_title) if gpx_title and yamap_title else False

    time_delta = ''
    if yamap and gpx.get('first_time_jst') and yamap.get('date'):
        # Attempt to parse yamap date for a rough delta
        m = re.search(r'(\d{4})[-\/年](\d{2})[-\/月](\d{2})日?', yamap.get('date'))
        if m:
            y_date_str = f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
            try:
                y_date = datetime.strptime(y_date_str, '%Y-%m-%d').replace(tzinfo=timezone(timedelta(hours=9)))
                # Calculate delta in seconds
                delta = gpx['first_time_jst'] - y_date
                time_delta = int(delta.total_seconds())
            except:
                pass

    return {
        'gpx_path': gpx['filepath'],
        'gpx_filename_timestamp': gpx['filename_timestamp'].strftime('%Y-%m-%d %H:%M') if gpx.get('filename_timestamp') else '',
        'gpx_first_time_utc': gpx['first_time_utc'].strftime('%Y-%m-%dT%H:%M:%SZ') if gpx.get('first_time_utc') else '',
        'gpx_first_time_jst': gpx['first_time_jst'].strftime('%Y-%m-%dT%H:%M:%S%z') if gpx.get('first_time_jst') else '',
        'gpx_track_name': gpx.get('first_track_name', ''),
        'candidate_yamap_activity_id': yamap['activity_id'] if yamap else '',
        'candidate_markdown_path': yamap['filepath'] if yamap else '',
        'yamap_date': yamap.get('date', '') if yamap else '',
        'yamap_title': yamap.get('title', '') if yamap else '',
        'time_delta_seconds': time_delta,
        'title_exact_match': title_exact_match,
        'match_status': status,
        'notes': notes
    }

if __name__ == '__main__':
    main()
