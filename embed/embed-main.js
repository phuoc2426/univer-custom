/* global UniverPresets, UniverCore, UniverPresetSheetsCore, UniverPresetSheetsCoreEnUS */
// =====================================================
// MAIN EMBED - Orchestrates all modules
// =====================================================
(function (global) {
  let Helpers = global.UNIVER_HELPERS;
  let TemplateClient = global.UNIVER_TEMPLATE_CLIENT;
  let TagClient = global.UNIVER_TAG_CLIENT;
  let SheetUtils = global.UNIVER_SHEET_UTILS;
  let Selection = global.UNIVER_SELECTION;
  let Handlers = global.UNIVER_HANDLERS;
  let LocalStorage = global.UNIVER_LOCAL_STORAGE;
  let I18n = global.UNIVER_I18N;

  // i18n shortcut
  function t(key, params) {
    return I18n ? I18n.t(key, params) : key;
  }

  const EmbedMain = {};

  EmbedMain.mount = function () {
    // Resolve runtime dependencies in case scripts loaded in different order
    Helpers = global.UNIVER_HELPERS;
    TemplateClient = global.UNIVER_TEMPLATE_CLIENT;
    TagClient = global.UNIVER_TAG_CLIENT;
    SheetUtils = global.UNIVER_SHEET_UTILS;
    Selection = global.UNIVER_SELECTION;
    Handlers = global.UNIVER_HANDLERS;
    LocalStorage = global.UNIVER_LOCAL_STORAGE;
    I18n = global.UNIVER_I18N;

    const cfg = global.USER_UNIVER_CONFIG || {};

    if (!Helpers)
      throw new Error(
        "UNIVER_HELPERS is not loaded. Ensure embed/helpers.js is included before embed-main.js",
      );
    const sheetEl = document.getElementById("sheet");
    const sideEl = document.getElementById("sidebar");
    if (!sheetEl || !sideEl) throw new Error("Container not found");

    // Set up i18n locale from config
    const uiLocale = cfg.uiLocale || "vi-VN";
    if (I18n) I18n.setLocale(uiLocale);

    // Univer locale key (e.g. "vi-VN" → "VI_VN")
    cfg.locale =
      cfg.locale || (I18n ? I18n.toUniverLocaleKey(uiLocale) : "EN_US");
    cfg.dataApis = cfg.dataApis || [];
    cfg.templateApi = cfg.templateApi || null;
    cfg.templateMode = cfg.templateMode || "auto"; // "api" | "local" | "auto"
    cfg.defaultTemplateCategory = cfg.defaultTemplateCategory || "default";

    // Client factory: API mode vs Local file mode
    let templateClient = null;
    let tagClient = null;
    let localClient = null; // reference for manage tab (categories/tags CRUD)
    let dataServerUrl = "";
    const useApi =
      cfg.templateMode === "api" ||
      (cfg.templateMode === "auto" && cfg.templateApi?.baseUrl);

    if (useApi && cfg.templateApi?.baseUrl) {
      // API mode
      templateClient = TemplateClient
        ? TemplateClient.create(
            cfg.templateApi.baseUrl,
            cfg.templateApi.headers || {},
          )
        : null;
      tagClient =
        TagClient?.create?.(
          cfg.templateApi.baseUrl,
          cfg.templateApi.headers || {},
        ) || null;
    } else if (LocalStorage) {
      // Local file mode — build server URL from config
      // Priority: window globals (index.html) > user-config.js
      dataServerUrl =
        global.UNIVER_DATA_SERVER_URL ||
        cfg.dataServerUrl ||
        (global.UNIVER_DATA_SERVER_PORT
          ? "http://127.0.0.1:" + global.UNIVER_DATA_SERVER_PORT
          : "") ||
        (cfg.dataServerPort ? "http://127.0.0.1:" + cfg.dataServerPort : "");
      localClient = LocalStorage.create(
        cfg.localTemplatePath || "data/templates_store",
        cfg.templateIndexPath || "data/templates_index.json",
        {
          categoriesPath: cfg.categoriesPath || "data/categories.json",
          tagsPath: cfg.tagsPath || "data/tags.json",
          serverUrl: dataServerUrl,
        },
      );
      templateClient = localClient;
      // Wrap localClient as tagClient interface (search/create)
      tagClient = {
        search: (q) => localClient.searchTags(q),
        create: (name) => localClient.createTag(name),
      };
    }

    // Boot Univer
    const { createUniver } = UniverPresets;
    const { LocaleType, mergeLocales } = UniverCore;
    const { UniverSheetsCorePreset } = UniverPresetSheetsCore;

    const localeEnum = LocaleType[cfg.locale] || LocaleType.EN_US;

    const { univerAPI, univer } = createUniver({
      locale: localeEnum,
      locales: {
        [LocaleType.EN_US]: mergeLocales(UniverPresetSheetsCoreEnUS),
      },
      presets: [UniverSheetsCorePreset({ container: sheetEl })],
    });

    univerAPI.createWorkbook({
      name: cfg.workbookName || "Workbook",
    });

    // State
    let activeTemplateId = null;
    let activeTemplateName = null;

    const statusEl = Helpers.el("div", { class: "status" }, [
      t("status.ready"),
    ]);

    function setStatus(msg) {
      statusEl.textContent = msg;
    }

    function getActive() {
      const wb = univerAPI.getActiveWorkbook();
      const ws = wb.getActiveSheet();
      return { wb, ws };
    }

    function getCurrentCellA1() {
      // Lấy vị trí hiện tại của cell
      return Selection.getCurrentSelectionA1(univerAPI) || "A1";
    }

    // -----------------------
    // Build UI
    // -----------------------
    sideEl.innerHTML = "";

    const showLauncherSection = !useApi && Boolean(LocalStorage);
    const fallbackServerUrl = dataServerUrl || "http://127.0.0.1:8080";
    const normalizedServerUrl = showLauncherSection
      ? fallbackServerUrl.replace(/\/$/, "")
      : "";
    const healthEndpoint =
      showLauncherSection && normalizedServerUrl
        ? normalizedServerUrl + "/health"
        : "";

    let launcherStatusEl = null;
    let launcherHintEl = null;
    let launcherButtonEl = null;

    async function checkServerHealth() {
      if (!launcherStatusEl) return;
      if (!healthEndpoint) {
        launcherStatusEl.textContent = t("launcher.noUrl");
        launcherStatusEl.classList.add("status-error");
        return;
      }

      launcherStatusEl.classList.remove("status-ok", "status-error");
      launcherStatusEl.textContent = t("launcher.checking");
      if (launcherButtonEl) launcherButtonEl.disabled = true;

      try {
        const resp = await fetch(healthEndpoint + "?t=" + Date.now(), {
          method: "GET",
          cache: "no-store",
        });
        if (!resp.ok) {
          throw new Error("HTTP " + resp.status);
        }
        const payload = await resp.json().catch(() => ({}));
        launcherStatusEl.textContent = payload?.message || t("launcher.ok");
        launcherStatusEl.classList.add("status-ok");
        if (launcherHintEl) {
          launcherHintEl.textContent = t("launcher.hintSuccess");
        }
      } catch (err) {
        console.warn("Server health check failed", err);
        launcherStatusEl.textContent = t("launcher.error");
        launcherStatusEl.classList.add("status-error");
        if (launcherHintEl) {
          launcherHintEl.textContent = t("launcher.hintRunLauncher");
        }
      } finally {
        if (launcherButtonEl) launcherButtonEl.disabled = false;
      }
    }

    // ─────────────────────────────────────────────────────────
    // Server Status Dialog - shown on page load if not API mode
    // ─────────────────────────────────────────────────────────
    let serverDialogOverlay = null;
    let serverIsRunning = false;

    function createServerDialog() {
      const overlay = Helpers.el("div", { class: "server-dialog-overlay" });
      const dialog = Helpers.el("div", { class: "server-dialog" });

      // Header
      const header = Helpers.el("div", { class: "server-dialog-header" });
      const icon = Helpers.el("div", { class: "server-dialog-icon checking" });
      icon.innerHTML = '<div class="server-dialog-spinner"></div>';
      const titleWrap = Helpers.el("div", {});
      const title = Helpers.el("h3", { class: "server-dialog-title" }, [
        t("serverDialog.titleChecking"),
      ]);
      const subtitle = Helpers.el("div", { class: "server-dialog-subtitle" }, [
        t("serverDialog.subtitleChecking"),
      ]);
      titleWrap.appendChild(title);
      titleWrap.appendChild(subtitle);
      header.appendChild(icon);
      header.appendChild(titleWrap);

      // Body
      const body = Helpers.el("div", { class: "server-dialog-body" });
      const message = Helpers.el("div", { class: "server-dialog-message" }, [
        t("serverDialog.messageChecking"),
      ]);
      body.appendChild(message);

      // Command (hidden initially, shown on error)
      const commandBox = Helpers.el("div", {
        class: "server-dialog-command",
        style: "display: none;",
      });
      const codeEl = Helpers.el("code", {}, [t("serverDialog.command")]);
      const copyBtn = Helpers.el("button", { class: "copy-btn" }, [
        t("serverDialog.copyCommand"),
      ]);
      copyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(t("serverDialog.command")).then(() => {
          copyBtn.textContent = t("serverDialog.copied");
          setTimeout(() => {
            copyBtn.textContent = t("serverDialog.copyCommand");
          }, 2000);
        });
      });
      commandBox.appendChild(codeEl);
      commandBox.appendChild(copyBtn);
      body.appendChild(commandBox);

      const hint = Helpers.el("div", {
        class: "server-dialog-hint",
        style: "display: none;",
      });
      hint.textContent = t("serverDialog.commandHint");
      body.appendChild(hint);

      // Footer
      const footer = Helpers.el("div", { class: "server-dialog-footer" });
      const checkAgainBtn = Helpers.el(
        "button",
        { class: "btn-primary", style: "display: none;" },
        [t("serverDialog.btnCheckAgain")],
      );
      const continueBtn = Helpers.el(
        "button",
        { class: "btn-secondary", style: "display: none;" },
        [t("serverDialog.btnContinue")],
      );
      const closeBtn = Helpers.el(
        "button",
        { class: "btn-primary", style: "display: none;" },
        [t("serverDialog.btnClose")],
      );

      footer.appendChild(continueBtn);
      footer.appendChild(checkAgainBtn);
      footer.appendChild(closeBtn);

      dialog.appendChild(header);
      dialog.appendChild(body);
      dialog.appendChild(footer);
      overlay.appendChild(dialog);

      // Store references for updates
      dialog._refs = {
        icon,
        title,
        subtitle,
        message,
        commandBox,
        hint,
        checkAgainBtn,
        continueBtn,
        closeBtn,
      };

      return overlay;
    }

    function updateDialogState(dialogEl, state) {
      const refs = dialogEl.querySelector(".server-dialog")._refs;
      const {
        icon,
        title,
        subtitle,
        message,
        commandBox,
        hint,
        checkAgainBtn,
        continueBtn,
        closeBtn,
      } = refs;

      // Reset icon
      icon.classList.remove("checking", "success", "error");

      if (state === "checking") {
        icon.classList.add("checking");
        icon.innerHTML = '<div class="server-dialog-spinner"></div>';
        title.textContent = t("serverDialog.titleChecking");
        subtitle.textContent = t("serverDialog.subtitleChecking");
        message.textContent = t("serverDialog.messageChecking");
        commandBox.style.display = "none";
        hint.style.display = "none";
        checkAgainBtn.style.display = "none";
        continueBtn.style.display = "none";
        closeBtn.style.display = "none";
        checkAgainBtn.disabled = true;
      } else if (state === "success") {
        icon.classList.add("success");
        icon.innerHTML = "✅";
        title.textContent = t("serverDialog.titleSuccess");
        subtitle.textContent = t("serverDialog.subtitleSuccess");
        message.textContent = t("serverDialog.messageSuccess");
        commandBox.style.display = "none";
        hint.style.display = "none";
        checkAgainBtn.style.display = "none";
        continueBtn.style.display = "none";
        closeBtn.style.display = "inline-block";
        serverIsRunning = true;
      } else if (state === "error") {
        icon.classList.add("error");
        icon.innerHTML = "❌";
        title.textContent = t("serverDialog.titleError");
        subtitle.textContent = t("serverDialog.subtitleError");
        message.textContent = t("serverDialog.messageError");
        commandBox.style.display = "flex";
        hint.style.display = "block";
        checkAgainBtn.style.display = "inline-block";
        continueBtn.style.display = "inline-block";
        closeBtn.style.display = "none";
        checkAgainBtn.disabled = false;
        serverIsRunning = false;
      }
    }

    async function checkServerForDialog(dialogEl) {
      updateDialogState(dialogEl, "checking");

      try {
        const resp = await fetch(healthEndpoint + "?t=" + Date.now(), {
          method: "GET",
          cache: "no-store",
        });
        if (!resp.ok) throw new Error("HTTP " + resp.status);
        await resp.json().catch(() => ({}));
        updateDialogState(dialogEl, "success");
        return true;
      } catch (err) {
        console.warn("Server health check for dialog failed", err);
        updateDialogState(dialogEl, "error");
        return false;
      }
    }

    function showServerStatusDialog() {
      if (!healthEndpoint) return; // No endpoint configured

      serverDialogOverlay = createServerDialog();
      document.body.appendChild(serverDialogOverlay);

      const dialogEl = serverDialogOverlay;
      const refs = dialogEl.querySelector(".server-dialog")._refs;

      // Bind button actions
      refs.checkAgainBtn.addEventListener("click", () => {
        checkServerForDialog(dialogEl);
      });

      refs.continueBtn.addEventListener("click", () => {
        serverDialogOverlay.remove();
        serverDialogOverlay = null;
        // Show warning in status
        if (launcherStatusEl) {
          launcherStatusEl.textContent = t("serverDialog.warningNoServer");
          launcherStatusEl.classList.add("status-error");
        }
      });

      refs.closeBtn.addEventListener("click", () => {
        serverDialogOverlay.remove();
        serverDialogOverlay = null;
        // Update launcher status to show server is OK
        if (launcherStatusEl) {
          launcherStatusEl.textContent = t("launcher.ok");
          launcherStatusEl.classList.remove("status-error");
          launcherStatusEl.classList.add("status-ok");
        }
        if (launcherHintEl) {
          launcherHintEl.textContent = t("launcher.hintSuccess");
        }
      });

      // Check server automatically
      checkServerForDialog(dialogEl);
    }

    if (showLauncherSection) {
      launcherButtonEl = Helpers.el(
        "button",
        { class: "btn-primary", type: "button" },
        [t("launcher.button")],
      );
      if (healthEndpoint) {
        launcherButtonEl.addEventListener("click", () => {
          checkServerHealth();
        });
      } else {
        launcherButtonEl.disabled = true;
      }

      launcherStatusEl = Helpers.el(
        "div",
        { class: "status launcher-status" },
        [healthEndpoint ? t("launcher.idle") : t("launcher.noUrl")],
      );

      launcherHintEl = Helpers.el("div", { class: "launcher-hint" }, [
        healthEndpoint ? t("launcher.hintIdle") : t("launcher.hintNoUrl"),
      ]);

      const launcherSection = Helpers.el("div", {
        class: "section launcher-section",
      });
      launcherSection.appendChild(
        Helpers.el("div", { class: "section-title" }, [t("launcher.title")]),
      );
      launcherSection.appendChild(
        Helpers.el("div", { class: "hint" }, [t("launcher.description")]),
      );
      launcherSection.appendChild(
        Helpers.el("div", { class: "launcher-actions" }, [launcherButtonEl]),
      );
      launcherSection.appendChild(launcherStatusEl);
      launcherSection.appendChild(launcherHintEl);
      sideEl.appendChild(launcherSection);

      // Show server status dialog on page load
      showServerStatusDialog();
    }

    // Data API section
    const apiSelect = Helpers.el("select", {
      class: "api-select",
      style: "width: 100%;",
    });
    apiSelect.appendChild(
      Helpers.el("option", { value: "" }, [t("sidebar.selectDataType")]),
    );
    for (const api of cfg.dataApis) {
      apiSelect.appendChild(
        Helpers.el("option", { value: api.id }, [api.name || api.id]),
      );
    }

    // Container for dynamic input fields
    const dynamicFieldsContainer = Helpers.el("div", {
      class: "dynamic-fields-container",
      style: "margin-top: 10px;",
    });

    // Current API context
    let currentApiFields = {};
    let currentApi = null;

    // Function to show/hide fields based on selected API
    async function updateDynamicFields() {
      const apiId = apiSelect.value;

      // Clear existing fields
      dynamicFieldsContainer.innerHTML = "";
      currentApiFields = {};
      currentApi = null;

      if (!apiId) return;

      const api = cfg.dataApis.find((x) => x.id === apiId);
      if (!api) return;

      currentApi = api;
      // console.log("🔍 Selected API:", api);

      // Check if API has @var placeholders
      const hasVars = Boolean(
        api.fields ||
        (api.ui && api.ui.extraFields) ||
        (api.url && api.url.includes("@")) ||
        (api.headers && JSON.stringify(api.headers).includes("@")) ||
        (api.body && JSON.stringify(api.body).includes("@")) ||
        (api.excel &&
          api.excel.startCell &&
          api.excel.startCell.includes("@")) ||
        (api.excel && api.excel.sheet && api.excel.sheet.includes("@")),
      );

      // console.log("🔧 Has variables?", hasVars);

      if (!hasVars) {
        // console.log("📊 API has no variables, no inputs needed");
        return;
      }

      // Get visible fields
      const visibleFields = Helpers.getVisibleFields(api);
      // console.log("👁️ Visible fields:", visibleFields);

      if (visibleFields.length === 0) {
        // console.log("⚠️ No visible fields found");
        return;
      }

      // Create input fields
      for (const { key, config } of visibleFields) {
        const fieldDiv = Helpers.el("div", {
          class: "field-group",
          style: "margin-bottom: 12px;",
        });

        const label = Helpers.el(
          "label",
          {
            style:
              "display: block; font-size: 12px; color: #666; margin-bottom: 4px; font-weight: 500;",
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
              style: `width: 100%; padding: 6px 8px; border: 1px solid #ddd; border-radius: 4px;
                background: #fff; color: #333; font-size: 12px; min-height: 50px; resize: vertical;
                font-family: inherit;`,
            });
            input.value = defaultValue;
            break;

          case "select":
            input = Helpers.el("select", {
              style: `width: 100%; padding: 6px 8px; border: 1px solid #ddd; border-radius: 4px;
                background: #fff; color: #333; font-size: 12px;`,
            });

            // Static options
            if (config.options && Array.isArray(config.options.items)) {
              for (const opt of config.options.items) {
                const option = Helpers.el(
                  "option",
                  { value: String(opt.value) },
                  [String(opt.label)],
                );
                input.appendChild(option);
              }
            } else if (
              config.options &&
              config.options.source === "api" &&
              config.options.url
            ) {
              // Fetch remote options
              try {
                const opts = await Helpers.fetchOptionsForField(
                  config,
                  cfg.globalContext || {},
                );
                for (const o of opts) {
                  const option = Helpers.el(
                    "option",
                    { value: String(o.value) },
                    [String(o.label)],
                  );
                  input.appendChild(option);
                }
              } catch (e) {
                console.warn("Could not load select options", e);
              }
            }

            input.value = defaultValue;
            break;

          case "number":
            input = Helpers.el("input", {
              type: "number",
              placeholder: config.placeholder || "",
              style: `width: 100%; padding: 6px 8px; border: 1px solid #ddd; border-radius: 4px;
                background: #fff; color: #333; font-size: 12px;`,
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
              style: `width: 100%; padding: 6px 8px; border: 1px solid #ddd; border-radius: 4px;
                background: #fff; color: #333; font-size: 12px;`,
            });
            input.value = defaultValue;
            break;

          case "range":
            // Render two inputs side-by-side (from / to). Use config.rangeKeys if provided.
            const rangeWrapper = Helpers.el("div", {
              style: "display:flex;gap:8px;",
            });
            const fromInput = Helpers.el("input", {
              type: "text",
              placeholder:
                (config.placeholderFrom || t("fields.from")) +
                (config.placeholder ? ` - ${config.placeholder}` : ""),
              style: `flex:1;padding:6px 8px;border:1px solid #ddd;border-radius:4px;`,
            });
            const toInput = Helpers.el("input", {
              type: "text",
              placeholder:
                (config.placeholderTo || t("fields.to")) +
                (config.placeholder ? ` - ${config.placeholder}` : ""),
              style: `flex:1;padding:6px 8px;border:1px solid #ddd;border-radius:4px;`,
            });
            fromInput.value = defaultValue || "";
            toInput.value = "";
            rangeWrapper.appendChild(fromInput);
            rangeWrapper.appendChild(toInput);
            input = rangeWrapper;
            // store inputs specially
            currentApiFields[key] = {
              inputFrom: fromInput,
              inputTo: toInput,
              config,
            };
            break;

          default: // text
            input = Helpers.el("input", {
              type: "text",
              placeholder: config.placeholder || "",
              style: `width: 100%; padding: 6px 8px; border: 1px solid #ddd; border-radius: 4px;
                background: #fff; color: #333; font-size: 12px;`,
            });
            input.value = defaultValue;
        }

        // Store input reference if not already stored (range handled earlier)
        if (!currentApiFields[key]) {
          currentApiFields[key] = { input, config };
        }

        fieldDiv.appendChild(label);
        fieldDiv.appendChild(input);
        dynamicFieldsContainer.appendChild(fieldDiv);
      }

      // console.log("✅ Created", visibleFields.length, "input fields");
    }

    // Add event listener for API selection change
    apiSelect.addEventListener("change", updateDynamicFields);

    // Initialize Select2 for API selector if available
    setTimeout(() => {
      if (window.jQuery && window.jQuery.fn && window.jQuery.fn.select2) {
        try {
          const $ = window.jQuery;
          $(apiSelect).select2({
            placeholder: t("sidebar.selectDataSource"),
            allowClear: true,
            width: "100%",
          });

          // Handle Select2 change event
          $(apiSelect).on("select2:select select2:clear", updateDynamicFields);

          // console.log("✅ Select2 initialized for API selector");
        } catch (e) {
          // console.warn("⚠️ Select2 initialization failed:", e);
        }
      } else {
        // console.log("ℹ️ Select2 not available, using standard select");
      }
    }, 100);

    async function insertApiData() {
      const apiId = apiSelect.value;
      if (!apiId) {
        setStatus(t("errors.selectDataType"));
        return;
      }

      const api = cfg.dataApis.find((x) => x.id === apiId);
      if (!api) {
        console.error("❌ API not found:", apiId);
        return;
      }

      // console.log("🔍 Processing API:", api);

      // Check if API has @var placeholders
      const hasVars = Boolean(
        api.fields ||
        (api.ui && api.ui.extraFields) ||
        (api.url && api.url.includes("@")) ||
        (api.headers && JSON.stringify(api.headers).includes("@")) ||
        (api.body && JSON.stringify(api.body).includes("@")) ||
        (api.excel &&
          api.excel.startCell &&
          api.excel.startCell.includes("@")) ||
        (api.excel && api.excel.sheet && api.excel.sheet.includes("@")),
      );

      if (hasVars) {
        // console.log("📝 Using dynamic inputs for API:", api.id);

        // Validate required fields first (show alert if missing)
        const missing = [];
        for (const [key, entry] of Object.entries(currentApiFields)) {
          if (!entry) continue;
          const { config } = entry;
          if (!config || !config.required) continue;

          // range field: require at least one bound (or both)
          if (entry.inputFrom && entry.inputTo) {
            const vFrom = (entry.inputFrom.value || "").toString().trim();
            const vTo = (entry.inputTo.value || "").toString().trim();
            if (!vFrom && !vTo) missing.push(config.label || key);
            continue;
          }

          const inp = entry.input;
          if (!inp) {
            missing.push(config.label || key);
            continue;
          }
          if (config.type === "checkbox") {
            if (!inp.checked) missing.push(config.label || key);
          } else {
            if ((inp.value || "").toString().trim() === "")
              missing.push(config.label || key);
          }
        }
        if (missing.length > 0) {
          await Helpers.showAlert(
            t("modals.missingFieldsTitle"),
            t("modals.missingFieldsMessage", { fields: missing.join(", ") }),
          );
          return;
        }

        // Collect simple key=>value form values (user requested minimal mapping)
        const formValues = {};
        for (const [key, entry] of Object.entries(currentApiFields)) {
          if (!entry) continue;
          const { config } = entry;
          // range special-case
          if (entry.inputFrom && entry.inputTo) {
            const vFrom = (entry.inputFrom.value || "").toString().trim();
            const vTo = (entry.inputTo.value || "").toString().trim();
            if (
              Array.isArray(config.rangeKeys) &&
              config.rangeKeys.length >= 2
            ) {
              formValues[config.rangeKeys[0]] = vFrom;
              formValues[config.rangeKeys[1]] = vTo;
            } else {
              formValues[`${key}_from`] = vFrom;
              formValues[`${key}_to`] = vTo;
            }
            continue;
          }

          const input = entry.input;
          if (!input) continue;
          if (config.type === "checkbox") {
            formValues[key] = input.checked ? true : false;
          } else {
            formValues[key] = (input.value || "").toString();
          }
        }
        // console.log("📋 Simple form values:", formValues);

        // Build minimal context: merge globalContext then form values (form overrides)
        const globalContext = cfg.globalContext || {};
        const simpleContext = Object.assign({}, globalContext, formValues);

        // Log final substitution so developer can see what will be sent
        try {
          const resolvedUrl = String(
            Helpers.replaceAllVars(api.url || "", simpleContext),
          );
          const resolvedHeaders = Helpers.replaceAllVars(
            api.headers || {},
            simpleContext,
          );
          const resolvedBody = api.body
            ? Helpers.replaceAllVars(api.body, simpleContext)
            : null;
          // console.log("🔁 Resolved request:", {
          //   url: resolvedUrl,
          //   headers: resolvedHeaders,
          //   body: resolvedBody,
          // });
        } catch (e) {
          console.warn("Could not build resolved request for logging", e);
        }

        // Use insertDataWithForm with collected context
        if (!Handlers.insertDataWithForm) {
          console.error("❌ insertDataWithForm not found in Handlers");
          setStatus(t("errors.insertDataFormNotLoaded"));
          return;
        }
        await Handlers.insertDataWithForm(
          univerAPI,
          api,
          setStatus,
          simpleContext, // Pass minimal context
          getCurrentCellA1(), // use current selection
        );
        return;
      }

      // console.log("📊 Using legacy API call for:", api.id);

      // Legacy behavior for simple APIs
      try {
        setStatus(t("status.loadingData"));
        const opts = {
          method: api.method || "GET",
          headers: api.headers || {},
        };
        if (api.method === "POST" && api.body) {
          opts.body = JSON.stringify(api.body);
        }

        const raw = await Helpers.httpJson(api.url, opts);

        // Use extractResponseData for consistent data extraction
        const extracted = Helpers.extractResponseData(raw, api.responseSource);

        // Use excel config if available
        let values2d;
        if (api.excel && api.excel.table && api.excel.table.columns) {
          const dataArray = Array.isArray(extracted) ? extracted : [extracted];
          values2d = Helpers.dataToExcel2D(
            dataArray,
            api.excel.table.columns,
            api.excel.table.includeHeaders !== false,
          );
        } else {
          values2d = Helpers.normalizeTo2D(extracted, api.mapping);
        }

        const { ws } = getActive();
        const currentA1 = getCurrentCellA1();
        const pos = Helpers.parseA1(currentA1);
        if (!pos) throw new Error(t("errors.invalidPosition"));

        const numRows = values2d.length;
        const numCols = Math.max(...values2d.map((r) => r.length));
        const rect = values2d.map((r) => {
          const rr = r.slice();
          while (rr.length < numCols) rr.push(null);
          return rr;
        });

        // console.log("insertApiData DEBUG:", {
        //   currentA1,
        //   startRow1Based: pos.row + 1,
        //   startCol1Based: pos.col + 1,
        //   API_Rows: numRows,
        //   API_Cols: numCols,
        // });

        try {
          SheetUtils.ensureSheetCapacity(
            ws,
            pos.row + 1,
            numRows,
            pos.col + 1,
            numCols,
          );
        } catch (e) {
          console.warn("Could not ensure sheet capacity", e);
        }

        const range = ws.getRange(pos.row, pos.col, numRows, numCols);
        range.setValues(rect);

        setStatus(
          t("success.insertedRowsCols", {
            rows: String(numRows),
            cols: String(numCols),
            cell: currentA1,
          }),
        );
        apiSelect.value = "";
      } catch (e) {
        console.error(e);
        setStatus(t("errors.generic", { message: e.message }));
      } finally {
        Helpers.hideLoading();
      }
    }

    const dataSection = Helpers.el("div", { class: "section" });
    dataSection.appendChild(
      Helpers.el("div", { class: "section-title" }, [t("sidebar.dataFrom")]),
    );
    // dataSection.appendChild(Helpers.el("span", {}, ["Chọn API:"]));
    dataSection.appendChild(apiSelect);
    dataSection.appendChild(dynamicFieldsContainer); // Add dynamic fields container

    // Buttons row: Insert + Clear filters
    const buttonsRow = Helpers.el("div", {
      style: "display:flex;gap:8px;margin-top:10px;",
    });
    const insertBtn = Helpers.el(
      "button",
      {
        type: "button",
        style: `flex:1;background: #007acc; color: white; border: none; border-radius: 4px;
          padding: 8px 12px; cursor: pointer; font-size: 12px;`,
        onclick: insertApiData,
      },
      [t("buttons.insert")],
    );

    const clearBtn = Helpers.el(
      "button",
      {
        type: "button",
        style: `flex:1;background: #f3f4f6; color: #111; border: 1px solid #d1d5db; border-radius: 4px;
          padding: 8px 12px; cursor: pointer; font-size: 12px;`,
        onclick: () => {
          // Clear all dynamic inputs
          for (const [k, entry] of Object.entries(currentApiFields)) {
            if (!entry) continue;
            if (entry.inputFrom && entry.inputTo) {
              try {
                entry.inputFrom.value = "";
                entry.inputTo.value = "";
              } catch {}
              continue;
            }
            const inp = entry.input;
            if (!inp) continue;
            try {
              if (inp.type === "checkbox") inp.checked = false;
              else inp.value = "";
            } catch {}
          }
        },
      },
      [t("buttons.clearFilters")],
    );

    buttonsRow.appendChild(insertBtn);
    buttonsRow.appendChild(clearBtn);
    dataSection.appendChild(buttonsRow);

    // Template section
    const tplEnabled = !!templateClient;
    const tplSelect = Helpers.el("select", { class: "tpl-select" });
    const tplActiveLabel = Helpers.el("div", { class: "tpl-active" }, [
      t("templates.noActive"),
    ]);

    // Category filter dropdown
    const categoryFilterSelect = Helpers.el("select", {
      class: "cat-filter-select",
      style: "width:100%;margin-bottom:8px;",
    });
    categoryFilterSelect.appendChild(
      Helpers.el("option", { value: "" }, [t("templates.allCategories")]),
    );

    // Load categories into filter
    async function loadCategoryFilter() {
      const client = localClient || templateClient;
      if (!client || !client.listCategories) return;
      try {
        const cats = await client.listCategories();
        // Clear existing options (keep first "all" option)
        while (categoryFilterSelect.options.length > 1) {
          categoryFilterSelect.remove(1);
        }
        for (const cat of cats) {
          categoryFilterSelect.appendChild(
            Helpers.el("option", { value: cat.id }, [
              (cat.icon ? cat.icon + " " : "") + cat.name,
            ]),
          );
        }
      } catch (e) {
        console.warn("Could not load categories for filter:", e);
      }
    }

    // Current selected category for filtering
    function selectedCategoryId() {
      return categoryFilterSelect.value || "";
    }

    categoryFilterSelect.addEventListener("change", () => {
      refreshTemplates();
    });

    // Tag UI (Select2)
    const tagSelect = Helpers.el("select", {
      id: "tagSelect",
      multiple: "multiple",
      style: "width:100%",
    });

    function selectedTagIds() {
      try {
        const $ = window.jQuery;
        const data = $ ? $(tagSelect).select2("data") : [];

        const result = (data || [])
          .map((x) => String(x.id))
          .filter((id) => id && !id.startsWith("new:")); // UUID OK, chỉ bỏ new:

        // console.log("[selectedTagIds] data=", data);
        // console.log("[selectedTagIds] result=", result);

        return result; // string[]
      } catch (e) {
        console.warn("[selectedTagIds] error", e);
        return [];
      }
    }

    // Tag chips removed — Select2 already renders selected tags

    let tplListCache = [];

    async function refreshTemplates() {
      if (!tplEnabled) return;
      try {
        if (!activeTemplateId)
          Helpers.showLoading(t("status.loadingTemplates"));
        const filterCatId = selectedCategoryId();
        const listParams = {
          tag_ids: selectedTagIds(),
          tag_mode: "all",
        };
        // Filter by category if one is selected
        if (filterCatId) {
          listParams.category_id = filterCatId;
        }
        const items = await templateClient.list(listParams);
        tplListCache = items || [];
        tplSelect.innerHTML = "";
        tplSelect.appendChild(
          Helpers.el("option", { value: "" }, [t("templates.selectTemplate")]),
        );
        for (const it of tplListCache) {
          tplSelect.appendChild(
            Helpers.el("option", { value: it.id }, [it.name]),
          );
        }
      } catch (e) {
        console.error(e);
        setStatus(t("errors.generic", { message: e.message }));
      } finally {
        Helpers.hideLoading();
      }
    }

    // Prompt user for tags as comma-separated names, resolve to tag IDs
    async function promptForTagIds(prefillInput) {
      if (!tagClient) return [];
      try {
        // Use provided input (from multi-field dialog) or prefill from select2
        let input = prefillInput;
        if (!input) {
          try {
            const $ = window.jQuery;
            const data = $ ? $(tagSelect).select2("data") : [];
            input = (data || [])
              .map((tg) => tg.text || "")
              .filter(Boolean)
              .join(", ");
          } catch {
            input = "";
          }
        }

        if (!input) {
          input = await Helpers.showPrompt(
            t("modals.selectOrCreateTag"),
            input || "",
          );
        }
        if (!input) return [];

        const parts = input
          .split(",")
          .map((s) => (s || "").trim())
          .filter(Boolean);

        const ids = [];
        for (const name of parts) {
          try {
            const items = await tagClient.search(name);
            const found = (items || []).find(
              (it) =>
                String(it.name || "").toLowerCase() ===
                String(name).toLowerCase(),
            );
            if (found) {
              ids.push(String(found.id));
              continue;
            }
            const created = await tagClient.create(name);
            ids.push(String(created.id));
          } catch (e) {
            console.warn("Could not resolve/create tag", name, e);
          }
        }
        return ids;
      } catch (e) {
        console.error(e);
        return [];
      }
    }

    async function loadSelectedTemplate() {
      const id = tplSelect.value;
      if (!id) return;

      try {
        Helpers.showLoading(t("status.loadingTemplateContent"));
        setStatus(t("status.loadingTemplate"));
        const tpl = await templateClient.get(id);
        const snapshot = tpl.content;

        const current = univerAPI.getActiveWorkbook();
        const unitId = current?.getId?.();
        if (unitId) univerAPI.disposeUnit(unitId);

        univerAPI.createWorkbook(snapshot);

        activeTemplateId = id;
        activeTemplateName = tpl.name;
        tplActiveLabel.textContent = t("templates.activeLabel", {
          name: tpl.name,
        });
        tplActiveLabel.className = "tpl-active active";

        // Sync tags UI from template
        if (
          tagClient &&
          window.jQuery &&
          window.jQuery.fn &&
          window.jQuery.fn.select2
        ) {
          const $ = window.jQuery;
          const tags = Array.isArray(tpl.tags) ? tpl.tags : [];
          // Ensure options exist then select
          const values = [];
          for (const tg of tags) {
            const idStr = String(tg.id);
            values.push(idStr);
            if ($(tagSelect).find(`option[value="${idStr}"]`).length === 0) {
              const opt = new Option(
                tg.name || tg.slug || idStr,
                idStr,
                true,
                true,
              );
              $(tagSelect).append(opt);
            }
          }
          $(tagSelect).val(values).trigger("change");
        }

        setStatus(t("success.templateLoaded", { name: tpl.name }));
      } catch (e) {
        console.error(e);
        setStatus(t("errors.generic", { message: e.message }));
      } finally {
        Helpers.hideLoading();
      }
    }

    async function deleteSelectedTemplate() {
      const id = tplSelect.value;
      if (!id) {
        setStatus(t("errors.selectTemplateToDelete"));
        return;
      }

      const it = tplListCache.find((x) => x.id === id);
      const confirmed = await Helpers.showConfirm(
        t("modals.deleteTemplateTitle"),
        t("modals.deleteTemplateMessage", { name: it?.name || id }),
      );
      if (!confirmed) return;

      try {
        Helpers.showLoading(t("status.deletingTemplate"));
        await templateClient.remove(id);
        if (activeTemplateId === id) {
          activeTemplateId = null;
          activeTemplateName = null;
          tplActiveLabel.textContent = t("templates.noActive");
          tplActiveLabel.className = "tpl-active";
        }
        await refreshTemplates();
        setStatus(t("success.templateDeleted"));
      } catch (e) {
        console.error(e);
        setStatus(t("errors.generic", { message: e.message }));
      } finally {
        Helpers.hideLoading();
      }
    }

    async function handleCtrlS() {
      if (!tplEnabled) {
        setStatus(t("errors.apiNotConfigured"));
        return;
      }

      if (!activeTemplateId) {
        // Prefill tags from current selection for convenience
        let preTags = "";
        try {
          const $ = window.jQuery;
          const data = $ ? $(tagSelect).select2("data") : [];
          preTags = (data || [])
            .map((tg) => tg.text || "")
            .filter(Boolean)
            .join(", ");
        } catch {
          preTags = "";
        }

        // Load categories for the dialog
        let dialogCategories = [];
        try {
          const cats = await templateClient.listCategories();
          dialogCategories = (cats || []).map((c) => ({
            id: c.id,
            name: c.name,
            icon: c.icon || "",
          }));
        } catch {
          dialogCategories = [];
        }

        const res = await Helpers.showPromptWithTags(
          t("modals.createTemplate"),
          t("modals.namePlaceholder"),
          preTags,
          tagClient,
          {
            categories: dialogCategories,
            defaultCategory: selectedCategoryId() || "",
          },
        );
        if (!res || !res.name) {
          setStatus(t("errors.cancelledCreate"));
          return;
        }

        try {
          Helpers.showLoading(t("status.creatingNewTemplate"));
          setStatus(t("status.creatingNewTemplate"));
          const wb = univerAPI.getActiveWorkbook();
          let snapshot = wb.save();
          if (typeof snapshot === "string")
            snapshot = Helpers.safeJsonParse(snapshot, snapshot);

          const tagIds = await promptForTagIds(res.tags);

          const created = await templateClient.create({
            name: res.name,
            category: res.category || cfg.defaultTemplateCategory || "default",
            content: snapshot,
            start_cell: "A1",
            tag_ids: tagIds,
          });

          activeTemplateId = created.id;
          activeTemplateName = res.name;
          tplActiveLabel.textContent = t("templates.activeLabel", {
            name: res.name,
          });
          tplActiveLabel.className = "tpl-active active";

          await refreshTemplates();
          setStatus(t("success.templateCreated", { name: res.name }));
        } catch (e) {
          console.error(e);
          setStatus(t("errors.generic", { message: e.message }));
        } finally {
          Helpers.hideLoading();
        }
      } else {
        const confirmed = await Helpers.showConfirm(
          t("modals.saveTemplateTitle"),
          t("modals.saveTemplateMessage", { name: activeTemplateName }),
        );
        if (!confirmed) {
          setStatus(t("errors.cancelledSave"));
          return;
        }

        try {
          Helpers.showLoading(t("status.savingTemplate"));
          setStatus(t("status.saving"));
          const wb = univerAPI.getActiveWorkbook();
          let snapshot = wb.save();
          if (typeof snapshot === "string")
            snapshot = Helpers.safeJsonParse(snapshot, snapshot);

          const tagIds = await promptForTagIds();

          const uploadRes = await templateClient.uploadContent(snapshot);
          await templateClient.patch(activeTemplateId, {
            content_path: uploadRes.content_path,
            start_cell: "A1", // Mặc định
            tag_ids: tagIds,
          });

          setStatus(t("success.templateSaved", { name: activeTemplateName }));
        } catch (e) {
          console.error(e);
          setStatus(t("errors.generic", { message: e.message }));
        } finally {
          Helpers.hideLoading();
        }
      }
    }

    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleCtrlS();
      }
    });

    const templateBox = Helpers.el("div", { class: "section" }, [
      Helpers.el("div", { class: "section-title" }, [t("templates.title")]),
      ...(tplEnabled
        ? [
            Helpers.el(
              "div",
              { class: "section-header", style: "margin-bottom:2px" },
              [Helpers.el("span", {}, [t("templates.searchByTags")])],
            ),
            tagSelect,
            Helpers.el("div", { class: "hint" }, [
              t("templates.tagSearchHint"),
            ]),
            Helpers.el(
              "div",
              {
                class: "section-header",
                style: "margin-top:8px;margin-bottom:2px",
              },
              [Helpers.el("span", {}, [t("templates.filterByCategory")])],
            ),
            categoryFilterSelect,
            Helpers.el("div", { class: "hint" }, [""]),
            Helpers.el("div", { class: "sep", style: "margin:10px 0" }),
            tplActiveLabel,
            Helpers.el("div", { class: "tpl-row" }, [
              tplSelect,
              Helpers.el(
                "button",
                { class: "btn-primary", onclick: loadSelectedTemplate },
                [t("buttons.open")],
              ),
              Helpers.el(
                "button",
                {
                  class: "btn-icon danger",
                  onclick: deleteSelectedTemplate,
                  title: t("buttons.delete"),
                },
                ["🗑️"],
              ),
            ]),
            Helpers.el("div", { class: "tpl-row" }, [
              Helpers.el(
                "button",
                {
                  class: "btn btn-sm",
                  style:
                    "width:100%; background:#22c55e;color:#fff;padding:0.375rem 0.75rem;font-size:0.875rem;border-radius:0.375rem;border:1px solid #16a34a;box-shadow:0 2px 6px rgba(34,197,94,.45);transition:all .15s ease;",
                  onmouseenter: (e) =>
                    (e.target.style.boxShadow =
                      "0 4px 12px rgba(34,197,94,.65)"),
                  onmouseleave: (e) =>
                    (e.target.style.boxShadow =
                      "0 2px 6px rgba(34,197,94,.45)"),
                  onclick: () =>
                    Handlers.importExcel(
                      univerAPI,
                      cfg,
                      templateClient,
                      refreshTemplates,
                      setStatus,
                      () => selectedTagIds(),
                    ),
                  title: t("templates.importFromExcel"),
                },
                [t("templates.createFromExcel")],
              ),
            ]),
            Helpers.el("div", { class: "tpl-row" }, [
              Helpers.el(
                "button",
                {
                  class: "btn",
                  style:
                    "background:#3b82f6;color:#fff;padding:0.375rem 0.75rem;font-size:0.875rem;border-radius:0.375rem;border:1px solid #2563eb;box-shadow:0 2px 6px rgba(59,130,246,.45);transition:all .15s ease;",
                  onclick: () =>
                    Handlers.exportExcel(univerAPI, cfg, setStatus),
                  title: t("templates.exportToExcel"),
                },
                [t("templates.exportExcel")],
              ),
              Helpers.el(
                "button",
                {
                  class: "btn",
                  style:
                    "background:#f97316;color:#fff;padding:0.375rem 0.75rem;font-size:0.875rem;border-radius:0.375rem;border:1px solid #ea580c;box-shadow:0 2px 6px rgba(249,115,22,.45);transition:all .15s ease;",
                  onclick: () => Handlers.exportPDF(univerAPI, cfg, setStatus),
                  title: t("templates.printContent"),
                },
                [t("templates.printPDF")],
              ),
            ]),
            Helpers.el("div", { class: "hint" }, [t("templates.ctrlSHint")]),
          ]
        : [
            Helpers.el("div", { class: "hint" }, [
              t("templates.notConfigured"),
            ]),
          ]),
    ]);

    // -----------------------
    // Manage Tab (Categories & Tags CRUD)
    // -----------------------
    function buildManageTab() {
      const manageSection = Helpers.el("div", { class: "section" });
      manageSection.appendChild(
        Helpers.el("div", { class: "section-title" }, [t("manage.title")]),
      );

      // -- Categories Section --
      const catContainer = Helpers.el("div", { style: "margin-bottom: 16px;" });
      catContainer.appendChild(
        Helpers.el(
          "div",
          {
            style:
              "font-weight:600;font-size:13px;margin-bottom:8px;color:#1967d2;",
          },
          [t("manage.categoriesTitle")],
        ),
      );
      const catList = Helpers.el("div", { class: "manage-list" });
      const addCatBtn = Helpers.el(
        "button",
        {
          class: "btn-primary",
          style: "width:100%;margin-top:8px;font-size:12px;padding:6px 10px;",
          onclick: () => addCategory(),
        },
        [t("manage.addCategory")],
      );
      catContainer.appendChild(catList);
      catContainer.appendChild(addCatBtn);
      manageSection.appendChild(catContainer);

      manageSection.appendChild(
        Helpers.el("div", { class: "sep", style: "margin:12px 0;" }),
      );

      // -- Tags Section --
      const tagContainer = Helpers.el("div");
      tagContainer.appendChild(
        Helpers.el(
          "div",
          {
            style:
              "font-weight:600;font-size:13px;margin-bottom:8px;color:#1967d2;",
          },
          [t("manage.tagsTitle")],
        ),
      );
      const tagList = Helpers.el("div", { class: "manage-list" });
      const addTagBtn = Helpers.el(
        "button",
        {
          class: "btn-primary",
          style: "width:100%;margin-top:8px;font-size:12px;padding:6px 10px;",
          onclick: () => addTag(),
        },
        [t("manage.addTag")],
      );
      tagContainer.appendChild(tagList);
      tagContainer.appendChild(addTagBtn);
      manageSection.appendChild(tagContainer);

      // Functions to refresh lists
      async function refreshCatList() {
        catList.innerHTML = "";
        try {
          const client = localClient || templateClient;
          if (!client || !client.listCategories) {
            catList.appendChild(
              Helpers.el("div", { class: "hint" }, [t("manage.noCategories")]),
            );
            return;
          }
          const cats = await client.listCategories();
          const counts = client.getCategoryTemplateCounts
            ? await client.getCategoryTemplateCounts()
            : {};
          if (!cats || cats.length === 0) {
            catList.appendChild(
              Helpers.el("div", { class: "hint" }, [t("manage.noCategories")]),
            );
            return;
          }
          for (const cat of cats) {
            const count = counts[cat.id] || 0;
            const row = Helpers.el("div", {
              class: "manage-item",
              style:
                "display:flex;align-items:center;justify-content:space-between;padding:6px 8px;background:#f8f9fa;border:1px solid #e0e0e0;border-radius:4px;margin-bottom:4px;",
            });
            const info = Helpers.el("div", { style: "font-size:12px;" }, [
              (cat.icon ? cat.icon + " " : "") + cat.name,
              Helpers.el(
                "span",
                { style: "color:#888;margin-left:6px;font-size:11px;" },
                [t("manage.templateCount", { count: String(count) })],
              ),
            ]);
            const actions = Helpers.el("div", {
              style: "display:flex;gap:4px;",
            });
            actions.appendChild(
              Helpers.el(
                "button",
                {
                  style:
                    "border:none;background:transparent;cursor:pointer;font-size:14px;padding:2px;",
                  title: t("manage.editCategory"),
                  onclick: () => editCategory(cat),
                },
                ["✏️"],
              ),
            );
            actions.appendChild(
              Helpers.el(
                "button",
                {
                  style:
                    "border:none;background:transparent;cursor:pointer;font-size:14px;padding:2px;",
                  title: t("manage.deleteCategory"),
                  onclick: () => deleteCategory(cat),
                },
                ["🗑️"],
              ),
            );
            row.appendChild(info);
            row.appendChild(actions);
            catList.appendChild(row);
          }
        } catch (e) {
          console.error("Error loading categories:", e);
        }
      }

      async function refreshTagList() {
        tagList.innerHTML = "";
        try {
          const client = localClient || templateClient;
          if (!client || !client.listTags) {
            tagList.appendChild(
              Helpers.el("div", { class: "hint" }, [t("manage.noTags")]),
            );
            return;
          }
          const tags = await client.listTags();
          const counts = client.getTagTemplateCounts
            ? await client.getTagTemplateCounts()
            : {};
          if (!tags || tags.length === 0) {
            tagList.appendChild(
              Helpers.el("div", { class: "hint" }, [t("manage.noTags")]),
            );
            return;
          }
          for (const tag of tags) {
            const count = counts[tag.id] || 0;
            const row = Helpers.el("div", {
              class: "manage-item",
              style:
                "display:inline-flex;align-items:center;gap:6px;padding:4px 10px;background:#e8f0fe;border:1px solid #d2e3fc;border-radius:999px;margin:0 4px 6px 0;font-size:12px;",
            });
            row.appendChild(
              Helpers.el("span", {}, [
                tag.name,
                Helpers.el(
                  "span",
                  { style: "color:#888;margin-left:4px;font-size:10px;" },
                  ["(" + count + ")"],
                ),
              ]),
            );
            row.appendChild(
              Helpers.el(
                "button",
                {
                  style:
                    "border:none;background:transparent;cursor:pointer;font-size:12px;padding:0;color:#d93025;line-height:1;",
                  title: t("manage.deleteTag"),
                  onclick: () => deleteTag(tag),
                },
                ["×"],
              ),
            );
            tagList.appendChild(row);
          }
        } catch (e) {
          console.error("Error loading tags:", e);
        }
      }

      async function addCategory() {
        const name = await Helpers.showPrompt(t("manage.categoryName"), "");
        if (!name) return;
        const icon = await Helpers.showPrompt(
          t("manage.categoryIcon") + " (emoji)",
          "📁",
        );
        try {
          const client = localClient || templateClient;
          if (!client || !client.createCategory) return;
          await client.createCategory({ name, icon: icon || "📁" });
          setStatus(t("success.categoryCreated", { name }));
          await refreshCatList();
        } catch (e) {
          setStatus(t("errors.generic", { message: e.message }));
        }
      }

      async function editCategory(cat) {
        const name = await Helpers.showPrompt(
          t("manage.categoryName"),
          cat.name,
        );
        if (!name) return;
        const icon = await Helpers.showPrompt(
          t("manage.categoryIcon") + " (emoji)",
          cat.icon || "📁",
        );
        try {
          const client = localClient || templateClient;
          if (!client || !client.updateCategory) return;
          await client.updateCategory(cat.id, { name, icon: icon || cat.icon });
          setStatus(t("success.categoryUpdated", { name }));
          await refreshCatList();
        } catch (e) {
          setStatus(t("errors.generic", { message: e.message }));
        }
      }

      async function deleteCategory(cat) {
        const confirmed = await Helpers.showConfirm(
          t("manage.deleteCategory"),
          t("manage.confirmDeleteCategory", { name: cat.name }),
        );
        if (!confirmed) return;
        try {
          const client = localClient || templateClient;
          if (!client || !client.removeCategory) return;
          await client.removeCategory(cat.id);
          setStatus(t("success.categoryDeleted"));
          await refreshCatList();
        } catch (e) {
          setStatus(t("errors.generic", { message: e.message }));
        }
      }

      async function addTag() {
        const name = await Helpers.showPrompt(t("manage.tagName"), "");
        if (!name) return;
        try {
          const client = localClient || templateClient;
          if (!client || !client.createTag) return;
          await client.createTag(name);
          setStatus(t("success.tagCreated", { name }));
          await refreshTagList();
        } catch (e) {
          setStatus(t("errors.generic", { message: e.message }));
        }
      }

      async function deleteTag(tag) {
        const confirmed = await Helpers.showConfirm(
          t("manage.deleteTag"),
          t("manage.confirmDeleteTag", { name: tag.name }),
        );
        if (!confirmed) return;
        try {
          const client = localClient || templateClient;
          if (!client || !client.removeTag) return;
          await client.removeTag(tag.id);
          setStatus(t("success.tagDeleted"));
          await refreshTagList();
        } catch (e) {
          setStatus(t("errors.generic", { message: e.message }));
        }
      }

      // Initial load
      refreshCatList();
      refreshTagList();

      return manageSection;
    }

    // -----------------------
    // Tab System
    // -----------------------
    const tabNames = [
      { id: "data", label: t("tabs.data") },
      { id: "templates", label: t("tabs.templates") },
      { id: "manage", label: t("tabs.manage") },
    ];

    const tabBar = Helpers.el("div", { class: "tab-bar" });
    const tabPanels = {};
    let activeTab = "data";

    // Create tab buttons
    for (const tab of tabNames) {
      const btn = Helpers.el(
        "button",
        {
          class: "tab-btn" + (tab.id === activeTab ? " active" : ""),
          "data-tab": tab.id,
          onclick: () => switchTab(tab.id),
        },
        [tab.label],
      );
      tabBar.appendChild(btn);
    }

    // Create tab panels
    tabPanels.data = Helpers.el("div", {
      class: "tab-panel active",
      "data-panel": "data",
    });
    tabPanels.data.appendChild(dataSection);

    tabPanels.templates = Helpers.el("div", {
      class: "tab-panel",
      "data-panel": "templates",
      style: "display:none;",
    });
    tabPanels.templates.appendChild(templateBox);

    tabPanels.manage = Helpers.el("div", {
      class: "tab-panel",
      "data-panel": "manage",
      style: "display:none;",
    });
    const manageContent = buildManageTab();
    tabPanels.manage.appendChild(manageContent);

    function switchTab(tabId) {
      activeTab = tabId;
      // Update buttons
      tabBar.querySelectorAll(".tab-btn").forEach((btn) => {
        btn.classList.toggle("active", btn.getAttribute("data-tab") === tabId);
      });
      // Update panels
      for (const [id, panel] of Object.entries(tabPanels)) {
        panel.style.display = id === tabId ? "" : "none";
        panel.classList.toggle("active", id === tabId);
      }
    }

    // Assemble sidebar
    sideEl.appendChild(
      Helpers.el("div", { class: "sidebar-title" }, [t("sidebar.title")]),
    );
    sideEl.appendChild(tabBar);
    sideEl.appendChild(tabPanels.data);
    sideEl.appendChild(tabPanels.templates);
    sideEl.appendChild(tabPanels.manage);
    sideEl.appendChild(Helpers.el("div", { class: "sep" }));
    sideEl.appendChild(statusEl);

    // Init
    if (tplEnabled) {
      // Init Select2 tags if available
      if (
        tagClient &&
        window.jQuery &&
        window.jQuery.fn &&
        window.jQuery.fn.select2
      ) {
        const $ = window.jQuery;
        // Inject Select2 tag styles (only once)
        if (!document.getElementById("univer-tagselect-style")) {
          const style = document.createElement("style");
          style.id = "univer-tagselect-style";
          style.textContent = `
    /* Label "Tìm kiếm theo tags" spacing (nếu bạn muốn css thay vì inline) */
    .tag-search-label { margin-bottom: 2px; }

    /* Select2 multiple tags: font + padding top */
    #tagSelect + .select2-container .select2-selection--multiple {
      padding-top: 5px;
      font-size: 13px;
    }

    /* Tag chip text */
    #tagSelect + .select2-container .select2-selection__choice {
      font-size: 13px;
    }

    /* Search input inside select2 */
    #tagSelect + .select2-container .select2-search__field {
      font-size: 13px;
    }
  `;
          document.head.appendChild(style);
        }

        $(tagSelect).select2({
          placeholder: t("tags.selectOrCreateEllipsis"),
          multiple: true,
          closeOnSelect: false,
          tags: true,
          createTag: function (params) {
            const term = (params.term || "").trim();
            if (!term) return null;
            if (term.length > 50) return null;
            return {
              id: "new:" + term.toLowerCase(),
              text: term,
              isNew: true,
            };
          },
          templateResult: function (data) {
            if (data.isNew) {
              const escapedText = String(data.text).replace(
                /[&<>"']/g,
                (s) =>
                  ({
                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    '"': "&quot;",
                    "'": "&#39;",
                  })[s],
              );
              const createLabel = global.UNIVER_I18N
                ? global.UNIVER_I18N.t("tags.createTag", { name: escapedText })
                : "Create tag: <b>" + escapedText + "</b>";
              return $(`<span>${createLabel}</span>`);
            }
            return data.text;
          },
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
              } catch (e) {
                failure(e);
              }
            },
            delay: 200,
          },
        });

        $(tagSelect).on("select2:select", async function (e) {
          const data = e.params && e.params.data;
          if (!data || !data.isNew) {
            await refreshTemplates();
            return;
          }
          try {
            const created = await tagClient.create(data.text);
            const newOption = new Option(
              created.name,
              String(created.id),
              true,
              true,
            );
            $(tagSelect)
              .find(`option[value="${String(data.id).replace(/"/g, '\\"')}"]`)
              .remove();
            $(tagSelect).append(newOption).trigger("change");
          } catch (err) {
            console.error(err);
            setStatus(
              t("errors.tagCreateError", { message: err.message || err }),
            );
          } finally {
            await refreshTemplates();
          }
        });

        $(tagSelect).on("change", async function () {
          // console.log("[tagSelect change] fired, val=", $(tagSelect).val());
          await refreshTemplates();
        });
      }

      // tplSearch.addEventListener(
      //   "input",
      //   Helpers.debounce(refreshTemplates, 250),
      // );
      loadCategoryFilter();
      refreshTemplates();
    }

    // Expose for debugging
    global.__univer = univer;
    global.__univerAPI = univerAPI;
  };

  global.UNIVER_EMBED_MAIN = EmbedMain;

  if (typeof console !== "undefined" && console.log) {
    // console.log("✅ LOADED: univer-embed/embed-main.js");
  }
})(window);
