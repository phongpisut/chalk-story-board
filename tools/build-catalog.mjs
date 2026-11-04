// raw.json (from fetch-irasutoya.mjs) -> public/catalog.json with English tags + story categories.
import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const raw = JSON.parse(readFileSync(new URL('./raw.json', import.meta.url)));

// Story categories (order = bit index, max 31).
const CATS = [
  ['people', 'People', '🧑'], ['emotion', 'Emotions', '😊'], ['animal', 'Animals', '🐶'],
  ['fantasy', 'Fantasy & Characters', '🧙'], ['food', 'Food', '🍙'], ['place', 'Places & Buildings', '🏠'],
  ['nature', 'Nature & Weather', '🌳'], ['school', 'School', '🏫'], ['work', 'Work & Money', '💼'],
  ['health', 'Health & Body', '🏥'], ['sport', 'Sports', '⚽'], ['event', 'Events & Seasons', '🎉'],
  ['vehicle', 'Vehicles', '🚗'], ['object', 'Objects & Tech', '💡'], ['life', 'Daily Life', '🛁'],
  ['art', 'Music & Art', '🎵'], ['drama', 'Danger & Conflict', '⚠️'], ['text', 'Text & Frames', '🔤'],
];
const CAT = Object.fromEntries(CATS.map(([id], i) => [id, i]));

// Every Irasutoya label: [English tag, story category or ''].
const LABELS = {
  リクエスト: ['request', ''], こども: ['child kid', 'people'], 職業: ['job occupation', 'work'], 病気: ['sick illness', 'health'],
  ポーズ: ['pose', 'people'], 会社: ['office company', 'work'], お金: ['money', 'work'], 道具: ['tool', 'object'],
  ビジネス: ['business', 'work'], 学校: ['school', 'school'], ファッション: ['fashion clothes', 'life'], 医療: ['medical doctor', 'health'],
  事故: ['accident', 'drama'], 違反: ['violation crime', 'drama'], 食べ物: ['food', 'food'], 趣味: ['hobby', 'life'],
  スポーツ: ['sport', 'sport'], 建物: ['building', 'place'], スイーツ: ['sweets dessert', 'food'], 旅行: ['travel trip', 'life'],
  おもちゃ: ['toy', 'object'], 家族: ['family', 'people'], 家電: ['appliance', 'object'], キャラクター: ['character', 'fantasy'],
  文字: ['text letters', 'text'], 料理: ['cooking dish', 'food'], 動物キャラ: ['animal character', 'animal'], 医療機器: ['medical device', 'health'],
  機械: ['machine', 'object'], マーク: ['mark icon symbol', 'text'], ショッピング: ['shopping', 'life'], 音楽: ['music', 'art'],
  飲み物: ['drink', 'food'], 日本: ['japan', 'place'], 車: ['car', 'vehicle'], コンピューター: ['computer pc', 'object'],
  パーティ: ['party', 'event'], スマートフォン: ['smartphone phone', 'object'], 家具: ['furniture', 'object'], 老人: ['old elderly grandpa grandma', 'people'],
  マナー: ['manners', 'life'], 食事: ['meal eating', 'food'], 乗り物: ['vehicle', 'vehicle'], 若者: ['young youth', 'people'],
  動物: ['animal', 'animal'], 生活: ['life daily', 'life'], インターネット: ['internet', 'object'], 友達: ['friends', 'people'],
  夏: ['summer', 'event'], 魚: ['fish', 'animal'], 軽食: ['snack', 'food'], 災害: ['disaster', 'drama'],
  野菜: ['vegetable', 'food'], お正月: ['new year', 'event'], 人体: ['human body', 'health'], 受験: ['exam', 'school'],
  恋愛: ['love romance couple', 'people'], 運動: ['exercise', 'sport'], 冬: ['winter', 'event'], 科学: ['science', 'school'],
  表情: ['face expression emotion', 'emotion'], 美術: ['art painting', 'art'], 掃除: ['cleaning', 'life'], 睡眠: ['sleep', 'life'],
  似顔絵: ['portrait famous person', 'people'], ペット: ['pet', 'animal'], 美容: ['beauty', 'life'], 戦争: ['war battle soldier', 'drama'],
  世界: ['world country', 'place'], ファンタジー: ['fantasy magic', 'fantasy'], 本: ['book', 'object'], 風景: ['landscape scenery background', 'place'],
  犬: ['dog', 'animal'], 就活: ['job hunting', 'work'], 虫: ['insect bug', 'animal'], 花: ['flower', 'nature'],
  あかちゃん: ['baby', 'people'], 植物: ['plant tree', 'nature'], 鳥: ['bird', 'animal'], 海: ['sea ocean beach', 'place'],
  文房具: ['stationery', 'school'], 食材: ['ingredient', 'food'], お風呂: ['bath', 'life'], フルーツ: ['fruit', 'food'],
  干支: ['zodiac', 'animal'], お年賀状: ['new year card', 'event'], マスク: ['mask', 'health'], 調味料: ['seasoning', 'food'],
  猫: ['cat', 'animal'], 物語: ['story tale folklore', 'fantasy'], 介護: ['nursing care', 'health'], 南国: ['tropical', 'place'],
  ウェディング: ['wedding', 'event'], ランドマーク: ['landmark', 'place'], 環境問題: ['environment', 'nature'], 髪: ['hair', 'life'],
  スポーツ用具: ['sports equipment', 'sport'], 夏休み: ['summer vacation', 'event'], 書類: ['document paper', 'work'], クリスマス: ['christmas', 'event'],
  怪我: ['injury', 'health'], テンプレート: ['template', 'text'], メディア: ['media tv', 'art'], 食器: ['tableware dish', 'food'],
  お祭り: ['festival', 'event'], 政治: ['politics', 'work'], 中年: ['middle aged', 'people'], 座布団: ['cushion', 'object'],
  映画: ['movie film', 'art'], メッセージ: ['message', 'text'], 電車: ['train', 'vehicle'], ゴミ: ['trash garbage', 'life'],
  楽器: ['instrument', 'art'], パン: ['bread', 'food'], 宗教: ['religion', 'fantasy'], エネルギー: ['energy', 'nature'],
  幼稚園: ['kindergarten', 'school'], 引越し: ['moving house', 'life'], 農業: ['farming farmer', 'work'], 自転車: ['bicycle bike', 'vehicle'],
  オリンピック: ['olympics', 'sport'], 飾り: ['decoration', 'object'], お寿司: ['sushi', 'food'], POP: ['pop sign', 'text'],
  食べ物キャラ: ['food character', 'fantasy'], ダンス: ['dance', 'art'], 体育: ['gym class', 'school'], 梅雨: ['rainy season rain', 'nature'],
  棒人間: ['stick figure', 'people'], 周辺機器: ['peripheral device', 'object'], メタボリック: ['obesity', 'health'], お葬式: ['funeral', 'drama'],
  思い出: ['memories', 'life'], 歯: ['teeth dentist', 'health'], 集合: ['group crowd', 'people'], 運動会: ['sports day', 'school'],
  春: ['spring', 'event'], 室内: ['room interior background', 'place'], 流通: ['delivery logistics', 'work'], カフェ: ['cafe', 'food'],
  お誕生日: ['birthday', 'event'], 宇宙: ['space universe', 'fantasy'], 英語: ['english', 'school'], バレンタイン: ['valentine', 'event'],
  サッカー: ['soccer football', 'sport'], 野球: ['baseball', 'sport'], 吹奏楽: ['brass band', 'art'], トイレ: ['toilet', 'life'],
  秋: ['autumn fall', 'event'], 歌: ['song singing', 'art'], 卒業式: ['graduation', 'school'], 夏バテ: ['summer heat', 'health'],
  爬虫類両生類: ['reptile amphibian', 'animal'], 健康診断: ['health check', 'health'], フレーム: ['frame border', 'text'], 新社会人: ['new employee', 'work'],
  天気: ['weather', 'nature'], 洗濯: ['laundry', 'life'], ハロウィン: ['halloween', 'event'], お弁当: ['bento lunch', 'food'],
  ぴょこ: ['peeking', 'fantasy'], 文化祭: ['school festival', 'school'], ライン: ['line divider', 'text'], 古代生物: ['ancient creature', 'animal'],
  ゴールデンウィーク: ['golden week holiday', 'event'], 深海: ['deep sea', 'animal'], 漁業: ['fishing', 'work'], 貝: ['shell', 'animal'],
  あいさつ: ['greeting', 'people'], 裁縫: ['sewing', 'life'], 人体キャラ: ['body character', 'fantasy'], お花見: ['cherry blossom', 'event'],
  世代: ['generation', 'people'], 地図: ['map', 'place'], こども職業: ['kid job', 'people'], 甲殻類: ['crab shrimp', 'animal'],
  人工知能: ['ai robot', 'object'], 仏像: ['buddha statue', 'fantasy'], 花火: ['fireworks', 'event'], 初詣: ['shrine visit', 'event'],
  年の瀬: ['year end', 'event'], 新学期: ['new term', 'school'], スープ: ['soup', 'food'], 入学式: ['entrance ceremony', 'school'],
  給食: ['school lunch', 'food'], 地域キャラ: ['mascot', 'fantasy'], 音楽家: ['musician', 'people'], 忘年会: ['year end party', 'event'],
  恐竜: ['dinosaur', 'animal'], 禁止: ['prohibited no', 'drama'], 紅葉: ['autumn leaves', 'nature'], 林業: ['forestry', 'work'],
  こどもの日: ['childrens day', 'event'], VR: ['vr', 'object'], 父の日: ['fathers day', 'event'], 祝日: ['holiday', 'event'],
  忍者: ['ninja', 'fantasy'], 書道: ['calligraphy', 'school'], 日焼け: ['sunburn tan', 'health'], 母の日: ['mothers day', 'event'],
  節分: ['setsubun oni', 'event'], クジライルカ: ['whale dolphin', 'animal'], LGBT: ['lgbt', 'people'], ペンギン: ['penguin', 'animal'],
  ヨガ: ['yoga', 'sport'], 動物の顔: ['animal face', 'animal'], パラリンピック: ['paralympics', 'sport'], 大晦日: ['new years eve', 'event'],
  乗り物キャラ: ['vehicle character', 'vehicle'], おにぎり: ['rice ball onigiri', 'food'], ことわざ: ['proverb', 'fantasy'], 七夕: ['tanabata', 'event'],
  ホワイトデー: ['white day', 'event'], 暑中見舞い: ['summer greeting', 'event'], 陸上: ['track running', 'sport'], 野菜の切り方: ['vegetable cutting', 'food'],
  星座: ['constellation star', 'fantasy'], ワンピース: ['dress', 'life'], 成人式: ['coming of age', 'event'], ゆめかわ: ['cute pastel', 'fantasy'],
  敬老の日: ['respect for aged', 'event'], ひな祭り: ['doll festival', 'event'], お月見: ['moon viewing', 'event'], パターン: ['pattern', 'text'],
  アマビエ: ['amabie yokai', 'fantasy'], 伝言メモ: ['memo note', 'text'], 顔アイコン: ['face icon', 'emotion'], イースター: ['easter', 'event'],
  勤労感謝の日: ['labor day', 'event'], 一筆箋: ['letter paper', 'text'], トランプ: ['playing cards', 'object'], 七五三: ['shichigosan', 'event'],
  書体: ['font', 'text'], メッセージカード: ['message card', 'text'], エイプリルフール: ['april fool', 'event'], ペンキ書体: ['paint font', 'text'],
  白抜き書体: ['outline font', 'text'], 宣伝: ['advertising', 'work'], 旗: ['flag', 'place'],
};

// Title keywords -> English tags (+ category). Titles are Japanese, so this is what makes English story words searchable.
const RULES = [
  [/男性|男の人|おじさん|お父さん|父親|サラリーマン/, 'man', 'people'], [/女性|女の人|おばさん|お母さん|母親|OL/, 'woman', 'people'],
  [/男の子|少年/, 'boy', 'people'], [/女の子|少女/, 'girl', 'people'], [/おじいさん|祖父/, 'grandpa', 'people'], [/おばあさん|祖母/, 'grandma', 'people'],
  [/笑|喜|嬉|楽し|ガッツポーズ/, 'happy smile laugh', 'emotion'], [/泣|涙|悲し/, 'sad cry', 'emotion'],
  [/怒/, 'angry mad', 'emotion'], [/驚|びっくり|ショック/, 'surprised shock', 'emotion'], [/困|悩|焦/, 'worried confused trouble', 'emotion'],
  [/怖|恐怖|おびえ/, 'scared fear', 'emotion'], [/照れ|恥ずかし/, 'shy blush', 'emotion'], [/落ち込|がっかり|疲れ/, 'depressed tired', 'emotion'],
  [/恋|ハート|告白/, 'love heart', 'emotion'], [/寝|眠/, 'sleep', 'life'], [/走/, 'run running', ''], [/歩/, 'walk', ''],
  [/王様|国王/, 'king', 'fantasy'], [/王女|お姫様|姫/, 'princess', 'fantasy'], [/王子/, 'prince', 'fantasy'], [/女王/, 'queen', 'fantasy'],
  [/勇者|戦士|騎士/, 'hero knight warrior', 'fantasy'], [/魔法使い|魔女/, 'wizard witch', 'fantasy'], [/魔王|悪魔/, 'demon devil villain', 'fantasy'],
  [/ドラゴン|竜/, 'dragon', 'fantasy'], [/お化け|幽霊|ゴースト/, 'ghost', 'fantasy'], [/妖怪|鬼/, 'yokai oni monster', 'fantasy'],
  [/モンスター|怪獣|怪物/, 'monster', 'fantasy'], [/ロボット/, 'robot', 'fantasy'], [/宇宙人|エイリアン|UFO/, 'alien ufo', 'fantasy'],
  [/天使/, 'angel', 'fantasy'], [/神様/, 'god', 'fantasy'], [/泥棒|犯人|強盗/, 'thief criminal', 'drama'], [/警察|警官/, 'police', 'people'],
  [/医者|医師/, 'doctor', 'people'], [/先生|教師/, 'teacher', 'people'], [/学生|生徒/, 'student', 'people'],
  [/家|住宅/, 'house home', 'place'], [/城/, 'castle', 'place'], [/森/, 'forest', 'nature'], [/木/, 'tree', 'nature'], [/山/, 'mountain', 'nature'],
  [/川/, 'river', 'nature'], [/太陽/, 'sun', 'nature'], [/月/, 'moon', ''], [/星/, 'star', ''], [/雨/, 'rain', 'nature'], [/雪/, 'snow', 'nature'],
  [/雷/, 'thunder lightning', 'nature'], [/火事|炎|火/, 'fire', 'drama'], [/爆発/, 'explosion', 'drama'], [/宝/, 'treasure', 'fantasy'],
  [/剣|刀/, 'sword', 'fantasy'], [/銃/, 'gun', 'drama'], [/手紙/, 'letter', ''], [/電話/, 'phone call', 'object'],
  [/ウサギ|うさぎ/, 'rabbit bunny', 'animal'], [/クマ|くま|熊/, 'bear', 'animal'], [/キツネ|きつね/, 'fox', 'animal'], [/タヌキ|たぬき/, 'tanuki raccoon', 'animal'],
  [/ネズミ|ねずみ/, 'mouse rat', 'animal'], [/ライオン/, 'lion', 'animal'], [/ゾウ|象/, 'elephant', 'animal'], [/サル|猿/, 'monkey', 'animal'],
  [/ウマ|馬/, 'horse', 'animal'], [/ブタ|豚/, 'pig', 'animal'], [/ウシ|牛/, 'cow', 'animal'], [/ヘビ|蛇/, 'snake', 'animal'],
  [/カエル/, 'frog', 'animal'], [/パンダ/, 'panda', 'animal'], [/トラ|虎/, 'tiger', 'animal'], [/オオカミ|狼/, 'wolf', 'animal'],
  [/吹き出し/, 'speech bubble', 'text'], [/矢印/, 'arrow', 'text'], [/ドア|扉/, 'door', 'object'], [/車椅子/, 'wheelchair', 'health'],
];

const labelList = Object.keys(LABELS);
const labelIdx = new Map(labelList.map((l, i) => [l, i]));
const tagList = [...new Set(RULES.map(r => r[1]))];

// Compact the URL: drop the CDN prefix and the size segment (the app re-inserts the size it wants).
const PREFIXES = ['https://blogger.googleusercontent.com/img/b/R29vZ2xl/', 'https://blogger.googleusercontent.com/img/', 'https://'];
const compact = u => {
  const p = PREFIXES.findIndex(x => u.startsWith(x));
  const m = u.slice(PREFIXES[p].length).match(/^(.*)\/s\d+(?:-c)?\/([^/]+)$/);
  return m ? `${p}|${m[1]}|${m[2]}` : null;
};

const seen = new Set(), items = [], unknownLabels = new Set();
for (const r of raw) {
  const url = compact(r.u);
  if (!url || seen.has(url)) continue;
  seen.add(url);
  const title = r.t.replace(/のイラスト(（.*?）)?$|のイラスト$/, '').replace(/のイラスト/g, ' ').trim();
  const lab = r.l.map(l => labelIdx.get(l) ?? (unknownLabels.add(l), -1)).filter(i => i >= 0);
  let mask = 0; const tags = [];
  for (const i of lab) { const c = LABELS[labelList[i]][1]; if (c) mask |= 1 << CAT[c]; }
  RULES.forEach(([re, tag, c]) => { if (re.test(title)) { tags.push(tagList.indexOf(tag)); if (c) mask |= 1 << CAT[c]; } });
  items.push([title, lab, url, mask, [...new Set(tags)]]);
}

const catalog = {
  source: 'いらすとや irasutoya.com — index only, images load from their CDN',
  prefixes: PREFIXES, cats: CATS, labels: labelList.map(l => [l, LABELS[l][0]]), tags: tagList, items,
};

// self-check
assert.ok(items.length > 20000, `only ${items.length} items`);
assert.ok(items.every(i => i[2].split('|').length === 3));
const uncategorized = items.filter(i => !i[3]).length;
assert.ok(uncategorized / items.length < 0.15, `too many uncategorized: ${uncategorized}`);
for (const [, , c] of CATS) assert.ok(c);
console.log({ items: items.length, uncategorized, unknownLabels: [...unknownLabels].slice(0, 20) });
console.log(CATS.map(([id], b) => `${id}:${items.filter(i => i[3] & (1 << b)).length}`).join(' '));

writeFileSync(new URL('../public/catalog.json', import.meta.url), JSON.stringify(catalog));
