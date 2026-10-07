/* Add-product form. */

const form = document.getElementById("submitForm");
const message = document.getElementById("formMessage");
const submitBtn = document.getElementById("submitBtn");

const NUMBER_FIELDS = ["energyKcal", "sugar", "fat", "saturatedFat", "salt", "fiber", "protein"];
const TEXT_FIELDS = ["barcode", "name", "brand", "category", "ingredientsText", "allergens"];

// Pre-fill the barcode when coming from a "not found" product page
const preset = new URLSearchParams(location.search).get("barcode");
if (preset) document.getElementById("barcode").value = preset;

function showMessage(html, kind) {
  message.className = "notice " + (kind || "");
  message.innerHTML = html;
  message.scrollIntoView({ behavior: "smooth", block: "center" });
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {};
  TEXT_FIELDS.forEach((f) => {
    const v = form.elements[f].value.trim();
    data[f] = v === "" ? null : v;
  });
  NUMBER_FIELDS.forEach((f) => {
    const v = form.elements[f].value;
    data[f] = v === "" ? null : Number(v);
  });

  if (!data.barcode || !/^\d{8,14}$/.test(data.barcode)) {
    showMessage("Please enter a barcode of 8 to 14 digits.", "error");
    return;
  }
  if (!data.name) {
    showMessage("Please enter the product name.", "error");
    return;
  }

  submitBtn.disabled = true;
  try {
    await api("/api/products", { method: "POST", body: data });
    location.href = productUrl(data.barcode);
  } catch (err) {
    const details = err.details && err.details.length
      ? "<ul>" + err.details.map((d) => `<li>${escapeHtml(d)}</li>`).join("") + "</ul>"
      : "";
    showMessage(escapeHtml(err.message) + details, "error");
  } finally {
    submitBtn.disabled = false;
  }
});
