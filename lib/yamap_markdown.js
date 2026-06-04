function parseYamapMarkdown(content) {
    let title = '';
    let activityDate = null;
    let parseStatus = 'unparsed';
    let notes = '';

    const titleMatch = content.match(/-\s*\*\*Title\*\*:\s*(.*)/i);
    if (titleMatch) {
        title = titleMatch[1].trim();
    }

    // Capture e.g. 2022年01月15日
    const dateMatch = content.match(/-\s*\*\*Date\*\*:\s*(\d{4})[年\-\/](\d{2})[月\-\/](\d{2})日?/i);
    if (dateMatch) {
        const [_, year, month, day] = dateMatch;
        activityDate = `${year}-${month}-${day}`;
        parseStatus = 'parsed';
    } else {
        notes = 'Could not parse activity date from Markdown.';
    }

    return {
        activity_date: activityDate,
        title,
        parse_status: parseStatus,
        notes
    };
}

module.exports = {
    parseYamapMarkdown
};
