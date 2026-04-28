# Проблемы с базой данных

> Решение проблем с миграциями PostgreSQL, расширением pgvector, пулом соединений и медленными запросами.

## Обзор
GoClaw требует **PostgreSQL версии 15+** с установленными расширениями `pgvector` и `pgcrypto`. Подключение настраивается через переменную окружения `GOCLAW_POSTGRES_DSN`. Миграции управляются автоматически через команду `./goclaw migrate up`.

## Ошибки подключения

| Проблема | Причина | Решение |
|----------|---------|---------|
| `GOCLAW_POSTGRES_DSN is not set` | Не задана переменная окружения | `export GOCLAW_POSTGRES_DSN=postgres://user:pass@host:5432/db` |
| `password authentication failed` | Неверный пароль или логин | Проверьте учетные данные в DSN-строке |
| `database "goclaw" does not exist` | База данных не создана | Выполните `createdb goclaw` в консоли PostgreSQL |

GoClaw использует пул из **25 соединений**. Если вы запускаете несколько инстансов GoClaw, убедитесь, что параметр `max_connections` в `postgresql.conf` достаточно велик.

## Ошибки миграций
Миграции выполняются командой:
```bash
./goclaw migrate up
```

**Если миграция зависла в статусе "dirty":**
1. Проверьте логи Postgres, чтобы найти причину ошибки SQL.
2. Исправьте ошибку вручную в БД.
3. Выполните команду `./goclaw migrate force <номер_версии>`, где номер — это последняя успешная миграция.
4. Снова запустите `./goclaw migrate up`.

## Расширения pgvector и pgcrypto
GoClaw критически зависит от этих расширений.

- **pgcrypto**: Нужен для генерации UUID. Обычно входит в стандартный пакет `postgresql-contrib`.
- **pgvector**: Нужен для семантического поиска в памяти агентов.
  - Установка в Ubuntu: `apt install postgresql-15-pgvector`
  - Установка в macOS: `brew install pgvector`
  - Docker: Используйте образ `pgvector/pgvector:pg15`

## Медленные запросы
Если поиск в памяти или загрузка истории чатов занимают много времени:
1. Выполните команду `ANALYZE memory_chunks;`, чтобы обновить статистику планировщика.
2. Убедитесь, что для расширения pgvector выделено достаточно памяти (параметр `work_mem` в `postgresql.conf` рекомендуется поднять до 256MB).

## Резервное копирование
Используйте стандартные инструменты PostgreSQL:
```bash
# Создание бэкапа
pg_dump "$GOCLAW_POSTGRES_DSN" -Fc -f backup.dump

# Восстановление
pg_restore -d "$GOCLAW_POSTGRES_DSN" --clean backup.dump
```

<!-- goclaw-source: 050aafc9 | updated: 2026-04-09 -->
