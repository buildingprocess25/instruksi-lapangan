// --- Global Variable Declarations ---
let form;
let submitButton;
let messageDiv;
let grandTotalAmount;
let finalTotalAmount;
let lingkupPekerjaanSelect;
let cabangSelect;
let sipilTablesWrapper;
let meTablesWrapper;
let currentResetButton;
let categorizedPrices = {};
let pendingStoreCodes = [];
let approvedStoreCodes = [];
let rejectedSubmissionsList = [];
let originalFormData = null;
let toggleRenovasi;
let separatorRenov;
let suffixRenov;
let pembulatanAmount;
let ppnAmount;

const PYTHON_API_BASE_URL = "https://instruksi-lapangan.onrender.com";
// const PYTHON_API_BASE_URL = "https://cuma-backend.web.id";

const sipilCategoryOrder = [
    "PEKERJAAN PERSIAPAN",
    "PEKERJAAN BOBOKAN / BONGKARAN",
    "PEKERJAAN TANAH",
    "PEKERJAAN PONDASI & BETON",
    "PEKERJAAN PASANGAN",
    "PEKERJAAN BESI",
    "PEKERJAAN KERAMIK",
    "PEKERJAAN PLUMBING",
    "PEKERJAAN SANITARY & ACECORIES",
    "PEKERJAAN JANITOR",
    "PEKERJAAN ATAP",
    "PEKERJAAN KUSEN, PINTU & KACA",
    "PEKERJAAN FINISHING",
    "PEKERJAAN BEANSPOT",
    "PEKERJAAN TAMBAHAN",
    "PEKERJAAN SBO"
];

const meCategoryOrder = [
    "INSTALASI",
    "FIXTURE",
    "PEKERJAAN TAMBAHAN",
    "PEKERJAAN SBO"
];

const branchGroups = {
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
};

const branchToUlokMap = {
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
};

// --- Helper Functions ---
const formatRupiah = (number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(number);
const parseRupiah = (formattedString) => parseFloat(String(formattedString).replace(/Rp\s?|\./g, "").replace(/,/g, ".")) || 0;
const formatNumberWithSeparators = (num) => (num === null || isNaN(num)) ? '0' : new Intl.NumberFormat('id-ID').format(num);
const parseFormattedNumber = (str) => typeof str !== 'string' ? (Number(str) || 0) : (parseFloat(String(str).replace(/\./g, '').replace(/,/g, '.')) || 0);

function applyTheme(theme) {
    const isDark = theme === 'dark';
    document.body.classList.toggle('dark', isDark);
    const btn = document.getElementById('theme-toggle');
    if (btn) {
        btn.setAttribute('aria-pressed', String(isDark));
        btn.textContent = isDark ? '☀️ Tema' : '🌙 Tema';
    }
}

function initThemeFromPreference() {
    try {
        const saved = localStorage.getItem('theme');
        const preferred = saved || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        applyTheme(preferred);
    } catch (e) {
        applyTheme('light');
    }
}


const handleCurrencyInput = (event) => {
    const input = event.target;
    let numericValue = input.value.replace(/[^0-9]/g, '');
    if (numericValue === '') {
        input.value = '';
        calculateTotalPrice(input);
        return;
    }
    const number = parseInt(numericValue, 10);
    input.value = formatNumberWithSeparators(number);
    calculateTotalPrice(input);
};

function getCurrentFormData() {
    const formData = new FormData(form);
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
            data[`Harga_Material_Item_${itemIndex}`] = parseFormattedNumber(row.querySelector('.harga-material').value);
            data[`Harga_Upah_Item_${itemIndex}`] = parseFormattedNumber(row.querySelector('.harga-upah').value);
            data["nama_toko"] = data["Nama_Toko"] || document.getElementById("nama_toko")?.value?.trim() || "";
            itemIndex++;
        }
    });
    return JSON.stringify(data);
}

const populateJenisPekerjaanOptionsForNewRow = (rowElement) => {
    const category = rowElement.dataset.category;
    const scope = rowElement.dataset.scope;
    const selectEl = rowElement.querySelector(".jenis-pekerjaan");

    if (!selectEl) return;

    const dataSource = (scope === "Sipil") ? categorizedPrices.categorizedSipilPrices : (scope === "ME") ? categorizedPrices.categorizedMePrices : {};
    const itemsInCategory = dataSource ? (dataSource[category] || []) : [];

    // --- PERBAIKAN DIMULAI ---
    // 1. Dapatkan semua nilai yang SUDAH DIPILIH di kategori ini
    const selectedValues = Array.from(
        document.querySelectorAll(`.boq-table-body[data-category="${category}"] .jenis-pekerjaan`)
    )
        .map(sel => sel.value)
        .filter(v => v !== "");
    // --- PERBAIKAN SELESAI ---

    selectEl.innerHTML = '<option value="">-- Pilih Jenis Pekerjaan --</option>';

    if (itemsInCategory.length > 0) {
        itemsInCategory.forEach(item => {
            const option = document.createElement("option");
            option.value = item["Jenis Pekerjaan"];
            option.textContent = item["Jenis Pekerjaan"];
            option.title = item["Jenis Pekerjaan"];

            // --- PERBAIKAN DIMULAI ---
            // 2. Nonaktifkan (disable) opsi jika sudah ada di selectedValues
            if (selectedValues.includes(item["Jenis Pekerjaan"])) {
                option.disabled = true;
            }
            // --- PERBAIKAN SELESAI ---

            selectEl.appendChild(option);
        });
    } else {
        selectEl.innerHTML = '<option value="">-- Tidak ada item --</option>';
    }
};

const autoFillPrices = (selectElement) => {
    const row = selectElement.closest("tr");
    if (!row) return;

    const selectedJenisPekerjaan = selectElement.value;

    if (selectElement.selectedIndex > 0) {
        selectElement.title = selectElement.options[selectElement.selectedIndex].text;
    } else {
        selectElement.title = '';
    }

    const currentCategory = row.dataset.category;
    const currentLingkupPekerjaan = lingkupPekerjaanSelect.value;

    const volumeInput = row.querySelector(".volume");
    const materialPriceInput = row.querySelector(".harga-material");
    const upahPriceInput = row.querySelector(".harga-upah");
    const satuanInput = row.querySelector(".satuan");

    // Selalu setel ulang tampilan saat pilihan berubah
    [volumeInput, materialPriceInput, upahPriceInput, satuanInput].forEach(el => {
        el.classList.remove('auto-filled', 'kondisional-input');
    });

    if (!selectedJenisPekerjaan) {
        volumeInput.value = "0.00";
        volumeInput.readOnly = false;
        materialPriceInput.value = "0";
        upahPriceInput.value = "0";
        satuanInput.value = "";
        materialPriceInput.readOnly = true;
        upahPriceInput.readOnly = true;
        calculateTotalPrice(selectElement);
        return;
    }

    materialPriceInput.removeEventListener('input', handleCurrencyInput);
    upahPriceInput.removeEventListener('input', handleCurrencyInput);

    let selectedItem = null;
    let dataSource = (currentLingkupPekerjaan === "Sipil") ? categorizedPrices.categorizedSipilPrices : categorizedPrices.categorizedMePrices;
    if (dataSource && dataSource[currentCategory]) {
        selectedItem = dataSource[currentCategory].find(item => item["Jenis Pekerjaan"] === selectedJenisPekerjaan);
    }

    if (selectedItem) {
        satuanInput.value = selectedItem["Satuan"];
        satuanInput.classList.add('auto-filled');

        if (selectedItem["Satuan"] === "Ls") {
            volumeInput.value = "1.00";
            volumeInput.readOnly = true;
            volumeInput.classList.add('auto-filled');
        } else {
            volumeInput.value = "0.00";
            volumeInput.readOnly = false;
            volumeInput.classList.remove('auto-filled');
        }

        const materialPrice = selectedItem["Harga Material"];
        const upahPrice = selectedItem["Harga Upah"];

        const isMaterialKondisional = materialPrice === "Kondisional";
        const isUpahKondisional = upahPrice === "Kondisional";

        // --- 1. Logika untuk Input Harga Material ---
        if (isMaterialKondisional) {
            // Jika material "Kondisional", set nilai ke 0 dan readonly
            materialPriceInput.value = "0";
            materialPriceInput.readOnly = true;
            materialPriceInput.classList.add("auto-filled");
            materialPriceInput.classList.remove("kondisional-input");
        } else {
            // Jika material punya harga, isi harga dan buat readonly
            materialPriceInput.value = formatNumberWithSeparators(materialPrice);
            materialPriceInput.readOnly = true;
            materialPriceInput.classList.add("auto-filled");
            materialPriceInput.classList.remove("kondisional-input");
        }

        // --- 2. Logika untuk Input Harga Upah ---
        // Input upah bisa diedit JIKA material "Kondisional" ATAU upah "Kondisional"
        if (isMaterialKondisional || isUpahKondisional) {
            upahPriceInput.value = "0"; // Selalu mulai dari 0 jika bisa diedit
            upahPriceInput.readOnly = false;
            upahPriceInput.classList.add("kondisional-input"); // Beri style kuning
            upahPriceInput.classList.remove("auto-filled");
            upahPriceInput.addEventListener("input", handleCurrencyInput);
            upahPriceInput.focus(); // Auto-fokus ke input upah
        } else {
            // Jika upah punya harga normal (dan material juga normal)
            upahPriceInput.value = formatNumberWithSeparators(upahPrice);
            upahPriceInput.readOnly = true;
            upahPriceInput.classList.add("auto-filled");
            upahPriceInput.classList.remove("kondisional-input");
        }

    } else {
        // Jika item tidak ditemukan (seharusnya tidak terjadi jika data lengkap)
        volumeInput.value = "0.00";
        volumeInput.readOnly = false;
        materialPriceInput.value = "0";
        materialPriceInput.readOnly = true;
        upahPriceInput.value = "0";
        upahPriceInput.readOnly = true;
        satuanInput.value = "";
    }

    calculateTotalPrice(selectElement);
};

function refreshJenisPekerjaanOptions(category) {
    // Kumpulkan semua jenis pekerjaan yang sudah dipilih dalam category ini
    const selectedValues = Array.from(
        document.querySelectorAll(`.boq-table-body[data-category="${category}"] .jenis-pekerjaan`)
    )
        .map(sel => sel.value)
        .filter(v => v !== "");

    // Loop semua select di kategori tersebut
    document.querySelectorAll(`.boq-table-body[data-category="${category}"] .jenis-pekerjaan`)
        .forEach(select => {
            const currentValue = select.value;

            Array.from(select.options).forEach(opt => {
                if (opt.value === "") return;

                const isSelectedElsewhere = selectedValues.includes(opt.value);

                // PERUBAHAN: Gunakan 'disabled' (ini bekerja dengan Select2)
                if (opt.value !== currentValue && isSelectedElsewhere) {
                    opt.disabled = true;
                } else {
                    opt.disabled = false;  // Pastikan untuk meng-enable kembali
                }
            });
        });
}

const createBoQRow = (category, scope) => {
    const row = document.createElement("tr");
    row.classList.add("boq-item-row");
    row.dataset.scope = scope;
    row.dataset.category = category;

    // PERBAIKAN UTAMA ADA DI BARIS innerHTML DI BAWAH INI
    row.innerHTML = `<td class="col-no"><span class="row-number"></span></td><td class="col-jenis-pekerjaan"><select class="jenis-pekerjaan form-control" name="Jenis_Pekerjaan_Item" required><option value="">-- Pilih --</option></select></td><td class="col-satuan"><input type="text" class="satuan form-control auto-filled" name="Satuan_Item" required readonly /></td><td class="col-volume"><input type="text" class="volume form-control" name="Volume_Item" value="0.00" inputmode="decimal" oninput="this.value = this.value.replace(/[^0-9.]/g, '').replace(/(\\..*?)\\..*/g, '$1').replace(/(\\.\\d{2})\\d+/, '$1')" /></td><td class="col-harga"><input type="text" class="harga-material form-control auto-filled" name="Harga_Material_Item" inputmode="numeric" required readonly /></td><td class="col-harga"><input type="text" class="harga-upah form-control auto-filled" name="Harga_Upah_Item" inputmode="numeric" required readonly /></td><td class="col-total"><input type="text" class="total-material form-control auto-filled" disabled /></td><td class="col-total"><input type="text" class="total-upah form-control auto-filled" disabled /></td><td class="col-total-harga"><input type="text" class="total-harga form-control auto-filled" disabled /></td><td class="col-aksi"><button type="button" class="delete-row-btn">Hapus</button></td>`;

    row.querySelector(".volume").addEventListener("input", (e) => calculateTotalPrice(e.target));
    row.querySelector(".delete-row-btn").addEventListener("click", () => {
        const category = row.dataset.category;
        $(row.querySelector('.jenis-pekerjaan')).select2('destroy');
        row.remove();
        updateAllRowNumbersAndTotals();
        refreshJenisPekerjaanOptions(category);
    });

    const jenisPekerjaanSelect = row.querySelector('.jenis-pekerjaan');

    $(jenisPekerjaanSelect).on('change', function (e) {
        autoFillPrices(e.target);
        const row = e.target.closest("tr");
        const category = row.dataset.category;
        refreshJenisPekerjaanOptions(category);
    });

    initializeSelect2(jenisPekerjaanSelect);

    return row;
};

function buildTables(scope, data) {
    const wrapper = scope === 'Sipil' ? sipilTablesWrapper : meTablesWrapper;
    wrapper.innerHTML = '';
    const categories = scope === 'Sipil' ? sipilCategoryOrder : meCategoryOrder;

    categories.forEach(category => {
        wrapper.appendChild(createTableStructure(category, scope));
    });

    document.querySelectorAll(".add-row-btn").forEach(button => {
        button.addEventListener("click", async () => {
            const category = button.dataset.category;
            const scope = button.dataset.scope;

            const categoryWrapper = button.parentElement;
            const tableContainer = categoryWrapper.querySelector('.table-container');
            if (tableContainer) {
                tableContainer.style.display = 'block';
            }

            const dataSource = scope === "Sipil" ? categorizedPrices.categorizedSipilPrices : categorizedPrices.categorizedMePrices;
            if (!dataSource || Object.keys(dataSource).length === 0) {
                await fetchAndPopulatePrices();
            }

            const targetTbody = document.querySelector(`.boq-table-body[data-category="${category}"]`);
            if (targetTbody) {
                const newRow = createBoQRow(category, scope);
                targetTbody.appendChild(newRow);
                populateJenisPekerjaanOptionsForNewRow(newRow);
                updateAllRowNumbersAndTotals();
            }
        });
    });
}

async function fetchAndPopulatePrices() {
    const selectedCabang = cabangSelect.value;
    const selectedScope = lingkupPekerjaanSelect.value;

    if (!selectedCabang || !selectedScope) {
        return;
    }

    messageDiv.textContent = `Memuat data harga untuk Cabang ${selectedCabang} - ${selectedScope}...`;
    messageDiv.style.display = 'block';
    messageDiv.style.backgroundColor = '#007bff';
    messageDiv.style.color = 'white';

    try {
        const response = await fetch(`${PYTHON_API_BASE_URL}/get-data?cabang=${selectedCabang}&lingkup=${selectedScope}`);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Gagal mengambil data: ${response.statusText}`);
        }
        const data = await response.json();

        buildTables(selectedScope, data);

        if (selectedScope === 'Sipil') {
            categorizedPrices.categorizedSipilPrices = data;
        } else if (selectedScope === 'ME') {
            categorizedPrices.categorizedMePrices = data;
        }
        console.log(`Data harga untuk ${selectedScope} berhasil dimuat.`);
        messageDiv.style.display = 'none';

    } catch (error) {
        console.error("Error fetching price data:", error);
        messageDiv.textContent = `Error: ${error.message}`;
        messageDiv.style.backgroundColor = "#dc3545";
    }
}

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
    tbodyElement.querySelectorAll(".boq-item-row .total-harga").forEach(input => subTotal += parseRupiah(input.value));
    const subTotalAmountElement = tbodyElement.closest("table").querySelector(".sub-total-amount");
    if (subTotalAmountElement) subTotalAmountElement.textContent = formatRupiah(subTotal);
};

function calculateTotalPrice(inputElement) {
    const row = inputElement.closest("tr");
    if (!row) return;
    const volume = parseFloat(row.querySelector("input.volume").value) || 0;

    const materialValue = row.querySelector("input.harga-material").value;
    const upahValue = row.querySelector("input.harga-upah").value;

    const material = parseFormattedNumber(materialValue);
    const upah = parseFormattedNumber(upahValue);

    const totalMaterial = volume * material;
    const totalUpah = volume * upah;
    row.querySelector("input.total-material").value = formatRupiah(totalMaterial);
    row.querySelector("input.total-upah").value = formatRupiah(totalUpah);
    row.querySelector("input.total-harga").value = formatRupiah(totalMaterial + totalUpah);
    calculateSubTotal(row.closest(".boq-table-body"));
    calculateGrandTotal();
}

const calculateGrandTotal = () => {
    let total = 0;
    // Hitung total murni dari semua input
    document.querySelectorAll(".boq-table-body:not(.hidden) .total-harga").forEach(input => total += parseRupiah(input.value));
    
    if (grandTotalAmount) grandTotalAmount.textContent = formatRupiah(total);
    // Pembulatan turun ke kelipatan 10.000
    const pembulatan = Math.floor(total / 10000) * 10000;
    // PPN 11% (dari hasil pembulatan)
    const ppn = pembulatan * 0.11;
    // Grand Total Final
    const finalTotal = pembulatan + ppn;

    if (pembulatanAmount) pembulatanAmount.textContent = formatRupiah(pembulatan);
    if (ppnAmount) ppnAmount.textContent = formatRupiah(ppn);
    if (finalTotalAmount) finalTotalAmount.textContent = formatRupiah(finalTotal);
};

async function populateFormWithHistory(data) {
    form.reset();
    sipilTablesWrapper.innerHTML = "";
    meTablesWrapper.innerHTML = "";

    const nomorUlok = data["Nomor Ulok"];
        if (nomorUlok) {
            const cleanUlok = nomorUlok.replace(/-/g, ""); // Hapus dash jika ada
    // Cek panjang karakter
    // Format Normal: Z001 2512 0001 (12 chars)
    // Format Renov:  Z001 2512 C0B4 R (13 chars)
            let ulokParts;
            const isRenov = cleanUlok.length === 13 && cleanUlok.endsWith("R");
            if (isRenov) {
            // Regex untuk Z001-2512-C0B4-R
                ulokParts = cleanUlok.match(/^(.{4})(.{4})(.{4})R$/);
            } else {
                // Regex untuk Z001-2512-0001
                    ulokParts = cleanUlok.match(/^(.{4})(.{4})(.{4})$/);
                    }

            if (ulokParts) {
                document.getElementById("lokasi_cabang").value = ulokParts[1];
                document.getElementById("lokasi_tanggal").value = ulokParts[2];
                document.getElementById("lokasi_manual").value = ulokParts[3];
            // Set status checkbox
                const toggleBox = document.getElementById("toggle_renovasi");
                if(isRenov) {
                    toggleBox.checked = true;
                // Trigger event change manual agar UI suffix muncul
                    toggleBox.dispatchEvent(new Event('change')); 
                } else {
                    toggleBox.checked = false;
                    toggleBox.dispatchEvent(new Event('change'));
                }
            updateNomorUlok();
            }
        }
    // Isi ulang field Nama Toko dari riwayat (dukung kedua penamaan)
    if (data["nama_toko"]) {
        document.getElementById("nama_toko").value = data["nama_toko"];
    } else if (data["Nama_Toko"]) {
        document.getElementById("nama_toko").value = data["Nama_Toko"];
    }

    for (const key in data) {
        const input = form.querySelector(`[name="${key}"]`);
        if (input && key !== "Nomor Ulok") {
            input.value = data[key];
        }
    }

    const selectedScope = lingkupPekerjaanSelect.value;
    sipilTablesWrapper.classList.toggle("hidden", selectedScope !== "Sipil");
    meTablesWrapper.classList.toggle("hidden", selectedScope !== "ME");

    await fetchAndPopulatePrices();

    const itemDetails = data["Item_Details_JSON"]
        ? JSON.parse(data["Item_Details_JSON"])
        : data;

    for (let i = 1; i <= 200; i++) {
        if (itemDetails[`Jenis_Pekerjaan_${i}`]) {
            const category = itemDetails[`Kategori_Pekerjaan_${i}`];
            const scope = lingkupPekerjaanSelect.value;
            const targetTbody = document.querySelector(
                `.boq-table-body[data-category="${category}"][data-scope="${scope}"]`
            );

            if (targetTbody) {
                const tableContainer = targetTbody.closest(".table-container");
                if (tableContainer) tableContainer.style.display = "block";

                const newRow = createBoQRow(category, scope);
                targetTbody.appendChild(newRow);
                populateJenisPekerjaanOptionsForNewRow(newRow);

                newRow.querySelector(".jenis-pekerjaan").value =
                    itemDetails[`Jenis_Pekerjaan_${i}`];

                autoFillPrices(newRow.querySelector(".jenis-pekerjaan"));

                newRow.querySelector(".volume").value =
                    itemDetails[`Volume_Item_${i}`] || "0.00";

                const materialInput = newRow.querySelector(".harga-material");
                const upahInput = newRow.querySelector(".harga-upah");

                if (!materialInput.readOnly) {
                    materialInput.value = formatNumberWithSeparators(
                        itemDetails[`Harga_Material_Item_${i}`]
                    );
                }
                if (!upahInput.readOnly) {
                    upahInput.value = formatNumberWithSeparators(
                        itemDetails[`Harga_Upah_Item_${i}`]
                    );
                }
                calculateTotalPrice(newRow.querySelector(".volume"));
            }
        }
    }

    updateAllRowNumbersAndTotals();
    originalFormData = getCurrentFormData();
}


async function handleFormSubmit() {
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const currentData = getCurrentFormData();
    if (originalFormData && currentData === originalFormData) {
        messageDiv.textContent =
            "Tidak ada perubahan yang terdeteksi. Silakan ubah data sebelum mengirim.";
        messageDiv.style.backgroundColor = "#ffc107";
        messageDiv.style.display = "block";
        return;
    }

    // Cek ULOK lebih dulu sebelum mengirim
    const nomorUlok = (document.getElementById('lokasi')?.value || '').trim();
    try {
        if (!nomorUlok || nomorUlok.length < 12) {
            messageDiv.textContent = "Nomor Ulok belum lengkap.";
            messageDiv.style.backgroundColor = "#ffc107";
            messageDiv.style.display = "block";
            return;
        }

        const checkResp = await fetch(`${PYTHON_API_BASE_URL}/api/check_ulok_rab_2?ulok=${encodeURIComponent(nomorUlok.replace(/-/g, ''))}`);
        const checkData = await checkResp.json();

        if (checkResp.ok && checkData?.status === 'success') {
            const exists = !!checkData?.data?.exists;
            if (exists) {
                // Tampilkan info bahwa ULok sudah ada di RAB 2
                const infoLingkup = checkData?.data?.lingkup || '-';
                messageDiv.innerHTML = `Nomor Ulok sudah terdaftar pada RAB 2 (Lingkup: <strong>${infoLingkup}</strong>). Jika ingin revisi, lanjutkan pengisian lalu kirim.`;
                messageDiv.style.backgroundColor = "#ffc107";
                messageDiv.style.display = "block";
                // Tetap lanjut mengirim (boleh revisi)
            } else {
                // Tidak ada, sembunyikan bar
                messageDiv.style.display = "none";
            }
        } else {
            // Jika API cek gagal, jangan blokir submit; hanya tampilkan peringatan ringan
            messageDiv.textContent = "Gagal mengecek status ULOK. Melanjutkan pengiriman.";
            messageDiv.style.backgroundColor = "#ffc107";
            messageDiv.style.display = "block";
        }
    } catch (err) {
        console.error('Gagal cek ULOK RAB 2:', err);
        messageDiv.textContent = "Gagal mengecek status ULOK. Melanjutkan pengiriman.";
        messageDiv.style.backgroundColor = "#ffc107";
        messageDiv.style.display = "block";
    }

    submitButton.disabled = true;
    messageDiv.textContent = "Mengirim data...";
    messageDiv.style.display = "block";
    messageDiv.style.backgroundColor = "#007bff";

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    const luasTerbangunanRaw = document.getElementById("luas_terbangunan")?.value;
    const luasTerbangunan = parseFloat(luasTerbangunanRaw);

    // Jika kosong / bukan angka

    // Jika hasil minus / <= 0


    // Mapping nama_toko
    data["nama_toko"] =
        data["Nama_Toko"] ||
        document.getElementById("nama_toko")?.value?.trim() ||
        "";
    data["Nama_Toko"] = data["nama_toko"];

    data["Cabang"] = cabangSelect.value;
    data["Email_Pembuat"] = sessionStorage.getItem("loggedInUserEmail");
    data["Grand Total"] = parseRupiah(grandTotalAmount.textContent);

    let itemIndex = 1;
    document
        .querySelectorAll(".boq-table-body:not(.hidden) .boq-item-row")
        .forEach((row) => {
            const jenisPekerjaan = row.querySelector(".jenis-pekerjaan").value;
            const volume = parseFloat(row.querySelector(".volume").value) || 0;

            if (jenisPekerjaan && volume > 0) {
                const materialInput = row.querySelector(".harga-material");
                const upahInput = row.querySelector(".harga-upah");

                const materialValue = parseFormattedNumber(materialInput.value);
                const upahValue = parseFormattedNumber(upahInput.value);

                data[`Kategori_Pekerjaan_${itemIndex}`] = row.dataset.category;
                data[`Jenis_Pekerjaan_${itemIndex}`] = jenisPekerjaan;
                data[`Satuan_Item_${itemIndex}`] = row.querySelector(".satuan").value;
                data[`Volume_Item_${itemIndex}`] = volume;
                data[`Harga_Material_Item_${itemIndex}`] = materialValue;
                data[`Harga_Upah_Item_${itemIndex}`] = upahValue;
                data[`Total_Material_Item_${itemIndex}`] = parseRupiah(
                    row.querySelector(".total-material").value
                );
                data[`Total_Upah_Item_${itemIndex}`] = parseRupiah(
                    row.querySelector(".total-upah").value
                );
                data[`Total_Harga_Item_${itemIndex}`] = parseRupiah(
                    row.querySelector(".total-harga").value
                );
                itemIndex++;
            }
        });

    // Ambil elemen input file berdasarkan ID
    const fileInput = document.getElementById('attachment_pdf');
    // Ambil file pertama yang dipilih user
    const pdfFile = fileInput.files[0];
    // Form data baru
    const submissionData = new FormData();

    // Tambah file PDF ke FormData
    if (pdfFile) {
        submissionData.append("file_pdf", pdfFile, pdfFile.name);
    }

    // Input semua data (termasuk Nomor Ulok) sebagai field biasa
    for (const key in data) {
        if (data.hasOwnProperty(key)) {
            submissionData.append(key, String(data[key]));
        }
    }

    try {
        const response = await fetch(`${PYTHON_API_BASE_URL}/api/submit_rab_kedua`, {
            method: "POST",
            body: submissionData,
        });

        const result = await response.json();

        if (response.ok && result.status === "success") {
            messageDiv.textContent =
                "Data berhasil dikirim! Halaman akan dimuat ulang.";
            messageDiv.style.backgroundColor = "#28a745";
            setTimeout(() => window.location.reload(), 5000);
        } else {
            throw new Error(result.message || "Terjadi kesalahan di server.");
        }
    } catch (error) {
        messageDiv.textContent = `Error: ${error.message}`;
        messageDiv.style.backgroundColor = "#dc3545";
        submitButton.disabled = false;
    }
}

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
            <col class="col-no">
            <col class="col-jenis-pekerjaan">
            <col class="col-satuan">
            <col class="col-volume">
            <col class="col-harga">
            <col class="col-harga">
            <col class="col-total">
            <col class="col-total">
            <col class="col-total-harga">
            <col class="col-aksi">
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

    const wrapper = document.createElement('div');
    wrapper.appendChild(sectionTitle);
    wrapper.appendChild(tableContainer).appendChild(table);
    wrapper.appendChild(addRowButton);

    return wrapper;
}

function updateNomorUlok() {
    const kodeCabang = document.getElementById('lokasi_cabang').value;
    const tanggalInput = document.getElementById('lokasi_tanggal').value;
    const manualValue = document.getElementById('lokasi_manual').value;
    const isRenovasi = document.getElementById('toggle_renovasi').checked;
    // Pastikan input manual panjangnya 4 karakter
    if (kodeCabang && tanggalInput.length === 4 && manualValue.length === 4) {
        let nomorUlok = `${kodeCabang}${tanggalInput}${manualValue}`;
        // Jika mode renovasi aktif, tambahkan 'R'
        if (isRenovasi) {
            nomorUlok += "R";
        }
        document.getElementById('lokasi').value = nomorUlok;
    } else {
        document.getElementById('lokasi').value = '';
    }
}

function checkAndPopulateRejectedData() {
    // 1. Ambil Ulok Lengkap
    const fullUlok = document.getElementById('lokasi').value.replace(/-/g, '');
    
    // 2. Ambil Lingkup Pekerjaan
    const selectedScope = document.getElementById('lingkup_pekerjaan').value;

    // PERBAIKAN: Izinkan panjang 12 (Reguler) ATAU 13 (Renovasi)
    // Jika panjang bukan 12 DAN bukan 13, atau lingkup belum dipilih, hentikan.
    if ((fullUlok.length !== 12 && fullUlok.length !== 13) || !selectedScope) {
        return;
    }

    // 3. Cari di rejectedSubmissionsList
    // Syarat: Ulok Sama DAN Lingkup Pekerjaan Sama
    const rejectedData = rejectedSubmissionsList.find(item => {
        const itemUlok = item['Nomor Ulok'].replace(/-/g, '');
        const itemScope = item['Lingkup_Pekerjaan'] || item['Lingkup Pekerjaan']; 
        
        return itemUlok === fullUlok && itemScope === selectedScope;
    });

    // 4. Jika ditemukan data revisi yang cocok
    if (rejectedData) {
        console.log("Data revisi ditemukan:", rejectedData);
        
        if (confirm(`Ditemukan data REVISI untuk Ulok ${rejectedData['Nomor Ulok']} (${selectedScope}) yang ditolak. \nApakah Anda ingin memuat data tersebut untuk diperbaiki?`)) {
            populateFormWithHistory(rejectedData);
            
            const msgDiv = document.getElementById("message");
            msgDiv.textContent = `Memuat data revisi untuk ${selectedScope}. Silakan perbaiki item yang salah.`;
            msgDiv.style.backgroundColor = '#ffc107'; 
            msgDiv.style.display = 'block';
        }
    }
}

async function initializePage() {
    form = document.getElementById("form");
    submitButton = document.getElementById("submit-button");
    messageDiv = document.getElementById("message");
    grandTotalAmount = document.getElementById("grand-total-amount");
    pembulatanAmount = document.getElementById("pembulatan-amount");
    ppnAmount = document.getElementById("ppn-amount");
    finalTotalAmount = document.getElementById("final-total-amount");
    lingkupPekerjaanSelect = document.getElementById("lingkup_pekerjaan");
    cabangSelect = document.getElementById("cabang");
    sipilTablesWrapper = document.getElementById("sipil-tables-wrapper");
    meTablesWrapper = document.getElementById("me-tables-wrapper");
    currentResetButton = form.querySelector("button[type='reset']");
    toggleRenovasi = document.getElementById('toggle_renovasi');
    separatorRenov = document.getElementById('separator_renov');
    suffixRenov = document.getElementById('suffix_renov');
    const inputManual = document.getElementById('lokasi_manual');

    initThemeFromPreference();
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            const next = document.body.classList.contains('dark') ? 'light' : 'dark';
            try { localStorage.setItem('theme', next); } catch (e) { }
            applyTheme(next);
        });
    }
    
    // --- LOGIKA 1: Event Listener Checkbox Renovasi ---
    toggleRenovasi.addEventListener('change', () => {
        if (toggleRenovasi.checked) {
            // Mode Renovasi: Tampilkan 'R', Input Manual jadi Alphanumeric
            separatorRenov.style.display = 'inline';
            suffixRenov.style.display = 'block';
            inputManual.placeholder = "C0B4"; // Contoh alphanumeric
        } else {
            // Mode Normal: Sembunyikan 'R', Input Manual jadi Numeric Only
            separatorRenov.style.display = 'none';
            suffixRenov.style.display = 'none';
            inputManual.placeholder = "0001"; // Contoh numeric
            // Bersihkan huruf jika user switch kembali ke normal
            inputManual.value = inputManual.value.replace(/[^0-9]/g, '');
        }
        updateNomorUlok();
    });

    // --- Validasi Input Manual (Dinamis) ---
    inputManual.addEventListener('input', function() {
        if (toggleRenovasi.checked) {
            // Allow Angka & Huruf (Alphanumeric)
            this.value = this.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        } else {
            // Allow Angka Saja (Numeric)
            this.value = this.value.replace(/[^0-9]/g, '');
        }
        updateNomorUlok();
        checkAndPopulateRejectedData();
    });

    const userEmail = sessionStorage.getItem('loggedInUserEmail');
    const userCabang = sessionStorage.getItem('loggedInUserCabang')?.toUpperCase();

    const lokasiCabangSelect = document.getElementById('lokasi_cabang');
    lokasiCabangSelect.innerHTML = '<option value="">-- Kode --</option>';

    if (userCabang) {
        if (userCabang === 'CIKOKOL') {
            const cikokolOptions = { "CIKOKOL": "KZ01" };
            for (const name in cikokolOptions) {
                const option = document.createElement('option');
                option.value = cikokolOptions[name];
                option.textContent = `${name} (${cikokolOptions[name]})`;
                lokasiCabangSelect.appendChild(option);
            }
            lokasiCabangSelect.disabled = false;
        }
        else if (userCabang === 'BANDUNG') {
            const bandungOptions = { "BANDUNG 1": "BZ01", "BANDUNG 2": "NZ01" };
            for (const name in bandungOptions) {
                const option = document.createElement('option');
                option.value = bandungOptions[name];
                option.textContent = `${name} (${bandungOptions[name]})`;
                lokasiCabangSelect.appendChild(option);
            }
            lokasiCabangSelect.disabled = false;
        }
        else {
            const ulokCode = branchToUlokMap[userCabang];
            if (ulokCode) {
                const option = document.createElement('option');
                option.value = ulokCode;
                option.textContent = ulokCode;
                lokasiCabangSelect.appendChild(option);
                lokasiCabangSelect.value = ulokCode;
                lokasiCabangSelect.disabled = true;
            }
        }
    }

    cabangSelect.innerHTML = '';

    if (userCabang) {
        const group = branchGroups[userCabang];
        if (group) {
            group.forEach(branchName => {
                const option = document.createElement('option');
                option.value = branchName;
                option.textContent = branchName;
                cabangSelect.appendChild(option);
            });
            cabangSelect.value = userCabang;
            cabangSelect.disabled = false;
        } else {
            const option = document.createElement('option');
            option.value = userCabang;
            option.textContent = userCabang;
            cabangSelect.appendChild(option);
            cabangSelect.value = userCabang;
            cabangSelect.disabled = true;
        }
    }

    messageDiv.textContent = 'Memuat data status...';
    messageDiv.style.display = 'block';

    try {
        if (userEmail && userCabang) {
            const statusResponse = await fetch(`${PYTHON_API_BASE_URL}/api/check_status_rab_2?email=${encodeURIComponent(userEmail)}&cabang=${encodeURIComponent(userCabang)}`);
            const statusResult = await statusResponse.json();
            
            if (statusResult.active_codes) {
                pendingStoreCodes = statusResult.active_codes.pending || [];
                approvedStoreCodes = statusResult.active_codes.approved || [];
            }
            
            if (statusResult.rejected_submissions && statusResult.rejected_submissions.length > 0) {
                rejectedSubmissionsList = statusResult.rejected_submissions;
                const rejectedCodes = rejectedSubmissionsList.map(item => item['Nomor Ulok']).join(', ');
                messageDiv.innerHTML = `Ditemukan pengajuan yang ditolak untuk Nomor Ulok: <strong>${rejectedCodes}</strong>. Masukkan Nomor Ulok lengkap untuk revisi.`;
                messageDiv.style.backgroundColor = '#ffc107';
            } else {
                messageDiv.style.display = 'none';
            }
        } else {
            messageDiv.style.display = 'none';
        }
    } catch (error) {
        console.error("Gagal memuat data status awal:", error);
        messageDiv.textContent = "Gagal memuat data status. Mohon muat ulang halaman.";
        messageDiv.style.backgroundColor = '#dc3545';
    } finally {
        lingkupPekerjaanSelect.disabled = false;
    }
    
    // 1. Saat Kode Cabang berubah
    document.getElementById('lokasi_cabang').addEventListener('change', () => {
        updateNomorUlok();
        checkAndPopulateRejectedData(); // Cek setiap kali ulok berubah
    });

    // 2. Saat Tanggal berubah
    document.getElementById('lokasi_tanggal').addEventListener('input', () => {
        updateNomorUlok();
        checkAndPopulateRejectedData();
    });

    // 3. Saat Nomor Manual berubah
    document.getElementById('lokasi_manual').addEventListener('input', () => {
        updateNomorUlok();
        checkAndPopulateRejectedData(); 
    });

    document.getElementById('lokasi_manual')?.addEventListener('input', function(e) {
        const fullUlok = document.getElementById('lokasi').value.replace(/-/g, '');
        if (fullUlok.length === 12) {
            const rejectedData = rejectedSubmissionsList.find(item => item['Nomor Ulok'].replace(/-/g, '') === fullUlok);
            if (rejectedData) {
                populateFormWithHistory(rejectedData);
            }
        }
    });
    
    // 4. Saat Lingkup Pekerjaan berubah
    lingkupPekerjaanSelect.addEventListener("change", () => {
        const selectedScope = lingkupPekerjaanSelect.value;
        // Logika toggle tabel (tetap ada)
        sipilTablesWrapper.innerHTML = '';
        meTablesWrapper.innerHTML = '';
        sipilTablesWrapper.classList.toggle("hidden", selectedScope !== 'Sipil');
        meTablesWrapper.classList.toggle("hidden", selectedScope !== 'ME');
        
        // Fetch harga (tetap ada)
        if (cabangSelect.value && selectedScope) {
            fetchAndPopulatePrices();
        }

        // --- TAMBAHAN BARU: Cek Data Revisi ---
        checkAndPopulateRejectedData();
    });

    cabangSelect.addEventListener('change', () => {
        if (cabangSelect.value && lingkupPekerjaanSelect.value) {
            fetchAndPopulatePrices();
        }
    });

    document.getElementById('attachment_pdf').addEventListener('change', function (e) {
        const fileNameDisplay = document.querySelector('.file-info-label');
        const wrapper = document.querySelector('.file-upload-wrapper');

        if (e.target.files.length > 0) {
            // File dipilih
            const fileName = e.target.files[0].name;
            fileNameDisplay.textContent = `File Terpilih: ${fileName}`;
            wrapper.style.borderColor = '#48bb78'; // Ubah border menjadi hijau
            wrapper.style.backgroundColor = '#95ff95ff'; // Latar belakang hijau muda

        } else {
            // Tidak ada file
            fileNameDisplay.textContent = `Belum ada file dipilih.`;
            wrapper.style.borderColor = '#9e0000ff'; // Kembalikan ke warna awal
            wrapper.style.backgroundColor = '#fff0f0ff';
        }
    });

    currentResetButton.addEventListener("click", () => {
        if (confirm("Apakah Anda yakin ingin mengulang dan mengosongkan semua isian form?")) {
            window.location.reload();
        }
    });

    submitButton.addEventListener("click", function (e) {
        e.preventDefault();
        handleFormSubmit();
    });

    checkSessionTime();
    setInterval(checkSessionTime, 300000);
}

document.addEventListener("DOMContentLoaded", initializePage);

function checkSessionTime() {
    try {
        const startHour = 6;
        const endHour = 18;

        const now = new Date();
        const options = { timeZone: "Asia/Jakarta", hour: '2-digit', hour12: false };
        const currentHour = parseInt(new Intl.DateTimeFormat('en-US', options).format(now));

        if (currentHour < startHour || currentHour >= endHour) {

            const token = sessionStorage.getItem("authenticated");

            if (token) {
                sessionStorage.removeItem("authenticated");
                sessionStorage.removeItem("loggedInUserEmail");
                sessionStorage.removeItem("loggedInUserCabang");
                sessionStorage.removeItem("userRole");

                alert("Sesi Anda telah berakhir karena di luar jam operasional (06:00 - 18:00 WIB).");

                window.location.href = "/login.html";
            }
        }
    } catch (err) {
        console.error("Gagal menjalankan pengecekan jam sesi:", err);
    }
}