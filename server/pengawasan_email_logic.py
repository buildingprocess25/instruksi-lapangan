# Logika untuk menentukan URL form berikutnya
FORM_LINKS = {
    "input_pic": {
        "non_ruko_non_urugan_30hr": "/Pengawasan/h2_30hr.html",
        "non_ruko_non_urugan_35hr": "/Pengawasan/h2_35hr.html",
        "non_ruko_non_urugan_40hr": "/Pengawasan/h2_40hr.html",
        "non_ruko_urugan_48hr": "/Pengawasan/h2_48hr.html",
        "ruko_10hr": "/Pengawasan/h2_10hr.html",
        "ruko_14hr": "/Pengawasan/h2_14hr.html",
        "ruko_20hr": "/Pengawasan/h2_20hr.html",
    },
    "h2": {
        "non_ruko_non_urugan_30hr": "/Pengawasan/h7_30hr.html",
        "non_ruko_non_urugan_35hr": "/Pengawasan/h7_35hr.html",
        "non_ruko_non_urugan_40hr": "/Pengawasan/h7_40hr.html",
        "non_ruko_urugan_48hr": "/Pengawasan/h10_48hr.html",
        "ruko_10hr": "/Pengawasan/h5_10hr.html",
        "ruko_14hr": "/Pengawasan/h7_14hr.html",
        "ruko_20hr": "/Pengawasan/h12_20hr.html",
    },
    "h5": {"ruko_10hr": "/Pengawasan/h8_10hr.html"},
    "h7": {
        "non_ruko_non_urugan_30hr": "/Pengawasan/h14_30hr.html",
        "non_ruko_non_urugan_35hr": "/Pengawasan/h17_35hr.html",
        "non_ruko_non_urugan_40hr": "/Pengawasan/h17_40hr.html",
        "ruko_14hr": "/Pengawasan/h10_14hr.html",
    },
    "h8": {"ruko_10hr": "/Pengawasan/serah_terima.html"},
    "h10": {
        "non_ruko_urugan_48hr": "/Pengawasan/h25_48hr.html",
        "ruko_14hr": "/Pengawasan/serah_terima.html",
    },
    "h12": {"ruko_20hr": "/Pengawasan/h16_20hr.html"},
    "h14": {"non_ruko_non_urugan_30hr": "/Pengawasan/h18_30hr.html"},
    "h16": {"ruko_20hr": "/Pengawasan/serah_terima.html"},
    "h17": {
        "non_ruko_non_urugan_35hr": "/Pengawasan/h22_35hr.html",
        "non_ruko_non_urugan_40hr": "/Pengawasan/h25_40hr.html",
    },
    "h18": {"non_ruko_non_urugan_30hr": "/Pengawasan/h23_30hr.html"},
    "h22": {"non_ruko_non_urugan_35hr": "/Pengawasan/h28_35hr.html"},
    "h23": {"non_ruko_non_urugan_30hr": "/Pengawasan/serah_terima.html"},
    "h25": {
        "non_ruko_non_urugan_40hr": "/Pengawasan/h33_40hr.html",
        "non_ruko_urugan_48hr": "/Pengawasan/h32_48hr.html",
    },
    "h28": {"non_ruko_non_urugan_35hr": "/Pengawasan/serah_terima.html"},
    "h32": {"non_ruko_urugan_48hr": "/Pengawasan/h41_48hr.html"},
    "h33": {"non_ruko_non_urugan_40hr": "/Pengawasan/serah_terima.html"},
    "h41": {"non_ruko_urugan_48hr": "/Pengawasan/serah_terima.html"},
}

# Jadwal otomatis berdasarkan kategori lokasi
# Format: { 'kategori_lokasi': [('nama_form_tanpa_ekstensi', hari_ke), ...] }
FORM_SCHEDULE = {
    "non_ruko_non_urugan_30hr": [('h2_30hr', 2), ('h7_30hr', 7), ('h14_30hr', 14), ('h18_30hr', 18), ('h23_30hr', 23), ('serah_terima', 30)],
    "non_ruko_non_urugan_35hr": [('h2_35hr', 2), ('h7_35hr', 7), ('h17_35hr', 17), ('h22_35hr', 22), ('h28_35hr', 28), ('serah_terima', 35)],
    "non_ruko_non_urugan_40hr": [('h2_40hr', 2), ('h7_40hr', 7), ('h17_40hr', 17), ('h25_40hr', 25), ('h33_40hr', 33), ('serah_terima', 40)],
    "non_ruko_urugan_48hr": [('h2_48hr', 2), ('h10_48hr', 10), ('h25_48hr', 25), ('h32_48hr', 32), ('h41_48hr', 41), ('serah_terima', 48)],
    "ruko_10hr": [('h2_10hr', 2), ('h5_10hr', 5), ('h8_10hr', 8), ('serah_terima', 10)],
    "ruko_14hr": [('h2_14hr', 2), ('h7_14hr', 7), ('h10_14hr', 10), ('serah_terima', 14)],
    "ruko_20hr": [('h2_20hr', 2), ('h12_20hr', 12), ('h16_20hr', 16), ('serah_terima', 20)],
}


def get_email_details(form_type, data, user_info):
    pic_email = data.get('pic_building_support')
    
    recipients = []
    if pic_email:
        recipients.append(pic_email)
    
    # Menambahkan koordinator dan manajer ke penerima notifikasi awal
    if form_type == 'input_pic':
        koordinator_email = user_info.get('koordinator_info', {}).get('email')
        manager_email = user_info.get('manager_info', {}).get('email')
        if koordinator_email: recipients.append(koordinator_email)
        if manager_email: recipients.append(manager_email)

    subject = f"Informasi Awal Pengawasan Toko: {data.get('kode_ulok')}"
    if form_type != 'input_pic':
        hari_ke = data.get('hari_ke_pengawasan', 'N/A')
        subject = f"Tugas Pengawasan H+{hari_ke} untuk Toko: {data.get('kode_ulok')}"

    # Menyaring nilai kosong atau None dan membuat daftar unik
    unique_recipients = list(set(filter(None, recipients)))

    return {
        "recipients": unique_recipients,
        "subject": subject,
    }