// =====================================================
// LOCALE: English (en-US)
// =====================================================
(function (global) {
  const locale = {
    code: "en-US",

    sidebar: {
      title: "Spreadsheet Editor Tools",
      insertPosition: "Insert position: ",
      clickToChange: "Click any cell to change position",
      dataFrom: "Insert data from",
      selectDataSource: "-- Select data source --",
      selectDataType: "-- Select data type --",
    },

    tabs: {
      data: "📊 Data",
      templates: "📋 Templates",
      manage: "🏷️ Manage",
    },

    buttons: {
      insert: "Insert data",
      clearFilters: "Clear filters",
      open: "Open",
      delete: "Delete",
      cancel: "Cancel",
      confirm: "Confirm",
      ok: "OK",
      execute: "Execute",
      save: "Save",
      create: "Create",
      edit: "Edit",
      add: "Add",
      close: "Close",
    },

    templates: {
      title: "Templates",
      searchByTags: "Search by tags:",
      tagSearchHint: "Type to search. Press Enter to create a new tag.",
      noActive: "No template selected",
      activeLabel: "📄 Opened: {name}",
      selectTemplate: "-- Select template --",
      createFromExcel: "Create template from Excel",
      exportExcel: "Export to Excel",
      printPDF: "Print PDF",
      ctrlSHint: "💡 Press Ctrl+S to save/create template",
      notConfigured: "Template storage not configured",
      importFromExcel: "Import template from Excel",
      exportToExcel: "Export to Excel file",
      printContent: "Print content as PDF",
      filterByCategory: "Filter by category:",
      allCategories: "-- All categories --",
      category: "Category",
      selectCategory: "-- Select category --",
    },

    manage: {
      title: "Manage",
      categoriesTitle: "Categories",
      tagsTitle: "Tags",
      addCategory: "+ Add category",
      addTag: "+ Add tag",
      editCategory: "Edit category",
      deleteCategory: "Delete category",
      editTag: "Edit tag",
      deleteTag: "Delete tag",
      categoryName: "Category name",
      categoryIcon: "Icon",
      parentCategory: "Parent category",
      noParent: "-- None --",
      tagName: "Tag name",
      confirmDeleteCategory:
        'Are you sure you want to delete category "{name}"?',
      confirmDeleteTag: 'Are you sure you want to delete tag "{name}"?',
      templateCount: "{count} template(s)",
      noCategories: "No categories yet",
      noTags: "No tags yet",
    },

    status: {
      ready: "Ready",
      loading: "Processing...",
      loadingTemplates: "Loading templates...",
      loadingTemplateContent: "Loading template content...",
      loadingTemplate: "Loading template...",
      exportingExcel: "Exporting Excel...",
      exportingJSON: "Exporting JSON...",
      readingExcel: "Reading Excel file...",
      creatingTemplate: "Creating template...",
      creatingNewTemplate: "Creating new template...",
      savingTemplate: "Saving template...",
      saving: "Saving...",
      deletingTemplate: "Deleting template...",
      callingAPI: "Calling API...",
      writingData: "Writing data...",
      loadingData: "Loading data...",
      preparingPrint: "Preparing print content...",
    },

    launcher: {
      title: "Data server launcher",
      description:
        "Run a quick health check to make sure the local Python server is up.",
      button: "Check server",
      idle: 'Click "Check server" to call the health endpoint.',
      checking: "Checking http://127.0.0.1:8080/health...",
      ok: "✅ Server is running",
      error: "❌ Cannot reach the server",
      noUrl: "Server URL not configured",
      hintIdle:
        "If the server is stopped, run python launcher/UniverApiApp.py (or UniverApiApp.exe).",
      hintRunLauncher:
        'Connection failed. Please start UniverApiApp, then click "Check server" again.',
      hintSuccess: "Server is ready — you can keep working in the sidebar.",
      hintNoUrl:
        "Missing UNIVER_DATA_SERVER_PORT / URL config. Update index.html or user-config.",
    },

    serverDialog: {
      titleChecking: "Checking server...",
      titleSuccess: "Server is running",
      titleError: "Server not started",
      subtitleChecking: "Please wait a moment",
      subtitleSuccess: "You can start working now",
      subtitleError: "Server required to save data",
      messageChecking: "Checking connection to Python server...",
      messageSuccess:
        "Python server is running. You can use all template and data saving features.",
      messageError:
        "Cannot connect to server. To save templates and data, start the Python server with:",
      command: "python server.py",
      commandHint:
        "Open Terminal/Command Prompt in the project folder and run the command above. Or use UniverApiApp.exe if available.",
      copyCommand: "Copy",
      copied: "Copied!",
      btnCheckAgain: "Check again",
      btnContinue: "Continue",
      btnClose: "Close",
      warningNoServer:
        "⚠️ Server not running. Template saving features will not work.",
    },

    success: {
      exportedExcel: "✅ Excel exported",
      downloadedJSON: "✅ JSON downloaded",
      printOpened: "✅ Print window opened",
      templateLoaded: "✅ Loaded: {name}",
      templateDeleted: "✅ Template deleted",
      templateCreated: "✅ Template created: {name}",
      templateSaved: "✅ Saved: {name}",
      dataInserted: "✅ Inserted {count} rows from {cell}",
      insertedRowsCols: "✅ Inserted {rows} rows x {cols} cols at {cell}",
      categoryCreated: "✅ Category created: {name}",
      categoryUpdated: "✅ Category updated: {name}",
      categoryDeleted: "✅ Category deleted",
      tagCreated: "✅ Tag created: {name}",
      tagDeleted: "✅ Tag deleted",
    },

    errors: {
      xlsxNotLoaded: "❌ SheetJS (XLSX) is not loaded",
      generic: "❌ Error: {message}",
      noWorkbook: "No active workbook",
      noSheet: "No active sheet",
      emptySheet: "Sheet is empty, no data to print",
      popupBlocked: "Cannot open print window (popup blocked)",
      apiNotConfigured: "Template storage not configured",
      cancelled: "Cancelled",
      cancelledCreate: "Template creation cancelled",
      cancelledSave: "Save cancelled",
      selectDataType: "Please select a data type",
      selectTemplateToDelete: "Please select a template to delete",
      invalidPosition: "Invalid position",
      tagCreateError: "❌ Tag creation error: {message}",
      insertDataFormNotLoaded: "❌ Error: insertDataWithForm not loaded",
    },

    modals: {
      templateName: "Template name",
      createTemplate: "Create new template",
      namePlaceholder: "Enter template name...",
      nameLabel: "Name",
      tagsLabel: "Tags",
      deleteTemplateTitle: "Delete template?",
      deleteTemplateMessage:
        'Are you sure you want to delete template "{name}"?',
      saveTemplateTitle: "Save template?",
      saveTemplateMessage: 'Overwrite template "{name}" content?',
      missingFieldsTitle: "Missing required fields",
      missingFieldsMessage: "Please fill in: {fields}",
      importExcelName: "Template name (leave empty to use file name)",
      selectOrCreateTag: "Select or create tag (comma-separated)",
      printTitle: "Print content",
    },

    tags: {
      selectOrCreate: "Select or create tag",
      selectOrCreateEllipsis: "Select or create tag...",
      createTag: "Create tag: <b>{name}</b>",
      enterCommaSeparated: "Enter tags, separated by commas",
    },

    fields: {
      from: "From",
      to: "To",
    },
  };

  global.UNIVER_LOCALES = global.UNIVER_LOCALES || {};
  global.UNIVER_LOCALES["en-US"] = locale;
})(window);
