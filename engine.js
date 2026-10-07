/* TruthScan engine: ratings are calculated here in the browser, so no server is needed. */
(function (root) {
  const ADDED_SUGAR = "Added sugar", REFINED_FLOUR = "Refined flour", TRANS_FAT = "Trans fat risk",
    PALM_OIL = "Palm oil", SWEETENER = "Sweetener", COLOUR = "Colour", PRESERVATIVE = "Preservative",
    FLAVOUR_ENHANCER = "Flavour enhancer", CAFFEINE = "Caffeine", ARTIFICIAL_FLAVOUR = "Artificial flavour",
    EMULSIFIER = "Emulsifier / thickener", ANTIOXIDANT = "Antioxidant";
  const LOW = "LOW", MEDIUM = "MEDIUM", HIGH = "HIGH";

  const colR = "Synthetic colour; linked to hyperactivity in some children.";
  const enhR = "Flavour enhancer; adds sodium and is typical of ultra-processed snacks.";
  const nitR = "Used in processed meats; regular intake is linked to higher cancer risk.";
  const sulR = "Can trigger reactions in people with asthma or sulphite sensitivity.";
  const ADD = {
    "102": ["Tartrazine", COLOUR, MEDIUM, colR], "110": ["Sunset Yellow FCF", COLOUR, MEDIUM, colR],
    "122": ["Carmoisine", COLOUR, MEDIUM, colR], "124": ["Ponceau 4R", COLOUR, MEDIUM, colR],
    "129": ["Allura Red", COLOUR, MEDIUM, colR], "133": ["Brilliant Blue FCF", COLOUR, LOW, "Synthetic colour."],
    "150c": ["Ammonia caramel", COLOUR, LOW, "Caramel colour made with ammonia."],
    "150d": ["Sulphite ammonia caramel", COLOUR, LOW, "Caramel colour common in colas."],
    "211": ["Sodium benzoate", PRESERVATIVE, MEDIUM, "Preservative; can form small amounts of benzene with vitamin C in drinks."],
    "220": ["Sulphur dioxide", PRESERVATIVE, MEDIUM, sulR], "223": ["Sodium metabisulphite", PRESERVATIVE, MEDIUM, sulR],
    "250": ["Sodium nitrite", PRESERVATIVE, HIGH, nitR], "251": ["Sodium nitrate", PRESERVATIVE, HIGH, nitR],
    "319": ["TBHQ", ANTIOXIDANT, MEDIUM, "Synthetic antioxidant; keep intake low."],
    "320": ["BHA", ANTIOXIDANT, HIGH, "Classified as possibly carcinogenic to humans (IARC Group 2B)."],
    "321": ["BHT", ANTIOXIDANT, MEDIUM, "Synthetic antioxidant; keep intake low."],
    "407": ["Carrageenan", EMULSIFIER, LOW, "Thickener; may upset digestion in sensitive people."],
    "433": ["Polysorbate 80", EMULSIFIER, LOW, "Emulsifier; early research suggests it may affect gut health."],
    "471": ["Mono- and diglycerides of fatty acids", EMULSIFIER, LOW, "Emulsifier typical of ultra-processed foods."],
    "621": ["Monosodium glutamate (MSG)", FLAVOUR_ENHANCER, LOW, enhR], "627": ["Disodium guanylate", FLAVOUR_ENHANCER, LOW, enhR],
    "631": ["Disodium inosinate", FLAVOUR_ENHANCER, LOW, enhR], "635": ["Disodium 5'-ribonucleotides", FLAVOUR_ENHANCER, LOW, enhR],
    "950": ["Acesulfame potassium", SWEETENER, MEDIUM, "Artificial sweetener."],
    "951": ["Aspartame", SWEETENER, MEDIUM, "Artificial sweetener; IARC 'possibly carcinogenic' (2B); not suitable for people with PKU."],
    "954": ["Saccharin", SWEETENER, MEDIUM, "Artificial sweetener."], "955": ["Sucralose", SWEETENER, MEDIUM, "Artificial sweetener."],
  };
  const SUGAR_WORDS = ["high fructose corn syrup", "corn syrup", "glucose syrup", "liquid glucose", "invert sugar", "invert syrup",
    "brown sugar", "cane sugar", "malt extract", "maltodextrin", "dextrose", "sucrose", "fructose", "jaggery", "honey", "glucose", "sugar"];
  const FLOUR_WORDS = ["refined wheat flour", "maida"], TRANS_WORDS = ["hydrogenated", "vanaspati", "interesterified"];
  const PALM_WORDS = ["palm oil", "palmolein", "palm olein", "palm fat"], CAFF_WORDS = ["caffeine"];
  const ARTFLAV_WORDS = ["artificial flavouring", "artificial flavoring", "artificial flavour", "artificial flavor",
    "nature identical flavouring", "nature identical flavoring", "nature-identical flavouring"];
  const ALLERGEN_WORDS = {
    "milk": ["milk", "milk solids", "whey", "casein", "butter", "ghee", "cheese", "cream", "lactose", "curd", "paneer", "khoa", "yogurt", "yoghurt"],
    "peanuts": ["peanut", "groundnut"],
    "tree nuts": ["almond", "cashew", "walnut", "pistachio", "hazelnut", "pecan", "macadamia"],
    "gluten": ["wheat", "maida", "atta", "barley", "rye", "semolina", "sooji", "suji", "gluten"],
    "soy": ["soy", "soya", "soybean"], "egg": ["egg"], "sesame": ["sesame", "til"], "fish": ["fish"],
    "crustaceans": ["shrimp", "prawn", "crab", "lobster"], "mustard": ["mustard"],
  };
  const OFF_ALLERGENS = { milk: "milk", peanuts: "peanuts", nuts: "tree nuts", gluten: "gluten", soybeans: "soy",
    eggs: "egg", "sesame-seeds": "sesame", fish: "fish", crustaceans: "crustaceans", mustard: "mustard" };
  const NON_DAIRY = ["cocoa butter", "peanut butter", "nut butter", "shea butter", "kokum butter", "mango butter"];

  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const normalise = (t) => (t == null ? "" : String(t).toLowerCase().replace(/_/g, " "));

  function findWords(text, words) {
    const found = [];
    if (!text) return found;
    let rem = text;
    for (const w of words) {
      const re = new RegExp("\\b" + esc(w) + "(?:s|es)?\\b", "g");
      if (re.test(rem)) { found.push(w); rem = rem.replace(re, " "); }
    }
    return found;
  }

  function findCodes(text, csv) {
    const codes = new Set();
    const re = /(?:\b(?:ins|e)\s*-?\s*|[(,&/]\s*|\bor\s+)(\d{3,4}[a-d]?)\b(?!\s*(?:%|g\b|mg|mcg|ml|kg|kcal|kj))/g;
    let m;
    while ((m = re.exec(text)) !== null) codes.add(m[1]);
    if (csv) for (const raw of csv.split(",")) {
      const c = raw.trim().toLowerCase().replace(/^[a-z]{2}:/, "").replace(/^(?:e|ins)\s*-?/, "");
      if (c) codes.add(c);
    }
    return codes;
  }

  function analyze(ingredientsText, additivesCsv) {
    const text = normalise(ingredientsText), flags = [];
    const sugars = findWords(text, SUGAR_WORDS);
    if (sugars.length) flags.push({ name: sugars.join(", "), category: ADDED_SUGAR, severity: MEDIUM,
      reason: "Contains added sugar" + (sugars.length > 1 ? " in " + sugars.length + " forms" : "") + "." });
    if (findWords(text, FLOUR_WORDS).length) flags.push({ name: "Refined wheat flour (maida)", category: REFINED_FLOUR, severity: MEDIUM,
      reason: "Low in fibre and raises blood sugar quickly." });
    if (findWords(text, TRANS_WORDS).length) flags.push({ name: "Hydrogenated / interesterified fat", category: TRANS_FAT, severity: HIGH,
      reason: "May contain trans fats, which raise the risk of heart disease." });
    if (findWords(text, PALM_WORDS).length) flags.push({ name: "Palm oil", category: PALM_OIL, severity: LOW, reason: "High in saturated fat." });
    if (findWords(text, CAFF_WORDS).length) flags.push({ name: "Caffeine", category: CAFFEINE, severity: LOW,
      reason: "Not recommended for children; limit during pregnancy." });
    if (findWords(text, ARTFLAV_WORDS).length) flags.push({ name: "Artificial / nature-identical flavouring", category: ARTIFICIAL_FLAVOUR, severity: LOW,
      reason: "Added flavour, typical of highly processed foods." });
    for (const code of findCodes(text, additivesCsv)) {
      const a = ADD[code] || ADD[code.replace(/[^0-9].*$/, "")];
      if (a) flags.push({ name: a[0] + " (INS " + code + ")", category: a[1], severity: a[2], reason: a[3] });
    }
    return flags;
  }

  function splitTraces(text) {
    const m = /\bmay (?:also )?contain\b|\btraces? of\b/.exec(text);
    return m ? [text.slice(0, m.index), text.slice(m.index)] : [text, ""];
  }

  function allergensIn(text) {
    const found = [];
    for (const [name, words] of Object.entries(ALLERGEN_WORDS)) {
      let t = text;
      if (name === "milk") for (const ph of NON_DAIRY) t = t.split(ph).join(" ");
      if (findWords(t, words).length) found.push(name);
    }
    return found;
  }

  function detectAllergens(ingredientsText, csv) {
    const found = new Set(allergensIn(splitTraces(normalise(ingredientsText))[0]));
    if (csv) for (const raw of csv.split(",")) {
      const tag = raw.trim().toLowerCase().replace(/^[a-z]{2}:/, "");
      const name = OFF_ALLERGENS[tag] || (ALLERGEN_WORDS[tag] ? tag : null);
      if (name) found.add(name);
    }
    return [...found];
  }

  function detectTraces(ingredientsText, contains) {
    return allergensIn(splitTraces(normalise(ingredientsText))[1]).filter((a) => !contains.includes(a));
  }

  // ---------- scoring ----------
  const FOOD = { sugar: [5.0, 22.5], fat: [3.0, 17.5], saturatedFat: [1.5, 5.0], salt: [0.3, 1.5] };
  const DRINK = { sugar: [2.5, 11.25], fat: [1.5, 8.75], saturatedFat: [0.75, 2.5], salt: [0.3, 0.75] };
  const level = (t, v) => (v <= t[0] ? LOW : v > t[1] ? HIGH : MEDIUM);
  const isDrink = (p) => /beverage|drink|juice|soda|cola/.test((p.category || "").toLowerCase());
  const fmt = (v) => (v == null ? "?" : Number.isInteger(v) ? String(v) : v.toFixed(1));
  const kcal = (v) => (v == null ? "?" : String(Math.round(v)));
  const has = (flags, c) => flags.some((f) => f.category === c);
  const atLeastMedium = (l) => l === MEDIUM || l === HIGH;

  function calculate(p, flags) {
    const drink = isDrink(p), t = drink ? DRINK : FOOD, levels = {};
    for (const k of ["sugar", "fat", "saturatedFat", "salt"]) if (p[k] != null) levels[k] = level(t[k], p[k]);
    const missing = [];
    if (p.sugar == null) missing.push("sugar");
    if (p.saturatedFat == null) missing.push("saturated fat");
    if (p.salt == null) missing.push("salt");
    if (missing.length) return { score: null, label: "Not enough data", dataComplete: false, nutrientLevels: levels,
      reasons: ["Missing nutrition values: " + missing.join(", ") + ", so we can't rate it yet."] };

    let score = 5.0; const reasons = [];
    const pen = (lv, high, med, what) => {
      if (lv === HIGH) { reasons.push("High in " + what); return high; }
      if (lv === MEDIUM && med > 0) { reasons.push("Moderate " + what); return med; }
      return 0;
    };
    const veryHigh = (v, th, what) => (v != null && v > th[1] * 2 ? (reasons.push("Very high in " + what), 0.5) : 0);

    score -= drink ? pen(levels.sugar, 2.5, 2.0, "sugar") : pen(levels.sugar, 1.5, 0.5, "sugar");
    if (drink && p.sugar > 5) { score -= 1.0; reasons.push("Sugary drink (" + fmt(p.sugar) + " g sugar per 100 ml)"); }
    score -= pen(levels.saturatedFat, 1.0, 0.5, "saturated fat");
    score -= pen(levels.salt, 1.0, 0.5, "salt");
    score -= pen(levels.fat, 0.5, 0.0, "total fat");
    if (!drink) score -= veryHigh(p.sugar, t.sugar, "sugar");
    score -= veryHigh(p.saturatedFat, t.saturatedFat, "saturated fat");
    score -= veryHigh(p.salt, t.salt, "salt");

    if (!drink && p.energyKcal != null && p.energyKcal > 500) { score -= 1.0; reasons.push("Very energy-dense (" + kcal(p.energyKcal) + " kcal per 100 g)"); }
    else if (!drink && p.energyKcal != null && p.energyKcal > 400) { score -= 0.5; reasons.push("Energy-dense (" + kcal(p.energyKcal) + " kcal per 100 g)"); }

    let fp = 0;
    for (const f of flags) {
      if (f.category === ADDED_SUGAR) continue;
      if (f.severity === HIGH) fp += 0.5; else if (f.severity === MEDIUM) fp += 0.25;
    }
    fp = Math.min(fp, 1.5);
    if (fp > 0) { score -= fp; reasons.push("Ingredients of concern (see list below)"); }

    const highCount = ["sugar", "saturatedFat", "salt"].filter((k) => levels[k] === HIGH).length;
    const bonus = !drink && highCount < 2;
    if (bonus && p.fiber != null && p.fiber >= 6) { score += 0.5; reasons.push("High in fibre"); }
    else if (bonus && p.fiber != null && p.fiber >= 3) { score += 0.25; reasons.push("Source of fibre"); }
    if (bonus && p.protein != null && p.protein >= 10) { score += 0.25; reasons.push("Good source of protein"); }

    score = Math.max(1.0, Math.min(5.0, score));
    score = Math.round(score * 2) / 2.0;
    if (!reasons.length) reasons.push("Low in sugar, saturated fat and salt");
    const label = score >= 4.5 ? "Excellent" : score >= 3.5 ? "Good" : score >= 2.5 ? "Okay in moderation" : score >= 1.5 ? "Poor" : "Limit";
    return { score, label, dataComplete: true, nutrientLevels: levels, reasons };
  }

  function personalWarnings(p, profile, flags, allergens, traces, levels) {
    const w = [], per = isDrink(p) ? "per 100 ml" : "per 100 g";
    const hasC = (c) => profile.conditions.includes(c);
    for (const a of allergens) if (profile.allergies.includes(a)) w.push("Contains " + a + ", which is in your allergy list.");
    for (const a of traces) if (profile.allergies.includes(a)) w.push("May contain traces of " + a + " (in your allergy list).");
    if (profile.allergies.length && !(p.ingredientsText || "").trim()) w.push("Ingredient list is missing. Check the pack for allergens before eating.");
    if (hasC("diabetes")) {
      if (p.sugar != null && p.sugar > 5) w.push("Diabetes: " + fmt(p.sugar) + " g sugar " + per + ".");
      if (has(flags, ADDED_SUGAR)) w.push("Diabetes: contains added sugars.");
      if (has(flags, REFINED_FLOUR)) w.push("Diabetes: refined flour can spike blood sugar.");
    }
    if (hasC("hypertension") && atLeastMedium(levels.salt)) w.push("Blood pressure: " + fmt(p.salt) + " g salt " + per + ".");
    if (hasC("heart")) {
      if (atLeastMedium(levels.saturatedFat)) w.push("Heart health: " + fmt(p.saturatedFat) + " g saturated fat " + per + ".");
      if (has(flags, TRANS_FAT)) w.push("Heart health: may contain trans fats.");
    }
    if (hasC("weight_loss")) {
      if (p.energyKcal != null && p.energyKcal > 350) w.push("Weight loss: " + kcal(p.energyKcal) + " kcal " + per + " is high.");
      if (levels.sugar === HIGH || levels.fat === HIGH) w.push("Weight loss: high in sugar or fat.");
    }
    if (hasC("pregnancy")) {
      if (has(flags, CAFFEINE)) w.push("Pregnancy: contains caffeine. Keep total daily intake low.");
      if (has(flags, SWEETENER)) w.push("Pregnancy: contains artificial sweeteners. Ask your doctor.");
    }
    if (hasC("kids")) {
      if (has(flags, COLOUR)) w.push("Children: contains synthetic colours.");
      if (has(flags, CAFFEINE)) w.push("Children: contains caffeine.");
    }
    return w;
  }

  function toResponse(p, profile) {
    const flags = analyze(p.ingredientsText, p.additives);
    const allergens = detectAllergens(p.ingredientsText, p.allergens);
    const traces = detectTraces(p.ingredientsText, allergens);
    const s = calculate(p, flags);
    return {
      id: null, barcode: p.barcode, name: p.name, brand: p.brand, category: p.category, imageUrl: p.imageUrl,
      ingredientsText: p.ingredientsText,
      nutrition: { energyKcal: p.energyKcal, sugar: p.sugar, fat: p.fat, saturatedFat: p.saturatedFat, salt: p.salt, fiber: p.fiber, protein: p.protein },
      score: s.score, scoreLabel: s.label, dataComplete: s.dataComplete, nutrientLevels: s.nutrientLevels, scoreReasons: s.reasons,
      flags, allergens, mayContain: traces, personalWarnings: personalWarnings(p, profile, flags, allergens, traces, s.nutrientLevels),
      source: p.source, sourceUrl: p.source === "OPEN_FOOD_FACTS" ? "https://world.openfoodfacts.org/product/" + p.barcode : null,
      status: "APPROVED",
    };
  }

  // ---------- Open Food Facts ----------
  const FIELDS = "product_name,product_name_en,brands,categories,ingredients_text,ingredients_text_en,nutriments,additives_tags,allergens_tags,image_front_url,image_url";
  const decodeHtml = (s) => s.replace(/&(#\d+|quot|amp|apos|#39|lt|gt|nbsp);/g, (_, e) =>
    ({ quot: '"', amp: "&", apos: "'", "#39": "'", lt: "<", gt: ">", nbsp: " " }[e] || String.fromCharCode(parseInt(e.slice(1), 10))));
  const text = (o, k) => { const v = o[k]; if (v == null) return null; const s = decodeHtml(String(v)).trim(); return s || null; };
  const num = (o, k) => { const v = o[k]; if (v == null || v === "") return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
  const joinArr = (a) => (Array.isArray(a) && a.length ? a.join(",") : null);

  function energyKcal(kc, kj) {
    const fromKj = kj == null ? null : Math.round((kj / 4.184) * 10) / 10;
    if (kc == null) return fromKj;
    if (fromKj != null && fromKj > 0 && Math.abs(kc - fromKj) / fromKj > 0.25) return fromKj;
    return Math.round(kc * 10) / 10;
  }

  function offToProduct(barcode, j) {
    const n = j.nutriments || {};
    let salt = num(n, "salt_100g");
    if (salt == null) { const na = num(n, "sodium_100g"); salt = na == null ? null : Math.round(na * 2.5 * 1000) / 1000; }
    return {
      barcode, name: text(j, "product_name_en") || text(j, "product_name") || "Unknown product",
      brand: text(j, "brands"), category: text(j, "categories"),
      ingredientsText: text(j, "ingredients_text_en") || text(j, "ingredients_text"),
      additives: joinArr(j.additives_tags), allergens: joinArr(j.allergens_tags),
      imageUrl: text(j, "image_front_url") || text(j, "image_url"),
      energyKcal: energyKcal(num(n, "energy-kcal_100g"), num(n, "energy_100g")),
      sugar: num(n, "sugars_100g"), fat: num(n, "fat_100g"), saturatedFat: num(n, "saturated-fat_100g"),
      salt, fiber: num(n, "fiber_100g"), protein: num(n, "proteins_100g"), source: "OPEN_FOOD_FACTS",
    };
  }

  const apiError = (status, code, message, details) => Object.assign(new Error(message), { status, code, details: details || [] });

  async function fetchOff(barcode) {
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 9000);
    try {
      const res = await fetch("https://world.openfoodfacts.org/api/v2/product/" + barcode + "?fields=" + FIELDS, { signal: ctl.signal });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("bad status");
      const body = await res.json();
      return body && body.status === 1 ? offToProduct(barcode, body.product || {}) : null;
    } catch (e) {
      throw apiError(0, "NETWORK", "Could not reach the Open Food Facts database. Check your internet connection and try again.");
    } finally { clearTimeout(timer); }
  }

  // Products you add yourself are kept in this browser only.
  const customKey = (b) => "truthscan.custom." + b;
  function loadCustom(b) { try { return JSON.parse(localStorage.getItem(customKey(b))); } catch (e) { return null; } }

  const csv = (s) => (s ? s.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean) : []);

  function addProduct(d) {
    const errs = [];
    if (!/^\d{8,14}$/.test(d.barcode || "")) errs.push("barcode: Barcode must be 8 to 14 digits");
    if (!d.name) errs.push("name: must not be blank");
    const range = (k, max) => { if (d[k] != null && (!(d[k] >= 0) || d[k] > max)) errs.push(k + ": must be between 0 and " + max); };
    range("energyKcal", 900);
    ["sugar", "fat", "saturatedFat", "salt", "fiber", "protein"].forEach((k) => range(k, 100));
    if (errs.length) throw apiError(400, "VALIDATION_FAILED", "Please check the highlighted fields", errs);
    const p = { ...d, imageUrl: null, additives: null, source: "USER" };
    try { localStorage.setItem(customKey(d.barcode), JSON.stringify(p)); }
    catch (e) { throw apiError(0, "STORAGE", "Your browser blocked saving. Allow site data and try again."); }
    return toResponse(p, { conditions: [], allergies: [] });
  }

  /** Same call the pages always used, now answered in the browser. */
  async function api(path, options) {
    options = options || {};
    const url = new URL(path, "http://local"), method = (options.method || "GET").toUpperCase();
    const m = url.pathname.match(/^\/api\/products\/(\d{8,14})$/);
    if (m && method === "GET") {
      const profile = { conditions: csv(url.searchParams.get("conditions")), allergies: csv(url.searchParams.get("allergies")) };
      const p = loadCustom(m[1]) || (await fetchOff(m[1]));
      if (!p) throw apiError(404, "NOT_FOUND", "This barcode isn't in the Open Food Facts database yet.");
      return toResponse(p, profile);
    }
    if (url.pathname === "/api/products" && method === "POST") return addProduct(typeof options.body === "string" ? JSON.parse(options.body) : options.body);
    throw apiError(404, "NOT_FOUND", "Not available in this version.");
  }

  root.api = api;
  root.TruthEngine = { analyze, detectAllergens, detectTraces, calculate, personalWarnings, offToProduct };
})(typeof window !== "undefined" ? window : globalThis);
