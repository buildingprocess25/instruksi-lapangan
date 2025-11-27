import os
from dotenv import load_dotenv

load_dotenv()

# --- Google & Spreadsheet Configuration ---
SPREADSHEET_ID = os.getenv("SPREADSHEET_ID", "1LA1TlhgltT2bqSN3H-LYasq9PtInVlqq98VPru8txoo")
PDF_STORAGE_FOLDER_ID = "1lvPxOwNILXHmagVfPGkVlNEtfv3U4Emj"
KONTRAKTOR_SHEET_ID = "1s95mAc0yXEyDwUDyyOzsDdIqIPEETZkA62_jQQBWXyw"
# ID Spreadsheet untuk semua data Pengawasan
PENGAWASAN_SPREADSHEET_ID = "1zy6BBKJwwmSSvFrMZSZG39pf0YgmjXockZNf10_OFLo"
# ID Folder Google Drive untuk upload file SPK dari form pengawasan
INPUT_PIC_DRIVE_FOLDER_ID = "1gkGZhOJYVo7zv7sZnUIOYAafL-NbNHf8"

# Nama-nama sheet
DATA_ENTRY_SHEET_NAME = "Form2"
APPROVED_DATA_SHEET_NAME = "Form3"
CABANG_SHEET_NAME = "Cabang"
SPK_DATA_SHEET_NAME = "SPK_Data"
KONTRAKTOR_SHEET_NAME = "Monitoring Kontraktor"

# Nama sheet untuk Pengawasan
INPUT_PIC_SHEET_NAME = "InputPIC"
PENUGASAN_SHEET_NAME = "Penugasan"
# Nama sheet dinamis akan ditangani di kode, contoh: "DataH2", "SerahTerima"

# --- Nama Kolom ---
class COLUMN_NAMES:
    STATUS = "Status"
    TIMESTAMP = "Timestamp"
    EMAIL_PEMBUAT = "Email_Pembuat"
    LOKASI = "Nomor Ulok"
    PROYEK = "Proyek"
    CABANG = "Cabang"
    LINGKUP_PEKERJAAN = "Lingkup_Pekerjaan"
    KOORDINATOR_APPROVER = "Pemberi Persetujuan Koordinator"
    KOORDINATOR_APPROVAL_TIME = "Waktu Persetujuan Koordinator"
    MANAGER_APPROVER = "Pemberi Persetujuan Manager"
    MANAGER_APPROVAL_TIME = "Waktu Persetujuan Manager"
    LINK_PDF = "Link PDF"
    LINK_PDF_NONSBO = "Link PDF Non-SBO"
    LINK_PDF_REKAP = "Link PDF Rekapitulasi"
    GRAND_TOTAL = "Grand Total"
    GRAND_TOTAL_NONSBO = "Grand Total Non-SBO"
    ALAMAT = "Alamat"
    ALASAN_PENOLAKAN_RAB = "Alasan Penolakan"
    ALASAN_PENOLAKAN_SPK = "Alasan Penolakan"
    GRAND_TOTAL_FINAL = "Grand Total Final"

# --- Jabatan & Status ---
class JABATAN:
    SUPPORT = "BRANCH BUILDING SUPPORT"
    KOORDINATOR = "BRANCH BUILDING COORDINATOR"
    MANAGER = "BRANCH BUILDING & MAINTENANCE MANAGER"
    BRANCH_MANAGER = "BRANCH MANAGER"
    KONTRAKTOR = "KONTRAKTOR"

class STATUS:
    # Status RAB
    WAITING_FOR_COORDINATOR = "Menunggu Persetujuan Koordinator"
    REJECTED_BY_COORDINATOR = "Ditolak oleh Koordinator"
    WAITING_FOR_MANAGER = "Menunggu Persetujuan Manajer"
    REJECTED_BY_MANAGER = "Ditolak oleh Manajer"
    APPROVED = "Disetujui"
    # Status SPK
    WAITING_FOR_BM_APPROVAL = "Menunggu Persetujuan Branch Manager"
    SPK_APPROVED = "SPK Disetujui"
    SPK_REJECTED = "SPK Ditolak"