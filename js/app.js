const viewer = document.getElementById("viewer");
const canvas = document.getElementById("canvas");
const image = document.getElementById("newsletter");
const loading = document.getElementById("loading");
const zoomLabel = document.getElementById("zoomLabel");
const viewerHeading = document.getElementById("viewerHeading");
const viewerMeta = document.getElementById("viewerMeta");

let imageReady = false;
let activeImageSource = "";
let imageWidth = 1365;
let imageHeight = 2048;
let scale = 1;
let minimumScale = .1;
const maximumScale = 6;
let x = 0;
let y = 0;
let dragging = false;
let lastX = 0;
let lastY = 0;
let pinchDistance = 0;
let pinchScale = 1;

const clamp = (value, minimum, maximum) =>
  Math.max(minimum, Math.min(maximum, value));

function render() {
  image.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
  zoomLabel.textContent = `${Math.round(scale * 100)}%`;
}

function prepareImage(source, altText) {
  if (activeImageSource === source && imageReady) return;

  activeImageSource = source;
  imageReady = false;
  loading.classList.remove("hidden");
  loading.innerHTML = "<span></span>Loading original image";
  image.removeAttribute("src");
  image.alt = altText || "Newsletter image";
}

function loadOriginalImage(source) {
  return new Promise((resolve, reject) => {
    if (imageReady && image.src.endsWith(source)) {
      resolve();
      return;
    }

    image.onload = () => {
      imageWidth = image.naturalWidth;
      imageHeight = image.naturalHeight;
      image.width = imageWidth;
      image.height = imageHeight;
      imageReady = true;
      loading.classList.add("hidden");
      resolve();
    };

    image.onerror = () => reject(new Error(`Unable to load image: ${source}`));
    image.src = source;
  });
}

function fitToScreen() {
  if (!imageReady) return;

  const padding = window.innerWidth <= 700 ? 18 : 34;
  minimumScale = Math.min(
    (canvas.clientWidth - padding * 2) / imageWidth,
    (canvas.clientHeight - padding * 2) / imageHeight
  );

  scale = minimumScale * 1.2;
  x = (canvas.clientWidth - imageWidth * scale) / 2;
  y = (canvas.clientHeight - imageHeight * scale) / 2;
  render();
}

function zoomAt(nextScale, centerX, centerY) {
  if (!imageReady) return;

  const boundedScale = clamp(nextScale, minimumScale, maximumScale);
  const imageX = (centerX - x) / scale;
  const imageY = (centerY - y) / scale;

  x = centerX - imageX * boundedScale;
  y = centerY - imageY * boundedScale;
  scale = boundedScale;
  render();
}

function actualSize(centerX = canvas.clientWidth / 2, centerY = canvas.clientHeight / 2) {
  zoomAt(1, centerX, centerY);
}

async function openViewer(trigger) {
  const source = trigger?.dataset.image || "images/newsletter-vol01.png";
  const title = trigger?.dataset.title || "Marketing News";
  const meta = trigger?.dataset.meta || "Volume 01 · July 2026";
  const alt = trigger?.dataset.alt || title;

  viewerHeading.textContent = title;
  viewerMeta.textContent = meta;
  viewer.setAttribute("aria-label", `${title} viewer`);
  prepareImage(source, alt);

  viewer.classList.add("open");
  viewer.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  try {
    await loadOriginalImage(source);
    requestAnimationFrame(() => requestAnimationFrame(fitToScreen));
  } catch (error) {
  loading.innerHTML = "Unable to load image";
  console.error(error);
}
}

function closeViewer() {
  viewer.classList.remove("open");
  viewer.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

document.addEventListener("click", (event) => {
  const trigger = event.target.closest(".js-open");
  if (trigger) openViewer(trigger);
});

document.getElementById("close").addEventListener("click", closeViewer);
document.getElementById("fit").addEventListener("click", fitToScreen);
document.getElementById("actual").addEventListener("click", () => actualSize());

document.getElementById("zoomIn").addEventListener("click", () => {
  zoomAt(scale * 1.25, canvas.clientWidth / 2, canvas.clientHeight / 2);
});

document.getElementById("zoomOut").addEventListener("click", () => {
  zoomAt(scale / 1.25, canvas.clientWidth / 2, canvas.clientHeight / 2);
});

zoomLabel.addEventListener("click", fitToScreen);

canvas.addEventListener("wheel", (event) => {
  event.preventDefault();
  const bounds = canvas.getBoundingClientRect();
  zoomAt(
    scale * Math.exp(-event.deltaY * .00145),
    event.clientX - bounds.left,
    event.clientY - bounds.top
  );
}, { passive:false });

canvas.addEventListener("dblclick", (event) => {
  const bounds = canvas.getBoundingClientRect();
  if (Math.abs(scale - 1) < .04) {
    fitToScreen();
  } else {
    actualSize(event.clientX - bounds.left, event.clientY - bounds.top);
  }
});

canvas.addEventListener("pointerdown", (event) => {
  if (event.pointerType === "touch") return;
  dragging = true;
  lastX = event.clientX;
  lastY = event.clientY;
  canvas.classList.add("dragging");
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener("pointermove", (event) => {
  if (!dragging) return;
  x += event.clientX - lastX;
  y += event.clientY - lastY;
  lastX = event.clientX;
  lastY = event.clientY;
  render();
});

function endDrag() {
  dragging = false;
  canvas.classList.remove("dragging");
}

canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", endDrag);

canvas.addEventListener("touchstart", (event) => {
  if (event.touches.length === 1) {
    dragging = true;
    lastX = event.touches[0].clientX;
    lastY = event.touches[0].clientY;
  }
  if (event.touches.length === 2) {
    dragging = false;
    pinchDistance = Math.hypot(
      event.touches[0].clientX - event.touches[1].clientX,
      event.touches[0].clientY - event.touches[1].clientY
    );
    pinchScale = scale;
  }
}, { passive:false });

canvas.addEventListener("touchmove", (event) => {
  event.preventDefault();
  if (event.touches.length === 1 && dragging) {
    x += event.touches[0].clientX - lastX;
    y += event.touches[0].clientY - lastY;
    lastX = event.touches[0].clientX;
    lastY = event.touches[0].clientY;
    render();
  }
  if (event.touches.length === 2) {
    const distance = Math.hypot(
      event.touches[0].clientX - event.touches[1].clientX,
      event.touches[0].clientY - event.touches[1].clientY
    );
    const bounds = canvas.getBoundingClientRect();
    const centerX = (event.touches[0].clientX + event.touches[1].clientX) / 2 - bounds.left;
    const centerY = (event.touches[0].clientY + event.touches[1].clientY) / 2 - bounds.top;
    zoomAt(pinchScale * distance / pinchDistance, centerX, centerY);
  }
}, { passive:false });

canvas.addEventListener("touchend", () => {
  dragging = false;
});

window.addEventListener("keydown", (event) => {
  if (!viewer.classList.contains("open")) return;
  if (event.key === "Escape") closeViewer();
  if (event.key === "+" || event.key === "=") document.getElementById("zoomIn").click();
  if (event.key === "-") document.getElementById("zoomOut").click();
  if (event.key === "0") fitToScreen();
  if (event.key === "1") actualSize();
});

window.addEventListener("resize", () => {
  if (viewer.classList.contains("open")) fitToScreen();
});

document.querySelectorAll(".nav a").forEach((link) => {
  link.addEventListener("click", () => {
    document.querySelectorAll(".nav a").forEach((item) => item.classList.remove("active"));
    link.classList.add("active");
  });
});
window.addEventListener("load", () => {
  const params = new URLSearchParams(window.location.search);

  if (params.get("view") === "vol01") {
    setTimeout(() => {
      document.querySelector(".newsletter-page").click();
    }, 100);
  }
});
new ResizeObserver(() => {
  if (viewer.classList.contains("open") && imageReady) fitToScreen();
}).observe(canvas);
