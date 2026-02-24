/* global XLSX */
// =====================================================
// SHEET UTILITIES - Sheet operations, Excel import/export
// =====================================================
// console.log("✅ LOADED: univer-embed/sheetUtils.js");
(function (global) {
  const Helpers = global.UNIVER_HELPERS;
  const SheetUtils = {};

  // -----------------------
  // Extract sheet data as 2D array
  // -----------------------
  SheetUtils.getSheetData2D = function (ws) {
    let data = [];
    try {
      if (typeof ws.getDataRange === "function") {
        const rng = ws.getDataRange();
        if (rng && typeof rng.getValues === "function") {
          data = rng.getValues() || [];
        }
      }
    } catch {}

    // Fallback: read cells manually (up to 100x50 for safety)
    if (!data || data.length === 0) {
      try {
        const maxRow = 100;
        const maxCol = 50;
        try {
          SheetUtils.ensureSheetSize(ws, maxRow, maxCol);
        } catch (e) {}
        for (let r = 0; r < maxRow; r++) {
          let row = [];
          let hasValue = false;
          for (let c = 0; c < maxCol; c++) {
            try {
              const cell = ws.getRange(r, c, 1, 1);
              const val = cell.getValue
                ? cell.getValue()
                : cell.getValues
                  ? cell.getValues()?.[0]?.[0]
                  : null;
              row.push(val ?? "");
              if (val !== null && val !== undefined && val !== "")
                hasValue = true;
            } catch {
              row.push("");
            }
          }
          if (!hasValue && r > 0) break;
          data.push(row);
        }
      } catch (e) {
        console.warn("getSheetData2D fallback failed", e);
      }
    }

    return data;
  };

  // -----------------------
  // Get all sheets from workbook
  // -----------------------
  SheetUtils.getAllSheetsFromWorkbook = function (wb) {
    try {
      if (typeof wb.getSheets === "function") return wb.getSheets() || [];
      if (typeof wb.getWorksheets === "function")
        return wb.getWorksheets() || [];
      if (typeof wb.getSheetNames === "function") {
        const names = wb.getSheetNames() || [];
        const out = [];
        for (let i = 0; i < names.length; i++) {
          const n = names[i];
          try {
            if (typeof wb.getSheetByName === "function") {
              const s = wb.getSheetByName(n);
              if (s) out.push(s);
              continue;
            }
            if (typeof wb.getSheet === "function") {
              const s = wb.getSheet(i);
              if (s) out.push(s);
              continue;
            }
          } catch {}
        }
        return out;
      }
    } catch (e) {
      console.warn("getAllSheetsFromWorkbook failed", e);
    }
    // Fallback: try active sheet only
    try {
      const a = wb.getActiveSheet && wb.getActiveSheet();
      return a ? [a] : [];
    } catch {
      return [];
    }
  };

  // -----------------------
  // Ensure sheet size
  // -----------------------
  // Ensure sheet size (Updated with user logic)
  // Ensure sheet capacity using User's Formula: Extra = max(0, (Start + Count - 1) - Current)
  SheetUtils.ensureSheetCapacity = function (
    ws,
    startRow1Based,
    dataRows,
    startCol1Based,
    dataCols,
  ) {
    try {
      const tryFn = (obj, name, ...args) => {
        try {
          if (obj && typeof obj[name] === "function") {
            return obj[name](...args);
          }
        } catch (e) {
          return null;
        }
        return null;
      };

      // 1. Get C and R (Current Counts)
      let C = 0; // Columns
      let R = 0; // Rows

      // Helper to try various ways to get dimension
      const getVal = (methods, props) => {
        for (const m of methods) {
          const v = tryFn(ws, m);
          if (v != null && !Number.isNaN(Number(v))) return Number(v);
        }
        for (const p of props) {
          if (ws[p] != null && !Number.isNaN(Number(ws[p])))
            return Number(ws[p]);
        }
        // Try .getConfig()
        try {
          if (typeof ws.getConfig === "function") {
            const cfg = ws.getConfig();
            // check props on config
            for (const p of props) {
              if (cfg[p] != null && !Number.isNaN(Number(cfg[p])))
                return Number(cfg[p]);
            }
          }
        } catch (e) {}
        return 0;
      };

      R = getVal(
        ["getRowCount", "getRows", "getMaxRows"],
        ["rowCount", "maxRows", "_rowCount"],
      );
      C = getVal(
        ["getColumnCount", "getColumnCount", "getCols", "getMaxColumns"],
        ["columnCount", "maxColumns", "_columnCount"],
      );

      // console.log("ensureSheetCapacity RAW DETECT:", { R, C });

      // Fallback defaults if still 0
      if (R === 0) R = 1000; // Assume default if detection fails completely
      if (C === 0) C = 20; // Assume default if detection fails completely

      // 2. Calculate Extra Rows/Cols using Formula
      // Formula: Extra = max(0, (Start + API_Data - 1) - Current)
      const extraRows = Math.max(0, startRow1Based + dataRows - 1 - R);
      const extraCols = Math.max(0, startCol1Based + dataCols - 1 - C);

      // console.log("SheetUtils.ensureSheetCapacity DEBUG", {
      //   startRow1Based,
      //   dataRows,
      //   startCol1Based,
      //   dataCols,
      //   CurrentR: R,
      //   CurrentC: C,
      //   Calculated: { extraRows, extraCols },
      // });

      // 3. Insert if needed
      if (extraRows > 0) {
        // console.log(`SheetUtils: Adding ${extraRows} rows...`);
        if (typeof ws.insertRows === "function") {
          // Insert at index R (end of sheet)
          ws.insertRows(R, extraRows);
        } else if (typeof ws.addRows === "function") {
          ws.addRows(extraRows);
        } else if (typeof ws.setRowCount === "function") {
          ws.setRowCount(R + extraRows);
        }
      }

      if (extraCols > 0) {
        // console.log(`SheetUtils: Adding ${extraCols} cols...`);
        if (typeof ws.insertColumns === "function") {
          // Insert at index C (end of sheet)
          ws.insertColumns(C, extraCols);
        } else if (typeof ws.addColumns === "function") {
          ws.addColumns(extraCols);
        } else if (typeof ws.setColumnCount === "function") {
          ws.setColumnCount(C + extraCols);
        }
      }
    } catch (e) {
      console.warn("ensureSheetCapacity failed", e);
    }
  };
  // Alias for legacy compatibility (optional)
  SheetUtils.ensureSheetSize = function (ws, minRows, minCols) {
    // Legacy call assumes starting at 1
    SheetUtils.ensureSheetCapacity(ws, 1, minRows, 1, minCols);
  };

  // -----------------------
  // Create/ensure sheet helper
  // -----------------------
  SheetUtils.ensureSheet = function (wb, idx, sheetName) {
    try {
      if (typeof wb.getSheetByName === "function") {
        const s = wb.getSheetByName(sheetName);
        if (s) return s;
      }
      if (typeof wb.getSheetNames === "function") {
        const names = wb.getSheetNames() || [];
        if (names.includes(sheetName)) {
          if (typeof wb.getSheet === "function")
            return wb.getSheet(names.indexOf(sheetName));
        }
      }
    } catch (e) {}

    const creators = [
      "insertSheet",
      "addSheet",
      "createSheet",
      "insertWorksheet",
      "addWorksheet",
      "createWorksheet",
    ];
    let tryName = sheetName || "Sheet";
    for (let attempt = 0; attempt < 20; attempt++) {
      if (attempt > 0) tryName = `${sheetName} (${attempt})`;

      for (const fn of creators) {
        if (typeof wb[fn] === "function") {
          try {
            let s = null;
            try {
              s = wb[fn](tryName);
            } catch (e) {}
            if (!s) {
              try {
                s = wb[fn]({ name: tryName });
              } catch (e) {}
            }
            if (s) return s;
          } catch (e) {
            const msg = (e && e.message) || "";
            if (msg.match(/exist/i)) {
              continue;
            }
          }
        }
      }

      if (attempt === 0 && idx === 0) {
        try {
          const first = wb.getActiveSheet && wb.getActiveSheet();
          if (first) return first;
        } catch {}
      }
    }

    return null;
  };

  // -----------------------
  // Get sheet by name, or create it if not exists
  // -----------------------
  SheetUtils.getOrCreateSheet = function (wb, sheetName) {
    // First try to find existing sheet
    try {
      if (typeof wb.getSheetByName === "function") {
        const s = wb.getSheetByName(sheetName);
        if (s) return s;
      }
      if (typeof wb.getSheetNames === "function") {
        const names = wb.getSheetNames() || [];
        const idx = names.indexOf(sheetName);
        if (idx >= 0 && typeof wb.getSheet === "function") {
          const s = wb.getSheet(idx);
          if (s) return s;
        }
      }
    } catch {
      // Continue to create
    }

    // Create new sheet
    return SheetUtils.ensureSheet(wb, -1, sheetName);
  };

  global.UNIVER_SHEET_UTILS = SheetUtils;
})(window);
