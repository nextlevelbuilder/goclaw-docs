# Провайдер YesScale

Запуск ИИ-моделей в облаке через платформу YesScale.

## Обзор
YesScale — это облачная платформа, предоставляющая доступ к широкому спектру языковых моделей через OpenAI-совместимый API. GoClaw подключается к YesScale, используя стандартный механизм `OpenAIProvider`.

## Настройка

### В файле config.json
```json
{
  "providers": {
    "yescale": {
      "provider_type": "yescale",
      "api_key": "ваш-ключ-api",
      "api_base": "https://api.yescale.io/v1"
    }
  }
}
```

## Что дальше
- [Обзор провайдеров](/providers-overview)
- [OpenRouter](/provider-openrouter) — альтернативная платформа с доступом к множеству моделей.

<!-- goclaw-source: 050aafc9 | updated: 2026-04-09 -->
