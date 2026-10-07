/* Shared helpers used by every page. */

/** Health conditions the visitor can pick on profile.html (keys match the backend). */
const CONDITIONS = {
  diabetes: "Diabetes / blood sugar",
  hypertension: "High blood pressure",
  heart: "Heart health / cholesterol",
  weight_loss: "Weight loss",
  pregnancy: "Pregnancy",
  kids: "Buying for children",
};

/** Allergens (keys match IngredientAnalyzer on the backend). */
const ALLERGENS = ["milk", "peanuts", "tree nuts", "gluten", "soy", "egg", "sesame", "fish", "crustaceans", "mustard"];

/* ---------- Health profile (stored only in this browser) ---------- */

function getProfile() {
  try {
    const saved = JSON.parse(localStorage.getItem("truthscan.profile"));
    if (saved && Array.isArray(saved.conditions) && Array.isArray(saved.allergies)) return saved;
  } catch (e) { /* storage blocked or corrupted */ }
  return { conditions: [], allergies: [] };
}

function saveProfile(profile) {
  try {
    localStorage.setItem("truthscan.profile", JSON.stringify(profile));
    return true;
  } catch (e) {
    return false;
  }
}

function profileQuery() {
  const p = getProfile();
  const params = new URLSearchParams();
  if (p.conditions.length) params.set("conditions", p.conditions.join(","));
  if (p.allergies.length) params.set("allergies", p.allergies.join(","));
  const q = params.toString();
  return q ? "?" + q : "";
}

/* ---------- Small utilities ---------- */

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatNumber(value, unit) {
  if (value === null || value === undefined) return "—";
  const n = Number(value);
  const text = Number.isInteger(n) ? String(n) : n.toFixed(1);
  return unit ? `${text} ${unit}` : text;
}

/** CSS class for a 1–5 score. */
function scoreClass(score) {
  if (score === null || score === undefined) return "none";
  if (score >= 3.5) return "good";
  if (score >= 2.5) return "ok";
  return "bad";
}

function productUrl(barcode) {
  return "product.html?barcode=" + encodeURIComponent(barcode);
}

/** Highlights the current page in the header menu. */
document.addEventListener("DOMContentLoaded", () => {
  const page = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".site-header nav a").forEach((a) => {
    if (a.getAttribute("href") === page) a.classList.add("active");
  });
});
