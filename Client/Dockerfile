# Gunakan image Nginx yang ringan
FROM nginx:alpine

# Hapus konfigurasi default bawaan Nginx
RUN rm -rf /etc/nginx/conf.d/*

# Copy konfigurasi Nginx custom kita ke dalam container
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy seluruh file website (HTML, CSS, JS, Assets) ke folder hosting Nginx
COPY . /usr/share/nginx/html

# Buka port 80 untuk akses web
EXPOSE 80

# Jalankan Nginx
CMD ["nginx", "-g", "daemon off;"]