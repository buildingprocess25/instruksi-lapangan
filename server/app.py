from gevent import monkey
monkey.patch_all()

import datetime
import os
import traceback
import json
import base64
from flask import Flask, request, jsonify, render_template, url_for
from dotenv import load_dotenv
from flask_cors import CORS
from datetime import timezone, timedelta
from num2words import num2words

import config
from google_services import GoogleServiceProvider
from pdf_generator import create_pdf_from_data, create_recap_pdf
from spk_generator import create_spk_pdf
from pengawasan_email_logic import get_email_details, FORM_LINKS

load_dotenv()
app = Flask(__name__)

CORS(app,
     origins=[
         "http://127.0.0.1:5500",
         "http://localhost:5500",
         "https://building-alfamart.vercel.app"
     ],
     methods=["GET", "POST", "OPTIONS", "PUT", "PATCH", "DELETE"],
     allow_headers=["Content-Type", "Authorization"],
     supports_credentials=True
)

google_provider = GoogleServiceProvider()

from data_api import data_bp
app.register_blueprint(data_bp)

def get_tanggal_h(start_date, jumlah_hari_kerja):
    tanggal = start_date
    count = 0
    if not jumlah_hari_kerja: return tanggal
    while count < jumlah_hari_kerja:
        tanggal += timedelta(days=1)
        if tanggal.weekday() < 5:
            count += 1
    return tanggal

@app.route('/')
def index():
    return "Backend server is running and healthy.", 200

# --- ENDPOINTS OTENTIKASI & DATA UMUM ---
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    cabang = data.get('cabang')
    if not email or not cabang:
        return jsonify({"status": "error", "message": "Email and cabang are required"}), 400
    try:
        is_valid, role = google_provider.validate_user(email, cabang)
        if is_valid:
            return jsonify({"status": "success", "message": "Login successful", "role": role}), 200
        else:
            return jsonify({"status": "error", "message": "Invalid credentials"}), 401
    except Exception as e:
        traceback.print_exc()
        return jsonify({"status": "error", "message": "An internal server error occurred"}), 500

@app.route('/api/check_status', methods=['GET'])
def check_status():
    email = request.args.get('email')
    cabang = request.args.get('cabang')
    if not email or not cabang:
        return jsonify({"error": "Email and cabang parameters are missing"}), 400
    try:
        status_data = google_provider.check_user_submissions(email, cabang)
        return jsonify(status_data), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# --- ENDPOINTS UNTUK ALUR KERJA RAB ---
@app.route('/api/submit_rab', methods=['POST'])
def submit_rab():
    data = request.get_json()
    if not data:
        return jsonify({"status": "error", "message": "Invalid JSON data"}), 400

    new_row_index = None
    try:
        nomor_ulok_raw = data.get(config.COLUMN_NAMES.LOKASI, '')
        lingkup_pekerjaan = data.get(config.COLUMN_NAMES.LINGKUP_PEKERJAAN, '')

        if not nomor_ulok_raw:
            return jsonify({
                "status": "error",
                "message": "Nomor Ulok tidak boleh kosong."
            }), 400

        # Cek revisi / duplikasi
        is_revising = google_provider.is_revision(
            nomor_ulok_raw,
            data.get('Email_Pembuat')
        )

        if not is_revising and google_provider.check_ulok_exists(nomor_ulok_raw, lingkup_pekerjaan):
            return jsonify({
                "status": "error",
                "message": (
                    f"Nomor Ulok {nomor_ulok_raw} dengan lingkup {lingkup_pekerjaan} "
                    "sudah pernah diajukan dan sedang diproses atau sudah disetujui."
                )
            }), 409

        # Set status awal & timestamp
        WIB = timezone(timedelta(hours=7))
        data[config.COLUMN_NAMES.STATUS] = config.STATUS.WAITING_FOR_COORDINATOR
        data[config.COLUMN_NAMES.TIMESTAMP] = datetime.datetime.now(WIB).isoformat()

        # --- 1) HITUNG GRAND TOTAL NON-SBO (sudah ada) ---
        total_non_sbo = 0.0
        for i in range(1, 201):
            kategori = data.get(f'Kategori_Pekerjaan_{i}')
            total_item_str = data.get(f'Total_Harga_Item_{i}')
            if kategori and kategori != 'PEKERJAAN SBO' and total_item_str:
                try:
                    total_non_sbo += float(total_item_str)
                except ValueError:
                    pass
        data[config.COLUMN_NAMES.GRAND_TOTAL_NONSBO] = total_non_sbo

        # --- 2) HITUNG GRAND TOTAL (SEMUA ITEM, TERMASUK SBO) ---
        total_semua_item = 0.0
        for i in range(1, 201):
            total_item_str = data.get(f'Total_Harga_Item_{i}')
            if total_item_str:
                try:
                    total_semua_item += float(total_item_str)
                except ValueError:
                    pass

        # Simpan "data lama" Grand Total (sebelum pembulatan & PPN)
        data[config.COLUMN_NAMES.GRAND_TOTAL] = total_semua_item

        # --- 3) HITUNG GRAND TOTAL FINAL (UNTUK SPK) ---
        #   - dibulatkan ke bawah kelipatan 10.000
        #   - + PPN 11%
        pembulatan = (total_semua_item // 10000) * 10000  # kelipatan 10.000
        ppn = pembulatan * 0.11
        final_grand_total = pembulatan + ppn

        # Simpan ke kolom baru "Grand Total Final"
        data[config.COLUMN_NAMES.GRAND_TOTAL_FINAL] = final_grand_total

        # --- 4) ARSIPKAN DETAIL ITEM KE JSON ---
        item_keys_to_archive = (
            'Kategori_Pekerjaan_', 'Jenis_Pekerjaan_', 'Satuan_Item_',
            'Volume_Item_', 'Harga_Material_Item_', 'Harga_Upah_Item_',
            'Total_Material_Item_', 'Total_Upah_Item_', 'Total_Harga_Item_'
        )
        item_details = {
            k: v for k, v in data.items()
            if k.startswith(item_keys_to_archive)
        }
        data['Item_Details_JSON'] = json.dumps(item_details)

        jenis_toko = data.get('Proyek', 'N/A')
        nama_toko = data.get('Nama_Toko', data.get('nama_toko', 'N/A'))

        nomor_ulok_formatted = nomor_ulok_raw
        if isinstance(nomor_ulok_raw, str) and len(nomor_ulok_raw) == 12:
            nomor_ulok_formatted = (
                f"{nomor_ulok_raw[:4]}-"
                f"{nomor_ulok_raw[4:8]}-"
                f"{nomor_ulok_raw[8:]}"
            )

        # --- 5) GENERATE PDF (NON-SBO & REKAP) ---
        pdf_nonsbo_bytes = create_pdf_from_data(
            google_provider, data, exclude_sbo=True
        )
        pdf_recap_bytes = create_recap_pdf(google_provider, data)

        pdf_nonsbo_filename = f"RAB_NON-SBO_{jenis_toko}_{nomor_ulok_formatted}.pdf"
        pdf_recap_filename = f"REKAP_RAB_{jenis_toko}_{nomor_ulok_formatted}.pdf"

        link_pdf_nonsbo = google_provider.upload_file_to_drive(
            pdf_nonsbo_bytes,
            pdf_nonsbo_filename,
            'application/pdf',
            config.PDF_STORAGE_FOLDER_ID
        )
        link_pdf_rekap = google_provider.upload_file_to_drive(
            pdf_recap_bytes,
            pdf_recap_filename,
            'application/pdf',
            config.PDF_STORAGE_FOLDER_ID
        )

        data[config.COLUMN_NAMES.LINK_PDF_NONSBO] = link_pdf_nonsbo
        data[config.COLUMN_NAMES.LINK_PDF_REKAP] = link_pdf_rekap
        data[config.COLUMN_NAMES.LOKASI] = nomor_ulok_formatted

        # --- 6) SIMPAN KE SHEET ---
        new_row_index = google_provider.append_to_sheet(
            data,
            config.DATA_ENTRY_SHEET_NAME
        )

        # --- 7) KIRIM EMAIL KE KOORDINATOR ---
        cabang = data.get('Cabang')
        if not cabang:
            raise Exception("Field 'Cabang' is empty. Cannot find Coordinator.")

        coordinator_emails = google_provider.get_emails_by_jabatan(
            cabang,
            config.JABATAN.KOORDINATOR
        )
        if not coordinator_emails:
            raise Exception(
                f"Tidak ada email Koordinator yang ditemukan untuk cabang '{cabang}'."
            )

        base_url = "https://building-alfamart.onrender.com"
        approver_for_link = coordinator_emails[0]
        approval_url = (
            f"{base_url}/api/handle_rab_approval"
            f"?action=approve&row={new_row_index}"
            f"&level=coordinator&approver={approver_for_link}"
        )
        rejection_url = (
            f"{base_url}/api/reject_form/rab"
            f"?row={new_row_index}&level=coordinator"
            f"&approver={approver_for_link}"
        )

        email_html = render_template(
            'email_template.html',
            doc_type="RAB",
            level='Koordinator',
            form_data=data,
            approval_url=approval_url,
            rejection_url=rejection_url
        )

        google_provider.send_email(
            to=coordinator_emails,
            subject=f"[TAHAP 1: PERLU PERSETUJUAN] RAB Proyek {nama_toko}: {jenis_toko}",
            html_body=email_html,
            attachments=[
                (pdf_nonsbo_filename, pdf_nonsbo_bytes, 'application/pdf'),
                (pdf_recap_filename, pdf_recap_bytes, 'application/pdf')
            ]
        )

        return jsonify({
            "status": "success",
            "message": "Data successfully submitted and approval email sent."
        }), 200

    except Exception as e:
        if new_row_index:
            google_provider.delete_row(
                config.DATA_ENTRY_SHEET_NAME,
                new_row_index
            )
        traceback.print_exc()
        return jsonify({"status": "error", "message": str(e)}), 500
    
@app.route('/api/reject_form/rab', methods=['GET'])
def reject_form_rab():
    row = request.args.get('row')
    level = request.args.get('level')
    approver = request.args.get('approver')
    
    if not all([row, level, approver]):
        return "Parameter tidak lengkap.", 400

    row_data = google_provider.get_row_data(int(row))
    if not row_data:
        return "Data permintaan tidak ditemukan.", 404

    logo_url = url_for('static', filename='Alfamart-Emblem.png', _external=True)
    item_identifier = row_data.get(config.COLUMN_NAMES.LOKASI, 'N/A')
    
    return render_template(
        'rejection_form.html',
        form_action=url_for('handle_rab_approval', _external=True),
        row=row,
        level=level,
        approver=approver,
        item_type="RAB",
        item_identifier=item_identifier,
        logo_url=logo_url
    )

@app.route('/api/handle_rab_approval', methods=['GET', 'POST'])
def handle_rab_approval():
    if request.method == 'POST':
        data = request.form
    else:
        data = request.args

    action = data.get('action')
    row_str = data.get('row')
    level = data.get('level')
    approver = data.get('approver')
    reason = data.get('reason', 'Tidak ada alasan yang diberikan.') # Ambil alasan jika ada
    
    logo_url = url_for('static', filename='Alfamart-Emblem.png', _external=True)

    if not all([action, row_str, level, approver]):
        return render_template('response_page.html', title='Incomplete Parameters', message='URL parameters are incomplete.', logo_url=logo_url), 400
    try:
        row = int(row_str)
        row_data = google_provider.get_row_data(row)
        if not row_data:
            return render_template('response_page.html', title='Data Not Found', message='This request may have been deleted.', logo_url=logo_url)
        
        item_details_json = row_data.get('Item_Details_JSON', '{}')
        if item_details_json:
            try:
                item_details = json.loads(item_details_json)
                row_data.update(item_details)
            except json.JSONDecodeError:
                print(f"Warning: Could not decode Item_Details_JSON for row {row}")
        
        current_status = row_data.get(config.COLUMN_NAMES.STATUS, "").strip()
        expected_status_map = {'coordinator': config.STATUS.WAITING_FOR_COORDINATOR, 'manager': config.STATUS.WAITING_FOR_MANAGER}
        
        if current_status != expected_status_map.get(level):
            msg = f'This action has already been processed. Current status: <strong>{current_status}</strong>.'
            return render_template('response_page.html', title='Action Already Processed', message=msg, logo_url=logo_url)
        
        WIB = timezone(timedelta(hours=7))
        current_time = datetime.datetime.now(WIB).isoformat()
        
        cabang = row_data.get(config.COLUMN_NAMES.CABANG)
        jenis_toko = row_data.get(config.COLUMN_NAMES.PROYEK, 'N/A')
        nama_toko = row_data.get('Nama_Toko', row_data.get('nama_toko', 'N/A'))

        creator_email = row_data.get(config.COLUMN_NAMES.EMAIL_PEMBUAT)

        if action == 'reject':
            new_status = ""
            if level == 'coordinator':
                new_status = config.STATUS.REJECTED_BY_COORDINATOR
                google_provider.update_cell(row, config.COLUMN_NAMES.KOORDINATOR_APPROVER, approver)
                google_provider.update_cell(row, config.COLUMN_NAMES.KOORDINATOR_APPROVAL_TIME, current_time)
            elif level == 'manager':
                new_status = config.STATUS.REJECTED_BY_MANAGER
                google_provider.update_cell(row, config.COLUMN_NAMES.MANAGER_APPROVER, approver)
                google_provider.update_cell(row, config.COLUMN_NAMES.MANAGER_APPROVAL_TIME, current_time)
            
            google_provider.update_cell(row, config.COLUMN_NAMES.STATUS, new_status)
            google_provider.update_cell(row, 'Alasan Penolakan', reason)
            if creator_email:
                subject = f"[DITOLAK] Pengajuan RAB Proyek {nama_toko}: {jenis_toko}"
                body = (f"<p>Pengajuan RAB untuk proyek <b>{jenis_toko}</b> telah <b>DITOLAK</b>.</p>"
                        f"<p><b>Alasan Penolakan:</b></p>"
                        f"<p><i>{reason}</i></p>"
                        f"<p>Silakan ajukan revisi RAB Anda melalui link berikut:</p>"
                        f"<p><a href='https://building-alfamart.vercel.app/login_rab.html' target='_blank' rel='noopener noreferrer'>Input Ulang RAB</a></p>")
                google_provider.send_email(to=creator_email, subject=subject, html_body=body)
            return render_template('response_page.html', title='Permintaan Ditolak', message='Status permintaan telah diperbarui.', logo_url=logo_url)

        elif level == 'coordinator' and action == 'approve':
            google_provider.update_cell(row, config.COLUMN_NAMES.STATUS, config.STATUS.WAITING_FOR_MANAGER)
            google_provider.update_cell(row, config.COLUMN_NAMES.KOORDINATOR_APPROVER, approver)
            google_provider.update_cell(row, config.COLUMN_NAMES.KOORDINATOR_APPROVAL_TIME, current_time)
            manager_email = google_provider.get_email_by_jabatan(cabang, config.JABATAN.MANAGER)
            if manager_email:
                row_data[config.COLUMN_NAMES.KOORDINATOR_APPROVER] = approver
                row_data[config.COLUMN_NAMES.KOORDINATOR_APPROVAL_TIME] = current_time
                base_url = "https://building-alfamart.onrender.com"
                approval_url_manager = f"{base_url}/api/handle_rab_approval?action=approve&row={row}&level=manager&approver={manager_email}"
                rejection_url_manager = f"{base_url}/api/reject_form/rab?row={row}&level=manager&approver={manager_email}"
                email_html_manager = render_template('email_template.html', doc_type="RAB", level='Manajer', form_data=row_data, approval_url=approval_url_manager, rejection_url=rejection_url_manager, additional_info=f"Telah disetujui oleh Koordinator: {approver}")
                pdf_nonsbo_bytes = create_pdf_from_data(google_provider, row_data, exclude_sbo=True)
                pdf_recap_bytes = create_recap_pdf(google_provider, row_data)
                pdf_nonsbo_filename = f"RAB_NON-SBO_{jenis_toko}_{row_data.get('Nomor Ulok')}.pdf"
                pdf_recap_filename = f"REKAP_RAB_{jenis_toko}_{row_data.get('Nomor Ulok')}.pdf"
                google_provider.send_email(manager_email, f"[TAHAP 2: PERLU PERSETUJUAN] RAB Proyek {nama_toko}: {jenis_toko}", email_html_manager, attachments=[(pdf_nonsbo_filename, pdf_nonsbo_bytes, 'application/pdf'),(pdf_recap_filename, pdf_recap_bytes, 'application/pdf')])
            return render_template('response_page.html', title='Persetujuan Diteruskan', message='Terima kasih. Persetujuan Anda telah dicatat.', logo_url=logo_url)
        
        elif level == 'manager' and action == 'approve':
            google_provider.update_cell(row, config.COLUMN_NAMES.STATUS, config.STATUS.APPROVED)
            google_provider.update_cell(row, config.COLUMN_NAMES.MANAGER_APPROVER, approver)
            google_provider.update_cell(row, config.COLUMN_NAMES.MANAGER_APPROVAL_TIME, current_time)
            
            row_data[config.COLUMN_NAMES.STATUS] = config.STATUS.APPROVED
            row_data[config.COLUMN_NAMES.MANAGER_APPROVER] = approver
            row_data[config.COLUMN_NAMES.MANAGER_APPROVAL_TIME] = current_time
            
            # ====== Generate PDFs ======
            pdf_nonsbo_bytes = create_pdf_from_data(google_provider, row_data, exclude_sbo=True)
            pdf_nonsbo_filename = f"DISETUJUI_RAB_NON-SBO_{jenis_toko}_{row_data.get('Nomor Ulok')}.pdf"

            pdf_recap_bytes = create_recap_pdf(google_provider, row_data)
            pdf_recap_filename = f"DISETUJUI_REKAP_RAB_{jenis_toko}_{row_data.get('Nomor Ulok')}.pdf"

            # Upload ke Drive
            link_pdf_nonsbo = google_provider.upload_file_to_drive(
                pdf_nonsbo_bytes, pdf_nonsbo_filename, 'application/pdf', config.PDF_STORAGE_FOLDER_ID
            )
            link_pdf_rekap = google_provider.upload_file_to_drive(
                pdf_recap_bytes, pdf_recap_filename, 'application/pdf', config.PDF_STORAGE_FOLDER_ID
            )

            # Update sheet
            google_provider.update_cell(row, config.COLUMN_NAMES.LINK_PDF_NONSBO, link_pdf_nonsbo)
            google_provider.update_cell(row, config.COLUMN_NAMES.LINK_PDF_REKAP, link_pdf_rekap)

            row_data[config.COLUMN_NAMES.LINK_PDF_NONSBO] = link_pdf_nonsbo
            row_data[config.COLUMN_NAMES.LINK_PDF_REKAP] = link_pdf_rekap

            google_provider.copy_to_approved_sheet(row_data)

            # ====== Kumpulkan email dari jabatan ======
            email_pembuat = row_data.get(config.COLUMN_NAMES.EMAIL_PEMBUAT)
            kontraktor_emails = [email_pembuat] if email_pembuat else []
            coordinator_emails = google_provider.get_emails_by_jabatan(cabang, config.JABATAN.KOORDINATOR)
            manager_email = approver  # manager yang menyetujui

            # ====== Attachment bersama ======
            email_attachments = [
                (pdf_nonsbo_filename, pdf_nonsbo_bytes, 'application/pdf'),
                (pdf_recap_filename, pdf_recap_bytes, 'application/pdf')
            ]

            subject = f"[FINAL - DISETUJUI] Pengajuan RAB Proyek {nama_toko}: {jenis_toko}"

            # Template body utama (bold + link Google Drive)
            base_body = (
                f"<p>Pengajuan RAB untuk proyek <b>{jenis_toko}</b> di cabang <b>{cabang}</b> "
                f"telah disetujui sepenuhnya.</p>"
                f"<p>Tiga versi file PDF RAB telah dilampirkan:</p>"
                f"<ul>"
                f"<li><b>{pdf_nonsbo_filename}</b>: Hanya berisi item pekerjaan di luar SBO.</li>"
                f"<li><b>{pdf_recap_filename}</b>: Rekapitulasi Total Biaya.</li>"
                f"</ul>"
                f"<p>Link Google Drive:</p>"
                f"<ul>"
                f"<li><a href='{link_pdf_nonsbo}'>Link PDF Non-SBO</a></li>"
                f"<li><a href='{link_pdf_rekap}'>Link PDF Rekapitulasi</a></li>"
                f"</ul>"
            )

            # 1) KONTRAKTOR → body utama + link upload materai/SPH
            if kontraktor_emails:
                kontraktor_body = (
                    base_body +
                    f"<p>Silakan upload Rekapitulasi RAB Termaterai & SPH melalui link berikut:</p>"
                    f"<p><a href='https://materai-rab-pi.vercel.app/login' "
                    f"target='_blank'>UPLOAD REKAP RAB TERMATERAI & SPH</a></p>"
                )

                google_provider.send_email(
                    to=kontraktor_emails,
                    subject=subject,
                    html_body=kontraktor_body,
                    attachments=email_attachments
                )

            # 2) KOORDINATOR → hanya body utama
            if coordinator_emails:
                google_provider.send_email(
                    to=coordinator_emails,
                    subject=subject,
                    html_body=base_body,
                    attachments=email_attachments
                )

            # 3) MANAGER → hanya body utama
            if manager_email:
                google_provider.send_email(
                    to=[manager_email],
                    subject=subject,
                    html_body=base_body,
                    attachments=email_attachments
                )

            return render_template('response_page.html', 
                title='Persetujuan Berhasil', 
                message='Tindakan Anda telah berhasil diproses.', 
                logo_url=logo_url
            )

    except Exception as e:
        traceback.print_exc()
        return render_template('response_page.html', title='Internal Error', message=f'An internal error occurred: {str(e)}', logo_url=logo_url), 500

# --- ENDPOINTS UNTUK ALUR KERJA SPK ---
@app.route('/api/get_approved_rab', methods=['GET'])
def get_approved_rab():
    user_cabang = request.args.get('cabang')
    if not user_cabang:
        return jsonify({"error": "Cabang parameter is missing"}), 400
    try:
        approved_rabs = google_provider.get_approved_rab_by_cabang(user_cabang)
        return jsonify(approved_rabs), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/api/get_kontraktor', methods=['GET'])
def get_kontraktor():
    user_cabang = request.args.get('cabang')
    if not user_cabang:
        return jsonify({"error": "Cabang parameter is missing"}), 400
    try:
        kontraktor_list = google_provider.get_kontraktor_by_cabang(user_cabang)
        return jsonify(kontraktor_list), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/api/get_spk_status', methods=['GET'])
def get_spk_status():
    ulok = request.args.get('ulok')
    lingkup = request.args.get('lingkup')  # 🔥 tambahan baru

    if not ulok:
        return jsonify({"error": "Parameter ulok kosong"}), 400

    if not lingkup:
        return jsonify({"error": "Parameter lingkup kosong"}), 400

    spk_sheet = google_provider.sheet.worksheet(config.SPK_DATA_SHEET_NAME)
    records = spk_sheet.get_all_records()

    ulok = str(ulok).strip()
    lingkup = str(lingkup).strip().lower()

    for i, row in enumerate(records, start=2):  # row 2 = data pertama
        row_ulok = str(row.get("Nomor Ulok", "")).strip()
        row_lingkup = str(row.get("Lingkup Pekerjaan", "")).strip().lower()

        # 🔥 Perbaikan utama: cek ULOK + Lingkup Pekerjaan
        if row_ulok == ulok and row_lingkup == lingkup:
            return jsonify({
                "Status": row.get("Status"),
                "RowIndex": i,
                "Data": row
            }), 200

    # Tidak ada SPK untuk kombinasi ULok + Lingkup → boleh submit
    return jsonify(None), 200

@app.route('/api/submit_spk', methods=['POST'])
def submit_spk():
    data = request.get_json()
    if not data:
        return jsonify({"status": "error", "message": "Invalid JSON data"}), 400

    row_index_for_update = data.get("RowIndex")  # Jika revisi
    is_revision = data.get("Revisi") == "YES"

    new_row_index = None  # Untuk mode tambah baris

    try:
        WIB = timezone(timedelta(hours=7))
        now = datetime.datetime.now(WIB)

        # Timestamp & status baru (selalu reset saat submit)
        data['Timestamp'] = now.isoformat()
        data['Status'] = config.STATUS.WAITING_FOR_BM_APPROVAL

        # ---- PERHITUNGAN DURASI ----
        start_date = datetime.datetime.fromisoformat(data['Waktu Mulai'])
        duration = int(data['Durasi'])
        end_date = start_date + timedelta(days=duration - 1)
        data['Waktu Selesai'] = end_date.isoformat()

        # ---- HITUNG BIAYA ----
        total_cost = float(data.get('Grand Total', 0))
        terbilang_text = num2words(total_cost, lang='id').title()
        data['Biaya'] = total_cost
        data['Terbilang'] = f"( {terbilang_text} Rupiah )"

        cabang = data.get('Cabang')
        nama_toko = data.get('Nama_Toko', data.get('nama_toko', 'N/A'))
        jenis_toko = data.get('Jenis_Toko', data.get('Proyek', 'N/A'))

        # ---- GENERATE NOMOR SPK ----
        spk_manual_1 = data.get('spk_manual_1', '')
        spk_manual_2 = data.get('spk_manual_2', '')
        cabang_code = google_provider.get_cabang_code(cabang)

        # Sequence hanya dipakai saat SPK BARU
        if not is_revision:
            spk_sequence = google_provider.get_next_spk_sequence(cabang, now.year, now.month)
            full_spk_number = f"{spk_sequence:03d}/PROPNDEV-{cabang_code}/{spk_manual_1}/{spk_manual_2}"
        else:
            # Untuk revisi → nomor SPK lama dipertahankan
            full_spk_number = data.get("Nomor SPK")

        data['Nomor SPK'] = full_spk_number
        data['PAR'] = data.get('PAR', '')

        # ---- BUAT PDF BARU ----
        pdf_bytes = create_spk_pdf(google_provider, data)
        pdf_filename = f"SPK_{data.get('Proyek')}_{data.get('Nomor Ulok')}.pdf"

        pdf_link = google_provider.upload_file_to_drive(
            pdf_bytes, pdf_filename, 'application/pdf', config.PDF_STORAGE_FOLDER_ID
        )
        data['Link PDF'] = pdf_link

        # ==============================================
        #  MODE REVISI (UPDATE baris lama)
        # ==============================================
        if is_revision and row_index_for_update:
            google_provider.update_row(
                config.SPK_DATA_SHEET_NAME,
                int(row_index_for_update),
                data
            )
            row_to_notify = int(row_index_for_update)
        else:
            # ==============================================
            #  MODE NORMAL (TAMBAH BARIS BARU)
            # ==============================================
            new_row_index = google_provider.append_to_sheet(data, config.SPK_DATA_SHEET_NAME)
            row_to_notify = new_row_index

        # ---- Kirim Email ke Branch Manager ----
        branch_manager_email = google_provider.get_email_by_jabatan(
            cabang, config.JABATAN.BRANCH_MANAGER
        )
        if not branch_manager_email:
            raise Exception(f"Branch Manager email for branch '{cabang}' not found.")

        base_url = "https://building-alfamart.onrender.com"
        approval_url = f"{base_url}/api/handle_spk_approval?action=approve&row={row_to_notify}&approver={branch_manager_email}"
        rejection_url = f"{base_url}/api/reject_form/spk?row={row_to_notify}&approver={branch_manager_email}"

        email_html = render_template(
            'email_template.html',
            doc_type="SPK",
            level='Branch Manager',
            form_data=data,
            approval_url=approval_url,
            rejection_url=rejection_url
        )

        google_provider.send_email(
            to=branch_manager_email,
            subject=f"[PERLU PERSETUJUAN BM] SPK Proyek {nama_toko}: {jenis_toko}",
            html_body=email_html,
            attachments=[(pdf_filename, pdf_bytes, 'application/pdf')]
        )

        return jsonify({"status": "success", "message": "SPK successfully submitted for approval."}), 200

    except Exception as e:
        # Jika submit baris baru gagal, hapus row
        if new_row_index:
            google_provider.delete_row(config.SPK_DATA_SHEET_NAME, new_row_index)

        traceback.print_exc()
        return jsonify({"status": "error", "message": str(e)}), 500

    
@app.route('/api/reject_form/spk', methods=['GET'])
def reject_form_spk():
    row = request.args.get('row')
    approver = request.args.get('approver')
    
    if not all([row, approver]):
        return "Parameter tidak lengkap.", 400

    spk_sheet = google_provider.sheet.worksheet(config.SPK_DATA_SHEET_NAME)
    row_data = google_provider.get_row_data_by_sheet(spk_sheet, int(row))
    if not row_data:
        return "Data permintaan tidak ditemukan.", 404

    logo_url = url_for('static', filename='Alfamart-Emblem.png', _external=True)
    item_identifier = row_data.get('Nomor Ulok', 'N/A')
    
    return render_template(
        'rejection_form.html',
        form_action=url_for('handle_spk_approval', _external=True),
        row=row,
        approver=approver,
        level=None, # SPK tidak memiliki 'level'
        item_type="SPK",
        item_identifier=item_identifier,
        logo_url=logo_url
    )

@app.route('/api/handle_spk_approval', methods=['GET', 'POST'])
def handle_spk_approval():
    if request.method == 'POST':
        data = request.form
    else:
        data = request.args
        
    action = data.get('action')
    row_str = data.get('row')
    approver = data.get('approver')
    reason = data.get('reason', 'Tidak ada alasan yang diberikan.') # Ambil alasan jika ada
    
    logo_url = url_for('static', filename='Alfamart-Emblem.png', _external=True)

    if not all([action, row_str, approver]):
        return render_template('response_page.html', title='Parameter Tidak Lengkap', message='URL tidak lengkap.', logo_url=logo_url), 400
    
    try:
        row_index = int(row_str)
        spk_sheet = google_provider.sheet.worksheet(config.SPK_DATA_SHEET_NAME)
        row_data = google_provider.get_row_data_by_sheet(spk_sheet, row_index)

        if not row_data:
            return render_template('response_page.html', title='Data Tidak Ditemukan', message='Permintaan ini mungkin sudah dihapus.', logo_url=logo_url)
        
        current_status = row_data.get('Status', '').strip()
        if current_status != config.STATUS.WAITING_FOR_BM_APPROVAL:
            msg = f'Tindakan ini sudah diproses. Status saat ini: <strong>{current_status}</strong>.'
            return render_template('response_page.html', title='Tindakan Sudah Diproses', message=msg, logo_url=logo_url)

        WIB = timezone(timedelta(hours=7))
        current_time = datetime.datetime.now(WIB).isoformat()
        
        initiator_email = row_data.get('Dibuat Oleh')
        
        if action == 'approve':
            new_status = config.STATUS.SPK_APPROVED
            google_provider.update_cell_by_sheet(spk_sheet, row_index, 'Status', new_status)
            google_provider.update_cell_by_sheet(spk_sheet, row_index, 'Disetujui Oleh', approver)
            google_provider.update_cell_by_sheet(spk_sheet, row_index, 'Waktu Persetujuan', current_time)
            
            row_data['Status'] = new_status
            row_data['Disetujui Oleh'] = approver
            row_data['Waktu Persetujuan'] = current_time


            final_pdf_bytes = create_spk_pdf(google_provider, row_data)
            final_pdf_filename = f"SPK_DISETUJUI_{row_data.get('Proyek')}_{row_data.get('Nomor Ulok')}.pdf"
            final_pdf_link = google_provider.upload_file_to_drive(final_pdf_bytes, final_pdf_filename, 'application/pdf', config.PDF_STORAGE_FOLDER_ID)
            google_provider.update_cell_by_sheet(spk_sheet, row_index, 'Link PDF', final_pdf_link)

            nomor_ulok_spk = row_data.get('Nomor Ulok')
            cabang = row_data.get('Cabang')
            
            manager_email = google_provider.get_email_by_jabatan(cabang, config.JABATAN.MANAGER)
            kontraktor_emails = google_provider.get_emails_by_jabatan(cabang, config.JABATAN.KONTRAKTOR)
            support_emails = google_provider.get_emails_by_jabatan(cabang, config.JABATAN.SUPPORT)
            pembuat_rab_email = google_provider.get_rab_creator_by_ulok(nomor_ulok_spk) if nomor_ulok_spk else None

            bm_email = approver
            bbm_manager_email = manager_email
            kontraktor_list = kontraktor_emails
            
            other_recipients = set()
            if initiator_email: other_recipients.add(initiator_email.strip())
            if pembuat_rab_email: other_recipients.add(pembuat_rab_email.strip())

            jenis_toko = row_data.get('Jenis_Toko', row_data.get('Proyek', 'N/A'))
            nama_toko = row_data.get('Nama_Toko', row_data.get('nama_toko', 'N/A'))
            subject = f"[DISETUJUI] SPK Proyek {nama_toko}: {jenis_toko}"
            
            email_attachments = [(final_pdf_filename, final_pdf_bytes, 'application/pdf')]

            body_bm = (f"<p>SPK yang Anda setujui untuk proyek <b>{row_data.get('Proyek')}</b> ({row_data.get('Nomor Ulok')}) telah disetujui sepenuhnya dan final.</p>"
                       f"<p>File PDF final terlampir.</p>")
            google_provider.send_email(to=[bm_email], subject=subject, html_body=body_bm, attachments=email_attachments)

            if bbm_manager_email:
                 link_input_pic = f"<p>Silakan melakukan input PIC pengawasan melalui link berikut: <a href='https://frontend-form-virid.vercel.app/login-input_pic.html' target='_blank' rel='noopener noreferrer'>Input PIC Pengawasan</a></p>"
                 body_bbm = (f"<p>SPK yang diajukan untuk proyek <b>{row_data.get('Proyek')}</b> ({row_data.get('Nomor Ulok')}) telah disetujui oleh Branch Manager.</p>"
                             f"{link_input_pic}"
                             f"<p>File PDF final terlampir.</p>")
                 google_provider.send_email(to=[bbm_manager_email], subject=subject, html_body=body_bbm, attachments=email_attachments)
                 other_recipients.discard(bbm_manager_email)

            opname_recipients = set()
            opname_recipients.update(kontraktor_list)
            
            if opname_recipients:
                link_opname = f"<p>Silakan melakukan Opname melalui link berikut: <a href='https://opnamebnm.vercel.app/' target='_blank' rel='noopener noreferrer'>Pengisian Opname</a></p>"
                body_opname = (f"<p>SPK untuk proyek <b>{row_data.get('Proyek')}</b> ({row_data.get('Nomor Ulok')}) telah disetujui.</p>"
                               f"{link_opname}"
                               f"<p>File PDF final terlampir.</p>")
                google_provider.send_email(to=list(opname_recipients), subject=subject, html_body=body_opname, attachments=email_attachments)
                
                for email in opname_recipients:
                    other_recipients.discard(email)

            if other_recipients:
                body_default = (f"<p>SPK yang Anda ajukan untuk proyek <b>{row_data.get('Proyek')}</b> ({row_data.get('Nomor Ulok')}) telah disetujui oleh Branch Manager.</p>"
                                f"<p>File PDF final terlampir.</p>")
                google_provider.send_email(to=list(other_recipients), subject=subject, html_body=body_default, attachments=email_attachments)
            
            return render_template('response_page.html', title='Persetujuan Berhasil', message='Terima kasih. Persetujuan Anda telah dicatat.', logo_url=logo_url)

        elif action == 'reject':
            new_status = config.STATUS.SPK_REJECTED
            google_provider.update_cell_by_sheet(spk_sheet, row_index, 'Status', new_status)
            
            google_provider.update_cell_by_sheet(spk_sheet, row_index, 'Alasan Penolakan', reason)

            jenis_toko = row_data.get('Jenis_Toko', row_data.get('Proyek', 'N/A'))
            nama_toko = row_data.get('Nama_Toko', row_data.get('nama_toko', 'N/A'))

            if initiator_email:
                subject = f"[DITOLAK] SPK untuk Proyek {nama_toko}: {jenis_toko}"
                body = (f"<p>SPK yang Anda ajukan untuk proyek <b>{row_data.get('Proyek')}</b> ({row_data.get('Nomor Ulok')}) telah ditolak oleh Branch Manager.</p>"
                        f"<p><b>Alasan Penolakan:</b></p>"
                        f"<p><i>{reason}</i></p>"
                        f"<p>Silakan ajukan revisi SPK Anda melalui link berikut:</p>"
                        f"<p><a href='https://building-alfamart.vercel.app/login_spk.html' target='_blank' rel='noopener noreferrer'>Input Ulang SPK</a></p>")
                google_provider.send_email(to=initiator_email, subject=subject, html_body=body)

            return render_template('response_page.html', title='Permintaan Ditolak', message='Status permintaan telah diperbarui menjadi ditolak.', logo_url=logo_url)

    except Exception as e:
        traceback.print_exc()
        return render_template('response_page.html', title='Error Internal', message=f'Terjadi kesalahan: {str(e)}', logo_url=logo_url), 500

# --- ENDPOINTS UNTUK FORM PENGAWASAN ---
@app.route('/api/pengawasan/init_data', methods=['GET'])
def get_pengawasan_init_data():
    cabang = request.args.get('cabang')
    if not cabang:
        return jsonify({"status": "error", "message": "Parameter cabang dibutuhkan."}), 400
    try:
        pic_list, _, _ = google_provider.get_user_info_by_cabang(cabang)
        spk_list = google_provider.get_spk_data_by_cabang(cabang)
        
        return jsonify({
            "status": "success",
            "picList": pic_list,
            "spkList": spk_list
        }), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/pengawasan/get_rab_url', methods=['GET'])
def get_rab_url():
    kode_ulok = request.args.get('kode_ulok')
    if not kode_ulok:
        return jsonify({"status": "error", "message": "Parameter kode_ulok dibutuhkan."}), 400
    try:
        rab_url = google_provider.get_rab_url_by_ulok(kode_ulok)
        if rab_url:
            return jsonify({"status": "success", "rabUrl": rab_url}), 200
        else:
            return jsonify({"status": "error", "message": "URL RAB tidak ditemukan."}), 404
    except Exception as e:
        traceback.print_exc()
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/pengawasan/get_spk_url', methods=['GET'])
def get_spk_url():
    kode_ulok = request.args.get('kode_ulok')
    if not kode_ulok:
        return jsonify({"status": "error", "message": "Parameter kode_ulok dibutuhkan."}), 400
    try:
        spk_url = google_provider.get_spk_url_by_ulok(kode_ulok)
        if spk_url:
            return jsonify({"status": "success", "spkUrl": spk_url}), 200
        else:
            return jsonify({"status": "error", "message": "URL SPK tidak ditemukan."}), 404
    except Exception as e:
        traceback.print_exc()
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/pengawasan/submit', methods=['POST'])
def submit_pengawasan():
    data = request.get_json()
    if not data:
        return jsonify({"status": "error", "message": "Data JSON tidak valid"}), 400

    try:
        form_type = data.get('form_type')
        WIB = timezone(timedelta(hours=7))
        timestamp = datetime.datetime.now(WIB)
        
        cabang = data.get('cabang', 'N/A')
        
        if form_type != 'input_pic':
            kode_ulok = data.get('kode_ulok')
            if kode_ulok:
                pic_email = google_provider.get_pic_email_by_ulok(kode_ulok)
                if pic_email:
                    data['pic_building_support'] = pic_email
                else:
                    return jsonify({"status": "error", "message": f"PIC tidak ditemukan untuk Kode Ulok {kode_ulok}. Pastikan proyek ini sudah diinisiasi."}), 404

        pic_list, koordinator_info, manager_info = google_provider.get_user_info_by_cabang(cabang)
        user_info = {
            'pic_list': pic_list,
            'koordinator_info': koordinator_info,
            'manager_info': manager_info
        }

        if form_type == 'input_pic':
            input_pic_data = {
                'Timestamp': timestamp.isoformat(),
                'Cabang': data.get('cabang'),
                'Kode_Ulok': data.get('kode_ulok'),
                'Kategori_Lokasi': data.get('kategori_lokasi'),
                'Tanggal_Mulai_SPK': data.get('tanggal_spk'),
                'PIC_Building_Support': data.get('pic_building_support'),
                'SPK_URL': data.get('spkUrl'),
                'RAB_URL': data.get('rabUrl')
            }
            google_provider.append_to_dynamic_sheet(
                config.PENGAWASAN_SPREADSHEET_ID, 
                config.INPUT_PIC_SHEET_NAME, 
                input_pic_data
            )

            penugasan_data = {
                'Email_BBS': data.get('pic_building_support'),
                'Kode_Ulok': data.get('kode_ulok'),
                'Cabang': data.get('cabang')
            }
            google_provider.append_to_dynamic_sheet(
                config.PENGAWASAN_SPREADSHEET_ID, 
                config.PENUGASAN_SHEET_NAME,
                penugasan_data
            )
            
            tanggal_spk_obj = datetime.datetime.fromisoformat(data.get('tanggal_spk'))
            tanggal_mengawas = get_tanggal_h(tanggal_spk_obj, 2)
            data['tanggal_mengawas'] = tanggal_mengawas.strftime('%d %B %Y')

        else:
            data_to_sheet = {}
            header_mapping = {
                "timestamp": "Timestamp", "kode_ulok": "Kode_Ulok", "status_lokasi": "Status_Lokasi",
                "status_progress1": "Status_Progress1", "catatan1": "Catatan1",
                "status_progress2": "Status_Progress2", "catatan2": "Catatan2",
                "status_progress3": "Status_Progress3", "catatan3": "Catatan3",
                "pengukuran_bowplank": "Pengukuran_Dan_Pemasangan_Bowplank",
                "pekerjaan_tanah": "Pekerjaan_Tanah",
                "berkas_pengawasan": "Berkas_Pengawasan"
            }
            
            if form_type == 'serah_terima':
                data_to_sheet = data
                data_to_sheet['Timestamp'] = timestamp.isoformat()
            else:
                 for key, value in data.items():
                    sheet_header = header_mapping.get(key, key.replace('_', ' ').title().replace(' ', '_'))
                    data_to_sheet[sheet_header] = value
                 data_to_sheet['Timestamp'] = timestamp.isoformat()

            sheet_map = {
                'h2': 'DataH2', 'h5': 'DataH5', 'h7': 'DataH7', 'h8': 'DataH8', 'h10': 'DataH10',
                'h12': 'DataH12', 'h14': 'DataH14', 'h16': 'DataH16', 'h17': 'DataH17',
                'h18': 'DataH18', 'h22': 'DataH22', 'h23': 'DataH23', 'h25': 'DataH25',
                'h28': 'DataH28', 'h32': 'DataH32', 'h33': 'DataH33', 'h41': 'DataH41',
                'serah_terima': 'SerahTerima'
            }
            target_sheet = sheet_map.get(form_type)
            if target_sheet:
                 google_provider.append_to_dynamic_sheet(
                    config.PENGAWASAN_SPREADSHEET_ID, target_sheet, data_to_sheet
                )

        email_details = get_email_details(form_type, data, user_info)
        
        if not email_details['recipients']:
            return jsonify({
                "status": "error", 
                "message": "Tidak ada penerima email yang valid. Pastikan PIC Building Support dipilih dan/atau Koordinator/Manajer terdaftar untuk cabang ini."
            }), 400

        base_url = "https://building-alfamart.vercel.app" 
        next_form_path = FORM_LINKS.get(form_type, {}).get(data.get('kategori_lokasi'), '#')
        
        next_url_with_redirect = f"{base_url.strip('/')}/?redirectTo={next_form_path}" if next_form_path != '#' else None

        email_html = render_template('pengawasan_email_template.html', 
                                     form_data=data,
                                     user_info=user_info,
                                     next_form_url=next_url_with_redirect,
                                     form_type=form_type
                                    )
        
        google_provider.send_email(
            to=email_details['recipients'],
            subject=email_details['subject'],
            html_body=email_html
        )
        
        if form_type == 'input_pic' and 'tanggal_mengawas' in data:
            event_date_obj = datetime.datetime.strptime(data['tanggal_mengawas'], '%d %B %Y')
            google_provider.create_calendar_event({
                'title': f"[REMINDER] Pengawasan H+2: {data.get('kode_ulok')}",
                'description': f"Ini adalah pengingat untuk melakukan pengawasan H+2 untuk toko {data.get('kode_ulok')}. Link untuk mengisi laporan akan dikirimkan melalui email terpisah.",
                'date': event_date_obj.strftime('%Y-%m-%d'),
                'guests': email_details['recipients']
            })

        return jsonify({"status": "success", "message": "Laporan berhasil dikirim."}), 200

    except Exception as e:
        traceback.print_exc()
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/pengawasan/active_projects', methods=['GET'])
def get_active_projects():
    email = request.args.get('email')
    if not email:
        return jsonify({"status": "error", "message": "Parameter email dibutuhkan."}), 400
    try:
        active_projects = google_provider.get_active_pengawasan_by_pic(email)
        return jsonify({"status": "success", "projects": active_projects}), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "message": "Service is alive"}), 200

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5001))
    app.run(host='0.0.0.0', port=port)