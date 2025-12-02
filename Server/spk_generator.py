import os
import locale
from weasyprint import HTML
from flask import render_template
from datetime import datetime, timedelta
from num2words import num2words
import config

try:
    locale.setlocale(locale.LC_TIME, 'id_ID.UTF-8')
except locale.Error:
    try:
        locale.setlocale(locale.LC_TIME, 'Indonesian_Indonesia.1252')
    except locale.Error:
        print("Peringatan: Locale Bahasa Indonesia tidak ditemukan.")

def get_nama_lengkap_by_email(google_provider, email):
    if not email: return ""
    try:
        cabang_sheet = google_provider.sheet.worksheet(config.CABANG_SHEET_NAME)
        records = cabang_sheet.get_all_records()
        for record in records:
            if str(record.get('EMAIL_SAT', '')).strip().lower() == str(email).strip().lower():
                return record.get('NAMA LENGKAP', '').strip()
    except Exception as e:
        print(f"Error getting name for email {email}: {e}")
    return email

def parse_flexible_timestamp(ts_string):
    if not ts_string or not isinstance(ts_string, str):
        return None
    try:
        return datetime.fromisoformat(ts_string)
    except (ValueError, TypeError):
        pass
    for fmt in ['%m/%d/%Y %H:%M:%S', '%Y-%m-%d %H:%M:%S']:
        try:
            return datetime.strptime(ts_string, fmt)
        except (ValueError, TypeError):
            continue
    return None

def create_approval_details_block(google_provider, approver_email, approval_time_str):
    if not approver_email:
        return ""
    approver_name = get_nama_lengkap_by_email(google_provider, approver_email)
    approval_dt = parse_flexible_timestamp(approval_time_str)
    formatted_time = approval_dt.strftime('%d %B %Y, %H:%M WIB') if approval_dt else "Waktu tidak tersedia"
    
    name_display = f"<strong>( {approver_name} )</strong><br>" if approver_name else f"<strong>( {approver_email} )</strong><br>"
    return f"""
    <div class="approval-details">
        {name_display}
        <span class="timestamp">Disetujui pada: {formatted_time}</span>
    </div>
    """

def create_spk_pdf(google_provider, spk_data):
    initiator_email = spk_data.get('Dibuat Oleh')
    initiator_timestamp = spk_data.get('Timestamp') 
    
    approver_email = spk_data.get('Disetujui Oleh')
    approval_time = spk_data.get('Waktu Persetujuan') 

    initiator_details_html = create_approval_details_block(google_provider, initiator_email, initiator_timestamp)
    
    approver_details_html = create_approval_details_block(google_provider, approver_email, approval_time)

    start_date_obj = datetime.fromisoformat(spk_data.get('Waktu Mulai'))
    duration = int(spk_data.get('Durasi'))
    end_date_obj = start_date_obj + timedelta(days=duration - 1)
    start_date_formatted = start_date_obj.strftime('%d %B %Y')
    end_date_formatted = end_date_obj.strftime('%d %B %Y')

    total_cost = float(spk_data.get('Grand Total', 0))
    total_cost_formatted = f"{total_cost:,.0f}".replace(",", ".")
    terbilang = num2words(int(total_cost), lang='id').title()

    template_context = {
        "logo_path": 'file:///' + os.path.abspath(os.path.join('static', 'ALFALOGO.png')),
        "spk_location": spk_data.get('Cabang'),
        "spk_date": datetime.now().strftime('%d %B %Y'),
        "spk_number": spk_data.get('Nomor SPK', '____/PROPNDEV-____/____/____'),
        "par_number": spk_data.get('PAR', '____/PROPNDEV-____-____-____'),
        "contractor_name": spk_data.get('Nama Kontraktor'),
        "lingkup_pekerjaan": spk_data.get('Lingkup Pekerjaan'),
        "proyek": spk_data.get('Proyek'),
        "project_address": spk_data.get('Alamat'),
        "nama_toko": spk_data.get('Nama_Toko'),
        "total_cost_formatted": total_cost_formatted,
        "terbilang": terbilang,
        "start_date": start_date_formatted,
        "end_date": end_date_formatted,
        "duration": duration,
        "initiator_details_html": initiator_details_html,
        "approver_details_html": approver_details_html
    }
    
    html_string = render_template('spk_template.html', **template_context)
    return HTML(string=html_string).write_pdf()