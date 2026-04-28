# Провайдер Novita AI

Облачная платформа для запуска десятков моделей с открытым исходным кодом через OpenAI-совместимый API.

## Обзор
Novita AI предоставляет доступ к множеству моделей через единый интерфейс. GoClaw подключается к Novita, используя стандартный механизм `OpenAIProvider`.

- **Тип провайдера:** `novita`
- **Адрес API по умолчанию:** `https://api.novita.ai/openai`
- **Модель по умолчанию:** `moonshotai/kimi-k2.5`
- **Протокол:** OpenAI-совместимый (Bearer token)

## Быстрая настройка

### В файле config.json
```json
{
  "providers": {
    "novita": {
      "api_key": "ваш-ключ-api"
    }
  }
}
```

### Через переменные окружения
```
GOCLAW_NOVITA_API_KEY=ваш-ключ-api
```

## Использование в агенте
Просто укажите `novita` в качестве провайдера и выберите нужную модель:
```json
{
  "agents": {
    "defaults": {
      "provider": "novita",
      "model": "moonshotai/kimi-k2.5"
    }
  }
}
```

## Что дальше
- [Обзор провайдеров](/providers-overview)
- [OpenRouter](/provider-openrouter) — еще одна платформа с доступом к множеству моделей.

<!-- goclaw-source: 050aafc9 | updated: 2026-04-09 -->
