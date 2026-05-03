function resizeApp() {
    const app = document.querySelector(".app-card");
    app.style.height = "auto";

    requestAnimationFrame(() => {
        const scrollHeight = app.scrollHeight;
        app.style.height = scrollHeight + "px";
    });
}

function scrollRowIntoView(row) {
    const scrollContainer = document.querySelector(".right tbody");
    if (!scrollContainer || !row) return;

    const rowTop = row.offsetTop;
    const rowBottom = rowTop + row.offsetHeight;
    const viewTop = scrollContainer.scrollTop;
    const viewBottom = viewTop + scrollContainer.clientHeight;

    if (rowTop < viewTop) {
        scrollContainer.scrollTo({
            top: rowTop,
            behavior: "smooth"
        });
        return;
    }

    if (rowBottom > viewBottom) {
        scrollContainer.scrollTo({
            top: rowBottom - scrollContainer.clientHeight,
            behavior: "smooth"
        });
    }
}

function setExportButtonReady(isReady) {
    const exportBtn = document.getElementById("exportBtn");
    if (!exportBtn) return;

    exportBtn.classList.toggle("ready", isReady);
    exportBtn.innerHTML = isReady
        ? '<span class="btn-icon" aria-hidden="true">&#8681;</span> Export PDF (A4)'
        : "Export PDF (A4)";
}

/* =========================
   PROCESS TEXT + OPEN PANEL
========================= */
function processText() {
    const text = document.getElementById("input").value;
    const customNamesEnabled = document.getElementById("customNamesToggle").checked;
    const customNamesArea = document.getElementById("qrNames");
    let customNames = [];
    if (customNamesEnabled) {
        customNames = customNamesArea.value.split(/\r?\n/).map(l => l.trim()).filter(l => l);
    }

    // Accept any non-empty line as a name/QR pair
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l);
    const qrs = [];
    for (let i = 0; i < lines.length; i++) {
        const parts = lines[i].split(/[\t,;|]+/);
        if (parts.length === 1) {
            // Only QR value provided
            qrs.push(parts[0].trim());
        } else if (parts[1]) {
            qrs.push(parts[1].trim());
        }
    }

    // Decide names: if custom names enabled and present, use them; else use QR value as name
    let names = [];
    if (customNamesEnabled && customNames.length > 0) {
        names = customNames.slice(0, qrs.length);
        // If fewer custom names than qrs, fill with empty or QR value
        for (let i = customNames.length; i < qrs.length; i++) {
            names.push(qrs[i]);
        }
    } else {
        names = qrs.slice();
    }

    // Always apply prefix/suffix if text is present
    const prefix = document.getElementById("prefixValue").value || "";
    const suffix = document.getElementById("suffixValue").value || "";

    const count = Math.min(names.length, qrs.length);
    setExportButtonReady(false);

    const tbody = document.getElementById("tableBody");
    tbody.innerHTML = "";

    for (let i = 0; i < count; i++) {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${names[i]}</td>
            <td>${prefix}${qrs[i]}${suffix}</td>
            <td><div id="qr-${i}"></div></td>
        `;
        tbody.appendChild(tr);
    }

    document.getElementById("count").textContent = `${count} pairs`;
    document.getElementById("qrBtn").style.display = count ? "block" : "none";

    /* 👉 OPEN RIGHT PANEL ONCE DATA EXISTS */
    const main = document.querySelector(".main");
    if (count > 0) {
        main.classList.add("open");
    }

    resizeApp();
}
// Toggle custom names textarea visibility
document.getElementById("customNamesToggle").addEventListener("change", function() {
    const area = document.getElementById("qrNames");
    area.style.display = this.checked ? "block" : "none";
});

/* =========================
   QR GENERATION (TABLE VIEW) - SEQUENTIAL
========================= */
document.getElementById("qrBtn").addEventListener("click", function () {
    const rows = document.querySelectorAll("#tableBody tr");
    setExportButtonReady(false);
    
    // Disable button while generating
    this.disabled = true;
    const originalText = this.textContent;
    this.textContent = "Generating...";

    rows.forEach((row, i) => {
        const qrValue = row.children[1].textContent;
        const container = document.getElementById(`qr-${i}`);

        // Generate each QR code with a delay
        setTimeout(() => {
            container.innerHTML = "";
            
            // Create a wrapper for animation
            const wrapper = document.createElement("div");
            wrapper.classList.add("qr-generating");
            
            // Create QR code inside wrapper
            new QRCode(wrapper, {
                text: qrValue,
                width: 80,
                height: 80
            });
            
            container.appendChild(wrapper);
            resizeApp();
            scrollRowIntoView(row);
            
            // Re-enable button after last QR code
            if (i === rows.length - 1) {
                this.disabled = false;
                this.textContent = originalText;
                setExportButtonReady(true);
            }
        }, i * 150); // 150ms delay between each QR code
    });
});

/* =========================
   PRINT / PDF EXPORT
========================= */
function exportPDF() {
    const sheet = document.getElementById("pdfSheet");
    sheet.innerHTML = "";

    const rows = document.querySelectorAll("#tableBody tr");

    rows.forEach((row) => {
        const name = row.children[0].textContent;
        const qrValue = row.children[1].textContent;

        const item = document.createElement("div");
        item.className = "pdf-item";

        const qrDiv = document.createElement("div");

        new QRCode(qrDiv, {
            text: qrValue,
            width: 110,
            height: 110
        });

        const label = document.createElement("div");
        label.className = "pdf-name";
        label.textContent = name;

        item.appendChild(qrDiv);
        item.appendChild(label);

        sheet.appendChild(item);
    });

    setTimeout(() => {
        window.print();
    }, 300);
}
