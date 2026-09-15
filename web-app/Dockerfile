# PERSONAL-1 · deploy · DEV байршуулалт · 2026-09-15
# dist нь build хийгдсэн статик файл — offline cache-аас vite build-ээр урьдчилан гаргана
# (`npm ci --prefer-offline && npm run build`), энэ image зөвхөн nginx-ээр түгээнэ.
FROM nginx:alpine
COPY web-app/dist /usr/share/nginx/html
COPY web-app/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
