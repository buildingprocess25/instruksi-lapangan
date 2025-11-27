document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('form');
    const PYTHON_API_BASE_URL = "https://building-alfamart.onrender.com"; 

    // --- Fungsi Bantuan ---
    const toBase64 = file => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });

    function showPopup(message, isSuccess = true) {
        const popup = document.getElementById('popup');
        const popupMessage = document.getElementById('popup-message') || popup.querySelector('p');
        if (popup && popupMessage) {
            popupMessage.textContent = message;
            popup.classList.add('show');
        } else {
            alert(message);
        }
    }

    async function populateDropdown(elementId, dataList, valueKey, textKey) {
        const select = document.getElementById(elementId);
        if (!select) return;
        const currentSelection = select.value; 
        select.innerHTML = `<option value="">-- Pilih ${elementId.replace(/_/g, ' ')} --</option>`;
        dataList.forEach(item => {
            const option = document.createElement('option');
            option.value = item[valueKey];
            option.textContent = item[textKey] || item[valueKey];
            select.appendChild(option);
        });
        if (currentSelection) {
            select.value = currentSelection;
        }
    }

    // --- Fungsi Inisialisasi Form ---
    async function initInputPICForm() {
        const cabangSelect = document.getElementById('cabang');
        const kodeUlokSelect = document.getElementById('kode_ulok');
        const picSelect = document.getElementById('pic_building_support');
        const rabUrlInput = document.getElementById('rab_url');
        const spkUrlInput = document.getElementById('spk_url');
        const userCabang = sessionStorage.getItem('loggedInUserCabang');

        if (!cabangSelect || !kodeUlokSelect || !picSelect || !rabUrlInput || !spkUrlInput) {
            console.error("Satu atau lebih elemen form penting tidak ditemukan!");
            return;
        }

        if (userCabang) {
            cabangSelect.innerHTML = `<option value="${userCabang}">${userCabang}</option>`;
            cabangSelect.value = userCabang;
            cabangSelect.disabled = true;

            try {
                const response = await fetch(`${PYTHON_API_BASE_URL}/api/pengawasan/init_data?cabang=${encodeURIComponent(userCabang)}`);
                if (!response.ok) throw new Error('Gagal memuat data awal untuk form.');
                const data = await response.json();

                if(data.picList) populateDropdown('pic_building_support', data.picList, 'email', 'nama');
                
                if(data.spkList && data.spkList.length > 0) {
                    const ulokData = data.spkList.map(item => ({ 
                        ulok: item['Nomor Ulok'] + ' (' + item['Lingkup Pekerjaan'] + ')',
                        displayText: `${item['Nomor Ulok']} (${item['Lingkup Pekerjaan']})`
                    }));
                    populateDropdown('kode_ulok', ulokData, 'ulok', 'displayText');
                } else {
                     kodeUlokSelect.innerHTML = '<option value="">-- Tidak ada SPK yang dibuat di cabang ini --</option>';
                }

            } catch (error) {
                console.error("Error saat inisialisasi form:", error);
                alert("Gagal memuat data untuk form. Silakan coba muat ulang halaman.");
            }
        } else {
            alert("Informasi cabang tidak ditemukan. Silakan login kembali.");
            [cabangSelect, kodeUlokSelect, picSelect].forEach(el => el.disabled = true);
        }
        
        kodeUlokSelect.addEventListener('change', async (e) => {
            const selectedUlokWithLingkup = e.target.value;
            const selectedUlok = selectedUlokWithLingkup.split(' (')[0]; // Extract the ulok
            rabUrlInput.value = '';
            spkUrlInput.value = '';

            if(!selectedUlok) return;

            rabUrlInput.placeholder = 'Mencari link RAB...';
            spkUrlInput.placeholder = 'Mencari link SPK...';

            // Fetch RAB URL
            try {
                 const response = await fetch(`${PYTHON_API_BASE_URL}/api/pengawasan/get_rab_url?kode_ulok=${encodeURIComponent(selectedUlok)}`);
                 const data = await response.json();
                 if(response.ok && data.rabUrl) {
                     rabUrlInput.value = data.rabUrl;
                 } else {
                     throw new Error(data.message || 'RAB tidak ditemukan');
                 }
            } catch(error) {
                rabUrlInput.placeholder = `Error: ${error.message}`;
            }

            // Fetch SPK URL
            try {
                 const response = await fetch(`${PYTHON_API_BASE_URL}/api/pengawasan/get_spk_url?kode_ulok=${encodeURIComponent(selectedUlok)}`);
                 const data = await response.json();
                 if(response.ok && data.spkUrl) {
                     spkUrlInput.value = data.spkUrl;
                 } else {
                     throw new Error(data.message || 'SPK tidak ditemukan');
                 }
            } catch(error) {
                spkUrlInput.placeholder = `Error: ${error.message}`;
            }
        });
    }
    
    // --- Inisialisasi untuk form pengawasan (H2, H5, dll) ---
    async function initPengawasanForm() {
        const kodeUlokSelect = document.getElementById('kode_ulok');
        const userEmail = sessionStorage.getItem('loggedInUserEmail');

        if (!kodeUlokSelect || !userEmail) {
            console.error("Elemen kode ulok atau email pengguna tidak ditemukan!");
            return;
        }
        
        try {
            const response = await fetch(`${PYTHON_API_BASE_URL}/api/pengawasan/active_projects?email=${encodeURIComponent(userEmail)}`);
            if (!response.ok) throw new Error('Gagal memuat daftar proyek aktif.');
            const data = await response.json();

            if(data.projects && data.projects.length > 0) {
                populateDropdown('kode_ulok', data.projects, 'kode_ulok', 'kode_ulok');
            } else {
                kodeUlokSelect.innerHTML = '<option value="">-- Tidak ada proyek pengawasan aktif untuk Anda --</option>';
            }
        } catch (error) {
            console.error("Error saat inisialisasi form pengawasan:", error);
            alert("Gagal memuat data untuk form. Silakan coba muat ulang halaman.");
        }
    }


    if (form) {
        const isInputPicPage = window.location.pathname.includes('input_pic_pengawasan.html');
        
        if (isInputPicPage) {
            initInputPICForm();
        } else {
            initPengawasanForm();
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitButton = form.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            showPopup('Mengirim data...');

            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            
            // ▼▼▼ BARIS PERBAIKAN DITAMBAHKAN DI SINI ▼▼▼
            // Secara manual menambahkan nilai 'cabang' dari session storage
            // karena kolom yang 'disabled' tidak akan ikut terkirim.
            if (!data.cabang && sessionStorage.getItem('loggedInUserCabang')) {
                data.cabang = sessionStorage.getItem('loggedInUserCabang');
            }
            // ▲▲▲ AKHIR DARI PERBAIKAN ▲▲▲
            
            try {
                const response = await fetch(`${PYTHON_API_BASE_URL}/api/pengawasan/submit`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });
                const result = await response.json();

                if (response.ok && result.status === 'success') {
                    showPopup('Data berhasil dikirim!');
                    form.reset();
                    if(isInputPicPage) {
                       initInputPICForm();
                    } else {
                       initPengawasanForm();
                    }
                } else {
                    throw new Error(result.message || 'Terjadi kesalahan di server.');
                }
            } catch (error) {
                showPopup(`Error: ${error.message}`, false);
            } finally {
                submitButton.disabled = false;
            }
        });
    }
});

function closePopup() {
    const popup = document.getElementById('popup');
    if (popup) {
        popup.classList.remove('show');
    }
}