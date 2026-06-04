function parseGpxFilename(filename) {
    // Expected pattern: yamap_YYYY-MM-DD_HH_mm.gpx
    const match = filename.match(/^yamap_(\d{4})-(\d{2})-(\d{2})_(\d{2})_(\d{2})\.gpx$/i);
    if (!match) {
        return null;
    }

    const [_, yearStr, monthStr, dayStr, hourStr, minuteStr] = match;
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);

    const pad = (n) => n.toString().padStart(2, '0');

    // 1. Interpret filename datetime as JST local datetime directly
    const jstDatetime = `${yearStr}-${monthStr}-${dayStr}T${hourStr}:${minuteStr}:00+09:00`;
    const jstDate = `${yearStr}-${monthStr}-${dayStr}`;

    // 2. Interpret filename datetime as UTC, then convert to JST (UTC+9)
    const utcTimeMs = Date.UTC(year, month - 1, day, hour, minute);
    const jstConvertedTimeMs = utcTimeMs + (9 * 60 * 60 * 1000);
    const jstConvertedDate = new Date(jstConvertedTimeMs);

    const convYear = jstConvertedDate.getUTCFullYear();
    const convMonth = pad(jstConvertedDate.getUTCMonth() + 1);
    const convDay = pad(jstConvertedDate.getUTCDate());
    const convHour = pad(jstConvertedDate.getUTCHours());
    const convMin = pad(jstConvertedDate.getUTCMinutes());

    const utcToJstDatetime = `${convYear}-${convMonth}-${convDay}T${convHour}:${convMin}:00+09:00`;
    const utcToJstDate = `${convYear}-${convMonth}-${convDay}`;

    const timezoneSensitive = jstDate !== utcToJstDate;

    // Deduplicate candidate dates
    const candidateDatesJst = [
        { date: jstDate, assumption: 'filename_datetime_is_jst' }
    ];
    if (timezoneSensitive) {
        candidateDatesJst.push({
            date: utcToJstDate,
            assumption: 'filename_datetime_is_utc_then_converted_to_jst'
        });
    }

    return {
        gpx_filename_datetime_raw: `${yearStr}-${monthStr}-${dayStr} ${hourStr}:${minuteStr}`,
        filename_as_jst: {
            datetime: jstDatetime,
            date: jstDate
        },
        filename_as_utc_to_jst: {
            datetime: utcToJstDatetime,
            date: utcToJstDate
        },
        candidate_dates_jst: candidateDatesJst,
        timezone_ambiguity: true,
        timezone_sensitive: timezoneSensitive,
        inference_method: 'filename_pattern',
        filename_pattern: 'yamap_YYYY-MM-DD_HH_mm.gpx',
        parse_status: 'parsed',
        notes: ''
    };
}

module.exports = {
    parseGpxFilename
};
