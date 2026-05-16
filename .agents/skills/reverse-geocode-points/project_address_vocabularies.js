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
    console.error("Usage: node project_address_vocabularies.js --input <extracted_dir> --out <derived_dir>");
    process.exit(1);
}

if (!fs.existsSync(inputDir)) {
    console.error(`Error: Input directory does not exist: ${inputDir}`);
    process.exit(1);
}

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

function projectAddressVocabularies(extracted, lang, rawAddress) {
    const locn = {};
    const schema = {};
    const ic = {};
    const notes = [];

    // Base defaults
    const countryStr = "JP";
    locn.adminUnitL1 = countryStr;
    schema.addressCountry = countryStr;
    ic["国コード"] = countryStr;

    if (!extracted) {
        return { locn, schema, ic, notes };
    }

    const pref = extracted.prefecture;
    const county = extracted.county;
    const city = extracted.city;
    const local = extracted.local;

    // prefecture
    if (pref && pref.value) {
        locn.adminUnitL2 = pref.value;
        schema.addressRegion = pref.value;
        ic["都道府県"] = pref.value;
    }

    // county and city -> locn:postName, schema:addressLocality, ic:市区町村
    let localityStr = "";
    if (county && county.value) {
        localityStr += county.value;
        notes.push("county は標準語彙への直接写像を確定しない。");
    }
    if (city && city.value) {
        localityStr += city.value;
        ic["市区町村"] = city.value;
    }
    if (localityStr) {
        locn.postName = localityStr;
        schema.addressLocality = localityStr;
    }

    // local -> locn:thoroughfare, locn:addressArea, schema:streetAddress
    if (local && local.value) {
        const key = local.source_key;
        if (key === "road") {
            locn.thoroughfare = local.value;
            notes.push("local.source_key が road であるため locn.thoroughfare に投影した。");
        } else if (['suburb', 'quarter', 'neighbourhood', 'city_district'].includes(key)) {
            locn.addressArea = local.value;
            notes.push(`local.source_key が ${key} であるため locn.addressArea に投影した。`);
        } else if (key === "hamlet") {
            locn.addressArea = local.value;
            notes.push("注意: local.source_key が hamlet のため locn.addressArea に投影したが、自動確定ではない。");
        } else {
            locn.addressArea = local.value;
            notes.push(`local.source_key が ${key} のためデフォルトとして locn.addressArea に投影した。`);
        }
    }

    // schema:streetAddress should be a coarse street address line (concatenate elements below city)
    // We will extract all elements below city from rawAddress using localCandidates order
    let coarseStreetAddress = "";
    if (rawAddress) {
        const localCandidates = ['city_district', 'suburb', 'quarter', 'neighbourhood', 'hamlet', 'road', 'local'];
        for (const cand of localCandidates) {
            if (rawAddress[cand]) {
                coarseStreetAddress += rawAddress[cand] + (lang === 'en' ? " " : "");
            }
        }
        coarseStreetAddress = coarseStreetAddress.trim();
    }
    if (!coarseStreetAddress && local && local.value) {
        coarseStreetAddress = local.value;
    }
    if (coarseStreetAddress) {
        schema.streetAddress = coarseStreetAddress;
    }

    // Address string formatting (very rough simple concat for ja)
    let addressString = "";
    if (pref && pref.value) addressString += pref.value;
    if (county && county.value) addressString += county.value;
    if (city && city.value) addressString += city.value;
    if (coarseStreetAddress) {
        if (lang === 'en') addressString += " " + coarseStreetAddress;
        else addressString += coarseStreetAddress;
    }

    if (addressString) {
        locn.fullAddress = addressString;
    }

    return { address_string: addressString, locn, schema, ic, notes };
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

        const derivedData = data.map(pt => {
            const newPt = { ...pt };

            const derived = {
                ja: {},
                en: {}
            };

            if (pt.extracted && pt.extracted.ja) {
                const rawAddressJa = pt.reverse_geocoding?.requests?.ja?.response?.body?.address;
                derived.ja = projectAddressVocabularies(pt.extracted.ja, 'ja', rawAddressJa);
            }
            if (pt.extracted && pt.extracted.en) {
                const rawAddressEn = pt.reverse_geocoding?.requests?.en?.response?.body?.address;
                derived.en = projectAddressVocabularies(pt.extracted.en, 'en', rawAddressEn);
            }

            newPt.derived = derived;

            // Append metadata for projection
            newPt.metadata = newPt.metadata || {};
            newPt.metadata.projection_rule_version = "ja-address-projection-v1";
            newPt.metadata.script = newPt.metadata.script ? `${newPt.metadata.script}, project_address_vocabularies.js` : "project_address_vocabularies.js";

            return newPt;
        });

        fs.writeFileSync(outputFilePath, JSON.stringify(derivedData, null, 2), 'utf8');
        console.log(`Processed ${file} -> ${outputFilePath}`);
        processedCount++;
    }
    console.log(`Done! Processed ${processedCount} files.`);
}

processFiles();
