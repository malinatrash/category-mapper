FROM node:18-alpine AS build

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json (если есть)
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci

# Копируем исходный код
COPY . .

# Собираем приложение
RUN npm run build

# Стадия для продакшн-версии
FROM nginx:stable-alpine AS production

# Копируем собранные файлы из стадии build
COPY --from=build /app/dist /usr/share/nginx/html

# Копируем пользовательскую конфигурацию NGINX (при необходимости)
COPY ./nginx/default.conf /etc/nginx/conf.d/default.conf

# Открываем порт
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
