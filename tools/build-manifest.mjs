/**
 * Scans the team/kit folders at the repository root and writes kits-manifest.json.
 *
 * Paths are always read from disk rather than typed by hand: several kit folders use
 * decomposed Unicode (e.g. "Atlético" is stored as e + U+0301), contain double spaces
 * ("Galatasaray Away  Kit") or typos ("AS Monaco Thirt Kit"). Typing those by hand
 * produces URLs that 404 in production, so the manifest is the single source of truth.
 *
 * Run after adding, renaming or removing any team/kit folder:
 *   node tools/build-manifest.mjs
 */

import { readdirSync, writeFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const IMAGE_RE = /\.(jpe?g|png|webp|avif|gif)$/i;

/** League -> team folder names, in the order they should appear in the UI. */
const LEAGUES = [
    { id: 'bundesliga', name: 'Bundesliga', flag: '🇩🇪', teams: ['Bayern Munchen', 'Borussia Dortmund', 'Bayer 04 Leverkusen', 'RB Leipzig', 'Borussia Monchengladbach'] },
    { id: 'la-liga', name: 'La Liga', flag: '🇪🇸', teams: ['Real Madrid', 'Barcelona', 'Atletico Madrid', 'Sevilla FC', 'Real Sociedad'] },
    { id: 'premier-league', name: 'Premier League', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', teams: ['Manchester United', 'Manchester City', 'Liverpool FC', 'Chelsea FC', 'Arsenal FC'] },
    { id: 'serie-a', name: 'Serie A', flag: '🇮🇹', teams: ['Juventus FC', 'Inter Milan', 'AC Milan', 'AS Roma', 'Napoli'] },
    { id: 'ligue-1', name: 'Ligue 1', flag: '🇫🇷', teams: ['Paris Saint-Germain', 'Olympique Marseille', 'Olympique Lyonnais', 'AS Monaco', 'RC Lens'] },
    { id: 'eredivisie', name: 'Eredivisie', flag: '🇳🇱', teams: ['Ajax', 'PSV Eindhoven', 'Feyenoord', 'AZ Alkmaar', 'Vitesse'] },
    { id: 'primeira-liga', name: 'Primeira Liga', flag: '🇵🇹', teams: ['Benfica', 'FC Porto', 'Sporting CP', 'Braga'] },
    { id: 'super-lig', name: 'Süper Lig', flag: '🇹🇷', teams: ['Galatasaray', 'Fenerbahce', 'Besiktas', 'Trabzonspor'] },
];

/** Display names, so the UI can show proper diacritics regardless of folder spelling. */
const DISPLAY_NAMES = {
    'Bayern Munchen': 'Bayern München',
    'Borussia Monchengladbach': 'Borussia Mönchengladbach',
    'Atletico Madrid': 'Atlético Madrid',
    'Besiktas': 'Beşiktaş',
    'Fenerbahce': 'Fenerbahçe',
    'Ajax': 'Ajax Amsterdam',
    'Braga': 'SC Braga',
};

/** Compare folder names ignoring case, diacritics and repeated whitespace. */
const loose = (value) =>
    value.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

const isDir = (path) => {
    try {
        return statSync(path).isDirectory();
    } catch {
        return false;
    }
};

/** Sort "Kit 2.jpg" before "Kit 10.jpg", and the unnumbered base file first. */
function naturalSort(a, b) {
    const rank = (name) => {
        const match = name.match(/(\d+)(?=\.[^.]+$)/);
        return match ? Number(match[1]) : 0;
    };
    return rank(a) - rank(b) || a.localeCompare(b);
}

/** Map a kit folder name to home/away/third, tolerating the "Thirt Kit" typo. */
function kitTypeOf(folderName) {
    const name = loose(folderName);
    if (name.includes('home')) return 'home';
    if (name.includes('away')) return 'away';
    if (name.includes('third') || name.includes('thirt')) return 'third';
    return null;
}

const warnings = [];
const leagues = [];
let teamCount = 0;
let imageCount = 0;

for (const league of LEAGUES) {
    const teams = [];

    for (const teamFolder of league.teams) {
        // Resolve the folder against what is actually on disk, so a differently
        // normalized or differently spaced folder name still matches.
        const actualFolder = readdirSync(ROOT).find(
            (entry) => isDir(join(ROOT, entry)) && loose(entry) === loose(teamFolder)
        );

        if (!actualFolder) {
            warnings.push(`Team folder not found: ${teamFolder}`);
            continue;
        }

        const kits = {};
        for (const kitFolder of readdirSync(join(ROOT, actualFolder))) {
            const kitPath = join(ROOT, actualFolder, kitFolder);
            if (!isDir(kitPath)) continue;

            const type = kitTypeOf(kitFolder);
            if (!type) {
                warnings.push(`Unrecognized kit folder: ${actualFolder}/${kitFolder}`);
                continue;
            }

            const images = readdirSync(kitPath)
                .filter((file) => IMAGE_RE.test(file))
                .sort(naturalSort)
                .map((file) => `${actualFolder}/${kitFolder}/${file}`);

            if (!images.length) {
                warnings.push(`No images in: ${actualFolder}/${kitFolder}`);
                continue;
            }

            kits[type] = { folder: `${actualFolder}/${kitFolder}`, cover: images[0], images };
            imageCount += images.length;
        }

        if (!Object.keys(kits).length) {
            warnings.push(`No kits resolved for: ${actualFolder}`);
            continue;
        }

        teams.push({
            id: loose(actualFolder).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
            folder: actualFolder,
            name: DISPLAY_NAMES[actualFolder] || actualFolder,
            league: league.name,
            kits,
        });
        teamCount += 1;
    }

    leagues.push({ ...league, teams });
}

// Flag any team folder at the root that no league claims, so new uploads are noticed.
const claimed = new Set(leagues.flatMap((l) => l.teams.map((t) => t.folder)));
for (const entry of readdirSync(ROOT)) {
    if (entry.startsWith('.') || entry === 'tools' || entry === 'node_modules') continue;
    if (isDir(join(ROOT, entry)) && !claimed.has(entry)) {
        warnings.push(`Team folder present but not assigned to a league: ${entry}`);
    }
}

const manifest = {
    generatedAt: new Date().toISOString(),
    teamCount,
    imageCount,
    leagues: leagues.map(({ id, name, flag, teams }) => ({ id, name, flag, teams })),
};

writeFileSync(join(ROOT, 'kits-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`kits-manifest.json: ${teamCount} teams, ${imageCount} images, ${leagues.length} leagues`);
for (const warning of warnings) console.warn(`  warning: ${warning}`);
