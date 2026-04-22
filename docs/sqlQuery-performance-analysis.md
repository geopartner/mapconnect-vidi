# sqlQuery.js — Performance Analysis

Date: 2026-04-22

## Overview

`sqlQuery.js` drives the feature-info workflow: a user clicks the map, a spatial SQL query is fired against every visible layer, results are rendered in Bootstrap Table tabs, and features are highlighted on the map. The UI sluggishness stems from several independent issues across the reset, query, and render phases.

---

## Search Lifecycle

### Phase 1 — `reset(qstore)` (synchronous, before new search fires)

1. For each previous store: `store.abort()` → `store.reset()` → `cloud.get().removeGeoJsonStore(store)`
   - `removeGeoJsonStore` calls Leaflet's `map.removeLayer()` individually per store, triggering a map repaint per removal.
2. `$('#info-pane').empty()` — jQuery `.empty()` does not just remove DOM nodes; it traverses the **entire subtree** to unbind jQuery event handlers before removal. After a previous search that rendered Bootstrap Table with hundreds of rows (each with click/hover bindings), this is O(rows × bindings). This is likely the most visibly slow step on reset.
3. `cloud.get().map.closePopup()` fires even if no popup is open (Leaflet still dispatches events).

### Phase 2 — `init()` async fan-out (one XHR per layer)

SQL is built synchronously per layer. Stores are created and `.load()` is called; the page is responsive during the XHR wait.

### Phase 3 — `onLoad` callback (fires per layer as responses arrive)

For the **first layer** with hits:
- Builds and injects the popup/tab container HTML.
- Opens a Bootstrap tab (`.tab('show')`) — triggers CSS animation.

For **every layer** with hits:
- Appends a tab + pane fragment to the DOM.
- Calls `document.querySelector(ns).style.width = (document.querySelector(e).offsetWidth - 12) + "px"` — accessing `offsetWidth` is a **forced synchronous layout/reflow**, flushing all pending style changes. Happens once per layer per search.
- Calls `gc2table.init(...)` and `_table.loadDataInTable()` — heaviest work per layer.
- Switches to the newly loaded tab (`$('#tab_' + storeId).tab('show')`) — another tab animation per layer.

After all layers complete: a `setTimeout(..., 100)` runs `bootstrapTable('resetView')` — forces another layout pass.

---

## Issues Found

### 1. `arrive()` listeners accumulate per search — never-flipped flag (Bug, High)

```js
// line 60 — declared but never set to true
let backArrowIsAdded = false;

// line 341 — checked but backArrowIsAdded is never flipped to true
if ((featureInfoTableOnMap || forceOffCanvasInfo) && !backArrowIsAdded) {
    defaultTemplateWithBackBtn = `...`;
    $(document).arrive('.show-when-multiple-hits', function (e, data) { ... })
    // backArrowIsAdded = true  ← missing
}
```

Every call to `init()` under those conditions registers a **new** `.arrive()` listener on `document`. The `arrive` library is itself implemented on top of `MutationObserver`, so after N searches there are N redundant mutation callbacks firing on every DOM change. This grows unboundedly and worsens with each search.

**Fix (applied):** Set `backArrowIsAdded = true` immediately after the listener is registered, and move `defaultTemplateWithBackBtn` construction outside the `!backArrowIsAdded` guard so the template is still built on every search.

---

### 2. Global `MutationObserver` watching `document` fires on every DOM change (Medium-High)

```js
new MutationObserver(function (mutations) { ... })
    .observe(document, {childList: true, subtree: true});
```

This observer watches every DOM mutation across the whole page for the lifetime of the application. In a map application, Leaflet tile loading and Bootstrap Table rendering generate constant DOM churn. The callback iterates `addedNodes` on every single mutation, even though it only needs to react once when `#modal-info-body` is inserted.

**Fix:** Narrow the observation target to the specific container where `#modal-info-body` is injected, or disconnect the observer after it fires once, or wire the Excel button up directly in `init()` instead.

---

### 3. `Function()` string evaluation per layer per search (Medium)

Three separate places re-parse user-defined functions from strings on every search:

```js
// Inside $.each(layers, ...) — once per layer, per search
s = Function('"use strict";return (' + parsedMeta.select_function + ')')();
func = Function('"use strict";return (' + parsedMeta.info_function + ')')();

// After the loop — once per search
let func = Function('"use strict";return (' + window.vidiConfig.emptyInfoCallback + ')')();
let func = Function('"use strict";return (' + window.vidiConfig.infoCallback + ')')();
```

Each `Function()` call invokes the JS parser. The layer-level callbacks are re-parsed on every search even though the source string never changes between searches.

**Fix:** Compile `select_function` and `info_function` once per layer key and cache the result (keyed by layer + source string hash). Compile the config callbacks (`emptyInfoCallback`, `infoCallback`) once at startup.

---

### 4. `$.empty()` on info pane is slow after large result sets (Medium)

```js
$(`#${elementPrefix}info-pane`).empty();
```

jQuery's `.empty()` walks every descendant node to call `.removeData()` and detach event handlers. After a query that returned many features in a Bootstrap Table (which binds per-row events), this teardown can block the main thread visibly before the next search can start rendering.

**Fix:** Use `document.getElementById('info-pane').innerHTML = ''` directly. jQuery event cleanup is not needed here because the stores and table instances are already destroyed by `store.reset()` and `store.abort()` before this point. Alternatively, detach and replace the element entirely.

---

### 5. `offsetWidth` forced reflow per loaded layer (Medium)

```js
document.querySelector(ns).style.width =
    (document.querySelector(`${e}`).offsetWidth - 12) + "px";
```

Reading `offsetWidth` forces the browser to flush all pending style changes and compute layout synchronously. This happens once per layer inside `onLoad`, interleaved with DOM mutations from Bootstrap Table initialisation, which is the worst-case scenario for forced reflows.

**Fix:** Read the container width once before the `$.each(layers, ...)` loop (it doesn't change between layer callbacks) and use the cached value inside `onLoad`.

---

### 6. Individual `map.removeLayer()` per store in `reset()` (Low-Medium)

```js
$.each(qstore, function (index, store) {
    // ...
    cloud.get().removeGeoJsonStore(store);  // one map.removeLayer() call per store
});
```

Each `removeLayer()` triggers Leaflet's internal layer bookkeeping and may schedule a map invalidation. With multiple query stores (one per visible layer), this is multiple partial repaints during reset.

**Fix:** Track all query layers inside a single `L.LayerGroup` so that one `removeLayer()` removes all of them in a single Leaflet operation, or batch the removals by temporarily suppressing Leaflet's `update` events.

---

### 7. `setTimeout(..., 100)` for `bootstrapTable('resetView')` (Low)

```js
setTimeout(() => {
    $(`#${elementPrefix}modal-info-body table`).bootstrapTable('resetView');
    if (count.hits === 1) {
        $(`._sql_query [data-uniqueid]`).trigger("click");
        $(".show-when-multiple-hits").hide();
    }
}, 100);
```

The 100 ms delay is a workaround for a layout timing issue (the table container needs to be visible before `resetView` measures it). While not directly causing sluggishness, it delays the final render step and can cause a visible "pop" as the table reflows.

**Fix:** Use `requestAnimationFrame` or respond to a Bootstrap Table event (`post-body.bs.table`) instead of a fixed timer.

---

## Summary

| # | Issue | Phase | Severity | Status |
|---|---|---|---|---|
| 1 | `arrive()` listeners accumulate — never-flipped flag | reset → init | High | **Fixed** |
| 2 | Global `MutationObserver` on `document` | ongoing | Medium-High | Open |
| 3 | `Function()` re-eval per layer per search | onLoad | Medium | Open |
| 4 | `$.empty()` on large info-pane teardown | reset | Medium | Open |
| 5 | `offsetWidth` forced reflow per loaded layer | onLoad | Medium | Open |
| 6 | Individual `map.removeLayer()` per store | reset | Low-Medium | Open |
| 7 | Fixed `setTimeout` for `resetView` | post-load | Low | Open |
