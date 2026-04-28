# Настройка базы данных

Для полноценной работы GoClaw требуется **PostgreSQL 15+** с установленным расширением **pgvector**. Это необходимо для хранения векторов памяти агентов, поиска по базе знаний и работы Knowledge Vault.

## Обзор
В базе данных хранится все состояние системы: настройки агентов, история диалогов, долгосрочная память, логи выполнения (traces), навыки, задачи по расписанию и конфигурации каналов связи.

## Быстрый запуск через Docker
Самый простой способ — использовать готовый оверлей:
```bash
docker compose -f docker-compose.yml -f docker-compose.postgres.yml up -d
```
Это запустит контейнер с PostgreSQL 18 и всеми необходимыми расширениями.

## Ручная настройка

### 1. Установка PostgreSQL и pgvector
В Ubuntu/Debian:
```bash
sudo apt install postgresql postgresql-contrib postgresql-16-pgvector
```

### 2. Создание базы данных и расширений
Подключитесь к PostgreSQL под суперпользователем и выполните:
```sql
CREATE DATABASE goclaw;
\c goclaw
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";
```
- `pgcrypto` — для генерации уникальных ID (UUID).
- `vector` — для семантического поиска по памяти агентов.

### 3. Строка подключения
Добавьте в файл `.env` параметр `GOCLAW_POSTGRES_DSN`:
```bash
GOCLAW_POSTGRES_DSN=postgres://goclaw:пароль@localhost:5432/goclaw?sslmode=disable
```

## Управление миграциями
GoClaw автоматически управляет схемой базы данных. Чтобы применить обновления, используйте команду:
```bash
./goclaw migrate up
```
Или, если вы используете Docker:
```bash
docker compose run --rm upgrade
```

## PostgreSQL vs SQLite
- **PostgreSQL**: Рекомендуется для всех реальных задач. Поддерживает векторный поиск, многопользовательский режим и Knowledge Vault.
- **SQLite**: Только для локального тестирования или десктопных версий. **Не поддерживает** векторный поиск и семантическую память.

## Резервное копирование (Backup)
Для создания полной резервной копии базы данных используйте `pg_dump`:
```bash
pg_dump -h localhost -U goclaw -d goclaw -Fc -f goclaw-backup.dump
```
Для восстановления в новую базу:
```bash
pg_restore -h localhost -U goclaw -d goclaw_new goclaw-backup.dump
```

## Типичные проблемы
- **Ошибка "extension vector does not exist"**: Убедитесь, что установлен пакет `pgvector`.
- **Медленный поиск по памяти**: Проверьте наличие индекса HNSW на таблице `memory_chunks`.
- **Быстрый рост диска**: Таблица `spans` (логи шагов агента) может быстро расти. Рекомендуется периодически очищать старые логи (старше 30 дней).

<!-- goclaw-source: 050aafc9 | updated: 2026-04-09 -->
