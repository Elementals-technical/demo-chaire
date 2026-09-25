# Native Vivid Player integration

This demo mounts Vivid Player directly into the page through the JavaScript API. It does not use an iframe.

## Product

- Project ID: `1189`
- Product ID: `3478`
- View mode: `WebGL`
- Product-selection block: hidden with `shareable: true`

## 1. Add the player container and SDK

```html
<div id="vivid-player-root" style="width: 100%; height: 720px"></div>
<script src="https://player.vivid3d.tech/cdn/vivid-player.js"></script>
```

The SDK creates the PlayCanvas canvas inside `#vivid-player-root`. No iframe is created.

## 2. Initialize the native player

```js
let player = null;

async function initPlayer() {
  if (player) await player.destroy();

  player = await window.initVividPlayer({
    container: "#vivid-player-root",
    idProject: "1189",
    idProduct: "3478",
    environment: "production",
    viewMode: "WebGL",
    shareable: true,
    playcanvasBaseUrl:
      "https://2d-render-admin-storage.fra1.cdn.digitaloceanspaces.com/projects/1189/products/3478/playcanvas/",
  });

  return player;
}
```

`shareable: true` keeps the selected product fixed and removes the project-level `Product selection` block.

`playcanvasBaseUrl` points directly to the PlayCanvas export in DigitalOcean Spaces. The Space CORS policy must allow the deployed website origin, currently `https://rational-icombi-gzvwt.ondigitalocean.app`.

## 3. Build the Player controls

```js
function renderOptionButtons() {
  const root = document.querySelector("#options-list");
  root.innerHTML = "";

  const cmsOptions = player.getConfigOptions();
  const runtime = player.configurator || player.getConfiguratorApi();
  const options = cmsOptions.length
    ? cmsOptions
    : Object.entries(runtime?.getAvailableOptions?.() || {}).map(([key, option]) => ({
        key,
        label: option.label || key,
        source: "runtime",
        variants: (option.options || []).map((variant) => ({
          ...variant,
          selected: Object.is(variant.value, option.value),
        })),
      }));

  options.forEach((option) => {
    const group = document.createElement("section");
    const title = document.createElement("strong");
    title.textContent = option.label || option.key;
    group.appendChild(title);

    option.variants.forEach((variant) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = variant.label || variant.name;
      button.disabled = variant.selected;

      button.addEventListener("click", async () => {
        if (option.source === "runtime") {
          await runtime.setConfig({ [option.key]: variant.value });
        } else {
          await player.setConfigOption(option.key, variant.value);
        }
        renderOptionButtons();
        renderCurrentConfig();
      });

      group.appendChild(button);
    });

    root.appendChild(group);
  });
}
```

For this product, the CMS `getConfigOptions()` response can be empty. In that
case `window.configurator.getAvailableOptions()` supplies five runtime groups:

1. `Icombi Body`
2. `Icombi Stand`
3. `Icombi Fat Drain`
4. `Icombi Vent`
5. `Icombi Open`

## 4. Display Current config

```html
<pre id="config-output">{}</pre>
```

```js
function renderCurrentConfig() {
  document.querySelector("#config-output").textContent = JSON.stringify(
    player.getConfiguration(),
    null,
    2,
  );
}
```

The result is the selection map currently applied to the PlayCanvas runtime:

```json
{
  "bg": 0,
  "camera": 0,
  "camera_rotation": 0,
  "Icombi Body": 0,
  "Icombi Stand": 0,
  "Icombi Fat Drain": 0,
  "Icombi Vent": 6,
  "Icombi Open": 0
}
```

## 5. Keep controls and config synchronized

```js
player.on("configurationChanged", () => {
  renderOptionButtons();
  renderCurrentConfig();
});
```

The event is emitted whenever the runtime configuration changes. Re-rendering both views ensures that selected buttons and JSON output remain synchronized.

## 6. Read the full product schema

```js
const schema = player.getSchema();

console.log(schema.product);
console.log(schema.selection);
console.log(schema.pcConfig);
```

Use `getConfiguration()` for the compact selection state. Use `getSchema()` when product metadata or the normalized PlayCanvas configuration is also required.

## 7. Lifecycle and fullscreen

```js
await player.fullscreen.toggle();

await player.destroy();
player = null;
```

Always destroy the current player before creating another instance in the same page. The demo's **Init player**, **Destroy**, and **Get config** buttons show this lifecycle directly.

## Complete flow

```js
const player = await initPlayer();

renderOptionButtons();
renderCurrentConfig();

player.on("configurationChanged", () => {
  renderOptionButtons();
  renderCurrentConfig();
});
```

The working implementation is in `dist/index.html`; `server.js` is only the local/static web server.
