// Színpaletta
const colors = [
    "#FF7F7F", "#FFB347", "#FFD700", "#90EE90", "#87CEEB", "#DDA0DD",
    "#FF69B4", "#F08080", "#FF6347", "#FFA500", "#FFD700", "#7FFF00",
    "#40E0D0", "#BA55D3", "#FF1493", "#DC143C", "#FF8C00", "#FFB90F",
    "#00FA9A", "#1E90FF"
];

let currentEditingTier = null;
let tierCounter = 0;
let confirmCallback = null;

/* ===== Kis, alacsony FPS-es canvas dísz =====
   - 360x360, nem full screen
   - 20 FPS körül limitált
   - nincs blur filter, csak sima kis pontok
   Ez sokkal olcsóbb, mint a full-screen blur. [web:24][web:48]
*/
let bgCanvas, bgCtx;
let bgParticles = [];
let bgMouseX = 0.5;
let bgMouseY = 0.5;

const CANVAS_TARGET_FPS = 20;
const CANVAS_FRAME_INTERVAL = 1000 / CANVAS_TARGET_FPS;
let lastCanvasUpdate = performance.now();

function initBackgroundCanvas() {
    bgCanvas = document.getElementById("bgCanvas");
    if (!bgCanvas) return;
    bgCtx = bgCanvas.getContext("2d");

    // Retina támogatás: devicePixelRatio skálázás
    const dpr = window.devicePixelRatio || 1;
    const cssWidth = bgCanvas.width;
    const cssHeight = bgCanvas.height;
    bgCanvas.width = cssWidth * dpr;
    bgCanvas.height = cssHeight * dpr;
    bgCtx.scale(dpr, dpr);

    initParticlesCanvas();

    window.addEventListener("mousemove", (e) => {
        const rect = bgCanvas.getBoundingClientRect();
        bgMouseX = (e.clientX - rect.left) / rect.width;
        bgMouseY = (e.clientY - rect.top) / rect.height;
    });

    requestAnimationFrame(drawBackgroundCanvas);
}

function initParticlesCanvas() {
    bgParticles.length = 0;
    const w = 360;
    const h = 360;
    const count = 22; // fix, nagyon alacsony szám
    for (let i = 0; i < count; i++) {
        bgParticles.push({
            x: Math.random() * w,
            y: Math.random() * h,
            r: 1.5 + Math.random() * 2,
            speed: 10 + Math.random() * 20,
            angle: Math.random() * Math.PI * 2,
            alpha: 0.25 + Math.random() * 0.4
        });
    }
}

function updateParticlesCanvas(delta) {
    const w = 360;
    const h = 360;

    const centerX = w * (0.3 + bgMouseX * 0.4);
    const centerY = h * (0.3 + bgMouseY * 0.4);

    bgParticles.forEach(p => {
        p.angle += 0.0015 * delta;
        const dirX = Math.cos(p.angle);
        const dirY = Math.sin(p.angle);

        p.x += dirX * p.speed * (delta / 1000);
        p.y += dirY * p.speed * (delta / 1000);

        // enyhe gravitáció a center felé
        p.x += (centerX - p.x) * 0.0007 * delta;
        p.y += (centerY - p.y) * 0.0007 * delta;

        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;
    });
}

function drawBackgroundCanvas(now) {
    const delta = now - lastCanvasUpdate;
    if (delta < CANVAS_FRAME_INTERVAL) {
        requestAnimationFrame(drawBackgroundCanvas);
        return;
    }
    lastCanvasUpdate = now;

    const w = 360;
    const h = 360;

    bgCtx.setTransform(1, 0, 0, 1, 0, 0); // dpr már be van állítva initnél
    bgCtx.clearRect(0, 0, w, h);

    // háttér glow a canvasban
    const grad = bgCtx.createRadialGradient(
        w * 0.5, h * 0.5, 40,
        w * 0.5, h * 0.5, 200
    );
    grad.addColorStop(0, "rgba(255,255,255,0.16)");
    grad.addColorStop(0.4, "rgba(120,180,255,0.15)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    bgCtx.fillStyle = grad;
    bgCtx.fillRect(0, 0, w, h);

    updateParticlesCanvas(delta);

    // kis “csillagok”
    bgParticles.forEach(p => {
        bgCtx.beginPath();
        bgCtx.fillStyle = `rgba(255,255,255,${p.alpha})`;
        bgCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        bgCtx.fill();
    });

    requestAnimationFrame(drawBackgroundCanvas);
}

/* ===================== Téma kezelés ===================== */
function detectColorScheme() {
    if (localStorage.getItem("theme")) {
        return localStorage.getItem("theme");
    }
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        return "dark";
    }
    return "light";
}

function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    applyTheme(newTheme);
}

if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
        if (!localStorage.getItem("theme")) {
            applyTheme(e.matches ? "dark" : "light");
        }
    });
}

/* ===================== Steam + custom item rendszer ===================== */
const itemDefinitions = [
    { id: "zort", name: "Zort", steamAppId: 3121110 },
    { id: "indianajones", name: "Indiana Jones And The Great Circle", steamAppId: 2677660 },
    { id: "fahrenheit", name: "Fahrenheit: Indigo Prophecy Remastered", steamAppId: 312840 },
    { id: "beyondtwosouls", name: "Beyond: Two Souls", steamAppId: 960990 },
    { id: "picopark", name: "PICO PARK 2", steamAppId: 2644470 },
    { id: "wewerehere", name: "We Were Here Together", steamAppId: 865360 },
    { id: "gotkingsroad", name: "Game of Thrones: Kingsroad", steamAppId: 3183280 },
    { id: "detroit", name: "Detroit: Become Human", steamAppId: 1222140 },
    { id: "splitfiction", name: "Split Fiction", steamAppId: 2001120 },
    { id: "repo", name: "R.E.P.O.", steamAppId: 3241660 },
    { id: "granny", name: "Granny: Escape Together", steamAppId: 3070520 },
    { id: "carrytheglass", name: "Carry The Glass", steamAppId: 3263320 },
    { id: "tloup2", name: "The Last of Us™ Part II Remastered", steamAppId: 2531310 },
    { id: "pummelparty", name: "Pummel Party", steamAppId: 880940 },
    { id: "deadspace", name: "Dead Space Remake", steamAppId: 1693980 },
    { id: "deadspace2", name: "Dead Space 2", steamAppId: 47780 },
    { id: "deadspace3", name: "Dead Space 3", steamAppId: 1238060 },
    { id: "digginghole", name: "A Game About Digging A Hole", steamAppId: 3244220 },
    { id: "doom", name: "DOOM: The Dark Ages", steamAppId: 3017860 },
    { id: "alienisolation", name: "Alien: Isolation", steamAppId: 214490 },
    { id: "peak", name: "PEAK", steamAppId: null, customImageUrl: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3527290/31bac6b2eccf09b368f5e95ce510bae2baf3cfcd/header.jpg?t=1764003551" },
    { id: "crashbandicoot", name: "Crash Bandicoot 4: It’s About Time", steamAppId: 1378990 },
    { id: "resi5", name: "Resident Evil 5", steamAppId: 21690 },
    { id: "mafiatoc", name: "Mafia: The Old Country", steamAppId: 1941540 },
    { id: "paranormalcleanup", name: "Paranormal Cleanup", steamAppId: 2197890 },
    { id: "resi6", name: "Resident Evil 6", steamAppId: 221040 },
    { id: "paddle", name: "Paddle Paddle Paddle", steamAppId: null, customImageUrl: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3570070/35be35d69c576eeb612eaf49aa62f24689cdc798/header.jpg?t=1763843659" },
    { id: "waterpark", name: "Waterpark Simulator", steamAppId: null, customImageUrl: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3293260/911c613bb4443911c7d2586e812a22108834a9cf/header_alt_assets_2.jpg?t=1765155521"},
    { id: "silenthillf", name: "SILENT HILL f", steamAppId: null, customImageUrl: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2947440/7e5d923ac622bd1775ebc9b5d4b5b0a24bf5ed40/header.jpg?t=1763007193" },
    { id: "trytodrive", name: "Try To Drive", steamAppId: null, customImageUrl: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3621700/defa537fea0d08c31eab9d1828875b8a42fc1430/header.jpg?t=1763746736" },
    { id: "ln3", name: "Little Nightmares III", steamAppId: 1392860 },
    { id: "rvthereyet", name: "RV There Yet?", steamAppId: null, customImageUrl: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3949040/cae24b4ed7f4531be51f0d63f785b7d253f92dc3/header.jpg?t=1761681404" },
    { id: "cuphead", name: "Cuphead", steamAppId: 268910 },
    { id: "redsec", name: "Battlefield REDSEC", steamAppId: null, customImageUrl: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3028330/7f156ef258b0b34011363f8da61b7e2a714232c7/header.jpg?t=1764676799" },
    { id: "7floor", name: "7th Floor", steamAppId: 3018430 },
    { id: "chained", name: "Chained in the Backrooms", steamAppId: 3060170 },
    { id: "miside", name: "MiSide", steamAppId: 2527500 },
    { id: "outlast", name: "The Outlast Trials", steamAppId: 1304930 },
    { id: "codblackops7", name: "Call of Duty: Black Ops 7", steamAppId: null, customImageUrl: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3606480/d7041a15f572f7702d5f4bc97e498cd3e1cc62e2/header.jpg?t=1765211460" },
    { id: "rematch", name: "REMATCH", steamAppId: 2138720 },
    { id: "biped", name: "Biped", steamAppId: 1071870 },
    { id: "hitmanwoa", name: "HITMAN World of Assassination", steamAppId: 1659040 },
    { id: "nightmareofdecay", name: "Nightmare of Decay", steamAppId: 1848450 },
    { id: "crimedetective", name: "Crime Detective: Red Flags", steamAppId: null, customImageUrl: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3528280/1ab5630840ab5d3b9314aaa59dbf1ee92c84e9e1/header.jpg?t=1761671222" },
    { id: "twistedtower", name: "Twisted Tower", steamAppId: 1575990 },
    { id: "radiolight", name: "Radiolight", steamAppId: 1342690 },
    { id: "trashhorror", name: "Trash Horror Collection 5", steamAppId: null, customImageUrl: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3569980/ccbcacc6cac07f1153ac8d72d09aecfc4042ffaf/header.jpg?t=1742368684" }
];

function getSteamHeaderUrl(appId) {
    return `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`;
}

function getItemImageUrl(itemDef) {
    if (itemDef.steamAppId) {
        return getSteamHeaderUrl(itemDef.steamAppId);
    }
    return itemDef.customImageUrl || "";
}

function createCard(itemDef) {
    const card = document.createElement("div");
    card.className = "card-item";
    card.draggable = true;

    const img = document.createElement("img");
    img.className = "card-thumb";
    img.loading = "lazy";
    const imgUrl = getItemImageUrl(itemDef);
    if (imgUrl) img.src = imgUrl;
    img.alt = itemDef.name;

    const title = document.createElement("div");
    title.className = "card-title";
    title.textContent = itemDef.name;

    card.appendChild(img);
    card.appendChild(title);

    card.addEventListener("dragstart", handleDragStart);
    card.addEventListener("dragend", handleDragEnd);

    card.dataset.itemId = itemDef.id;
    if (itemDef.steamAppId) card.dataset.steamAppId = itemDef.steamAppId;
    if (itemDef.customImageUrl) card.dataset.customImageUrl = itemDef.customImageUrl;
    card.dataset.gameName = itemDef.name;

    return card;
}

function initializeSampleCards() {
    const cardsArea = document.getElementById("cardsArea");
    itemDefinitions.forEach(def => {
        const card = createCard(def);
        cardsArea.appendChild(card);
    });
}

/* ===================== Confirm modal ===================== */
function showConfirmModal(title, message, items, tierLabel, tierColor, callback) {
    const modal = document.getElementById("confirmModal");
    const titleElement = document.getElementById("confirmTitle");
    const messageElement = document.getElementById("confirmMessage");
    const itemsListElement = document.getElementById("confirmItemsList");

    titleElement.textContent = title;
    messageElement.textContent = message;

    let itemsHTML = "";
    if (items.length > 0) {
        itemsHTML = `
            <div class="confirm-tier-info">
                <div class="confirm-tier-label" style="background-color: ${tierColor}">${tierLabel}</div>
            </div>
            <div class="confirm-items-grid">
                ${items.map(item => `<span class="confirm-item">${item}</span>`).join("")}
            </div>
        `;
    } else {
        itemsHTML = `<div class="confirm-empty-message">Nincsenek elemek ebben a tier-ben.</div>`;
    }

    itemsListElement.innerHTML = itemsHTML;
    confirmCallback = callback;
    modal.classList.add("active");
}

function cancelConfirm() {
    const modal = document.getElementById("confirmModal");
    modal.classList.remove("active");
    confirmCallback = null;
}

function executeConfirm() {
    const modal = document.getElementById("confirmModal");
    modal.classList.remove("active");
    if (confirmCallback) {
        confirmCallback();
        confirmCallback = null;
    }
}

/* ===================== Elérhető elemek ablak drag/resize (throttlinggel) ===================== */
function initializeDraggableWindow() {
    const cardsContainer = document.querySelector(".cards-container");
    const header = document.querySelector(".cards-window-header");

    const resizeHandles = `
        <div class="resizer corner tl"></div>
        <div class="resizer corner tr"></div>
        <div class="resizer corner bl"></div>
        <div class="resizer corner br"></div>
        <div class="resizer t"></div>
        <div class="resizer b"></div>
        <div class="resizer l"></div>
        <div class="resizer r"></div>
    `;
    cardsContainer.insertAdjacentHTML("afterbegin", resizeHandles);

    let isDragging = false;
    let initialX, initialY;

    function dragStart(e) {
        if (e.target.tagName === "BUTTON" || e.target.tagName === "I") return;
        initialX = e.clientX - cardsContainer.offsetLeft;
        initialY = e.clientY - cardsContainer.offsetTop;
        isDragging = true;
        document.addEventListener("mousemove", drag);
        document.addEventListener("mouseup", dragEnd);
        header.classList.add("active");
    }

    function drag(e) {
        if (!isDragging) return;
        e.preventDefault();
        const currentX = e.clientX - initialX;
        const currentY = e.clientY - initialY;
        cardsContainer.style.left = `${currentX}px`;
        cardsContainer.style.top = `${currentY}px`;
        cardsContainer.style.bottom = "auto";
        cardsContainer.style.right = "auto";
    }

    function dragEnd() {
        isDragging = false;
        document.removeEventListener("mousemove", drag);
        document.removeEventListener("mouseup", dragEnd);
        header.classList.remove("active");
    }

    header.addEventListener("mousedown", dragStart);

    const resizers = cardsContainer.querySelectorAll(".resizer");
    for (let resizer of resizers) {
        resizer.addEventListener("mousedown", initResize);
    }

    let resizePending = false;
    let lastResizeEvent = null;

    function initResize(e) {
        e.stopPropagation();
        const currentResizer = e.target;
        let prevX = e.clientX;
        let prevY = e.clientY;

        function handleMove(ev) {
            lastResizeEvent = ev;
            if (!resizePending) {
                resizePending = true;
                requestAnimationFrame(processResize);
            }
        }

        function processResize() {
            if (!lastResizeEvent) {
                resizePending = false;
                return;
            }
            const e2 = lastResizeEvent;
            const rect = cardsContainer.getBoundingClientRect();

            if (currentResizer.classList.contains("br")) {
                cardsContainer.style.width = `${rect.width + (e2.clientX - prevX)}px`;
                cardsContainer.style.height = `${rect.height + (e2.clientY - prevY)}px`;
            } else if (currentResizer.classList.contains("bl")) {
                cardsContainer.style.width = `${rect.width - (e2.clientX - prevX)}px`;
                cardsContainer.style.height = `${rect.height + (e2.clientY - prevY)}px`;
                cardsContainer.style.left = `${rect.left + (e2.clientX - prevX)}px`;
            } else if (currentResizer.classList.contains("tr")) {
                cardsContainer.style.width = `${rect.width + (e2.clientX - prevX)}px`;
                cardsContainer.style.height = `${rect.height - (e2.clientY - prevY)}px`;
                cardsContainer.style.top = `${rect.top + (e2.clientY - prevY)}px`;
            } else if (currentResizer.classList.contains("tl")) {
                cardsContainer.style.width = `${rect.width - (e2.clientX - prevX)}px`;
                cardsContainer.style.height = `${rect.height - (e2.clientY - prevY)}px`;
                cardsContainer.style.top = `${rect.top + (e2.clientY - prevY)}px`;
                cardsContainer.style.left = `${rect.left + (e2.clientX - prevX)}px`;
            } else if (currentResizer.classList.contains("t")) {
                cardsContainer.style.height = `${rect.height - (e2.clientY - prevY)}px`;
                cardsContainer.style.top = `${rect.top + (e2.clientY - prevY)}px`;
            } else if (currentResizer.classList.contains("b")) {
                cardsContainer.style.height = `${rect.height + (e2.clientY - prevY)}px`;
            } else if (currentResizer.classList.contains("l")) {
                cardsContainer.style.width = `${rect.width - (e2.clientX - prevX)}px`;
                cardsContainer.style.left = `${rect.left + (e2.clientX - prevX)}px`;
            } else if (currentResizer.classList.contains("r")) {
                cardsContainer.style.width = `${rect.width + (e2.clientX - prevX)}px`;
            }

            prevX = e2.clientX;
            prevY = e2.clientY;
            resizePending = false;
        }

        function stopResize() {
            window.removeEventListener("mousemove", handleMove);
            window.removeEventListener("mouseup", stopResize);
            resizePending = false;
            lastResizeEvent = null;
        }

        window.addEventListener("mousemove", handleMove);
        window.addEventListener("mouseup", stopResize);
    }
}

function toggleMinimize() {
    const cardsContainer = document.querySelector(".cards-container");
    const body = document.querySelector(".cards-container-body");
    if (body.style.display === "none") {
        body.style.display = "block";
        cardsContainer.style.height = "300px";
    } else {
        body.style.display = "none";
        cardsContainer.style.height = "auto";
    }
}

/* ===================== Tier kezelés ===================== */
function initializeColorPicker() {
    const colorPicker = document.getElementById("colorPicker");
    colors.forEach(color => {
        const colorOption = document.createElement("div");
        colorOption.className = "color-option";
        colorOption.style.backgroundColor = color;
        colorOption.dataset.color = color;
        colorOption.onclick = () => selectColor(colorOption);
        colorPicker.appendChild(colorOption);
    });
}

function selectColor(element) {
    document.querySelectorAll(".color-option").forEach(opt => opt.classList.remove("selected"));
    element.classList.add("selected");
}

function addTier(label = null, color = null) {
    const tiersContainer = document.getElementById("tiersContainer");
    const tier = document.createElement("div");
    tier.className = "tier";

    const tierLabel = label || String.fromCharCode(83 - tierCounter);
    const tierColor = color || colors[tierCounter % colors.length];
    tierCounter++;

    tier.innerHTML = `
        <div class="tier-label" style="background-color: ${tierColor}">${tierLabel}</div>
        <div class="tier-items empty-tier"
             ondrop="drop(event)"
             ondragover="allowDrop(event)"
             ondragleave="dragLeave(event)">
        </div>
        <div class="tier-controls">
            <button onclick="moveTierUp(this)" title="Feljebb"><i class="bi bi-arrow-up"></i></button>
            <button onclick="moveTierDown(this)" title="Lejjebb"><i class="bi bi-arrow-down"></i></button>
            <button onclick="openSettings(this)" title="Beállítások"><i class="bi bi-gear"></i></button>
            <button onclick="clearTier(this)" title="Törlés (elemek maradnak)"><i class="bi bi-trash"></i></button>
            <button onclick="deleteTier(this)" title="Tier törlése"><i class="bi bi-x-circle"></i></button>
        </div>
    `;

    tiersContainer.appendChild(tier);
}

function moveTierUp(button) {
    const tier = button.closest(".tier");
    const previousTier = tier.previousElementSibling;
    if (previousTier) {
        tier.parentNode.insertBefore(tier, previousTier);
    }
}

function moveTierDown(button) {
    const tier = button.closest(".tier");
    const nextTier = tier.nextElementSibling;
    if (nextTier) {
        tier.parentNode.insertBefore(nextTier, tier);
    }
}

function openSettings(button) {
    const tier = button.closest(".tier");
    currentEditingTier = tier;

    const label = tier.querySelector(".tier-label").textContent.trim();
    const color = tier.querySelector(".tier-label").style.backgroundColor;

    document.getElementById("tierLabel").value = label;

    const rgbMatch = color.match(/\d+/g);
    if (rgbMatch) {
        const hex = rgbMatch
            .map(x => {
                const h = parseInt(x).toString(16);
                return h.length === 1 ? "0" + h : h;
            })
            .join("")
            .toUpperCase();
        document.querySelectorAll(".color-option").forEach(opt => {
            opt.classList.remove("selected");
            if (opt.dataset.color.toUpperCase() === "#" + hex) {
                opt.classList.add("selected");
            }
        });
    }

    document.getElementById("settingsModal").classList.add("active");
}

function closeModal() {
    document.getElementById("settingsModal").classList.remove("active");
    currentEditingTier = null;
}

function saveTierSettings() {
    if (!currentEditingTier) return;

    const newLabel = document.getElementById("tierLabel").value;
    const selectedColor = document.querySelector(".color-option.selected");

    if (newLabel) {
        currentEditingTier.querySelector(".tier-label").textContent = newLabel;
    }
    if (selectedColor) {
        currentEditingTier.querySelector(".tier-label").style.backgroundColor = selectedColor.dataset.color;
    }

    closeModal();
}

function getTierInfo(tier) {
    const tierLabel = tier.querySelector(".tier-label").textContent.trim();
    const tierColor = tier.querySelector(".tier-label").style.backgroundColor;
    const tierItems = tier.querySelector(".tier-items");
    const items = Array.from(tierItems.querySelectorAll(".card-item")).map(item =>
        item.innerText.trim()
    );
    return { tierLabel, tierColor, items };
}

function clearTier(button) {
    const tier = button.closest(".tier");
    const tierInfo = getTierInfo(tier);

    showConfirmModal(
        "Tier ürítése",
        `Biztosan törölni szeretnéd az összes elemet a ${tierInfo.tierLabel} tier-ből?`,
        tierInfo.items,
        tierInfo.tierLabel,
        tierInfo.tierColor,
        () => {
            const tierItems = tier.querySelector(".tier-items");
            const cardsArea = document.getElementById("cardsArea");
            const items = tierItems.querySelectorAll(".card-item");
            items.forEach(item => cardsArea.appendChild(item));
        }
    );
}

function deleteTier(button) {
    const tier = button.closest(".tier");
    const tierInfo = getTierInfo(tier);

    showConfirmModal(
        "Tier törlése",
        `Biztosan törölni szeretnéd a ${tierInfo.tierLabel} tier-t? Az elemek visszakerülnek az elérhető elemek közé.`,
        tierInfo.items,
        tierInfo.tierLabel,
        tierInfo.tierColor,
        () => {
            const tierItems = tier.querySelector(".tier-items");
            const cardsArea = document.getElementById("cardsArea");
            const items = tierItems.querySelectorAll(".card-item");
            items.forEach(item => cardsArea.appendChild(item));
            tier.remove();
        }
    );
}

/* ===================== Drag & drop ===================== */
let draggedElement = null;

function handleDragStart(e) {
    draggedElement = this;
    this.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
}

function handleDragEnd() {
    this.classList.remove("dragging");
    document.querySelectorAll(".tier-items").forEach(area => area.classList.remove("drag-over"));
    draggedElement = null;
}

function allowDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.add("drag-over");
    e.dataTransfer.dropEffect = "move";
}

function dragLeave(e) {
    e.currentTarget.classList.remove("drag-over");
}

function drop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove("drag-over");
    if (draggedElement) {
        e.currentTarget.appendChild(draggedElement);
        e.currentTarget.classList.remove("empty-tier");
    }
}

/* ===================== DEBUG PANEL LOGIKA ===================== */
let debugActive = false;
let lastDebugSampleTime = performance.now();
let frameCount = 0;
let frameTimeSum = 0;

function toggleDebugPanel() {
    const panel = document.getElementById("debugPanel");
    debugActive = !debugActive;
    if (panel) {
        panel.classList.toggle("active", debugActive);
    }
}

// FPS / frame time mérés (a canvas loopra) [web:38]
(function debugFrameLoop() {
    const now = performance.now();
    const delta = now - lastDebugSampleTime;
    frameCount++;
    frameTimeSum += delta;

    if (debugActive && delta >= 1000) {
        const fps = (frameCount * 1000) / delta;
        const avgFrame = frameTimeSum / frameCount;

        const fpsEl = document.getElementById("debugFps");
        const ftEl = document.getElementById("debugFrameTime");

        if (fpsEl) fpsEl.textContent = fps.toFixed(1);
        if (ftEl) ftEl.textContent = avgFrame.toFixed(2);

        frameCount = 0;
        frameTimeSum = 0;
        lastDebugSampleTime = now;

        const mem = performance.memory;
        const heapEl = document.getElementById("debugHeap");
        if (mem && heapEl) {
            const used = mem.usedJSHeapSize / (1024 * 1024);
            const total = mem.totalJSHeapSize / (1024 * 1024);
            heapEl.textContent = `${used.toFixed(1)} / ${total.toFixed(1)} MB`;
        }
    } else if (!debugActive) {
        lastDebugSampleTime = now;
        frameCount = 0;
        frameTimeSum = 0;
    }

    requestAnimationFrame(debugFrameLoop);
})();

/* ===================== Init ===================== */
document.addEventListener("DOMContentLoaded", () => {
    initBackgroundCanvas();

    const initialTheme = detectColorScheme();
    applyTheme(initialTheme);

    const cardsContainer = document.querySelector(".cards-container");
    cardsContainer.innerHTML = `
        <div class="cards-window-header">
            <span>Elérhető elemek</span>
            <div class="cards-window-controls">
                <button onclick="toggleMinimize()" title="Minimalizálás"><i class="bi bi-dash-lg"></i></button>
            </div>
        </div>
        <div class="cards-container-body">
            <div class="cards-area" id="cardsArea"></div>
        </div>
    `;

    initializeDraggableWindow();

    const cardsArea = document.getElementById("cardsArea");
    cardsArea.addEventListener("dragover", allowDrop);
    cardsArea.addEventListener("dragleave", dragLeave);
    cardsArea.addEventListener("drop", drop);

    initializeColorPicker();
    initializeSampleCards();

    ["S", "A", "B", "C", "D"].forEach((label, index) => addTier(label, colors[index]));

    const coresEl = document.getElementById("debugCores");
    if (coresEl) {
        coresEl.textContent = navigator.hardwareConcurrency || "n/a"; // [web:23]
    }

    const webgpuEl = document.getElementById("debugWebgpu");
    if (webgpuEl) {
        webgpuEl.textContent = navigator.gpu ? "elérhető (WebGPU)" : "nem elérhető"; // [web:11][web:18]
    }

    const webglEl = document.getElementById("debugWebgl");
    if (webglEl) {
        let supported = false;
        try {
            const canvas = document.createElement("canvas");
            const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
            supported = !!gl;
        } catch (e) {
            supported = false;
        }
        webglEl.textContent = supported ? "elérhető (WebGL)" : "nem elérhető"; // [web:12]
    }
});
