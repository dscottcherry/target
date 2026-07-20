/*
 * bible-data.js
 * Offline reference data for the WOL Study Assistant.
 *
 * Each book carries its canonical NWT number (1-66), full name, chapter count,
 * and a list of accepted abbreviations used by the reference parser.
 * The number drives the jw.org "finder" deep-link verse ID:
 *     verseId = bookNumber * 1_000_000 + chapter * 1_000 + verse
 */

const BIBLE_BOOKS = [
  { n: 1,  name: 'Genesis',          chapters: 50,  abbr: ['ge', 'gen'] },
  { n: 2,  name: 'Exodus',           chapters: 40,  abbr: ['ex', 'exo'] },
  { n: 3,  name: 'Leviticus',        chapters: 27,  abbr: ['le', 'lev'] },
  { n: 4,  name: 'Numbers',          chapters: 36,  abbr: ['nu', 'num'] },
  { n: 5,  name: 'Deuteronomy',      chapters: 34,  abbr: ['de', 'deu', 'deut'] },
  { n: 6,  name: 'Joshua',           chapters: 24,  abbr: ['jos', 'josh'] },
  { n: 7,  name: 'Judges',           chapters: 21,  abbr: ['jg', 'jdg', 'judg'] },
  { n: 8,  name: 'Ruth',             chapters: 4,   abbr: ['ru', 'rut'] },
  { n: 9,  name: '1 Samuel',         chapters: 31,  abbr: ['1sa', '1 sam', '1sam'] },
  { n: 10, name: '2 Samuel',         chapters: 24,  abbr: ['2sa', '2 sam', '2sam'] },
  { n: 11, name: '1 Kings',          chapters: 22,  abbr: ['1ki', '1 kgs', '1kgs'] },
  { n: 12, name: '2 Kings',          chapters: 25,  abbr: ['2ki', '2 kgs', '2kgs'] },
  { n: 13, name: '1 Chronicles',     chapters: 29,  abbr: ['1ch', '1 chron', '1chr'] },
  { n: 14, name: '2 Chronicles',     chapters: 36,  abbr: ['2ch', '2 chron', '2chr'] },
  { n: 15, name: 'Ezra',             chapters: 10,  abbr: ['ezr'] },
  { n: 16, name: 'Nehemiah',         chapters: 13,  abbr: ['ne', 'neh'] },
  { n: 17, name: 'Esther',           chapters: 10,  abbr: ['es', 'est', 'esth'] },
  { n: 18, name: 'Job',              chapters: 42,  abbr: ['job'] },
  { n: 19, name: 'Psalms',           chapters: 150, abbr: ['ps', 'psa', 'psalm'] },
  { n: 20, name: 'Proverbs',         chapters: 31,  abbr: ['pr', 'pro', 'prov'] },
  { n: 21, name: 'Ecclesiastes',     chapters: 12,  abbr: ['ec', 'ecc', 'eccl'] },
  { n: 22, name: 'Song of Solomon',  chapters: 8,   abbr: ['ca', 'sos', 'song'] },
  { n: 23, name: 'Isaiah',           chapters: 66,  abbr: ['isa'] },
  { n: 24, name: 'Jeremiah',         chapters: 52,  abbr: ['jer'] },
  { n: 25, name: 'Lamentations',     chapters: 5,   abbr: ['la', 'lam'] },
  { n: 26, name: 'Ezekiel',          chapters: 48,  abbr: ['eze', 'ezek'] },
  { n: 27, name: 'Daniel',           chapters: 12,  abbr: ['da', 'dan'] },
  { n: 28, name: 'Hosea',            chapters: 14,  abbr: ['ho', 'hos'] },
  { n: 29, name: 'Joel',             chapters: 3,   abbr: ['joe', 'joel'] },
  { n: 30, name: 'Amos',             chapters: 9,   abbr: ['am', 'amo'] },
  { n: 31, name: 'Obadiah',          chapters: 1,   abbr: ['ob', 'oba'] },
  { n: 32, name: 'Jonah',            chapters: 4,   abbr: ['jon', 'jnh'] },
  { n: 33, name: 'Micah',            chapters: 7,   abbr: ['mic'] },
  { n: 34, name: 'Nahum',            chapters: 3,   abbr: ['na', 'nah'] },
  { n: 35, name: 'Habakkuk',         chapters: 3,   abbr: ['hab'] },
  { n: 36, name: 'Zephaniah',        chapters: 3,   abbr: ['zep', 'zeph'] },
  { n: 37, name: 'Haggai',           chapters: 2,   abbr: ['hag'] },
  { n: 38, name: 'Zechariah',        chapters: 14,  abbr: ['zec', 'zech'] },
  { n: 39, name: 'Malachi',          chapters: 4,   abbr: ['mal'] },
  { n: 40, name: 'Matthew',          chapters: 28,  abbr: ['mt', 'mat', 'matt'] },
  { n: 41, name: 'Mark',             chapters: 16,  abbr: ['mr', 'mk', 'mark'] },
  { n: 42, name: 'Luke',             chapters: 24,  abbr: ['lu', 'lk', 'luke'] },
  { n: 43, name: 'John',             chapters: 21,  abbr: ['joh', 'jhn'] },
  { n: 44, name: 'Acts',             chapters: 28,  abbr: ['ac', 'act'] },
  { n: 45, name: 'Romans',           chapters: 16,  abbr: ['ro', 'rom'] },
  { n: 46, name: '1 Corinthians',    chapters: 16,  abbr: ['1co', '1 cor', '1cor'] },
  { n: 47, name: '2 Corinthians',    chapters: 13,  abbr: ['2co', '2 cor', '2cor'] },
  { n: 48, name: 'Galatians',        chapters: 6,   abbr: ['ga', 'gal'] },
  { n: 49, name: 'Ephesians',        chapters: 6,   abbr: ['eph'] },
  { n: 50, name: 'Philippians',      chapters: 4,   abbr: ['php', 'phil'] },
  { n: 51, name: 'Colossians',       chapters: 4,   abbr: ['col'] },
  { n: 52, name: '1 Thessalonians',  chapters: 5,   abbr: ['1th', '1 thess', '1thess'] },
  { n: 53, name: '2 Thessalonians',  chapters: 3,   abbr: ['2th', '2 thess', '2thess'] },
  { n: 54, name: '1 Timothy',        chapters: 6,   abbr: ['1ti', '1 tim', '1tim'] },
  { n: 55, name: '2 Timothy',        chapters: 4,   abbr: ['2ti', '2 tim', '2tim'] },
  { n: 56, name: 'Titus',            chapters: 3,   abbr: ['tit'] },
  { n: 57, name: 'Philemon',         chapters: 1,   abbr: ['phm', 'phlm'] },
  { n: 58, name: 'Hebrews',          chapters: 13,  abbr: ['heb'] },
  { n: 59, name: 'James',            chapters: 5,   abbr: ['jas', 'jam'] },
  { n: 60, name: '1 Peter',          chapters: 5,   abbr: ['1pe', '1 pet', '1pet'] },
  { n: 61, name: '2 Peter',          chapters: 3,   abbr: ['2pe', '2 pet', '2pet'] },
  { n: 62, name: '1 John',           chapters: 5,   abbr: ['1jo', '1 jn', '1jn'] },
  { n: 63, name: '2 John',           chapters: 1,   abbr: ['2jo', '2 jn', '2jn'] },
  { n: 64, name: '3 John',           chapters: 1,   abbr: ['3jo', '3 jn', '3jn'] },
  { n: 65, name: 'Jude',             chapters: 1,   abbr: ['jud', 'jde'] },
  { n: 66, name: 'Revelation',       chapters: 22,  abbr: ['re', 'rev'] },
];

/* Curated topic chips for quick study searches on WOL. */
const STUDY_TOPICS = [
  'Kingdom', 'Love', 'Faith', 'Hope', 'Resurrection', 'Jehovah',
  'Jesus', 'Ransom', 'Prayer', 'Holy spirit', 'Last days', 'Paradise',
  'Repentance', 'Forgiveness', 'Endurance', 'Baptism', 'Elders',
  'Ministry', 'Wisdom', 'Joy',
];

/* Groupings for the browse-by-book view. */
const BIBLE_SECTIONS = [
  { title: 'Hebrew-Aramaic Scriptures', range: [1, 39] },
  { title: 'Christian Greek Scriptures', range: [40, 66] },
];
