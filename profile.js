/* Health profile page. The profile lives only in this browser (localStorage). */

const conditionsEl = document.getElementById("conditions");
const allergiesEl = document.getElementById("allergies");
const savedEl = document.getElementById("saved");

function checkbox(group, value, label, checked) {
  return `<label class="check">
    <input type="checkbox" name="${group}" value="${escapeHtml(value)}" ${checked ? "checked" : ""}>
    ${escapeHtml(label)}
  </label>`;
}

function render() {
  const profile = getProfile();
  conditionsEl.innerHTML = Object.entries(CONDITIONS)
    .map(([key, label]) => checkbox("conditions", key, label, profile.conditions.includes(key)))
    .join("");
  allergiesEl.innerHTML = ALLERGENS
    .map((a) => checkbox("allergies", a, a.charAt(0).toUpperCase() + a.slice(1), profile.allergies.includes(a)))
    .join("");
}

function selected(group) {
  return [...document.querySelectorAll(`input[name="${group}"]:checked`)].map((i) => i.value);
}

document.getElementById("profileForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const ok = saveProfile({ conditions: selected("conditions"), allergies: selected("allergies") });
  savedEl.textContent = ok
    ? "Saved. Product pages will now show warnings for you."
    : "Couldn't save. Your browser may be blocking storage (private mode?).";
  savedEl.className = "notice" + (ok ? "" : " error");
});

document.getElementById("clearBtn").addEventListener("click", () => {
  saveProfile({ conditions: [], allergies: [] });
  render();
  savedEl.textContent = "Profile cleared.";
  savedEl.className = "notice";
});

render();
