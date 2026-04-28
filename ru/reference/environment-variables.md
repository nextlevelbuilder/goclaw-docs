# Переменные окружения (Environment Variables)

> Полный список переменных окружения, используемых GoClaw, сгруппированный по категориям.

## Обзор
GoClaw считывает переменные окружения при запуске и применяет их поверх настроек из `config.json`. Переменные окружения всегда имеют приоритет над файлом конфигурации. Секреты (API-ключи, токены, пароли к БД) следует хранить именно в переменных окружения или в файле `.env.local`, а не в основном `config.json`.

---

## Основные настройки шлюза
- `GOCLAW_GATEWAY_TOKEN`: Токен для доступа к API и WebSocket (обязательно).
- `GOCLAW_ENCRYPTION_KEY`: 32-байтный ключ (hex) для шифрования секретов в БД (обязательно).
- `GOCLAW_POSTGRES_DSN`: Строка подключения к PostgreSQL (обязательно).
- `GOCLAW_PORT`: Порт, на котором работает шлюз (по умолчанию `18790`).
- `GOCLAW_AUTO_UPGRADE`: Установите `true`, чтобы автоматически обновлять БД при запуске.

---

## Провайдеры LLM
Установка ключа через переменную окружения автоматически активирует соответствующего провайдера.
- `GOCLAW_ANTHROPIC_API_KEY`: Ключ для Anthropic (Claude).
- `GOCLAW_OPENAI_API_KEY`: Ключ для OpenAI (GPT).
- `GOCLAW_GEMINI_API_KEY`: Ключ для Google Gemini.
- `GOCLAW_DEEPSEEK_API_KEY`: Ключ для DeepSeek.
- `GOCLAW_OPENROUTER_API_KEY`: Ключ для OpenRouter.

---

## Каналы связи
- `GOCLAW_TELEGRAM_TOKEN`: Токен бота Telegram.
- `GOCLAW_DISCORD_TOKEN`: Токен бота Discord.
- `GOCLAW_WHATSAPP_ENABLED`: Включить канал WhatsApp (`true`/`false`).
- `GOCLAW_LARK_APP_ID` / `_SECRET`: Данные для интеграции с Lark/Feishu.

---

## Песочница (Docker)
- `GOCLAW_SANDBOX_MODE`: Режим песочницы (`off`, `non-main`, `all`).
- `GOCLAW_SANDBOX_IMAGE`: Docker-образ для контейнеров-песочниц.
- `GOCLAW_SANDBOX_MEMORY_MB`: Лимит памяти для контейнера (по умолчанию `512`).

---

## Пример файла `.env.local`
Этот файл обычно создается автоматически командой `goclaw onboard`.
```bash
GOCLAW_GATEWAY_TOKEN=ваш-секретный-токен
GOCLAW_ENCRYPTION_KEY=ваш-ключ-шифрования-64-символа
GOCLAW_POSTGRES_DSN=postgres://user:pass@localhost:5432/goclaw?sslmode=disable
GOCLAW_OPENAI_API_KEY=sk-...
```

<!-- goclaw-source: 050aafc9 | updated: 2026-04-09 -->
