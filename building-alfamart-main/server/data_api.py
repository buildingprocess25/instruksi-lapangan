from flask import Blueprint, jsonify, request
import gspread
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
import re
import os

# 1. Membuat Blueprint
data_bp = Blueprint('data_api', __name__)

# --- Struktur ID Spreadsheet ---
SPREADSHEET_IDS = {
    "ACEH": {"ME": "1KZyh0VVn7dZRyvEm6q7RV4iA5jzg7u2oRTIvSHxeFu0", "SIPIL": "11b_oUEmsjqFkB8CX8uOg8SUjlUpfgjZQq6qN1BtVBm4"},
    "BALARAJA": {"ME": "1FVRlRK1Qop1Q7OlHKsIc14BhRSHn9XH2gLWarxWMON4", "SIPIL": "1nBPJjM17vwO1tTsC2m8VRnnhQQKC_bUEpfFebfib_g0"},
    "BALI": {"ME": "1ih2kuwqcCa7EiMTbJX6qiNsrv7vpmPE825a_9qAz2Ng", "SIPIL": "1gD_z66c4zPBXMXcKGxIFs8C2h2uiDXwO3J7r_e1BxJc"},
    "BANDUNG 1": {"ME": "13xo-gjJnXlCWXKNfW3ZugEYxK6qz1jvUq2ScSBJF1cw", "SIPIL": "11Weq3EIPCo-_bOPvTrSBQPcpXNPu5VTIoWHPA4ZJfHw"},
    "BANDUNG 2": {"ME": "15kOWwgAQTZKZ-Ofm_jrlaKHJbbU_wDkYTptefCVOTCY", "SIPIL": "1LsIBm2829RqC7Tu9fdNnWTgDKLT9gCz4zWCCHjMbmzI"},
    "BANGKA": {"ME": "1nhjwDMrG8fWUXu-4tTdcfgbLpEfOfEh90SSqOVhaaPc", "SIPIL": "1SmZJ5hNYAQba5byj-cduo4yRRNl74LEwHvayt_Wj27g"},
    "BANJARMASIN": {"ME": "1_1alrg4qaA2HeI_FpKqCczP-S8iasQ6P93jUDUISfgw", "SIPIL": "13PEkDV55bcV3SRU1gEvaU2EIDRUYfAREXLAkIYIX660"},
    "BATAM": {"ME": "1pUf7XBVN-eR7ptaeCqjHIokeRyu2xrE-_Y4b0KK0Uz8", "SIPIL": "1sl-1CfcEerMzpU-Boc-p7ePSZWbj53kq4DXjrC145R4"},
    "BEKASI": {"ME": "1TV8OqBBvHG93tuBe__aYm6Yo-tfRvlASoRe87qTD5WI", "SIPIL": "1rwdlpE0G_NP3zAsRECtALgXFh1g6Fp5-XC-bxdwvXhw"},
    "BELITUNG": {"ME": "1nhjwDMrG8fWUXu-4tTdcfgbLpEfOfEh90SSqOVhaaPc", "SIPIL": "1bLyVM6OEMHzR6LHyNlatDePmDOKE7UtHGXPfU-CqQsY"},
    "BENGKULU": {"ME": "1nhjwDMrG8fWUXu-4tTdcfgbLpEfOfEh90SSqOVhaaPc", "SIPIL": "1ZE69uEhHuG8hVTPqGge53wQBh4uy2j_UTXi0q8gHQNE"},
    "BOGOR": {"ME": "1ESn1O-gHsjJFoBYZGhzMxkI4IHO-L82aESTRWO_n26Y", "SIPIL": "1DMUZYn8ElI5j7yFn1Eeu_d7n4CIzYWbvLcdyjIsOrUI"},
    "CIANJUR": {"ME": "14MwcXFxSAkWAYf0CFSADNkBaONgcNjJBs9BsluMHAKU", "SIPIL": "1yrDQzOjYlg7YxI0E9clBZRG_Iz8KHoo9FA6abYxgDRs"},
    "CIKOKOL": {"ME": "1oEX2bmyi40u09LLfjsL-A6ec7Iw7hAXKVfk0SJDnnBw", "SIPIL": "1aSpjDMumbtEa0BrrK2T7qaGd2AIep09qSX14BwzI5gY"},
    "CILACAP": {"ME": "1nm9L7rNKnexO06dW0YkmfXO9hhlKN7Ai88iEWIC8Olw", "SIPIL": "1Lgjo4WB1cXNF9Howneisr-PdJLCjrJSE60C9JtxNIYI"},
    "CILEUNGSI": {"ME": "1JVtRGj9LxkYrBMCBfK1Tc4IMZLqiXyzhQBgQw0FBsj8", "SIPIL": "1yhAK38hk_pSzCII_rF329j8ebNOUbxDHju5EbG7L1t0"},
    "GORONTALO": {"ME": "1sYssoeMYr2iA0n-XLFLJTHo5Hr0ogOrAwIUnO8JKwro", "SIPIL": "1ZGsW7uzggEhvT77Kd8bqr-VokwPFlIjg6VOY_tntBN4"},
    "JAMBI": {"ME": "1SjIkwq9jLRKPeK3YXdBpEMJdCOlnIxaQ496mWG-aqWQ", "SIPIL": "1G_B08N-XSUqrVtcvizvUoZITPzST7pIiYbLouRFcfMc"},
    "JEMBER": {"ME": "1VjYiZ0C-h-ADIbhrJ4fAlr_oynqQabtASOTv5bc_JxY", "SIPIL": "1BBikMALwiAKam5Odz1e01Vb1aWtToCjRb2KNP4Zq-uE"},
    "KARAWANG": {"ME": "1pyhKAeNerRsOhok9VQ0Phb4h67W136ftaF7nJTXomXI", "SIPIL": "1W5nob_MXaCQCO90tdFO002irPBOTQZVNr_NMeoNjzf0"},
    "KLATEN": {"ME": "1qDUOB2xtNYEp3Kc_HbYaznc6cSfp4pa5vI9ZZZc3Hhk", "SIPIL": "1xA5qqKWlniFE8FCn0YTAnIpVfI7HKjPrFTOwUIv-7KI"},
    "KOTABUMI": {"ME": "14s6kC8qvAEjYW9E5-T1_cj_pXIkk82BZTrQd-UmPdmg", "SIPIL": "1TYCSAQ1Vu_K7KnfEfKdXTJnFuk-t6ZtKFktieXt199w"},
    "LAMPUNG": {"ME": "1Imw8469Od3dHiomBxPXgVQmn5_JOJkTT0iH-EJA6w0Y", "SIPIL": "1zY8SbebteKSb4OOGqQxDBFxJXlZHfCRz3AbmePY-4Mk"},
    "LOMBOK": {"ME": "1QeicLcNbNK7D0aYsVrM9klr273tiFZa2y9i1A3uK7Wc", "SIPIL": "17iy_6ONzglPDhOk4pm3KQpV4AIT53pZLgmERTMSrE5c"},
    "LUWU": {"ME": "1_2-ZXbpSoQN9uuHEkyFVVUjugx2n-QW3Qi0cfDeh_qM", "SIPIL": "1TDZCEUZC6TKeOWwX7I5VCDTInqy-nEVjNHYMr5ZiAbM"},
    "MADIUN": {"ME": "1UPv6sdqv5TtsL4UC3v0EOqY0MnvAB3Et-aTt2KMOrmI", "SIPIL": "1vJGFwQj92f9Mxs8dKT4dHDDCXer0DyFOPlUh__C956c"},
    "MAKASSAR": {"ME": "1XnFay1yEsQfUJ-fdccCCY8jfVuDks2sTUTgpuFrAj_k", "SIPIL": "1uUEIU7Ieqs7Nm68HBaRo4MHwob4RLTPUEtI_0LI6X28"},
    "MALANG": {"ME": "1FLZ-faMU1Cyp6OOVS5oQXdZNc4nDCvMs5rIzRvlEY0s", "SIPIL": "1EdKp2Yxz4GkEb7fyx8dLzIVNG7mSemZN_CnN3qQN_lI"},
    "MANADO": {"ME": "1kJBHqvxmvb8Kw4UvyxD_ecZsrjGGgtkCql2EAab5xfw", "SIPIL": "1sbt6Fu-OvH5qXf-LN0MpQaBnLF3tn1QcCUTNBgrVVIU"},
    "MANOKWARI": {"ME": "1O9tKmAojv42gRsNn6lryZ6Npo_kSt_J1LDOT9ZCNVMs", "SIPIL": "1DXvR6m9gZ4K_1m0hJwyJnSRAXtzy8y8uEyk68_yqziE"},
    "MEDAN": {"ME": "1TaEaBMTAXxXRS73VB8Ijnp53pZI6F6odweCBQV4vaFo", "SIPIL": "1ty-YLmkZqGAmVu7UGxjdtyBkmoYRhGibTk7ZkUt2dPs"},
    "NTT": {"ME": "1anZZF1ptwE-j_DroCLep6yfRC0A8jrFXp8v9cZ5gh7k", "SIPIL": "1dCfRyTOgMayV-m7y647X0Gqm_FPbBVl4rwJ8SPrav9o"},
    "PALEMBANG": {"ME": "1nhjwDMrG8fWUXu-4tTdcfgbLpEfOfEh90SSqOVhaaPc", "SIPIL": "1xfqITP8OOBTS7JdxBbc49U4HIlA0qbBsXZjuEuh_g4"},
    "PARUNG": {"ME": "1BTkXU0aVovA2p4zYUok3dPq57aqTiHwj_RboQUh6-54", "SIPIL": "1w7aBoRFAvt2kkuezHoPeKYxUx2FPgHCJ8eNWA7AvvCw"},
    "PEKANBARU": {"ME": "18x4TJ751pGnSeCtGXBWbbuKTJ68oK8MHYMQaCF-nQ_8", "SIPIL": "14vFw1rx4wDCCw2pKDIWKvnNqA4aAvnwrD0eRjNtguzo"},
    "PLUMBON": {"ME": "1mHnA9lQE5ymjUL4bc51MmdwTOkCO_okXhqdg3-XmuMY", "SIPIL": "1CPQcKkJrlvvyt4SSRbcu5_ee4tjFpS7upwxcVYRIZAQ"},
    "PONTIANAK": {"ME": "1o7RgfXKoS1FLok68SrSETBO0TQy1-yI0OtM0LtHriHo", "SIPIL": "1bzjdA0DJZqtTR3W0OdYU-J85Jipwk64WtYt_3TPwnAk"},
    "REMBANG": {"ME": "1KF5HvMQoNu9dk1lmaitc_I19nofgaiLPMzulHAXanJs", "SIPIL": "18eIGamo7yGhLKu16V5n4AceIIbMW1KxQ4PJfpZGl9D8"},
    "SEMARANG": {"ME": "1EAvelezXOEj06yiHeYxsf8R9H9wuUJImG0fLlLlfaA4", "SIPIL": "1a3aPYLepwr4u5lR0MmTO_0N-wb8XTmOld8flJCgRX30"},
    "SERANG": {"ME": "1hyjjNHkHZLJo3Z-n5c-Vik6SZCc1Sd2FbnjpnvrFz7A", "SIPIL": "12y3OZxSwPlrXFgiIA_6ediJ9DK6hJ_GKVznOsm1KBok"},
    "SIDOARJO": {"ME": "1BcUs28NrcsqPk9FA3oRrVmBBmlWyGjRspZ9dJ217kAQ", "SIPIL": "1k2eBX4vZaAHL30SZcAX3kXNastEuscirr-2RuiTKIRw"},
    "SIDOARJO BPN_SMD": {"ME": "1j1B7Yvgz5X02VcCuNSJC7btZv_tumFFmeMvxNEaS0ec", "SIPIL": "18BT0u4sHuNZA-NKxdcDeNTkxT35Mag4zOW9RjduRE8A"},
    "SORONG": {"ME": "1BfAWqaN-7fk5kZMWhK0SOKousSYM6pis6jVEplQLnYs", "SIPIL": "1NbG4HOt_Zl1auzR_kw-e8mG0ajrP9P-FFLfjNCD6Oyg"},
    "SUMBAWA": {"ME": "1WB6KA2sFD11Ol81IYbM3ugH34Sg1JU1Aw6Ny8zUgCpg", "SIPIL": "1Y3AqDtyXUyJhyrvT0slbQRlW14VUd9zA8P_1vPqqI8A"},
    "TEGAL": {"ME": "13qXfMnPrOYB-fJEf_7FGgL-UENA3KWBj5uTiY4PLoAQ", "SIPIL": "1i_2TLKswkCUoNm1Z6hDmc3j9k0qNcF38MZoC-z2-PNM"},
    "HEAD OFFICE": {"ME": "1oQfZkWSP-TWQmQMY-gM1qVcLP_i47REBmJj1IfDNzkg", "SIPIL": "1Jf_qTHOMpmyLWp9zR_5CiwjyzWWtD8cH99qt4kJvLOw"}
}

# --- ID Spreadsheet SBO ---
SBO_SPREADSHEET_ID = "11efRx3l6fXn5XLd_HZEQHmFWwQX5vRUIBVgFecCYMXQ"

BRANCH_TO_ULOK_MAP = {
    "WHC IMAM BONJOL": "7AZ1", "LUWU": "2VZ1", "KARAWANG": "1JZ1", "REMBANG": "2AZ1",
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
ULOK_TO_BRANCH_MAP = {v: k for k, v in BRANCH_TO_ULOK_MAP.items()}

# --- Fungsi Bantuan ---
def get_google_creds():
    creds = None
    scopes = [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/drive.file'
    ]
    secret_dir = '/etc/secrets/'
    token_path = os.path.join(secret_dir, 'token.json')

    if not os.path.exists(secret_dir):
        token_path = 'token.json'

    if os.path.exists(token_path):
        creds = Credentials.from_authorized_user_file(token_path, scopes)
    
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            raise Exception("Critical: token.json is missing, invalid, or expired and cannot be refreshed.")
    return creds

def safe_to_float(value):
    if isinstance(value, (int, float)):
        return float(value)
    s_value = str(value).strip()
    if not s_value or s_value == '-':
        return 0.0
    try:
        return float(s_value.replace(',', ''))
    except (ValueError, TypeError):
        return 0.0

def process_price_value(raw_value):
    value_str = str(raw_value).strip().lower()
    if value_str == 'kondisional':
        return 'Kondisional'
    if value_str == 'sbo':
        return 'SBO'
    if 'kontraktor' in value_str:
        return 0.0
    return safe_to_float(raw_value)

def process_sbo_sheet(sheet, cabang_kode, lingkup):
    try:
        worksheet = sheet.get_worksheet(0)
        all_records = worksheet.get_all_records()
    except Exception as e:
        raise ValueError(f"Gagal mengambil data dari sheet SBO. Error: {str(e)}")

    sbo_items = []
    for record in all_records:
        if str(record.get("Lingkup_Pekerjaan", "")).upper() == lingkup:
            if cabang_kode in str(record.get("Kode Cabang", "")).split(','):
                item_data = {
                    "Jenis Pekerjaan": record.get("Item Pekerjaan"),
                    "Satuan": record.get("Satuan"),
                    "Harga Material": process_price_value(record.get("Harga Material")),
                    "Harga Upah": 0.0
                }
                sbo_items.append(item_data)
            
    return {"PEKERJAAN SBO": sbo_items} if sbo_items else {}


def process_sheet(sheet, lingkup):
    try:
        worksheet = sheet.get_worksheet(0)
        all_values = worksheet.get_all_values()
    except Exception as e:
        raise ValueError(f"Gagal mengambil data dari sheet. Error: {str(e)}")

    categorized_prices = {}
    current_category = "Uncategorized"
    
    no_col_index = 1
    jenis_pekerjaan_col_index = 3
    sat_col_index = 4
    
    header_row = []
    header_row_index = -1
    
    target_header_row_index = 16 if lingkup == "SIPIL" else 13
    
    if len(all_values) > target_header_row_index:
        header_row_index = target_header_row_index
        header_row = [str(cell).strip() for cell in all_values[header_row_index]]
    else:
        raise ValueError(f"Baris header tidak ditemukan di sheet untuk lingkup {lingkup}.")

    try:
        material_col_index = -1
        upah_col_index = -1
        for i, header_text in enumerate(header_row):
            if "material" in header_text.lower():
                material_col_index = i
            if "upah" in header_text.lower():
                upah_col_index = i
        
        if material_col_index == -1 or upah_col_index == -1:
            raise ValueError("Header 'Material' atau 'Upah' tidak ditemukan.")

    except ValueError as e:
        raise ValueError(f"Error pada header untuk lingkup {lingkup}: {e}")

    for row in all_values:
        if len(row) <= jenis_pekerjaan_col_index or not row[jenis_pekerjaan_col_index].strip():
            continue

        no_val = row[no_col_index].strip()
        jenis_pekerjaan = row[jenis_pekerjaan_col_index].strip()

        if not no_val or jenis_pekerjaan.upper() == "JENIS PEKERJAAN":
            continue
        
        if re.fullmatch(r'^[IVXLCDM]+$', no_val):
            current_category = jenis_pekerjaan
            if current_category not in categorized_prices:
                categorized_prices[current_category] = []
            continue

        satuan_val = row[sat_col_index].strip() if len(row) > sat_col_index else ""
        if not satuan_val:
            continue

        harga_material_raw = row[material_col_index] if len(row) > material_col_index else "0"
        harga_upah_raw = row[upah_col_index] if len(row) > upah_col_index else "0"

        harga_material = process_price_value(harga_material_raw)
        harga_upah = process_price_value(harga_upah_raw)
        
        item_data = {
            "Jenis Pekerjaan": jenis_pekerjaan,
            "Satuan": satuan_val,
            "Harga Material": harga_material,
            "Harga Upah": harga_upah
        }

        if current_category not in categorized_prices:
            categorized_prices[current_category] = []
        categorized_prices[current_category].append(item_data)

    return categorized_prices

# --- Endpoint API ---
@data_bp.route('/get-data', methods=['GET'])
def get_data():
    cabang = request.args.get('cabang')
    lingkup = request.args.get('lingkup')

    if not cabang or not lingkup:
        return jsonify({"error": "Missing 'cabang' or 'lingkup' parameter"}), 400

    cabang = cabang.upper()
    lingkup_param = lingkup.upper()

    if cabang not in SPREADSHEET_IDS or lingkup_param not in SPREADSHEET_IDS[cabang]:
        return jsonify({"error": f"Invalid 'cabang' or 'lingkup' parameter"}), 404

    spreadsheet_id = SPREADSHEET_IDS[cabang][lingkup_param]

    try:
        creds = get_google_creds()
        client = gspread.authorize(creds)
        spreadsheet = client.open_by_key(spreadsheet_id)
        
        processed_data = process_sheet(spreadsheet, lingkup_param)
        
        cabang_kode = BRANCH_TO_ULOK_MAP.get(cabang)
        if cabang_kode:
            try:
                sbo_spreadsheet = client.open_by_key(SBO_SPREADSHEET_ID)
                sbo_data = process_sbo_sheet(sbo_spreadsheet, cabang_kode, lingkup_param)
                if sbo_data:
                    processed_data.update(sbo_data)
            except Exception as e:
                print(f"Warning: Could not fetch or process SBO data. Error: {e}")

        return jsonify(processed_data)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"An internal server error occurred: {str(e)}"}), 500