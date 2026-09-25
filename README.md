# RATIONAL iCombi Vivid Demo

Статичний демосайт для Vivid-проєкту `1189` і продукту `3478` із нативною JavaScript API-інтеграцією та власним невеликим Node-сервером для деплою. iframe не використовується.

## Сторінки

- [Головна](dist/index.html)
- [Recipes](dist/recipes.html)
- [Browser API guide](dist/api.html)
- [Native API guide](dist/VIVID_PLAYER_API.md)

## Інтеграція

`dist/index.html` викликає `window.initVividPlayer()` і спочатку будує Player controls із `player.getConfigOptions()`. Якщо продукт не має CMS-опцій, сторінка використовує runtime fallback: `player.configurator.getAvailableOptions()`, `setConfig()` і `getConfig()`.

PlayCanvas-експорт завантажується напряму з DigitalOcean Spaces. Для розгорнутого сайту origin `https://rational-icombi-gzvwt.ondigitalocean.app` має бути доданий до CORS-правил Space.

## Запуск локально

```bash
npm start
```

Сервер слухає на порту `$PORT` (за замовчуванням `8080`) і роздає файли з директорії `dist/`.
