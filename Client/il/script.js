/**
 * refactor: modularize configuration, consolidate state, and clean up dead code
 * * - Moved configuration/constants to CONFIG object
 * - Consolidated global DOM references into DOM object
 * - Consolidated app state into STATE object
 * - Removed unused 'luasTerbangunan' logic
 * - Optimized Select2 lifecycle handling
 * - Cleaned up autoFillPrices nesting
 */

// --- 1. Configuration & Constants ---
const CONFIG = {
    API_BASE_URL: "https://sparta-backend-5hdj.onrender.com",
    SIPIL_CATEGORIES: [
        "PEKERJAAN PERSIAPAN", "PEKERJAAN BOBOKAN / BONGKARAN", "PEKERJAAN TANAH",
        "PEKERJAAN PONDASI & BETON", "PEKERJAAN PASANGAN", "PEKERJAAN BESI",
        "PEKERJAAN KERAMIK", "PEKERJAAN PLUMBING", "PEKERJAAN SANITARY & ACECORIES",
        "PEKERJAAN JANITOR", "PEKERJAAN ATAP", "PEKERJAAN KUSEN, PINTU & KACA",
        "PEKERJAAN FINISHING", "PEKERJAAN BEANSPOT", "PEKERJAAN AREA TERBUKA",
        "PEKERJAAN TAMBAHAN", "PEKERJAAN SBO"
    ],
    ME_CATEGORIES: [
        "INSTALASI", "FIXTURE", "PEKERJAAN TAMBAHAN", "PEKERJAAN SBO"
    ],
    BRANCH_GROUPS: {
        "BANDUNG 1": ["BANDUNG 1", "BANDUNG 2"],
        "BANDUNG 2": ["BANDUNG 1", "BANDUNG 2"],
        "LOMBOK": ["LOMBOK", "SUMBAWA"],
        "SUMBAWA": ["LOMBOK", "SUMBAWA"],
        "MEDAN": ["MEDAN", "ACEH"],
        "ACEH": ["MEDAN", "ACEH"],
        "PALEMBANG": ["PALEMBANG", "BENGKULU", "BANGKA", "BELITUNG"],
        "BENGKULU": ["PALEMBANG", "BENGKULU", "BANGKA", "BELITUNG"],
        "BANGKA": ["PALEMBANG", "BENGKULU", "BANGKA", "BELITUNG"],
        "BELITUNG": ["PALEMBANG", "BENGKULU", "BANGKA", "BELITUNG"],
        "SIDOARJO": ["SIDOARJO", "SIDOARJO BPN_SMD", "MANOKWARI", "NTT", "SORONG"],
        "SIDOARJO BPN_SMD": ["SIDOARJO", "SIDOARJO BPN_SMD", "MANOKWARI", "NTT", "SORONG"],
        "MANOKWARI": ["SIDOARJO", "SIDOARJO BPN_SMD", "MANOKWARI", "NTT", "SORONG"],
        "NTT": ["SIDOARJO", "SIDOARJO BPN_SMD", "MANOKWARI", "NTT", "SORONG"],
        "SORONG": ["SIDOARJO", "SIDOARJO BPN_SMD", "MANOKWARI", "NTT", "SORONG"]
    },
    BRANCH_ULOK_MAP: {
        "LUWU": "2VZ1", "KARAWANG": "1JZ1", "REMBANG": "2AZ1",
        "BANJARMASIN": "1GZ1", "PARUNG": "1MZ1", "TEGAL": "2PZ1", "GORONTALO": "2SZ1",
        "PONTIANAK": "1PZ1", "LOMBOK": "1SZ1", "KOTABUMI": "1VZ1", "SERANG": "2GZ1",
        "CIANJUR": "2JZ1", "BALARAJA": "TZ01", "SIDOARJO": "UZ01", "MEDAN": "WZ01",
        "BOGOR": "XZ01", "JEMBER": "YZ01", "BALI": "QZ01", "PALEMBANG": "PZ01",
        "KLATEN": "OZ01", "MAKASSAR": "RZ01", "PLUMBON": "VZ01", "PEKANBARU": "1AZ1",
        "JAMBI": "1DZ1", "HEAD OFFICE": "Z001", "BANDUNG 1": "BZ01", "BANDUNG 2": "NZ01",
        "BEKASI": "CZ01", "CILACAP": "IZ01", "CILEUNGSI2": "JZ01", "SEMARANG": "HZ01",
        "CIKOKOL": "KZ01", "LAMPUNG": "LZ01", "MALANG": "MZ01", "MANADO": "1YZ1",
        "BATAM": "2DZ1", "MADIUN": "2MZ1"
    }
};

// --- 2. State Management ---
const STATE = {
    categorizedPrices: {
        sipil: {},
        me: {}
    },
    pendingStoreCodes: [],
    approvedStoreCodes: [],
    rejectedSubmissionsList: [],
    originalFormData: null
};

// --- 3. DOM References (Populated in initializePage) ---
let DOM = {};

// --- 4. Helper Functions (Formatters & Utilities) ---

const Utils = {
    formatRupiah: (number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(number),
    
    parseRupiah: (formattedString) => parseFloat(String(formattedString).replace(/Rp\s?|\./g, "").replace(/,/g, ".")) || 0,
    
    formatNumberWithSeparators: (num) => (num === null || isNaN(num)) ? '0' : new Intl.NumberFormat('id-ID').format(num),
    
    parseFormattedNumber: (str) => typeof str !== 'string' ? (Number(str) || 0) : (parseFloat(String(str).replace(/\./g, '').replace(/,/g, '.')) || 0),

    initializeSelect2: (selector) => {
        $(selector).select2({ width: '100%' });
    },

    getCurrentFormData: () => {
        const formData = new FormData(DOM.form);
        const data = Object.fromEntries(formData.entries());
        let itemIndex = 1;
        
        document.querySelectorAll(".boq-table-body:not(.hidden) .boq-item-row").forEach(row => {
            const jenisPekerjaan = row.querySelector('.jenis-pekerjaan').value;
            const volume = parseFloat(row.querySelector('.volume').value) || 0;

            if (jenisPekerjaan && volume > 0) {
                data[`Kategori_Pekerjaan_${itemIndex}`] = row.dataset.category;
                data[`Jenis_Pekerjaan_${itemIndex}`] = jenisPekerjaan;
                data[`Satuan_Item_${itemIndex}`] = row.querySelector('.satuan').value;
                data[`Volume_Item_${itemIndex}`] = volume;
                data[`Harga_Material_Item_${itemIndex}`] = Utils.parseFormattedNumber(row.querySelector('.harga-material').value);
                data[`Harga_Upah_Item_${itemIndex}`] = Utils.parseFormattedNumber(row.querySelector('.harga-upah').value);
                data["nama_toko"] = data["Nama_Toko"] || document.getElementById("nama_toko")?.value?.trim() || "";
                itemIndex++;
            }
        });
        return JSON.stringify(data);
    },

    toggleMessage: (text, type = 'info') => {
        DOM.messageDiv.textContent = text;
        DOM.messageDiv.style.display = 'block';
        if (type === 'error') {
            DOM.messageDiv.style.backgroundColor = "#dc3545";
            DOM.messageDiv.style.color = "white";
        } else if (type === 'success') {
            DOM.messageDiv.style.backgroundColor = "#28a745";
            DOM.messageDiv.style.color = "white";
        } else {
            DOM.messageDiv.style.backgroundColor = "#007bff"; // Blue/Info
            DOM.messageDiv.style.color = "white";
        }
        
        // Special case for warning/yellow
        if (type === 'warning') {
            DOM.messageDiv.style.backgroundColor = "#ffc107";
            DOM.messageDiv.style.color = "#000";
        }
    }
};

const handleCurrencyInput = (event) => {
    const input = event.target;
    let numericValue = input.value.replace(/[^0-9]/g, '');
    if (numericValue === '') {
        input.value = '';
    } else {
        input.value = Utils.formatNumberWithSeparators(parseInt(numericValue, 10));
    }
    calculateTotalPrice(input); // Recalculate totals immediately
};

// --- 5. Core Logic Functions ---

const populateJenisPekerjaanOptionsForNewRow = (rowElement) => {
    const category = rowElement.dataset.category;
    const scope = rowElement.dataset.scope;
    const selectEl = rowElement.querySelector(".jenis-pekerjaan");

    if (!selectEl) return;

    const dataSource = (scope === "Sipil") ? STATE.categorizedPrices.sipil : (scope === "ME") ? STATE.categorizedPrices.me : {};
    const itemsInCategory = dataSource ? (dataSource[category] || []) : [];

    // Filter already selected items
    const selectedValues = Array.from(
        document.querySelectorAll(`.boq-table-body[data-category="${category}"] .jenis-pekerjaan`)
    ).map(sel => sel.value).filter(v => v !== "");

    selectEl.innerHTML = '<option value="">-- Pilih Jenis Pekerjaan --</option>';

    if (itemsInCategory.length > 0) {
        itemsInCategory.forEach(item => {
            const option = document.createElement("option");
            option.value = item["Jenis Pekerjaan"];
            option.textContent = item["Jenis Pekerjaan"];
            option.title = item["Jenis Pekerjaan"];

            if (selectedValues.includes(item["Jenis Pekerjaan"])) {
                option.disabled = true;
            }
            selectEl.appendChild(option);
        });
    } else {
        selectEl.innerHTML = '<option value="">-- Tidak ada item --</option>';
    }
};

const refreshJenisPekerjaanOptions = (category) => {
    const selects = document.querySelectorAll(`.boq-table-body[data-category="${category}"] .jenis-pekerjaan`);
    const selectedValues = Array.from(selects).map(sel => sel.value).filter(v => v !== "");

    selects.forEach(select => {
        const currentValue = select.value;
        Array.from(select.options).forEach(opt => {
            if (opt.value === "") return;
            const isSelectedElsewhere = selectedValues.includes(opt.value);
            opt.disabled = (opt.value !== currentValue && isSelectedElsewhere);
        });
    });
};

const autoFillPrices = (selectElement) => {
    const row = selectElement.closest("tr");
    if (!row) return;

    const selectedJenisPekerjaan = selectElement.value;
    selectElement.title = selectElement.selectedIndex > 0 ? selectElement.options[selectElement.selectedIndex].text : '';

    const currentCategory = row.dataset.category;
    const currentLingkupPekerjaan = DOM.lingkupPekerjaanSelect.value;
    const dataSource = (currentLingkupPekerjaan === "Sipil") ? STATE.categorizedPrices.sipil : STATE.categorizedPrices.me;
    
    const els = {
        volume: row.querySelector(".volume"),
        material: row.querySelector(".harga-material"),
        upah: row.querySelector(".harga-upah"),
        satuan: row.querySelector(".satuan")
    };

    // Reset styles
    Object.values(els).forEach(el => el.classList.remove('auto-filled', 'kondisional-input'));

    if (!selectedJenisPekerjaan) {
        els.volume.value = "0.00"; els.volume.readOnly = false;
        els.material.value = "0"; els.material.readOnly = true;
        els.upah.value = "0"; els.upah.readOnly = true;
        els.satuan.value = "";
        calculateTotalPrice(selectElement);
        return;
    }

    els.material.removeEventListener('input', handleCurrencyInput);
    els.upah.removeEventListener('input', handleCurrencyInput);

    const selectedItem = dataSource && dataSource[currentCategory] 
        ? dataSource[currentCategory].find(item => item["Jenis Pekerjaan"] === selectedJenisPekerjaan) 
        : null;

    if (selectedItem) {
        els.satuan.value = selectedItem["Satuan"];
        els.satuan.classList.add('auto-filled');

        if (selectedItem["Satuan"] === "Ls") {
            els.volume.value = "1.00"; els.volume.readOnly = true; els.volume.classList.add('auto-filled');
        } else {
            els.volume.value = "0.00"; els.volume.readOnly = false; els.volume.classList.remove('auto-filled');
        }

        const isMatKondisional = selectedItem["Harga Material"] === "Kondisional";
        const isUpahKondisional = selectedItem["Harga Upah"] === "Kondisional";

        // Logic Material
        if (isMatKondisional) {
            els.material.value = "0"; els.material.readOnly = true;
            els.material.classList.add("auto-filled");
        } else {
            els.material.value = Utils.formatNumberWithSeparators(selectedItem["Harga Material"]);
            els.material.readOnly = true;
            els.material.classList.add("auto-filled");
        }

        // Logic Upah
        if (isMatKondisional || isUpahKondisional) {
            els.upah.value = "0"; els.upah.readOnly = false;
            els.upah.classList.add("kondisional-input");
            els.upah.addEventListener("input", handleCurrencyInput);
            els.upah.focus();
        } else {
            els.upah.value = Utils.formatNumberWithSeparators(selectedItem["Harga Upah"]);
            els.upah.readOnly = true;
            els.upah.classList.add("auto-filled");
        }
    }

    calculateTotalPrice(selectElement);
};

// --- 6. DOM Creation Functions ---

const createBoQRow = (category, scope) => {
    const row = document.createElement("tr");
    row.classList.add("boq-item-row");
    row.dataset.scope = scope;
    row.dataset.category = category;

    // Use Template Literals for cleaner HTML structure
    row.innerHTML = `
        <td class="col-no"><span class="row-number"></span></td>
        <td class="col-jenis-pekerjaan">
            <select class="jenis-pekerjaan form-control" name="Jenis_Pekerjaan_Item" required><option value="">-- Pilih --</option></select>
        </td>
        <td class="col-satuan"><input type="text" class="satuan form-control auto-filled" name="Satuan_Item" required readonly /></td>
        <td class="col-volume">
            <input type="text" class="volume form-control" name="Volume_Item" value="0.00" inputmode="decimal" 
            oninput="this.value = this.value.replace(/[^0-9.]/g, '').replace(/(\\..*?)\\..*/g, '$1').replace(/(\\.\\d{2})\\d+/, '$1')" />
        </td>
        <td class="col-harga"><input type="text" class="harga-material form-control auto-filled" name="Harga_Material_Item" inputmode="numeric" required readonly /></td>
        <td class="col-harga"><input type="text" class="harga-upah form-control auto-filled" name="Harga_Upah_Item" inputmode="numeric" required readonly /></td>
        <td class="col-total"><input type="text" class="total-material form-control auto-filled" disabled /></td>
        <td class="col-total"><input type="text" class="total-upah form-control auto-filled" disabled /></td>
        <td class="col-total-harga"><input type="text" class="total-harga form-control auto-filled" disabled /></td>
        <td class="col-aksi"><button type="button" class="delete-row-btn">Hapus</button></td>
    `;

    // Attach listeners
    row.querySelector(".volume").addEventListener("input", (e) => calculateTotalPrice(e.target));
    
    row.querySelector(".delete-row-btn").addEventListener("click", () => {
        // Correct Select2 Cleanup
        $(row.querySelector('.jenis-pekerjaan')).select2('destroy');
        row.remove();
        updateAllRowNumbersAndTotals();
        refreshJenisPekerjaanOptions(category);
    });

    const jenisPekerjaanSelect = row.querySelector('.jenis-pekerjaan');
    $(jenisPekerjaanSelect).on('change', function (e) {
        autoFillPrices(e.target);
        refreshJenisPekerjaanOptions(category);
    });

    Utils.initializeSelect2(jenisPekerjaanSelect);

    return row;
};

function createTableStructure(categoryName, scope) {
    const tableContainer = document.createElement('div');
    tableContainer.className = 'table-container';
    tableContainer.style.display = 'none';
    
    const sectionTitle = document.createElement('h2');
    sectionTitle.className = 'text-lg font-semibold mt-6 mb-2 section-title';
    sectionTitle.textContent = categoryName;

    const table = document.createElement('table');
    table.innerHTML = `
        <colgroup>
            <col class="col-no"><col class="col-jenis-pekerjaan"><col class="col-satuan">
            <col class="col-volume"><col class="col-harga"><col class="col-harga">
            <col class="col-total"><col class="col-total"><col class="col-total-harga"><col class="col-aksi">
        </colgroup>
        <thead>
            <tr>
                <th rowspan="2">No</th><th rowspan="2">Jenis Pekerjaan</th><th rowspan="2">Satuan</th><th colspan="1">Volume</th><th colspan="2">Harga Satuan (Rp)</th><th colspan="2">Total Harga Satuan (Rp)</th><th colspan="1">Total Harga (Rp)</th><th rowspan="2">Aksi</th>
            </tr>
            <tr>
                <th>a</th><th>Material<br>(b)</th><th>Upah<br>(c)</th><th>Material<br>(d = a × b)</th><th>Upah<br>(e = a × c)</th><th>(f = d + e)</th>
            </tr>
        </thead>
        <tbody class="boq-table-body" data-category="${categoryName}" data-scope="${scope}"></tbody>
        <tfoot>
            <tr>
                <td colspan="8" style="text-align: right; font-weight: bold">Sub Total:</td>
                <td class="sub-total-amount" style="font-weight: bold; text-align: center">Rp 0</td>
                <td></td>
            </tr>
        </tfoot>
    `;

    const addRowButton = document.createElement('button');
    addRowButton.type = 'button';
    addRowButton.className = 'add-row-btn';
    addRowButton.dataset.category = categoryName;
    addRowButton.dataset.scope = scope;
    addRowButton.textContent = `Tambah Item ${categoryName}`;

    // Add event listener immediately to the button
    addRowButton.addEventListener("click", async () => {
        // Ensure table is visible
        tableContainer.style.display = 'block';
        
        // Ensure data exists
        const dataSource = scope === "Sipil" ? STATE.categorizedPrices.sipil : STATE.categorizedPrices.me;
        if (!dataSource || Object.keys(dataSource).length === 0) {
            await fetchAndPopulatePrices();
        }

        const targetTbody = table.querySelector('.boq-table-body');
        if (targetTbody) {
            const newRow = createBoQRow(categoryName, scope);
            targetTbody.appendChild(newRow);
            populateJenisPekerjaanOptionsForNewRow(newRow);
            updateAllRowNumbersAndTotals();
        }
    });

    const wrapper = document.createElement('div');
    wrapper.appendChild(sectionTitle);
    wrapper.appendChild(tableContainer).appendChild(table);
    wrapper.appendChild(addRowButton);

    return wrapper;
}

function buildTables(scope, data) {
    const wrapper = scope === 'Sipil' ? DOM.sipilTablesWrapper : DOM.meTablesWrapper;
    wrapper.innerHTML = ''; // Clear previous content
    const categories = scope === 'Sipil' ? CONFIG.SIPIL_CATEGORIES : CONFIG.ME_CATEGORIES;

    categories.forEach(category => {
        wrapper.appendChild(createTableStructure(category, scope));
    });
}

// --- 7. Data Fetching & Form Hydration ---

async function fetchAndPopulatePrices() {
    const selectedCabang = DOM.cabangSelect.value;
    const selectedScope = DOM.lingkupPekerjaanSelect.value;

    if (!selectedCabang || !selectedScope) return;

    Utils.toggleMessage(`Memuat data harga untuk Cabang ${selectedCabang} - ${selectedScope}...`, 'info');

    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/get-data?cabang=${selectedCabang}&lingkup=${selectedScope}`);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Gagal mengambil data: ${response.statusText}`);
        }
        const data = await response.json();

        buildTables(selectedScope, data);

        if (selectedScope === 'Sipil') {
            STATE.categorizedPrices.sipil = data;
        } else if (selectedScope === 'ME') {
            STATE.categorizedPrices.me = data;
        }
        
        DOM.messageDiv.style.display = 'none';

    } catch (error) {
        console.error("Error fetching price data:", error);
        Utils.toggleMessage(`Error: ${error.message}`, 'error');
    }
}

async function populateFormWithHistory(data) {
    DOM.form.reset();
    DOM.sipilTablesWrapper.innerHTML = "";
    DOM.meTablesWrapper.innerHTML = "";

    const nomorUlok = data["Nomor Ulok"];
    if (nomorUlok) {
        const cleanUlok = nomorUlok.replace(/-/g, ""); 
        // Logic for checking if Renovasi based on length (13 chars ends with R)
        const isRenov = cleanUlok.length === 13 && cleanUlok.endsWith("R");
        
        let ulokParts;
        if (isRenov) {
            ulokParts = cleanUlok.match(/^(.{4})(.{4})(.{4})R$/);
        } else {
            ulokParts = cleanUlok.match(/^(.{4})(.{4})(.{4})$/);
        }

        if (ulokParts) {
            DOM.lokasiCabang.value = ulokParts[1];
            DOM.lokasiTanggal.value = ulokParts[2];
            DOM.lokasiManual.value = ulokParts[3];
            
            DOM.toggleRenovasi.checked = isRenov;
            // Dispatch event to update UI visibility
            DOM.toggleRenovasi.dispatchEvent(new Event('change'));
            
            updateNomorUlok();
        }
    }

    // Populate standard inputs
    const namaTokoVal = data["nama_toko"] || data["Nama_Toko"];
    if (namaTokoVal) document.getElementById("nama_toko").value = namaTokoVal;

    for (const key in data) {
        const input = DOM.form.querySelector(`[name="${key}"]`);
        if (input && key !== "Nomor Ulok") {
            input.value = data[key];
        }
    }

    const selectedScope = DOM.lingkupPekerjaanSelect.value;
    DOM.sipilTablesWrapper.classList.toggle("hidden", selectedScope !== "Sipil");
    DOM.meTablesWrapper.classList.toggle("hidden", selectedScope !== "ME");

    await fetchAndPopulatePrices();

    const itemDetails = data["Item_Details_JSON"] ? JSON.parse(data["Item_Details_JSON"]) : data;

    // Reconstruct rows
    for (let i = 1; i <= 200; i++) {
        if (itemDetails[`Jenis_Pekerjaan_${i}`]) {
            const category = itemDetails[`Kategori_Pekerjaan_${i}`];
            const scope = DOM.lingkupPekerjaanSelect.value;
            const targetTbody = document.querySelector(`.boq-table-body[data-category="${category}"][data-scope="${scope}"]`);

            if (targetTbody) {
                targetTbody.closest(".table-container").style.display = "block";

                const newRow = createBoQRow(category, scope);
                targetTbody.appendChild(newRow);
                populateJenisPekerjaanOptionsForNewRow(newRow);

                const rowSelect = newRow.querySelector(".jenis-pekerjaan");
                rowSelect.value = itemDetails[`Jenis_Pekerjaan_${i}`];
                
                // Initialize Select2 val for UI
                $(rowSelect).val(itemDetails[`Jenis_Pekerjaan_${i}`]).trigger('change.select2'); 

                autoFillPrices(rowSelect);

                newRow.querySelector(".volume").value = itemDetails[`Volume_Item_${i}`] || "0.00";
                
                // If price was edited manually in history, reflect it
                const materialInput = newRow.querySelector(".harga-material");
                const upahInput = newRow.querySelector(".harga-upah");

                if (!materialInput.readOnly) {
                    materialInput.value = Utils.formatNumberWithSeparators(itemDetails[`Harga_Material_Item_${i}`]);
                }
                if (!upahInput.readOnly) {
                    upahInput.value = Utils.formatNumberWithSeparators(itemDetails[`Harga_Upah_Item_${i}`]);
                }
                calculateTotalPrice(newRow.querySelector(".volume"));
            }
        }
    }

    updateAllRowNumbersAndTotals();
    STATE.originalFormData = Utils.getCurrentFormData();
}

// --- 8. Calculation Logic ---

const updateAllRowNumbersAndTotals = () => {
    document.querySelectorAll(".boq-table-body").forEach(tbody => {
        tbody.querySelectorAll(".boq-item-row").forEach((row, index) => {
            row.querySelector(".row-number").textContent = index + 1;
        });
        calculateSubTotal(tbody);
    });
    calculateGrandTotal();
};

const calculateSubTotal = (tbodyElement) => {
    let subTotal = 0;
    tbodyElement.querySelectorAll(".boq-item-row .total-harga").forEach(input => subTotal += Utils.parseRupiah(input.value));
    const subTotalAmountElement = tbodyElement.closest("table").querySelector(".sub-total-amount");
    if (subTotalAmountElement) subTotalAmountElement.textContent = Utils.formatRupiah(subTotal);
};

function calculateTotalPrice(inputElement) {
    const row = inputElement.closest("tr");
    if (!row) return;

    const volume = parseFloat(row.querySelector("input.volume").value) || 0;
    const material = Utils.parseFormattedNumber(row.querySelector("input.harga-material").value);
    const upah = Utils.parseFormattedNumber(row.querySelector("input.harga-upah").value);

    const totalMaterial = volume * material;
    const totalUpah = volume * upah;

    row.querySelector("input.total-material").value = Utils.formatRupiah(totalMaterial);
    row.querySelector("input.total-upah").value = Utils.formatRupiah(totalUpah);
    row.querySelector("input.total-harga").value = Utils.formatRupiah(totalMaterial + totalUpah);

    calculateSubTotal(row.closest(".boq-table-body"));
    calculateGrandTotal();
}

const calculateGrandTotal = () => {
    let total = 0;
    document.querySelectorAll(".boq-table-body:not(.hidden) .total-harga").forEach(input => total += Utils.parseRupiah(input.value));

    if (DOM.grandTotalAmount) DOM.grandTotalAmount.textContent = Utils.formatRupiah(total);
    
    // Round down to nearest 10,000
    const pembulatan = Math.floor(total / 10000) * 10000;
    const ppn = pembulatan * 0.11;
    const finalTotal = pembulatan + ppn;

    if (DOM.pembulatanAmount) DOM.pembulatanAmount.textContent = Utils.formatRupiah(pembulatan);
    if (DOM.ppnAmount) DOM.ppnAmount.textContent = Utils.formatRupiah(ppn);
    if (DOM.finalTotalAmount) DOM.finalTotalAmount.textContent = Utils.formatRupiah(finalTotal);
};

// --- 9. Event Handlers ---

const updateNomorUlok = () => {
    const kodeCabang = DOM.lokasiCabang.value;
    const tanggalInput = DOM.lokasiTanggal.value;
    const manualValue = DOM.lokasiManual.value;
    const isRenovasi = DOM.toggleRenovasi.checked;

    if (kodeCabang && tanggalInput.length === 4 && manualValue.length === 4) {
        let nomorUlok = `${kodeCabang}${tanggalInput}${manualValue}`;
        if (isRenovasi) nomorUlok += "R";
        DOM.lokasi.value = nomorUlok;
    } else {
        DOM.lokasi.value = '';
    }
};

const checkAndPopulateRejectedData = () => {
    const fullUlok = DOM.lokasi.value.replace(/-/g, '');
    const selectedScope = DOM.lingkupPekerjaanSelect.value;

    if ((fullUlok.length !== 12 && fullUlok.length !== 13) || !selectedScope) return;

    const rejectedData = STATE.rejectedSubmissionsList.find(item => {
        const itemUlok = item['Nomor Ulok'].replace(/-/g, '');
        const itemScope = item['Lingkup_Pekerjaan'] || item['Lingkup Pekerjaan'];
        return itemUlok === fullUlok && itemScope === selectedScope;
    });

    if (rejectedData) {
        if (confirm(`Ditemukan data REVISI untuk Ulok ${rejectedData['Nomor Ulok']} (${selectedScope}) yang ditolak. \nApakah Anda ingin memuat data tersebut untuk diperbaiki?`)) {
            populateFormWithHistory(rejectedData);
            Utils.toggleMessage(`Memuat data revisi untuk ${selectedScope}. Silakan perbaiki item yang salah.`, 'warning');
        }
    }
};

async function handleFormSubmit() {
    if (!DOM.form.checkValidity()) {
        DOM.form.reportValidity();
        return;
    }

    const currentData = Utils.getCurrentFormData();
    if (STATE.originalFormData && currentData === STATE.originalFormData) {
        Utils.toggleMessage("Tidak ada perubahan yang terdeteksi. Silakan ubah data sebelum mengirim.", 'warning');
        return;
    }

    // Check ULOK
    const nomorUlok = (DOM.lokasi?.value || '').trim();
    if (!nomorUlok || nomorUlok.length < 12) {
        Utils.toggleMessage("Nomor Ulok belum lengkap.", 'warning');
        return;
    }

    try {
        const checkResp = await fetch(`${CONFIG.API_BASE_URL}/api/check_ulok_rab_2?ulok=${encodeURIComponent(nomorUlok.replace(/-/g, ''))}`);
        const checkData = await checkResp.json();

        if (checkResp.ok && checkData?.status === 'success' && checkData?.data?.exists) {
            Utils.toggleMessage(`Nomor Ulok sudah terdaftar pada RAB 2 (Lingkup: <strong>${checkData.data.lingkup}</strong>). Jika ingin revisi, lanjutkan pengisian lalu kirim.`, 'warning');
        }
    } catch (err) {
        console.error('Gagal cek ULOK RAB 2:', err);
    }

    DOM.submitButton.disabled = true;
    Utils.toggleMessage("Mengirim data...", 'info');

    const formData = new FormData(DOM.form);
    const data = Object.fromEntries(formData.entries());

    // Prepare Payload
    data["nama_toko"] = data["Nama_Toko"] || document.getElementById("nama_toko")?.value?.trim() || "";
    data["Nama_Toko"] = data["nama_toko"];
    data["Cabang"] = DOM.cabangSelect.value;
    data["Email_Pembuat"] = sessionStorage.getItem("loggedInUserEmail");
    data["Grand Total"] = Utils.parseRupiah(DOM.grandTotalAmount.textContent);

    let itemIndex = 1;
    document.querySelectorAll(".boq-table-body:not(.hidden) .boq-item-row").forEach((row) => {
        const jenisPekerjaan = row.querySelector(".jenis-pekerjaan").value;
        const volume = parseFloat(row.querySelector(".volume").value) || 0;

        if (jenisPekerjaan && volume > 0) {
            const materialValue = Utils.parseFormattedNumber(row.querySelector(".harga-material").value);
            const upahValue = Utils.parseFormattedNumber(row.querySelector(".harga-upah").value);

            data[`Kategori_Pekerjaan_${itemIndex}`] = row.dataset.category;
            data[`Jenis_Pekerjaan_${itemIndex}`] = jenisPekerjaan;
            data[`Satuan_Item_${itemIndex}`] = row.querySelector(".satuan").value;
            data[`Volume_Item_${itemIndex}`] = volume;
            data[`Harga_Material_Item_${itemIndex}`] = materialValue;
            data[`Harga_Upah_Item_${itemIndex}`] = upahValue;
            data[`Total_Material_Item_${itemIndex}`] = Utils.parseRupiah(row.querySelector(".total-material").value);
            data[`Total_Upah_Item_${itemIndex}`] = Utils.parseRupiah(row.querySelector(".total-upah").value);
            data[`Total_Harga_Item_${itemIndex}`] = Utils.parseRupiah(row.querySelector(".total-harga").value);
            itemIndex++;
        }
    });

    const pdfFile = document.getElementById('attachment_pdf').files[0];
    const submissionData = new FormData();

    if (pdfFile) submissionData.append("file_pdf", pdfFile, pdfFile.name);
    
    for (const key in data) {
        if (data.hasOwnProperty(key)) {
            submissionData.append(key, String(data[key]));
        }
    }

    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/submit_rab_kedua`, {
            method: "POST",
            body: submissionData,
        });

        const result = await response.json();

        if (response.ok && result.status === "success") {
            Utils.toggleMessage("Data berhasil dikirim! Halaman akan dimuat ulang.", 'success');
            setTimeout(() => window.location.reload(), 5000);
        } else {
            throw new Error(result.message || "Terjadi kesalahan di server.");
        }
    } catch (error) {
        Utils.toggleMessage(`Error: ${error.message}`, 'error');
        DOM.submitButton.disabled = false;
    }
}

// --- 10. Initialization ---

function checkSessionTime() {
    try {
        const now = new Date();
        const currentHour = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: "Asia/Jakarta", hour: '2-digit', hour12: false }).format(now));

        if (currentHour < 6 || currentHour >= 23) {
            if (sessionStorage.getItem("authenticated")) {
                sessionStorage.clear();
                alert("Sesi Anda telah berakhir karena di luar jam operasional (06:00 - 18:00 WIB).");
                window.location.href = "/index.html";
            }
        }
    } catch (err) {
        console.error("Gagal menjalankan pengecekan jam sesi:", err);
    }
}

async function initializePage() {
    // Populate DOM object
    DOM = {
        form: document.getElementById("form"),
        submitButton: document.getElementById("submit-button"),
        messageDiv: document.getElementById("message"),
        grandTotalAmount: document.getElementById("grand-total-amount"),
        pembulatanAmount: document.getElementById("pembulatan-amount"),
        ppnAmount: document.getElementById("ppn-amount"),
        finalTotalAmount: document.getElementById("final-total-amount"),
        lingkupPekerjaanSelect: document.getElementById("lingkup_pekerjaan"),
        cabangSelect: document.getElementById("cabang"),
        lokasiCabang: document.getElementById('lokasi_cabang'),
        lokasiTanggal: document.getElementById('lokasi_tanggal'),
        lokasiManual: document.getElementById('lokasi_manual'),
        lokasi: document.getElementById('lokasi'),
        sipilTablesWrapper: document.getElementById("sipil-tables-wrapper"),
        meTablesWrapper: document.getElementById("me-tables-wrapper"),
        toggleRenovasi: document.getElementById('toggle_renovasi'),
        separatorRenov: document.getElementById('separator_renov'),
        suffixRenov: document.getElementById('suffix_renov'),
        resetButton: document.querySelector("button[type='reset']")
    };

    // Renovasi Toggle Listener
    DOM.toggleRenovasi.addEventListener('change', () => {
        const isRenov = DOM.toggleRenovasi.checked;
        DOM.separatorRenov.style.display = isRenov ? 'inline' : 'none';
        DOM.suffixRenov.style.display = isRenov ? 'block' : 'none';
        DOM.lokasiManual.placeholder = isRenov ? "C0B4" : "0001";
        if (!isRenov) DOM.lokasiManual.value = DOM.lokasiManual.value.replace(/[^0-9]/g, '');
        updateNomorUlok();
    });

    DOM.lokasiManual.addEventListener('input', function () {
        if (DOM.toggleRenovasi.checked) {
            this.value = this.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        } else {
            this.value = this.value.replace(/[^0-9]/g, '');
        }
        updateNomorUlok();
        checkAndPopulateRejectedData();
    });

    // Populate Select Options (Cabang & Locations)
    const userEmail = sessionStorage.getItem('loggedInUserEmail');
    const userCabang = sessionStorage.getItem('loggedInUserCabang')?.toUpperCase();

    DOM.lokasiCabang.innerHTML = '<option value="">-- Kode --</option>';

    if (userCabang) {
        if (userCabang === 'CIKOKOL') {
            const cikokolOptions = { "CIKOKOL": "KZ01" };
            for (const name in cikokolOptions) {
                DOM.lokasiCabang.add(new Option(`${name} (${cikokolOptions[name]})`, cikokolOptions[name]));
            }
        } else if (userCabang === 'BANDUNG') {
            const bandungOptions = { "BANDUNG 1": "BZ01", "BANDUNG 2": "NZ01" };
            for (const name in bandungOptions) {
                DOM.lokasiCabang.add(new Option(`${name} (${bandungOptions[name]})`, bandungOptions[name]));
            }
        } else {
            const ulokCode = CONFIG.BRANCH_ULOK_MAP[userCabang];
            if (ulokCode) {
                const opt = new Option(ulokCode, ulokCode);
                DOM.lokasiCabang.add(opt);
                DOM.lokasiCabang.value = ulokCode;
                DOM.lokasiCabang.disabled = true;
            }
        }
    }

    DOM.cabangSelect.innerHTML = '';
    if (userCabang) {
        const group = CONFIG.BRANCH_GROUPS[userCabang];
        if (group) {
            group.forEach(branchName => DOM.cabangSelect.add(new Option(branchName, branchName)));
            DOM.cabangSelect.value = userCabang;
        } else {
            DOM.cabangSelect.add(new Option(userCabang, userCabang));
            DOM.cabangSelect.value = userCabang;
            DOM.cabangSelect.disabled = true;
        }
    }

    // Check Status API
    Utils.toggleMessage('Memuat data status...', 'info');
    try {
        if (userEmail && userCabang) {
            const statusResponse = await fetch(`${CONFIG.API_BASE_URL}/api/check_status_rab_2?email=${encodeURIComponent(userEmail)}&cabang=${encodeURIComponent(userCabang)}`);
            const statusResult = await statusResponse.json();

            if (statusResult.active_codes) {
                STATE.pendingStoreCodes = statusResult.active_codes.pending || [];
                STATE.approvedStoreCodes = statusResult.active_codes.approved || [];
            }

            if (statusResult.rejected_submissions?.length > 0) {
                STATE.rejectedSubmissionsList = statusResult.rejected_submissions;
                const rejectedCodes = STATE.rejectedSubmissionsList.map(item => item['Nomor Ulok']).join(', ');
                Utils.toggleMessage(`Ditemukan pengajuan yang ditolak untuk Nomor Ulok: ${rejectedCodes}. Masukkan Nomor Ulok lengkap untuk revisi.`, 'warning');
            } else {
                DOM.messageDiv.style.display = 'none';
            }
        } else {
            DOM.messageDiv.style.display = 'none';
        }
    } catch (error) {
        console.error("Gagal memuat data status awal:", error);
        Utils.toggleMessage("Gagal memuat data status. Mohon muat ulang halaman.", 'error');
    } finally {
        DOM.lingkupPekerjaanSelect.disabled = false;
    }

    // Event Listeners
    DOM.lokasiCabang.addEventListener('change', () => { updateNomorUlok(); checkAndPopulateRejectedData(); });
    DOM.lokasiTanggal.addEventListener('input', () => { updateNomorUlok(); checkAndPopulateRejectedData(); });
    
    DOM.lingkupPekerjaanSelect.addEventListener("change", () => {
        const selectedScope = DOM.lingkupPekerjaanSelect.value;
        DOM.sipilTablesWrapper.innerHTML = '';
        DOM.meTablesWrapper.innerHTML = '';
        DOM.sipilTablesWrapper.classList.toggle("hidden", selectedScope !== 'Sipil');
        DOM.meTablesWrapper.classList.toggle("hidden", selectedScope !== 'ME');

        if (DOM.cabangSelect.value && selectedScope) fetchAndPopulatePrices();
        checkAndPopulateRejectedData();
    });

    DOM.cabangSelect.addEventListener('change', () => {
        if (DOM.cabangSelect.value && DOM.lingkupPekerjaanSelect.value) fetchAndPopulatePrices();
    });

    document.getElementById('attachment_pdf').addEventListener('change', function (e) {
        const fileNameDisplay = document.querySelector('.file-info-label');
        const wrapper = document.querySelector('.file-upload-wrapper');
        if (e.target.files.length > 0) {
            fileNameDisplay.textContent = `File Terpilih: ${e.target.files[0].name}`;
            wrapper.style.borderColor = '#48bb78';
            wrapper.style.backgroundColor = '#95ff95';
        } else {
            fileNameDisplay.textContent = `Belum ada file dipilih.`;
            wrapper.style.borderColor = '#9e0000';
            wrapper.style.backgroundColor = '#fff0f0';
        }
    });

    DOM.resetButton.addEventListener("click", () => {
        if (confirm("Apakah Anda yakin ingin mengulang dan mengosongkan semua isian form?")) window.location.reload();
    });

    DOM.submitButton.addEventListener("click", (e) => {
        e.preventDefault();
        handleFormSubmit();
    });

    checkSessionTime();
    setInterval(checkSessionTime, 300000); // 5 minutes
}

document.addEventListener("DOMContentLoaded", initializePage);