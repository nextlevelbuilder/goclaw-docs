# Установка GoClaw

> Запустите GoClaw на своем компьютере за несколько минут. Выберите подходящий способ: быстрая установка бинарного файла, установка из исходников, Docker или деплой на VPS.

## Обзор способов установки

| Способ | Для кого | Что потребуется |
|--------|----------|-----------------|
| **Быстрая установка** | Самый быстрый способ для Linux/macOS | curl, PostgreSQL |
| **Из исходников** | Для разработчиков, нужен полный контроль | Go 1.26+, PostgreSQL |
| **Docker (Рекомендуется) ⭐** | **Запуск всех сервисов одной командой** | **Docker + Docker Compose** |
| **VPS (Продакшн)** | Для постоянной работы в интернете | VPS, Docker, 2 ГБ RAM+ |

---

## Способ 1: Быстрая установка (Binary)

Скачайте и установите готовую версию GoClaw одной командой. Установка Go не требуется.

```bash
curl -fsSL https://raw.githubusercontent.com/nextlevelbuilder/goclaw/main/scripts/install.sh | bash
```
Скрипт сам определит вашу операционную систему (Linux или macOS) и архитектуру процессора.

### Настройка базы данных
GoClaw требуется PostgreSQL. Самый простой способ запустить его — через Docker:
```bash
docker run -d --name goclaw-pg -p 5432:5432 -e POSTGRES_PASSWORD=goclaw pgvector/pgvector:pg18
```

### Первый запуск
Укажите адрес базы данных и запустите мастер настройки:
```bash
export GOCLAW_POSTGRES_DSN='postgres://postgres:goclaw@localhost:5432/postgres?sslmode=disable'
goclaw onboard
```
Скрипт создаст нужные таблицы и сохранит настройки в файл `.env.local`. После этого запустите шлюз:
```bash
source .env.local && goclaw
```

---

## Способ 2: Использование Docker (Рекомендуется)

Это самый надежный способ, так как все зависимости (база данных, панель управления) уже настроены внутри контейнеров.

### 1. Клонирование и подготовка
```bash
git clone https://github.com/nextlevelbuilder/goclaw.git
cd goclaw

# Генерация секретных ключей и токенов
./prepare-env.sh
```

### 2. Запуск сервисов
```bash
docker compose -f docker-compose.yml -f docker-compose.postgres.yml up -d --build
```

Это запустит:
- **Шлюз GoClaw и панель управления** — по адресу `http://localhost:18790`.
- **Базу данных PostgreSQL** — на порту `5432`.

### 3. Вход в панель управления
Откройте `http://localhost:18790` и войдите, используя:
- **User ID:** `system`
- **Gateway Token:** Возьмите значение `GOCLAW_GATEWAY_TOKEN` из созданного файла `.env`.

---

## Деплой на VPS (Продакшн)

Для работы в интернете рекомендуется использовать VPS (например, за $6/мес) с 2 ГБ оперативной памяти.

1. Установите Docker на сервер: `curl -fsSL https://get.docker.com | sh`.
2. Клонируйте репозиторий и запустите Docker Compose (как в инструкции выше).
3. Настройте **Caddy** или **Nginx** в качестве прокси-сервера для доступа по вашему домену и автоматического получения SSL-сертификата (HTTPS).

Пример настройки для **Caddy**:
```
yourdomain.com {
    reverse_proxy localhost:18790
}
```

---

## Обновление системы

Чтобы обновить GoClaw до последней версии:

**Для бинарной установки:** Просто запустите скрипт установки повторно.
**Для Docker:**
```bash
git pull origin main
docker compose -f docker-compose.yml -f docker-compose.postgres.yml up -d --build
```
GoClaw автоматически обновит структуру базы данных при запуске.

## Решение проблем
- **"pgvector extension not found"**: Убедитесь, что в PostgreSQL установлено расширение `pgvector`. В Docker-версии оно уже включено.
- **Порт 18790 занят**: Вы можете изменить порт в файле `.env` (параметр `GOCLAW_PORT`).
- **Мало памяти**: Если Docker падает при сборке, убедитесь, что у вас выделено минимум 2 ГБ RAM.

<!-- goclaw-source: 050aafc9 | updated: 2026-04-09 -->
