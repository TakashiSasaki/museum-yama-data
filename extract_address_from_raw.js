const fs = require('fs');
const path = require('path');

// Parse command-line arguments
const args = process.argv.slice(2);
let inputDir = null;
let outputDir = null;

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && i + 1 < args.length) {
        inputDir = path.resolve(process.cwd(), args[i + 1]);
        i++;
    } else if (args[i] === '--out' && i + 1 < args.length) {
        outputDir = path.resolve(process.cwd(), args[i + 1]);
        i++;
    }
}

if (!inputDir || !outputDir) {
    console.error("Usage: node extract_address_from_raw.js --input <raw_dir> --out <extracted_dir>");
    process.exit(1);
}

if (!fs.existsSync(inputDir)) {
    console.error(`Error: Input directory does not exist: ${inputDir}`);
    process.exit(1);
}

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

function extractAddressInfoWithSourceKeys(address) {
    if (!address) return { prefecture: null, county: null, city: null, local: null };

    // Candidates arrays based on requested rules
    const prefCandidates = ['province', 'state'];
    const countyCandidates = ['county'];
    const cityCandidates = ['city', 'town', 'village'];
    const localCandidates = ['suburb', 'quarter', 'neighbourhood', 'road', 'local', 'hamlet', 'city_district'];

    const getExtractedField = (candidates) => {
        const result = { value: null, source_key: null, candidates: {} };
        for (const key of candidates) {
            const val = address[key];
            result.candidates[key] = val || null;
            if (!result.value && val) {
                result.value = val;
                result.source_key = key;
            }
        }
        if (!result.value) return null;
        return result;
    };

    return {
        prefecture: getExtractedField(prefCandidates),
        county: getExtractedField(countyCandidates),
        city: getExtractedField(cityCandidates),
        local: getExtractedField(localCandidates)
    };
}

function processFiles() {
    const files = fs.readdirSync(inputDir);
    let processedCount = 0;

    for (const file of files) {
        if (!file.toLowerCase().endsWith('.json')) continue;

        const inputFilePath = path.join(inputDir, file);
        const outputFilePath = path.join(outputDir, file);

        let data;
        try {
            data = JSON.parse(fs.readFileSync(inputFilePath, 'utf8'));
        } catch (e) {
            console.error(`Failed to parse ${inputFilePath}: ${e.message}`);
            continue;
        }

        const extractedData = data.map(pt => {
            const newPt = { ...pt }; // copy existing properties (type, source_file, source_point, reverse_geocoding)

            const extracted = {
                ja: {},
                en: {}
            };

            const reqJa = pt.reverse_geocoding && pt.reverse_geocoding.requests && pt.reverse_geocoding.requests.ja && pt.reverse_geocoding.requests.ja.response && pt.reverse_geocoding.requests.ja.response.body && pt.reverse_geocoding.requests.ja.response.body.address;
            if (reqJa) {
                extracted.ja = extractAddressInfoWithSourceKeys(reqJa);
            }

            const reqEn = pt.reverse_geocoding && pt.reverse_geocoding.requests && pt.reverse_geocoding.requests.en && pt.reverse_geocoding.requests.en.response && pt.reverse_geocoding.requests.en.response.body && pt.reverse_geocoding.requests.en.response.body.address;
            if (reqEn) {
                extracted.en = extractAddressInfoWithSourceKeys(reqEn);
            }

            newPt.extracted = extracted;

            // embed metadata into each point
            newPt.metadata = newPt.metadata || {};
            newPt.metadata.extraction_rule_version = "nominatim-address-v1";
            newPt.metadata.script = "extract_address_from_raw.js";

            return newPt;
        });


        fs.writeFileSync(outputFilePath, JSON.stringify(extractedData, null, 2), 'utf8');
        console.log(`Processed ${file} -> ${outputFilePath}`);
        processedCount++;
    }
    console.log(`Done! Processed ${processedCount} files.`);
}

processFiles();
