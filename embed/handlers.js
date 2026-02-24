/* global XLSX */
// =====================================================
// HANDLERS - Export/Import handlers
// =====================================================
(function (global) {
  const Helpers = global.UNIVER_HELPERS;
  const SheetUtils = global.UNIVER_SHEET_UTILS;
  const Handlers = {};

  // i18n shortcut
  function t(key, params) {
    if (global.UNIVER_I18N && global.UNIVER_I18N.t)
      return global.UNIVER_I18N.t(key, params);
    return key;
  }

  // -----------------------
  // Export Excel
  // -----------------------
  Handlers.exportExcel = async function (univerAPI, cfg, setStatus) {
    try {
      Helpers.showLoading(t("status.exportingExcel"));
      setStatus(t("status.exportingExcel"));

      const wb = univerAPI.getActiveWorkbook();
      if (!wb) throw new Error(t("errors.noWorkbook"));

      const xlsxWb = XLSX.utils.book_new();
      const sheets = SheetUtils.getAllSheetsFromWorkbook(wb);

      const used = new Set();
      function makeUniqueName(base) {
        const maxLen = 31;
        base = (base || "Sheet").toString();
        let name = base.substring(0, maxLen);
        if (!used.has(name)) {
          used.add(name);
          return name;
        }
        for (let i = 1; i < 1000; i++) {
          const suffix = ` (${i})`;
          const allowed = maxLen - suffix.length;
          const candidate = (
            base.substring(0, Math.max(0, allowed)) + suffix
          ).substring(0, maxLen);
          if (!used.has(candidate)) {
            used.add(candidate);
            return candidate;
          }
        }
        let j = 1;
        while (used.has(name + "(" + j + ")")) j++;
        const cand = (name + "(" + j + ")").substring(0, maxLen);
        used.add(cand);
        return cand;
      }

      for (const ws of sheets) {
        if (!ws) continue;
        const data2d = SheetUtils.getSheetData2D(ws) || [[]];
        let sheetName =
          (typeof ws.getName === "function" ? ws.getName() : null) || "Sheet";
        sheetName = makeUniqueName(sheetName);
        const xlsxSheet = XLSX.utils.aoa_to_sheet(data2d);
        XLSX.utils.book_append_sheet(xlsxWb, xlsxSheet, sheetName);
      }

      const wbout = XLSX.write(xlsxWb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const wbName =
        (wb.getName && wb.getName()) || cfg.workbookName || "workbook";
      a.download = `${wbName}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setStatus(t("success.exportedExcel"));
    } catch (err) {
      console.error(err);
      setStatus(t("errors.generic", { message: err.message || err }));
    } finally {
      Helpers.hideLoading();
    }
  };

  // -----------------------
  // Export PDF (Print)
  // -----------------------
  Handlers.exportPDF = async function (univerAPI, cfg, setStatus) {
    try {
      setStatus(t("status.preparingPrint"));
      const wb = univerAPI.getActiveWorkbook();
      const ws = wb.getActiveSheet();
      if (!ws) throw new Error(t("errors.noSheet"));

      const data2d = SheetUtils.getSheetData2D(ws);
      if (!data2d || data2d.length === 0)
        throw new Error(t("errors.emptySheet"));

      let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${t("modals.printTitle")}</title>
        <style>
          body { font-family: Arial, Helvetica, sans-serif; margin: 20px; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #333; padding: 6px 10px; text-align: left; }
          th { background: #f0f0f0; }
          @media print { body { margin: 0; } }
        </style>
      </head><body>`;

      const wbName =
        (wb.getName && wb.getName()) || cfg.workbookName || "Workbook";
      const sheetName =
        (typeof ws.getName === "function" ? ws.getName() : null) || "Sheet";
      html += `<h2>${wbName} - ${sheetName}</h2>`;
      html += "<table><tbody>";

      for (let r = 0; r < data2d.length; r++) {
        html += "<tr>";
        for (let c = 0; c < data2d[r].length; c++) {
          const cell = data2d[r][c];
          const tag = r === 0 ? "th" : "td";
          html += `<${tag}>${
            cell !== null && cell !== undefined ? String(cell) : ""
          }</${tag}>`;
        }
        html += "</tr>";
      }

      html += "</tbody></table></body></html>";

      const popup = window.open("", "_blank", "width=900,height=700");
      if (!popup) throw new Error(t("errors.popupBlocked"));
      popup.document.open();
      popup.document.write(html);
      popup.document.close();

      setTimeout(() => {
        popup.focus();
        popup.print();
      }, 300);

      setStatus(t("success.printOpened"));
    } catch (err) {
      console.error(err);
      setStatus(t("errors.generic", { message: err.message || err }));
    }
  };

  // -----------------------
  // Export JSON
  // -----------------------
  Handlers.exportJSON = async function (univerAPI, cfg, setStatus) {
    try {
      Helpers.showLoading(t("status.exportingJSON"));
      setStatus(t("status.exportingJSON"));
      const wb = univerAPI.getActiveWorkbook();
      if (!wb) throw new Error(t("errors.noWorkbook"));
      let snapshot = wb.save();
      if (typeof snapshot === "string")
        snapshot = Helpers.safeJsonParse(snapshot, snapshot);
      const name =
        (wb.getName && wb.getName()) || cfg.workbookName || "workbook";
      Helpers.downloadFile(
        `${name}.json`,
        JSON.stringify(snapshot, null, 2),
        "application/json",
      );
      setStatus(t("success.downloadedJSON"));
    } catch (err) {
      console.error(err);
      setStatus(t("errors.generic", { message: err.message || err }));
    } finally {
      Helpers.hideLoading();
    }
  };

  // -----------------------
  // Import Excel
  // -----------------------
  Handlers.importExcel = async function (
    univerAPI,
    cfg,
    templateClient,
    refreshTemplates,
    setStatus,
    getSelectedTagIds,
  ) {
    if (!templateClient) {
      setStatus(t("errors.apiNotConfigured"));
      return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".xlsx,.xls,.csv";

    input.addEventListener("change", async () => {
      const file = input.files && input.files[0];
      if (!file) return;

      const defaultName = file.name.replace(/\.[^.]+$/, "");
      const name = await Helpers.showPrompt(
        t("modals.importExcelName"),
        defaultName,
      );
      const tplName = name || defaultName || "Imported Template";

      try {
        Helpers.showLoading(t("status.readingExcel"));
        setStatus(t("status.readingExcel"));

        const arrayBuffer = await file.arrayBuffer();
        const workbookX = XLSX.read(arrayBuffer, { type: "array" });

        const current = univerAPI.getActiveWorkbook();
        const currentSnapshot = current ? current.save() : null;
        const currentId = current?.getId?.();

        if (currentId) univerAPI.disposeUnit(currentId);
        univerAPI.createWorkbook({ name: tplName });
        const tmpWb = univerAPI.getActiveWorkbook();

        for (let si = 0; si < workbookX.SheetNames.length; si++) {
          const sname = workbookX.SheetNames[si];
          const sheetX = workbookX.Sheets[sname];
          const data2d = XLSX.utils.sheet_to_json(sheetX, { header: 1 });

          const numRows = data2d.length || 1;
          const numCols = Math.max(
            1,
            ...data2d.map((r) => (Array.isArray(r) ? r.length : 1)),
          );
          const rect = data2d.map((r) => {
            const row = Array.isArray(r) ? r.slice() : [r];
            while (row.length < numCols) row.push(null);
            return row;
          });

          const ws =
            SheetUtils.ensureSheet(tmpWb, si, sname) || tmpWb.getActiveSheet();
          if (!ws) continue;

          try {
            if (typeof ws.setName === "function") {
              try {
                ws.setName(sname);
              } catch {}
            }

            // Ensure sheet capacity
            try {
              // startRow=1, numRows, etc.
              SheetUtils.ensureSheetCapacity(ws, 1, numRows, 1, numCols);
            } catch (e) {
              console.warn("Could not ensure sheet capacity", e);
            }

            const range = ws.getRange(0, 0, numRows, numCols);
            range.setValues(rect);
          } catch (e) {
            console.warn("Failed to populate sheet:", sname, e);
          }
        }

        const snapshot = tmpWb.save();

        const tmpId = tmpWb?.getId?.();
        if (tmpId) univerAPI.disposeUnit(tmpId);
        if (currentSnapshot) {
          univerAPI.createWorkbook(currentSnapshot);
        }

        Helpers.showLoading(t("status.creatingTemplate"));
        setStatus(t("status.creatingTemplate"));
        const created = await templateClient.create({
          name: tplName,
          category: cfg.defaultTemplateCategory || "default",
          content: snapshot,
          start_cell: "A1",
          tag_ids:
            (typeof getSelectedTagIds === "function"
              ? getSelectedTagIds()
              : []) || [],
        });

        await refreshTemplates();
        setStatus(t("success.templateCreated", { name: created.name }));
      } catch (err) {
        console.error(err);
        setStatus(t("errors.generic", { message: err.message || err }));
      } finally {
        Helpers.hideLoading();
      }
    });

    input.click();
  };

  global.UNIVER_HANDLERS = Handlers;

  // -----------------------
  // Insert Data With Dynamic Form
  // -----------------------
  Handlers.insertDataWithForm = async function (
    univerAPI,
    api,
    setStatus,
    globalContext = {},
    startCellOverride,
  ) {
    try {
      // Show dynamic form to collect input
      const formContext = await Helpers.showDynamicForm(
        `📊 ${api.name}`,
        api,
        globalContext,
      );
      if (formContext === null) {
        setStatus(t("errors.cancelled"));
        return;
      }

      Helpers.showLoading(t("status.callingAPI"));
      setStatus(t("status.callingAPI"));

      // Call API with resolved variables
      const data = await Handlers.callApiWithVars(api, formContext);

      Helpers.showLoading(t("status.writingData"));
      setStatus(t("status.writingData"));

      // Get workbook and target sheet
      const wb = univerAPI.getActiveWorkbook();
      if (!wb) throw new Error(t("errors.noWorkbook"));

      // Determine start cell
      let startCell = startCellOverride || "A1";
      if (api.excel && api.excel.startCell) {
        startCell = String(
          Helpers.replaceAllVars(api.excel.startCell, formContext),
        );
      }
      if (formContext.startCell) {
        startCell = String(formContext.startCell);
      }

      // Get target sheet
      let ws = wb.getActiveSheet();
      if (api.excel && api.excel.sheet) {
        const sheetName = String(
          Helpers.replaceAllVars(api.excel.sheet, formContext),
        );
        ws = SheetUtils.getOrCreateSheet(wb, sheetName) || ws;
      }

      if (!ws) throw new Error(t("errors.noSheet"));

      // Convert data to 2D array
      let data2d;
      if (api.excel && api.excel.table && api.excel.table.columns) {
        // Use excel column mapping
        const dataArray = Array.isArray(data) ? data : [data];
        data2d = Helpers.dataToExcel2D(
          dataArray,
          api.excel.table.columns,
          api.excel.table.includeHeaders !== false,
        );
      } else if (api.mapping) {
        // Use legacy mapping
        data2d = Helpers.normalizeTo2D(data, api.mapping);
      } else {
        // Auto-detect
        data2d = Helpers.normalizeTo2D(data);
      }

      // Parse start cell
      const pos = Helpers.parseA1(startCell.toUpperCase());
      const startRow = pos ? pos.row : 0;
      const startCol = pos ? pos.col : 0;

      // Ensure sheet capacity
      const numRows = data2d.length;
      const numCols = Math.max(1, ...data2d.map((r) => r.length));
      SheetUtils.ensureSheetCapacity(
        ws,
        startRow + 1,
        numRows,
        startCol + 1,
        numCols,
      );

      // Write data to sheet
      const range = ws.getRange(startRow, startCol, numRows, numCols);
      if (typeof range.setValues === "function") {
        range.setValues(data2d);
      }

      setStatus(
        t("success.dataInserted", { count: String(numRows), cell: startCell }),
      );
    } catch (err) {
      console.error(err);
      setStatus(t("errors.generic", { message: err.message || err }));
    } finally {
      Helpers.hideLoading();
    }
  };

  // -----------------------
  // Insert data from API with dynamic form input
  // -----------------------
  Handlers.insertDataWithForm = async function (
    univerAPI,
    api,
    setStatus,
    providedContext = {}, // Đã có context từ inline form hoặc global
    startCellOverride,
  ) {
    // console.log("🔍 insertDataWithForm called with API:", api.id, api);

    try {
      let formContext;

      // Kiểm tra xem có context được cung cấp từ inline form chưa
      const hasProvidedValues =
        providedContext && Object.keys(providedContext).length > 0;

      if (hasProvidedValues) {
        // Sử dụng context đã có từ inline form
        // console.log(
        //   "✅ Using provided context from inline form:",
        //   providedContext,
        // );
        formContext = providedContext;
      } else {
        // Fallback: hiển thị popup form nếu không có context
        // console.log("📝 Showing dynamic form for API:", api.name);
        formContext = await Helpers.showDynamicForm(
          `📊 ${api.name}`,
          api,
          providedContext,
        );

        if (formContext === null) {
          // console.log("❌ Form cancelled by user");
          setStatus(t("errors.cancelled"));
          return;
        }
      }

      // console.log("✅ Using form context:", formContext);

      Helpers.showLoading(t("status.callingAPI"));
      setStatus(t("status.callingAPI"));

      // Call API with resolved variables
      const data = await Handlers.callApiWithVars(api, formContext);
      // console.log("📊 API response data:", data);

      Helpers.showLoading(t("status.writingData"));
      setStatus(t("status.writingData"));

      // Get workbook and target sheet
      const wb = univerAPI.getActiveWorkbook();
      if (!wb) throw new Error(t("errors.noWorkbook"));

      // Determine start cell
      let startCell = startCellOverride || "A1";
      if (api.excel && api.excel.startCell) {
        // Replace vars in startCell if needed (e.g., "@startCell")
        startCell = String(
          Helpers.replaceAllVars(api.excel.startCell, formContext),
        );
      }
      if (formContext.startCell) {
        startCell = String(formContext.startCell);
      }
      // console.log("Using start cell:", startCell);

      // Get target sheet
      let ws = wb.getActiveSheet();
      if (api.excel && api.excel.sheet) {
        const sheetName = String(
          Helpers.replaceAllVars(api.excel.sheet, formContext),
        );
        // console.log("Target sheet:", sheetName);
        ws = SheetUtils.getOrCreateSheet(wb, sheetName) || ws;
      }

      if (!ws) throw new Error(t("errors.noSheet"));

      // Convert data to 2D array
      let data2d;
      if (api.excel && api.excel.table && api.excel.table.columns) {
        // Use excel column mapping
        // console.log("Using excel column mapping");
        const dataArray = Array.isArray(data) ? data : [data];
        data2d = Helpers.dataToExcel2D(
          dataArray,
          api.excel.table.columns,
          api.excel.table.includeHeaders !== false,
        );
      } else if (api.mapping) {
        // Use legacy mapping
        // console.log("Using legacy mapping");
        data2d = Helpers.normalizeTo2D(data, api.mapping);
      } else {
        // Auto-detect
        // console.log("Using auto-detect mapping");
        data2d = Helpers.normalizeTo2D(data);
      }

      // console.log(
      //   "Final data2d:",
      //   data2d.length,
      //   "rows x",
      //   Math.max(...data2d.map((r) => r.length)),
      //   "cols",
      // );

      // Parse start cell
      const pos = Helpers.parseA1(startCell.toUpperCase());
      const startRow = pos ? pos.row : 0;
      const startCol = pos ? pos.col : 0;

      // Ensure sheet capacity
      const numRows = data2d.length;
      const numCols = Math.max(1, ...data2d.map((r) => r.length));
      SheetUtils.ensureSheetCapacity(
        ws,
        startRow + 1,
        numRows,
        startCol + 1,
        numCols,
      );

      // Write data to sheet
      const range = ws.getRange(startRow, startCol, numRows, numCols);
      range.setValues(data2d);

      setStatus(
        t("success.dataInserted", { count: String(numRows), cell: startCell }),
      );
      // console.log("✅ Data inserted successfully");
    } catch (err) {
      console.error("❌ insertDataWithForm error:", err);
      setStatus(t("errors.generic", { message: err.message || err }));
    } finally {
      Helpers.hideLoading();
    }
  };

  // -----------------------
  // Call API with @var placeholders
  // -----------------------
  Handlers.callApiWithVars = async function (api, context) {
    // Replace vars in URL
    const url = String(Helpers.replaceAllVars(api.url, context));

    // If GET and api.fields provided, and url doesn't include placeholders for those fields,
    // append any non-empty values from context as query params (useful when api.url lacks @vars).
    let finalUrl = url;

    // Replace vars in headers
    const headers = Helpers.replaceAllVars(api.headers || {}, context);

    // Replace vars in body
    const body = api.body
      ? Helpers.replaceAllVars(api.body, context)
      : undefined;

    // Build fetch options
    const fetchOptions = {
      method: api.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    };

    // Add body for POST/PUT/PATCH
    if (body && ["POST", "PUT", "PATCH"].includes(fetchOptions.method || "")) {
      fetchOptions.body = Helpers.toJsonBody(body);
    }

    if ((fetchOptions.method || "GET").toUpperCase() === "GET" && api.fields) {
      try {
        const params = new URLSearchParams();
        for (const key of Object.keys(api.fields || {})) {
          const v = context && context[key];
          if (v !== undefined && v !== null && String(v) !== "") {
            params.append(key, String(v));
          }
        }
        if ([...params].length > 0) {
          finalUrl = url + (url.includes("?") ? "&" : "?") + params.toString();
        }
      } catch (e) {
        console.warn("Could not build query params for GET", e);
      }
    }

    // Make request
    // console.log(
    //   "🔁 Calling API URL:",
    //   finalUrl,
    //   "method:",
    //   fetchOptions.method,
    //   "headers:",
    //   fetchOptions.headers,
    // );
    const response = await Helpers.httpJson(finalUrl, fetchOptions);

    // Extract data from response using responseSource
    return Helpers.extractResponseData(response, api.responseSource);
  };

  if (typeof console !== "undefined" && console.log) {
    // console.log("✅ LOADED: univer-embed/handlers.js");
  }
})(window);
