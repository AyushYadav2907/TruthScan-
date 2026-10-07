/* Home page: camera scanning, typed barcode and search. */

const readerEl = document.getElementById("reader");
const startBtn = document.getElementById("startScan");
const stopBtn = document.getElementById("stopScan");
const fileInput = document.getElementById("scanFile");
const scanMessage = document.getElementById("scanMessage");

let scanner = null;        // live camera scanner (draws into #reader)
let frameDecoder = null;   // second instance used to decode full-resolution frames
let fullResTimer = null;
let handled = false;       // stop after the first successful read

function formats() {
  const F = Html5QrcodeSupportedFormats;
  return [F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E];
}

function getScanner() {
  if (!window.Html5Qrcode) {
    throw new Error("The scanner library didn't load. Check your connection and refresh.");
  }
  if (!scanner) {
    scanner = new Html5Qrcode("reader", {
      formatsToSupport: formats(),
      // Uses the phone's built-in barcode reader (fast, works from further away) on Android Chrome
      experimentalFeatures: { useBarCodeDetectorIfSupported: true },
      verbose: false,
    });
  }
  return scanner;
}

function getFrameDecoder() {
  if (!frameDecoder) {
    frameDecoder = new Html5Qrcode("frameDecoder", { formatsToSupport: formats(), verbose: false });
  }
  return frameDecoder;
}

function showScanError(text) {
  scanMessage.textContent = text;
  scanMessage.classList.remove("hidden");
}

function onBarcode(code) {
  const digits = String(code).replace(/\D/g, "");
  if (digits.length < 8) return;          // ignore partial reads
  location.href = productUrl(digits);
}

async function handleRead(text) {
  if (handled) return;
  handled = true;
  await stopCamera();
  onBarcode(text);
}

/*
 * The live scanner decodes a downscaled copy of the preview, so small or distant
 * barcodes can be missed. Every 600 ms we also decode the whole camera
 * frame at full resolution, which catches barcodes that aren't held close.
 */
function startFullResolutionScan() {
  let busy = false;
  fullResTimer = setInterval(async () => {
    const video = readerEl.querySelector("video");
    if (busy || handled || !video || !video.videoWidth) return;
    busy = true;
    try {
      // Whole frame: in testing, cropped frames decoded less reliably than the full picture
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d").drawImage(video, 0, 0);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
      const text = await getFrameDecoder().scanFile(new File([blob], "frame.jpg", { type: "image/jpeg" }), false);
      await handleRead(text);
    } catch (e) {
      /* no barcode in this frame */
    } finally {
      busy = false;
    }
  }, 600);
}

async function startCamera() {
  scanMessage.classList.add("hidden");
  handled = false;
  try {
    const s = getScanner();
    readerEl.classList.remove("hidden");
    startBtn.classList.add("hidden");
    stopBtn.classList.remove("hidden");

    await s.start(
      { facingMode: "environment" },          // back camera on phones
      {
        fps: 15,
        // Wide, short box that suits barcodes; sized to the preview
        qrbox: (w, h) => ({ width: Math.floor(w * 0.9), height: Math.floor(Math.min(h * 0.6, w * 0.45)) }),
        videoConstraints: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
      },
      handleRead,
      () => { /* no barcode in this frame yet - ignore */ }
    );
    startFullResolutionScan();
  } catch (e) {
    await stopCamera();
    const msg = String(e && e.message ? e.message : e);
    if (/permission|notallowed/i.test(msg)) {
      showScanError("Camera permission was denied. Allow camera access in your browser settings, or type the barcode below.");
    } else if (location.protocol !== "https:" && location.hostname !== "localhost") {
      showScanError("The camera only works on secure (https://) websites.");
    } else if (/notfound|no camera|requested device/i.test(msg)) {
      showScanError("No camera found. Use 'Scan from photo' or type the barcode below.");
    } else {
      showScanError("Couldn't start the camera: " + msg);
    }
  }
}

async function stopCamera() {
  clearInterval(fullResTimer);
  fullResTimer = null;
  if (scanner && scanner.isScanning) {
    try { await scanner.stop(); } catch (e) { /* already stopped */ }
  }
  readerEl.classList.add("hidden");
  startBtn.classList.remove("hidden");
  stopBtn.classList.add("hidden");
}

startBtn.addEventListener("click", startCamera);
stopBtn.addEventListener("click", stopCamera);

/* Scan a barcode from a saved photo (useful on laptops without a camera). */
fileInput.addEventListener("change", async () => {
  const file = fileInput.files[0];
  if (!file) return;
  scanMessage.classList.add("hidden");
  try {
    await stopCamera();
    const code = await getFrameDecoder().scanFile(file, false);
    onBarcode(code);
  } catch (e) {
    showScanError("No barcode found in that photo. Try a sharper, closer picture.");
  } finally {
    fileInput.value = "";
  }
});

/* Typed barcode */
document.getElementById("barcodeForm").addEventListener("submit", (e) => {
  e.preventDefault();
  onBarcode(document.getElementById("barcodeInput").value);
});
