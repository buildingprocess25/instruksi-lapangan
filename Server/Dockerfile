# Gunakan image Python versi stabil (Bookworm) untuk menghindari error paket "testing"
FROM python:3.9-slim-bookworm

# Set direktori kerja di dalam container
WORKDIR /app

# Instal dependensi sistem yang WAJIB untuk WeasyPrint (PDF Generator)
# PERBAIKAN: Menggunakan 'libgdk-pixbuf-2.0-0' (nama paket baru)
RUN apt-get update && apt-get install -y \
    build-essential \
    python3-dev \
    python3-pip \
    python3-cffi \
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf-2.0-0 \
    libffi-dev \
    shared-mime-info \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy file requirements terlebih dahulu (untuk caching docker layer)
COPY requirements.txt .

# Instal library Python
RUN pip install --no-cache-dir -r requirements.txt

# Copy seluruh sisa kode program ke dalam container
COPY . .

# Expose port 5000 (Port default Flask)
EXPOSE 5000

# Jalankan aplikasi menggunakan Gunicorn
CMD ["gunicorn", "--worker-class", "gevent", "--workers", "1", "--timeout", "120", "--bind", "0.0.0.0:5000", "app:app"]