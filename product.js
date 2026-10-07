/* Product page: shows the rating, nutrition, flagged ingredients and personal warnings. */

const loadingEl = document.getElementById("loading");
const errorEl = document.getElementById("error");
const productEl = document.getElementById("product");

const NUTRIENTS = [
  ["energyKcal", "Energy", "kcal"],
  ["sugar", "Sugar", "g"],
  ["fat", "Fat", "g"],
  ["saturatedFat", "Saturated fat", "g"],
  ["salt", "Salt", "g"],
  ["fiber", "Fibre", "g"],
  ["protein", "Protein", "g"],
];

async function load() {
  const barcode = new URLSearchParams(location.search).get("barcode");
  if (!barcode) {
    showError("No barcode given.", false);
    return;
  }

  try {
    const query = profileQuery();
    const p = await api("/api/products/" + encodeURIComponent(barcode) + query);
    render(p);
  } catch (e) {
    if (e.code === "NOT_FOUND") {
      showError(`${escapeHtml(e.message)}<br><br>
        <a class="btn" href="submit.html?barcode=${encodeURIComponent(barcode)}">Add this product</a>`, true);
    } else if (e.code === "PENDING_REVIEW") {
      showError(escapeHtml(e.message), true, "warn");
    } else {
      showError(escapeHtml(e.message), true);
    }
  } finally {
    loadingEl.classList.add("hidden");
  }
}

function showError(html, isHtml, kind = "error") {
  errorEl.className = "card";
  errorEl.innerHTML = `<div class="notice ${kind}">${isHtml ? html : escapeHtml(html)}</div>`;
}

function render(p) {
  document.title = `${p.name} – TruthScan`;

  const flags = p.flags.length
    ? p.flags.map((f) => `
        <div class="flag">
          <strong>${escapeHtml(f.name)} <span class="pill ${f.severity}">${f.severity}</span></strong>
          <span class="muted small">${escapeHtml(f.category)}</span> — ${escapeHtml(f.reason)}
        </div>`).join("")
    : `<p class="muted">Nothing of concern found${p.ingredientsText ? "" : " (ingredient list missing)"}.</p>`;

  const nutritionRows = NUTRIENTS.map(([key, label, unit]) => {
    const level = p.nutrientLevels[key];
    return `<tr>
      <td>${label}</td>
      <td class="num">${key === "energyKcal" && p.nutrition[key] != null
        ? Math.round(p.nutrition[key]) + " kcal"
        : formatNumber(p.nutrition[key], unit)}</td>
      <td style="width:90px">${level ? `<span class="pill ${level}">${level}</span>` : ""}</td>
    </tr>`;
  }).join("");

  const warnings = p.personalWarnings.length
    ? `<section class="card">
         <h2>For you</h2>
         ${p.personalWarnings.map((w) => `<div class="notice warn">${escapeHtml(w)}</div>`).join("")}
       </section>`
    : (getProfile().conditions.length || getProfile().allergies.length
        ? ""
        : `<div class="notice small">Get warnings for your health needs: <a href="profile.html">set up your profile</a>.</div>`);

  const tags = (list) => `<div class="tags">${list.map((a) => `<span class="tag">${escapeHtml(a)}</span>`).join("")}</div>`;
  const allergens = (p.allergens.length
      ? `<p class="small" style="margin:0 0 6px"><strong>Contains</strong></p>${tags(p.allergens)}`
      : `<p class="muted">None detected. Always check the pack if you have an allergy.</p>`)
    + (p.mayContain && p.mayContain.length
      ? `<p class="small" style="margin:14px 0 6px"><strong>May contain traces of</strong></p>${tags(p.mayContain)}`
      : "");

  const source = p.source === "OPEN_FOOD_FACTS"
    ? `Data from <a href="${escapeHtml(p.sourceUrl)}" target="_blank" rel="noopener">Open Food Facts</a> (ODbL). Spotted a mistake? You can fix it there.`
    : "Entered by you and saved on this device only. Nobody else has checked it.";

  productEl.innerHTML = `
    <section class="card">
      <div class="product-head">
        ${p.imageUrl ? `<img src="${escapeHtml(p.imageUrl)}" alt="${escapeHtml(p.name)}" onerror="this.remove()">` : ""}
        <div class="info">
          <h1>${escapeHtml(p.name)}</h1>
          <div class="muted">${escapeHtml(p.brand || "Unknown brand")} · ${escapeHtml(p.barcode)}</div>
          <div class="score ${scoreClass(p.score)}">
            <span class="value">${p.score ?? "?"}</span>
            <span><span class="label">${escapeHtml(p.scoreLabel)}</span><br><span class="small">out of 5</span></span>
          </div>
        </div>
      </div>
      <h2 style="margin-top:18px">Why this rating</h2>
      <ul class="reasons">${p.scoreReasons.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}</ul>
    </section>

    ${warnings}

    <section class="card">
      <h2>Nutrition per 100 g / 100 ml</h2>
      <table>${nutritionRows}</table>
    </section>

    <section class="card">
      <h2>Ingredients to know about</h2>
      ${flags}
    </section>

    <section class="card">
      <h2>Allergens</h2>
      ${allergens}
    </section>

    <section class="card">
      <h2>Full ingredient list</h2>
      <p>${p.ingredientsText ? escapeHtml(p.ingredientsText) : '<span class="muted">Not available.</span>'}</p>
      <p class="muted small">${source}</p>
    </section>`;

  productEl.classList.remove("hidden");
}

load();
