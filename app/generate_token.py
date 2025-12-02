import os
from google_auth_oauthlib.flow import InstalledAppFlow

# Pastikan scopes ini sama persis dengan yang ada di aplikasi Anda
SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/calendar' # <-- TAMBAHKAN SCOPE INI
]

CLIENT_SECRET_FILE = 'client_secret.json'
TOKEN_FILE = 'token.json'

def generate_token():
    """Membuat file token.json baru melalui autentikasi lokal."""
    if os.path.exists(TOKEN_FILE):
        print(f"'{TOKEN_FILE}' sudah ada. Harap hapus atau ganti namanya, lalu jalankan lagi.")
        return

    if not os.path.exists(CLIENT_SECRET_FILE):
        print(f"Error: '{CLIENT_SECRET_FILE}' tidak ditemukan di direktori ini.")
        return

    try:
        flow = InstalledAppFlow.from_client_secrets_file(CLIENT_SECRET_FILE, SCOPES)
        # Ini akan membuka browser agar Anda bisa login
        creds = flow.run_local_server(port=0)

        # Simpan kredensial baru untuk digunakan server
        with open(TOKEN_FILE, 'w') as token:
            token.write(creds.to_json())
        
        print(f"\nSukses! File '{TOKEN_FILE}' baru telah dibuat.")
        print("Harap unggah file ini ke server Anda (misalnya, Secret Files di Render).")

    except Exception as e:
        print(f"Terjadi kesalahan: {e}")

if __name__ == '__main__':
    generate_token()