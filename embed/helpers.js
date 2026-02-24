/* global XLSX */
(function (global) {
  const Helpers = {};

  // i18n shortcut - will be available after i18n.js loads
  function t(key, params) {
    if (global.UNIVER_I18N && global.UNIVER_I18N.t)
      return global.UNIVER_I18N.t(key, params);
    return key; // fallback to key
  }

  Helpers.el = function (tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") node.className = v;
      else if (k === "style") node.style.cssText = v;
      else if (k.startsWith("on") && typeof v === "function")
        node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    }
    for (const ch of children) {
      if (typeof ch === "string") node.appendChild(document.createTextNode(ch));
      else if (ch) node.appendChild(ch);
    }
    return node;
  };

  Helpers.debounce = function (fn, waitMs) {
    let t = null;
    return function (...args) {
      if (t) clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), waitMs || 0);
    };
  };

  // A1 notation helpers
  Helpers.colToA1 = function (col) {
    let n = col + 1;
    let s = "";
    while (n > 0) {
      const r = (n - 1) % 26;
      s = String.fromCharCode(65 + r) + s;
      n = Math.floor((n - 1) / 26);
    }
    return s;
  };

  Helpers.toA1 = function (row, col) {
    return Helpers.colToA1(col) + String(row + 1);
  };

  Helpers.parseA1 = function (a1) {
    if (!a1) return null;
    const m = /^([A-Z]+)(\d+)$/.exec(String(a1).toUpperCase());
    if (!m) return null;
    const letters = m[1];
    const row = parseInt(m[2], 10) - 1;
    let col = 0;
    for (let i = 0; i < letters.length; i++) {
      col = col * 26 + (letters.charCodeAt(i) - 64);
    }
    return { row: row, col: col - 1 };
  };

  // Data normalization
  Helpers.normalizeTo2D = function (data, mapping) {
    if (typeof mapping === "function") return mapping(data);
    if (data && typeof data === "object" && !Array.isArray(data)) {
      if (Array.isArray(data.data)) data = data.data;
    }
    if (Array.isArray(data) && data.length === 0) return [[]];
    if (Array.isArray(data) && Array.isArray(data[0])) return data;
    if (Array.isArray(data) && typeof data[0] === "object") {
      const cols =
        mapping && mapping.columns
          ? mapping.columns
          : Object.keys(data[0]).map((k) => ({ key: k, header: k }));
      const header = cols.map((c) => c.header ?? c.key);
      const rows = data.map((obj) => cols.map((c) => obj?.[c.key]));
      return [header, ...rows];
    }
    if (data && typeof data === "object") {
      const keys = Object.keys(data);
      return [["key", "value"], ...keys.map((k) => [k, data[k]])];
    }
    return [["value"], [data]];
  };

  Helpers.safeJsonParse = function (str, fallback) {
    try {
      return JSON.parse(str);
    } catch {
      return fallback;
    }
  };

  Helpers.toJsonBody = function (payload) {
    if (typeof payload === "string") {
      const parsed = Helpers.safeJsonParse(payload, null);
      if (parsed !== null) return JSON.stringify(parsed);
      return JSON.stringify(payload);
    }
    return JSON.stringify(payload);
  };

  Helpers.downloadFile = function (name, content, mime) {
    const blob = new Blob([content], {
      type: mime || "application/octet-stream",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  function showModal(content, onClose) {
    const overlay = Helpers.el(
      "div",
      {
        class: "modal-overlay",
        style:
          "position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); z-index: 99999; display: flex; align-items: center; justify-content: center;",
      },
      [content],
    );

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
        if (onClose) onClose(null);
      }
    });

    document.body.appendChild(overlay);
    return overlay;
  }

  Helpers.showPrompt = function (title, placeholder = "") {
    return new Promise((resolve) => {
      const input = Helpers.el("input", {
        type: "text",
        placeholder: placeholder,
        style:
          "width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;margin:8px 0;",
      });
      const box = Helpers.el(
        "div",
        {
          style:
            "background:#fff;border-radius:8px;padding:16px;min-width:320px;max-width:420px;box-shadow:0 4px 12px rgba(0,0,0,0.12);",
        },
        [
          Helpers.el("div", { style: "font-weight:600;margin-bottom:8px;" }, [
            title,
          ]),
          input,
          Helpers.el(
            "div",
            {
              style:
                "display:flex;justify-content:flex-end;gap:8px;margin-top:8px;",
            },
            [
              Helpers.el(
                "button",
                {
                  style:
                    "padding:8px 12px;border:1px solid #ddd;border-radius:4px;background:#fff;",
                  onclick: () => {
                    document.body.removeChild(overlay);
                    resolve(null);
                  },
                },
                [t("buttons.cancel")],
              ),
              Helpers.el(
                "button",
                {
                  style:
                    "padding:8px 12px;border-radius:4px;background:#1a73e8;color:#fff;",
                  onclick: () => {
                    const v = input.value.trim();
                    document.body.removeChild(overlay);
                    resolve(v || null);
                  },
                },
                [t("buttons.ok")],
              ),
            ],
          ),
        ],
      );

      let overlay = showModal(box, resolve);
      setTimeout(() => {
        input.focus();
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            const v = input.value.trim();
            document.body.removeChild(overlay);
            resolve(v || null);
          } else if (e.key === "Escape") {
            document.body.removeChild(overlay);
            resolve(null);
          }
        });
      }, 10);
    });
  };

  /**
   * Simple alert modal (OK)
   */
  Helpers.showAlert = function (title, message) {
    return new Promise((resolve) => {
      const box = Helpers.el(
        "div",
        {
          style:
            "background:#fff;border-radius:8px;padding:16px;min-width:320px;max-width:420px;box-shadow:0 4px 12px rgba(0,0,0,0.12);",
        },
        [
          Helpers.el("div", { style: "font-weight:600;margin-bottom:8px;" }, [
            title,
          ]),
          Helpers.el("div", { style: "margin-bottom:12px;color:#444;" }, [
            message,
          ]),
          Helpers.el(
            "div",
            { style: "display:flex;justify-content:flex-end;" },
            [
              Helpers.el(
                "button",
                {
                  style:
                    "padding:8px 14px;border:none;border-radius:4px;background:#1a73e8;color:#fff;cursor:pointer;",
                  onclick: () => {
                    if (overlay) document.body.removeChild(overlay);
                    resolve();
                  },
                },
                [t("buttons.ok")],
              ),
            ],
          ),
        ],
      );

      let overlay = showModal(box, () => resolve());
    });
  };

  // Minimal prompt with tags. If Select2 is available and tagClient provided, initialize it.
  Helpers.showPromptWithTags = function (
    title,
    namePlaceholder = "",
    tagsPlaceholder = "",
    tagClient = null,
    options = {},
  ) {
    // options.categories: array of {id, name, icon?} for category picker
    // options.defaultCategory: pre-selected category ID
    const categories = options.categories || [];
    const defaultCategory = options.defaultCategory || "";

    return new Promise((resolve) => {
      const nameInput = Helpers.el("input", {
        type: "text",
        placeholder: namePlaceholder,
        style:
          "width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;margin:8px 0;",
      });

      // Category select
      const categorySelect = Helpers.el("select", {
        style:
          "width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;margin:8px 0;",
      });
      categorySelect.appendChild(
        Helpers.el("option", { value: "" }, [
          global.UNIVER_I18N
            ? global.UNIVER_I18N.t("templates.selectCategory")
            : "-- Select category --",
        ]),
      );
      for (const cat of categories) {
        const opt = Helpers.el("option", { value: cat.id }, [
          (cat.icon ? cat.icon + " " : "") + cat.name,
        ]);
        if (cat.id === defaultCategory) opt.selected = true;
        categorySelect.appendChild(opt);
      }

      const tagsSelect = Helpers.el("select", {
        multiple: "multiple",
        style: "width:100%;",
      });
      const tagsInput = Helpers.el("input", {
        type: "text",
        placeholder: tagsPlaceholder,
        style:
          "width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;margin:8px 0;",
      });

      const useSelect2 = !!(
        tagClient &&
        window.jQuery &&
        window.jQuery.fn &&
        window.jQuery.fn.select2
      );
      const tagElement = useSelect2 ? tagsSelect : tagsInput;

      const box = Helpers.el(
        "div",
        {
          style:
            "background:#fff;border-radius:8px;padding:16px;min-width:360px;max-width:560px;box-shadow:0 4px 12px rgba(0,0,0,0.12);",
        },
        [
          Helpers.el("div", { style: "font-weight:600;margin-bottom:8px;" }, [
            title,
          ]),
          Helpers.el(
            "div",
            { style: "font-size:13px;color:#666;margin-bottom:6px;" },
            [t("modals.nameLabel")],
          ),
          nameInput,
          ...(categories.length > 0
            ? [
                Helpers.el(
                  "div",
                  { style: "font-size:13px;color:#666;margin:8px 0 6px;" },
                  [t("templates.category")],
                ),
                categorySelect,
              ]
            : []),
          Helpers.el(
            "div",
            { style: "font-size:13px;color:#666;margin:8px 0 6px;" },
            [t("modals.tagsLabel")],
          ),
          tagElement,
          Helpers.el(
            "div",
            {
              style:
                "display:flex;justify-content:flex-end;gap:8px;margin-top:10px;",
            },
            [
              Helpers.el(
                "button",
                {
                  style:
                    "padding:8px 12px;border:1px solid #ddd;border-radius:4px;background:#fff;",
                  onclick: () => {
                    document.body.removeChild(overlay);
                    resolve(null);
                  },
                },
                [t("buttons.cancel")],
              ),
              Helpers.el(
                "button",
                {
                  style:
                    "padding:8px 12px;border-radius:4px;background:#1a73e8;color:#fff;",
                  onclick: async () => {
                    const name = (nameInput.value || "").trim();
                    let tags = "";
                    if (useSelect2) {
                      try {
                        const $ = window.jQuery;
                        const data = $(tagsSelect).select2("data") || [];
                        tags = data
                          .map((d) => d.text)
                          .filter(Boolean)
                          .join(", ");
                      } catch (e) {
                        tags = "";
                      }
                    } else {
                      tags = (tagsInput.value || "").trim();
                    }
                    const category = categorySelect.value || "";
                    document.body.removeChild(overlay);
                    resolve({
                      name: name || null,
                      tags: tags || null,
                      category: category || null,
                    });
                  },
                },
                [t("buttons.ok")],
              ),
            ],
          ),
        ],
      );

      let overlay = showModal(box, resolve);

      setTimeout(() => {
        nameInput.focus();
        if (useSelect2) {
          try {
            const $ = window.jQuery;
            $(tagsSelect).select2({
              placeholder: tagsPlaceholder || t("tags.selectOrCreate"),
              tags: true,
              closeOnSelect: false,
              dropdownParent: $(overlay),
              ajax: {
                transport: async function (params, success, failure) {
                  try {
                    const q =
                      params.data && params.data.term ? params.data.term : "";
                    const items = await tagClient.search(q);
                    success({
                      results: (items || []).map((x) => ({
                        id: String(x.id),
                        text: x.name,
                      })),
                    });
                  } catch (err) {
                    failure(err);
                  }
                },
                delay: 200,
              },
              // allow creation and show a create-item hint when not found
              createTag: function (params) {
                const term = (params.term || "").trim();
                if (!term) return null;
                return {
                  id: "new:" + term.toLowerCase(),
                  text: term,
                  isNew: true,
                };
              },
              templateResult: function (data) {
                if (!data) return null;
                if (data.loading) return data.text;
                if (data.isNew) {
                  const t = String(data.text || "").replace(
                    /[&<>"']/g,
                    function (s) {
                      return {
                        "&": "&amp;",
                        "<": "&lt;",
                        ">": "&gt;",
                        '"': "&quot;",
                        "'": "&#39;",
                      }[s];
                    },
                  );
                  const escapedText = t;
                  return global.UNIVER_I18N
                    ? global.UNIVER_I18N.t("tags.createTag", {
                        name: escapedText,
                      })
                    : "Create tag: <b>" + escapedText + "</b>";
                }
                return data.text;
              },
              escapeMarkup: function (m) {
                return m;
              },
            });
            $(tagsSelect).on("select2:select", async function (e) {
              const data = e.params && e.params.data;
              if (!data || !data.isNew) return;
              try {
                const created = await tagClient.create(data.text);
                const newOption = new Option(
                  created.name,
                  String(created.id),
                  true,
                  true,
                );
                $(tagsSelect)
                  .find(`option[value="${String(data.id)}"]`)
                  .remove();
                $(tagsSelect).append(newOption).trigger("change");
              } catch (err) {
                console.error(err);
              }
            });
          } catch (e) {
            /* ignore */
          }
        } else {
          nameInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
              const name = (nameInput.value || "").trim();
              const tags = (tagsInput.value || "").trim();
              const category = categorySelect.value || "";
              document.body.removeChild(overlay);
              resolve({
                name: name || null,
                tags: tags || null,
                category: category || null,
              });
            } else if (e.key === "Escape") {
              document.body.removeChild(overlay);
              resolve(null);
            }
          });
        }
      }, 20);
    });
  };

  Helpers.showConfirm = function (title, message) {
    return new Promise((resolve) => {
      const box = Helpers.el(
        "div",
        {
          style:
            "background:#fff;border-radius:8px;padding:16px;min-width:320px;max-width:420px;box-shadow:0 4px 12px rgba(0,0,0,0.12);",
        },
        [
          Helpers.el("div", { style: "font-weight:600;margin-bottom:8px;" }, [
            title,
          ]),
          Helpers.el("div", { style: "margin-bottom:12px;color:#444;" }, [
            message,
          ]),
          Helpers.el(
            "div",
            { style: "display:flex;justify-content:flex-end;gap:8px;" },
            [
              Helpers.el(
                "button",
                {
                  style:
                    "padding:8px 12px;border:1px solid #ddd;border-radius:4px;background:#fff;",
                  onclick: () => {
                    document.body.removeChild(overlay);
                    resolve(false);
                  },
                },
                [t("buttons.cancel")],
              ),
              Helpers.el(
                "button",
                {
                  style:
                    "padding:8px 12px;border-radius:4px;background:#1a73e8;color:#fff;",
                  onclick: () => {
                    document.body.removeChild(overlay);
                    resolve(true);
                  },
                },
                [t("buttons.confirm")],
              ),
            ],
          ),
        ],
      );
      let overlay = showModal(box, () => resolve(false));
    });
  };

  Helpers.showLoading = function (msg) {
    if (!msg) msg = t("status.loading");
    if (Helpers._loading) return;
    Helpers._loading = Helpers.el(
      "div",
      {
        style:
          "position:fixed;left:8px;bottom:8px;background:rgba(0,0,0,0.7);color:#fff;padding:8px;border-radius:4px;z-index:100000;",
      },
      [msg],
    );
    document.body.appendChild(Helpers._loading);
  };

  Helpers.hideLoading = function () {
    if (Helpers._loading) {
      Helpers._loading.remove();
      Helpers._loading = null;
    }
  };

  Helpers.httpJson = async function (url, options = {}) {
    const { headers: optHeaders, ...rest } = options;
    const resp = await fetch(url, {
      ...rest,
      headers: { "Content-Type": "application/json", ...(optHeaders || {}) },
    });
    if (!resp.ok) {
      const t = await resp.text().catch(() => "");
      throw new Error(`HTTP ${resp.status} ${resp.statusText} - ${t}`);
    }
    const ct = resp.headers.get("content-type") || "";
    if (ct.includes("application/json")) return resp.json();
    return resp.text();
  };

  // =====================================================
  // @var placeholder utilities
  // =====================================================

  /**
   * Extract all @var placeholders from a string
   * @example extractVars("Hello @name, id=@id") => ["name", "id"]
   */
  Helpers.extractVars = function (str) {
    if (typeof str !== "string") return [];
    const matches = str.match(/@(\w+)/g);
    if (!matches) return [];
    return [...new Set(matches.map((m) => m.slice(1)))];
  };

  /**
   * Extract all @var placeholders from any value (string, object, array)
   */
  Helpers.extractAllVars = function (value) {
    const vars = new Set();

    function scan(val) {
      if (typeof val === "string") {
        Helpers.extractVars(val).forEach((v) => vars.add(v));
      } else if (Array.isArray(val)) {
        val.forEach(scan);
      } else if (val && typeof val === "object") {
        Object.values(val).forEach(scan);
      }
    }

    scan(value);
    return [...vars];
  };

  /**
   * Replace @var placeholders in a string with values from context
   */
  Helpers.replaceVars = function (str, context) {
    if (typeof str !== "string") return str;
    return str.replace(/@(\w+)/g, (_, key) => {
      const val = context[key];
      if (val === undefined || val === null) return "";
      return String(val);
    });
  };

  /**
   * Replace @var placeholders in any value (string, object, array)
   */
  Helpers.replaceAllVars = function (value, context) {
    if (typeof value === "string") {
      return Helpers.replaceVars(value, context);
    }
    if (Array.isArray(value)) {
      return value.map((v) => Helpers.replaceAllVars(v, context));
    }
    if (value && typeof value === "object") {
      const result = {};
      for (const [k, v] of Object.entries(value)) {
        result[k] = Helpers.replaceAllVars(v, context);
      }
      return result;
    }
    return value;
  };

  /**
   * Get nested value from object using dot notation path
   */
  Helpers.getNestedValue = function (obj, path) {
    if (!path || !obj) return undefined;
    const parts = path.split(".");
    let current = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      if (typeof current !== "object") return undefined;
      current = current[part];
    }
    return current;
  };

  /**
   * Build variable context from API config fields
   */
  Helpers.buildContextFromFields = function (
    fields,
    formValues,
    globalContext = {},
  ) {
    const context = {};

    for (const [key, fieldConfig] of Object.entries(fields || {})) {
      if (formValues[key] !== undefined && formValues[key] !== "") {
        context[key] = formValues[key];
      } else if (fieldConfig.source) {
        const sourceValue = Helpers.getNestedValue(
          globalContext,
          fieldConfig.source,
        );
        if (sourceValue !== undefined) {
          context[key] = sourceValue;
        } else if (fieldConfig.default !== undefined) {
          context[key] = fieldConfig.default;
        }
      } else if (fieldConfig.default !== undefined) {
        context[key] = fieldConfig.default;
      }
    }

    return context;
  };

  /**
   * Extract data from API response using responseSource path
   */
  Helpers.extractResponseData = function (response, responseSource) {
    if (!responseSource) {
      // Default: try common paths
      if (response && typeof response === "object") {
        if (Array.isArray(response.data)) return response.data;
        if (Array.isArray(response.rows)) return response.rows;
        if (Array.isArray(response.items)) return response.items;
        if (Array.isArray(response.result)) return response.result;
        if (Array.isArray(response.records)) return response.records;
      }
      return response;
    }
    return Helpers.getNestedValue(response, responseSource) ?? response;
  };

  /**
   * Convert data array to 2D array using Excel column mappings
   */
  Helpers.dataToExcel2D = function (data, columns, includeHeaders = true) {
    const result = [];

    // Add headers row
    if (includeHeaders) {
      result.push(columns.map((col) => col.header));
    }

    // Add data rows
    for (const item of data) {
      const row = columns.map((col) => {
        const value = Helpers.getNestedValue(item, col.key);
        if (col.format && typeof col.format === "function") {
          return col.format(value);
        }
        return value;
      });
      result.push(row);
    }

    return result;
  };

  /**
   * Get all visible fields (show !== false) for form generation
   */
  Helpers.getVisibleFields = function (api) {
    // console.log("🔍 getVisibleFields called with API:", api.id);
    const result = [];

    // Extract vars from URL, headers, body
    const allVars = new Set();
    const urlVars = Helpers.extractAllVars(api.url);
    const headerVars = Helpers.extractAllVars(api.headers);
    const bodyVars = Helpers.extractAllVars(api.body);

    // console.log("   URL vars:", urlVars);
    // console.log("   Header vars:", headerVars);
    // console.log("   Body vars:", bodyVars);

    urlVars.forEach((v) => allVars.add(v));
    headerVars.forEach((v) => allVars.add(v));
    bodyVars.forEach((v) => allVars.add(v));

    if (api.excel) {
      const excelStartVars = Helpers.extractAllVars(api.excel.startCell);
      const excelSheetVars = Helpers.extractAllVars(api.excel.sheet);
      // console.log("   Excel startCell vars:", excelStartVars);
      // console.log("   Excel sheet vars:", excelSheetVars);
      excelStartVars.forEach((v) => allVars.add(v));
      excelSheetVars.forEach((v) => allVars.add(v));
    }

    // Add UI extra fields vars
    if (api.ui && api.ui.extraFields) {
      // console.log("   UI extra fields:", Object.keys(api.ui.extraFields));
      Object.keys(api.ui.extraFields).forEach((k) => allVars.add(k));
    }

    // console.log("   All detected vars:", [...allVars]);

    // Build field list
    for (const varName of allVars) {
      let fieldConfig;

      // Check in api.fields first
      if (api.fields && api.fields[varName]) {
        fieldConfig = api.fields[varName];
        // console.log(`   Field ${varName}: from api.fields`);
      }
      // Check in ui.extraFields
      else if (api.ui && api.ui.extraFields && api.ui.extraFields[varName]) {
        fieldConfig = api.ui.extraFields[varName];
        // console.log(`   Field ${varName}: from ui.extraFields`);
      }
      // Auto-generate minimal config
      else {
        fieldConfig = { label: varName, type: "text" };
        // console.log(`   Field ${varName}: auto-generated`);
      }

      // Only include if show !== false
      if (fieldConfig.show !== false) {
        // console.log(`   ✅ Including field: ${varName}`);
        result.push({ key: varName, config: fieldConfig });
      } else {
        // console.log(`   ❌ Hiding field: ${varName}`);
      }
    }

    // console.log("   Final visible fields:", result.length);
    return result;
  };

  /**
   * Fetch options for a field configuration when options.source === 'api'
   * Returns array of { value, label }
   */
  Helpers.fetchOptionsForField = async function (fieldConfig, context = {}) {
    try {
      if (!fieldConfig || !fieldConfig.options) return [];
      const opts = fieldConfig.options;
      if (opts.source !== "api" || !opts.url) return [];

      // Determine keys
      const valueKey = opts.valueKey || opts.value_key || "id";
      const labelKey =
        opts.labelKey || opts.label_key || opts.labelKey || "name";

      // Fetch remote list (replace any vars if present)
      // Support @var placeholders in options.url
      const urlRaw = String(opts.url || "").trim();
      const url = String(Helpers.replaceAllVars(urlRaw, context) || "").trim();
      if (!url) return [];

      const resp = await fetch(url, { method: "GET" });
      if (!resp.ok) return [];
      const data = await resp.json();

      // Support common response shapes
      let items = data;
      if (data && typeof data === "object") {
        if (Array.isArray(data.data)) items = data.data;
        else if (Array.isArray(data.items)) items = data.items;
        else if (Array.isArray(data.rows)) items = data.rows;
      }

      if (!Array.isArray(items)) return [];

      return items.map((it) => ({
        value:
          Helpers.getNestedValue(it, valueKey) ??
          Helpers.getNestedValue(it, "id") ??
          "",
        label:
          Helpers.getNestedValue(it, labelKey) ??
          Helpers.getNestedValue(it, "name") ??
          String(Helpers.getNestedValue(it, valueKey) ?? ""),
      }));
    } catch (e) {
      console.warn("Could not fetch options for field", e);
      return [];
    }
  };

  /**
   * Show dynamic form dialog based on API fields configuration
   */
  Helpers.showDynamicForm = function (title, api, globalContext = {}) {
    // console.log("📝 showDynamicForm called with:", title, api, globalContext);

    return new Promise((resolve) => {
      const visibleFields = Helpers.getVisibleFields(api);
      // console.log("👁️ Visible fields:", visibleFields);

      // If no visible fields, return empty context
      if (visibleFields.length === 0) {
        // console.log("⚠️ No visible fields found, returning empty context");
        resolve({});
        return;
      }

      // console.log("🎯 Creating form with", visibleFields.length, "fields");

      const inputElements = {};
      let overlay = null;

      // Build form fields
      const fieldElements = [];
      for (const { key, config } of visibleFields) {
        const label = Helpers.el(
          "label",
          {
            style:
              "display: block; font-size: 13px; color: #5f6368; margin-bottom: 4px;",
          },
          [config.label || key, config.required ? " *" : ""],
        );

        let input;
        const defaultValue =
          config.default !== undefined ? String(config.default) : "";

        switch (config.type) {
          case "textarea":
            input = Helpers.el("textarea", {
              placeholder: config.placeholder || "",
              style: `width: 100%; padding: 8px 10px; border: 1px solid #dadce0; border-radius: 4px;
                background: #fff; color: #3c4043; font-size: 13px; min-height: 60px; resize: vertical;`,
            });
            input.value = defaultValue;
            break;

          case "select":
            input = Helpers.el("select", {
              style: `width: 100%; padding: 8px 10px; border: 1px solid #dadce0; border-radius: 4px;
                background: #fff; color: #3c4043; font-size: 13px;`,
            });
            // Add options (static or remote)
            if (config.options && config.options.items) {
              for (const opt of config.options.items) {
                const option = Helpers.el(
                  "option",
                  { value: String(opt.value) },
                  [opt.label],
                );
                input.appendChild(option);
              }
            } else if (
              config.options &&
              config.options.source === "api" &&
              config.options.url
            ) {
              // Fetch remote options asynchronously
              (async () => {
                const opts = await Helpers.fetchOptionsForField(
                  config,
                  globalContext || {},
                );
                for (const o of opts) {
                  const option = Helpers.el(
                    "option",
                    { value: String(o.value) },
                    [String(o.label)],
                  );
                  input.appendChild(option);
                }
                // set default if provided
                try {
                  input.value = defaultValue;
                } catch {}
              })();
            }
            input.value = defaultValue;
            break;

          case "number":
            input = Helpers.el("input", {
              type: "number",
              placeholder: config.placeholder || "",
              style: `width: 100%; padding: 8px 10px; border: 1px solid #dadce0; border-radius: 4px;
                background: #fff; color: #3c4043; font-size: 13px;`,
              ...(config.min !== undefined ? { min: String(config.min) } : {}),
              ...(config.max !== undefined ? { max: String(config.max) } : {}),
            });
            input.value = defaultValue;
            break;

          case "checkbox":
            input = Helpers.el("input", {
              type: "checkbox",
              style: "margin: 4px 0;",
            });
            input.checked = defaultValue === "true" || defaultValue === "1";
            break;

          case "date":
            input = Helpers.el("input", {
              type: "date",
              placeholder: config.placeholder || "",
              style: `width: 100%; padding: 8px 10px; border: 1px solid #dadce0; border-radius: 4px;
                background: #fff; color: #3c4043; font-size: 13px;`,
            });
            input.value = defaultValue;
            break;

          default: // text
            input = Helpers.el("input", {
              type: "text",
              placeholder: config.placeholder || "",
              style: `width: 100%; padding: 8px 10px; border: 1px solid #dadce0; border-radius: 4px;
                background: #fff; color: #3c4043; font-size: 13px;`,
            });
            input.value = defaultValue;
        }

        inputElements[key] = input;

        const fieldWrapper = Helpers.el(
          "div",
          { style: "margin-bottom: 12px;" },
          [label, input],
        );
        fieldElements.push(fieldWrapper);
      }

      const box = Helpers.el(
        "div",
        {
          style: `background: #ffffff; border-radius: 8px; padding: 20px;
            min-width: 360px; max-width: 500px; max-height: 80vh; overflow-y: auto;
            box-shadow: 0 4px 24px rgba(0,0,0,0.2); color: #3c4043;`,
        },
        [
          Helpers.el(
            "div",
            {
              style:
                "font-size: 16px; font-weight: 600; margin-bottom: 16px; color: #202124;",
            },
            [title],
          ),
          ...fieldElements,
          Helpers.el(
            "div",
            {
              style:
                "display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px;",
            },
            [
              Helpers.el(
                "button",
                {
                  style: `padding: 8px 16px; border: 1px solid #dadce0; border-radius: 4px;
                    background: #fff; color: #5f6368; cursor: pointer; font-size: 13px;`,
                  onclick: () => {
                    if (overlay) document.body.removeChild(overlay);
                    resolve(null);
                  },
                },
                [t("buttons.cancel")],
              ),
              Helpers.el(
                "button",
                {
                  style: `padding: 8px 16px; border: none; border-radius: 4px;
                    background: #1a73e8; color: #fff; cursor: pointer; font-size: 13px; font-weight: 500;`,
                  onclick: () => {
                    // Validate required fields
                    const missing = [];
                    for (const { key, config } of visibleFields) {
                      if (config.required) {
                        const inputEl = inputElements[key];
                        let val;
                        if (!inputEl) val = undefined;
                        else if (config.type === "checkbox")
                          val = inputEl.checked ? "1" : "";
                        else val = (inputEl.value || "").toString().trim();

                        if (val === undefined || val === "") {
                          missing.push(config.label || key);
                        }
                      }
                    }

                    if (missing.length > 0) {
                      Helpers.showAlert(
                        t("modals.missingFieldsTitle"),
                        t("modals.missingFieldsMessage", {
                          fields: missing.join(", "),
                        }),
                      );
                      return;
                    }

                    // Collect form values
                    const formValues = {};
                    for (const { key, config } of visibleFields) {
                      const inputEl = inputElements[key];
                      if (config.type === "checkbox") {
                        formValues[key] = inputEl.checked;
                      } else {
                        formValues[key] = inputEl.value;
                      }
                    }

                    // Build full context including hidden fields
                    const allFields = {
                      ...(api.fields || {}),
                      ...((api.ui && api.ui.extraFields) || {}),
                    };
                    const fullContext = Helpers.buildContextFromFields(
                      allFields,
                      formValues,
                      globalContext,
                    );

                    if (overlay) document.body.removeChild(overlay);
                    resolve(fullContext);
                  },
                },
                [t("buttons.execute")],
              ),
            ],
          ),
        ],
      );

      overlay = showModal(box, () => resolve(null));

      // Focus first input
      setTimeout(() => {
        const firstKey = visibleFields[0] && visibleFields[0].key;
        if (firstKey && inputElements[firstKey]) {
          inputElements[firstKey].focus();
        }
      }, 50);
    });
  };

  global.UNIVER_HELPERS = Helpers;
})(window);
