// =====================================================
// SELECTION - Cell selection tracking
// =====================================================
(function (global) {
  const Helpers = global.UNIVER_HELPERS;
  const Selection = {};

  Selection.extractSelectionA1 = function (sel) {
    if (!sel) return null;
    const range = sel.range || sel.primary || sel;
    const r = range?.startRow ?? range?.row ?? range?.actualRow;
    const c =
      range?.startColumn ?? range?.col ?? range?.column ?? range?.actualColumn;
    if (Number.isInteger(r) && Number.isInteger(c)) {
      return Helpers.toA1(r, c);
    }
    return null;
  };

  Selection.getCurrentSelectionA1 = function (univerAPI) {
    try {
      const wb = univerAPI.getActiveWorkbook();
      if (!wb) return null;
      const ws = wb.getActiveSheet();
      if (!ws) return null;
      if (typeof ws.getSelection === "function") {
        const a1 = Selection.extractSelectionA1(ws.getSelection());
        if (a1) return a1;
      }
      if (typeof ws.getActiveRange === "function") {
        const range = ws.getActiveRange();
        if (range) {
          const r =
            typeof range.getRow === "function"
              ? range.getRow()
              : range.startRow;
          const c =
            typeof range.getColumn === "function"
              ? range.getColumn()
              : range.startColumn;
          if (Number.isInteger(r) && Number.isInteger(c))
            return Helpers.toA1(r, c);
        }
      }
    } catch (e) {
      console.warn(e);
    }
    return null;
  };

  Selection.attachTracking = function (univerAPI, onSelectionChange) {
    let pollingInterval = null;

    function startPolling() {
      if (pollingInterval) return;
      pollingInterval = setInterval(() => {
        const a1 = Selection.getCurrentSelectionA1(univerAPI);
        if (a1) onSelectionChange(a1);
      }, 150);
    }

    try {
      const wb = univerAPI.getActiveWorkbook();
      const ws = wb.getActiveSheet();

      if (typeof univerAPI.onSelectionChange === "function") {
        univerAPI.onSelectionChange((selections) => {
          const sel = Array.isArray(selections) ? selections[0] : selections;
          const a1 = Selection.extractSelectionA1(sel);
          if (a1) onSelectionChange(a1);
        });
        return;
      }

      if (ws && typeof ws.onSelectionChange === "function") {
        ws.onSelectionChange((sel) => {
          const a1 = Selection.extractSelectionA1(sel);
          if (a1) onSelectionChange(a1);
        });
        return;
      }

      startPolling();
    } catch (e) {
      console.warn(e);
      startPolling();
    }
  };

  global.UNIVER_SELECTION = Selection;

  if (typeof console !== "undefined" && console.log) {
    // console.log("✅ LOADED: univer-embed/selection.js");
  }
})(window);
