\
const volumes = [
  { id: 1, date: "July 2026", status: "available" },
  { id: 2, date: "", status: "soon" },
  { id: 3, date: "", status: "soon" },
  { id: 4, date: "", status: "soon" }
];

const archive = document.getElementById("archive");
archive.innerHTML = volumes.map((v) => {
  if (v.status === "available") {
    return `<button class="vol-card active js-open" type="button">
      <strong>VOL.${String(v.id).padStart(2, "0")}</strong>
      <span>${v.date} · Available</span>
    </button>`;
  }
  return `<div class="vol-card">
    <strong>VOL.${String(v.id).padStart(2, "0")}</strong>
    <span>Coming Soon</span>
  </div>`;
}).join("");

const root = document.documentElement;
const dev = document.getElementById("dev");
document.getElementById("devToggle").addEventListener("click", () => dev.classList.toggle("open"));

document.getElementById("accent").addEventListener("input", (event) => {
  const hex = event.target.value;
  const value = parseInt(hex.slice(1), 16);
  const r = value >> 16;
  const g = (value >> 8) & 255;
  const b = value & 255;
  root.style.setProperty("--accent", hex);
  root.style.setProperty("--accent-rgb", `${r},${g},${b}`);
});

document.getElementById("density").addEventListener("change", (event) => {
  document.body.classList.toggle("compact", event.target.value === "compact");
});

(() => {
  const viewer = document.getElementById("viewer");
  const canvas = document.getElementById("canvas");
  const img = document.getElementById("newsletter");
  const label = document.getElementById("zoomLabel");
  const loading = document.getElementById("loading");

  let imageWidth = 1365;
  let imageHeight = 2048;
  let scale = 1;
  let x = 0;
  let y = 0;
  let minScale = 0.1;
  const maxScale = 6;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let pinchStart = 0;
  let pinchScale = 1;
  let imageReady = false;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function render() {
    img.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
    label.textContent = `${Math.round(scale * 100)}%`;
  }

  function fit() {
    if (!imageReady) return;
    const pad = window.innerWidth < 680 ? 18 : 30;
    minScale = Math.min(
      (canvas.clientWidth - pad * 2) / imageWidth,
      (canvas.clientHeight - pad * 2) / imageHeight
    );
    scale = minScale;
    x = (canvas.clientWidth - imageWidth * scale) / 2;
    y = (canvas.clientHeight - imageHeight * scale) / 2;
    render();
  }

  function actualSize(centerX = canvas.clientWidth / 2, centerY = canvas.clientHeight / 2) {
    zoomAt(1, centerX, centerY);
  }

  function zoomAt(nextScale, centerX, centerY) {
    if (!imageReady) return;
    const next = clamp(nextScale, minScale, maxScale);
    const imageX = (centerX - x) / scale;
    const imageY = (centerY - y) / scale;
    x = centerX - imageX * next;
    y = centerY - imageY * next;
    scale = next;
    render();
  }

  function loadOriginal() {
    return new Promise((resolve, reject) => {
      if (imageReady) return resolve();
      img.onload = () => {
        imageWidth = img.naturalWidth;
        imageHeight = img.naturalHeight;
        img.width = imageWidth;
        img.height = imageHeight;
        imageReady = true;
        loading.classList.add("hidden");
        resolve();
      };
      img.onerror = reject;
      img.src = img.dataset.src;
    });
  }

  async function openViewer() {
    viewer.classList.add("open");
    viewer.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    try {
      await loadOriginal();
      requestAnimationFrame(fit);
    } catch (error) {
      loading.textContent = "Unable to load image";
      console.error(error);
    }

    try {
      if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch (_) {
      // Fullscreen can be blocked by the browser; the overlay still works.
    }
  }

  function closeViewer() {
    viewer.classList.remove("open");
    viewer.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }

  document.addEventListener("click", (event) => {
    if (event.target.closest(".js-open")) openViewer();
  });

  document.getElementById("close").addEventListener("click", closeViewer);
  document.getElementById("fit").addEventListener("click", fit);
  document.getElementById("actual").addEventListener("click", () => actualSize());
  label.addEventListener("click", fit);

  document.getElementById("zoomIn").addEventListener("click", () => {
    zoomAt(scale * 1.25, canvas.clientWidth / 2, canvas.clientHeight / 2);
  });

  document.getElementById("zoomOut").addEventListener("click", () => {
    zoomAt(scale / 1.25, canvas.clientWidth / 2, canvas.clientHeight / 2);
  });

  canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    zoomAt(
      scale * Math.exp(-event.deltaY * 0.0015),
      event.clientX - rect.left,
      event.clientY - rect.top
    );
  }, { passive: false });

  canvas.addEventListener("dblclick", (event) => {
    const rect = canvas.getBoundingClientRect();
    if (Math.abs(scale - 1) < 0.04) {
      fit();
    } else {
      actualSize(event.clientX - rect.left, event.clientY - rect.top);
    }
  });

  canvas.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "touch") return;
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add("dragging");
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    x += event.clientX - lastX;
    y += event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
    render();
  });

  function stopDragging() {
    dragging = false;
    canvas.classList.remove("dragging");
  }

  canvas.addEventListener("pointerup", stopDragging);
  canvas.addEventListener("pointercancel", stopDragging);

  canvas.addEventListener("touchstart", (event) => {
    if (event.touches.length === 1) {
      dragging = true;
      lastX = event.touches[0].clientX;
      lastY = event.touches[0].clientY;
    } else if (event.touches.length === 2) {
      dragging = false;
      pinchStart = Math.hypot(
        event.touches[0].clientX - event.touches[1].clientX,
        event.touches[0].clientY - event.touches[1].clientY
      );
      pinchScale = scale;
    }
  }, { passive: false });

  canvas.addEventListener("touchmove", (event) => {
    event.preventDefault();

    if (event.touches.length === 1 && dragging) {
      x += event.touches[0].clientX - lastX;
      y += event.touches[0].clientY - lastY;
      lastX = event.touches[0].clientX;
      lastY = event.touches[0].clientY;
      render();
    } else if (event.touches.length === 2) {
      const distance = Math.hypot(
        event.touches[0].clientX - event.touches[1].clientX,
        event.touches[0].clientY - event.touches[1].clientY
      );
      const rect = canvas.getBoundingClientRect();
      const centerX = (event.touches[0].clientX + event.touches[1].clientX) / 2 - rect.left;
      const centerY = (event.touches[0].clientY + event.touches[1].clientY) / 2 - rect.top;
      zoomAt(pinchScale * distance / pinchStart, centerX, centerY);
    }
  }, { passive: false });

  canvas.addEventListener("touchend", () => { dragging = false; });

  window.addEventListener("keydown", (event) => {
    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "d") {
      dev.classList.toggle("open");
    }
    if (!viewer.classList.contains("open")) return;

    if (event.key === "Escape") closeViewer();
    if (event.key === "+" || event.key === "=") document.getElementById("zoomIn").click();
    if (event.key === "-") document.getElementById("zoomOut").click();
    if (event.key === "0") fit();
    if (event.key === "1") actualSize();
  });

  window.addEventListener("resize", () => {
    if (viewer.classList.contains("open")) fit();
  });

  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement && viewer.classList.contains("open")) {
      requestAnimationFrame(fit);
    }
  });
})();
