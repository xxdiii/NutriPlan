// One-off: extract the IFCT 2017 values used by data/foods.js into data/ifct-foods.json.
//
// Usage: node scripts/extract-ifct.js <path to IFCT compositions CSV>
//
// The CSV is the "compositions" table of the Indian Food Composition Tables 2017
// (ICMR-NIN), e.g. compositions/index.csv from the `ifct2017` npm package.
// IFCT reports energy in kJ and every other component in grams per 100 g edible portion.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FOODS } from '../data/foods.js';

const csvPath = process.argv[2];
if (!csvPath) {
    console.error('Usage: node scripts/extract-ifct.js <compositions.csv>');
    process.exit(1);
}

const parseLine = (line) => {
    const out = [];
    let cell = '';
    let quoted = false;
    for (const ch of line) {
        if (ch === '"') quoted = !quoted;
        else if (ch === ',' && !quoted) { out.push(cell); cell = ''; }
        else cell += ch;
    }
    out.push(cell);
    return out;
};

const lines = fs.readFileSync(csvPath, 'utf8').split(/\r?\n/).filter(Boolean);
const header = parseLine(lines[0]);
const col = (row, name) => {
    const value = parseFloat(row[header.indexOf(name)]);
    return Number.isFinite(value) ? value : 0;
};

const rows = new Map();
for (const line of lines.slice(1)) {
    const row = parseLine(line);
    rows.set(row[0], row);
}

const round = (value, digits) => Number(value.toFixed(digits));
const codes = [...new Set(FOODS.map(([, , source]) => source).filter(s => typeof s === 'string'))].sort();
const result = {};

for (const code of codes) {
    const row = rows.get(code);
    if (!row) throw new Error(`IFCT code ${code} not found in ${csvPath}`);

    const protein = col(row, 'protcnt');
    const fat = col(row, 'fatce');
    const carbs = col(row, 'choavldf');
    const fibre = col(row, 'fibtg');
    // Energy is derived from the macronutrients with Atwater factors (4/9/4/2 kcal per g
    // of protein/fat/carbohydrate/fibre), which is how IFCT computes it. The recorded
    // energy column is 0 for some rows (ghee, oils) and clearly wrong for others
    // (chicken leg lists ~384 kcal), so it is only used to flag disagreements.
    const kcal = 4 * protein + 9 * fat + 4 * carbs + 2 * fibre;
    const recorded = col(row, 'enerc') / 4.184;
    if (recorded > 0 && Math.abs(recorded - kcal) / kcal > 0.15) {
        console.warn(`  ${code} ${row[header.indexOf('name')]}: recorded ${recorded.toFixed(0)} kcal, macros give ${kcal.toFixed(0)} kcal`);
    }

    result[code] = {
        name: row[header.indexOf('name')],
        kcal: round(kcal, 1),
        protein: round(protein, 2),
        carbs: round(carbs, 2),
        fat: round(fat, 2),
        fibre: round(fibre, 2),
        sugar: round(col(row, 'fsugar'), 2),
        sodium: round(col(row, 'na') * 1000, 1),       // mg
        iron: round(col(row, 'fe') * 1000, 2),         // mg
        calcium: round(col(row, 'ca') * 1000, 1),      // mg
        vitC: round(col(row, 'vitc') * 1000, 1),       // mg
        folate: round(col(row, 'folsum') * 1e6, 1),    // µg
    };
}

const outPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'ifct-foods.json');
fs.writeFileSync(outPath, JSON.stringify({
    source: 'Indian Food Composition Tables 2017, ICMR-National Institute of Nutrition (Longvah et al.). Values per 100 g edible portion.',
    foods: result,
}, null, 2) + '\n');
console.log(`Wrote ${codes.length} IFCT foods to ${outPath}`);
