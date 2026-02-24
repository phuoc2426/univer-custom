// =====================================================
// LOCALE: Simplified Chinese (zh-CN)
// =====================================================
(function (global) {
  const locale = {
    code: "zh-CN",

    sidebar: {
      title: "电子表格编辑工具",
      insertPosition: "插入位置：",
      clickToChange: "点击任意单元格更改位置",
      dataFrom: "数据来源",
      selectDataSource: "-- 选择数据源 --",
      selectDataType: "-- 选择数据类型 --",
    },

    tabs: {
      data: "📊 数据",
      templates: "📋 模板",
      manage: "🏷️ 管理",
    },

    buttons: {
      insert: "插入数据",
      clearFilters: "清除筛选",
      open: "打开",
      delete: "删除",
      cancel: "取消",
      confirm: "确认",
      ok: "确定",
      execute: "执行",
      save: "保存",
      create: "创建",
      edit: "编辑",
      add: "添加",
      close: "关闭",
    },

    templates: {
      title: "模板",
      searchByTags: "按标签搜索：",
      tagSearchHint: "输入以搜索标签。按回车键创建新标签。",
      noActive: "未选择模板",
      activeLabel: "📄 已打开：{name}",
      selectTemplate: "-- 选择模板 --",
      createFromExcel: "从Excel创建模板",
      exportExcel: "导出为Excel",
      printPDF: "打印PDF",
      ctrlSHint: "💡 按 Ctrl+S 保存/创建模板",
      notConfigured: "模板存储未配置",
      importFromExcel: "从Excel导入模板",
      exportToExcel: "导出为Excel文件",
      printContent: "打印内容为PDF",
      filterByCategory: "按分类筛选：",
      allCategories: "-- 所有分类 --",
      category: "分类",
      selectCategory: "-- 选择分类 --",
    },

    manage: {
      title: "管理",
      categoriesTitle: "分类 (Categories)",
      tagsTitle: "标签 (Tags)",
      addCategory: "+ 添加分类",
      addTag: "+ 添加标签",
      editCategory: "编辑分类",
      deleteCategory: "删除分类",
      editTag: "编辑标签",
      deleteTag: "删除标签",
      categoryName: "分类名称",
      categoryIcon: "图标",
      parentCategory: "上级分类",
      noParent: "-- 无 --",
      tagName: "标签名称",
      confirmDeleteCategory: '确定要删除分类 "{name}" 吗？',
      confirmDeleteTag: '确定要删除标签 "{name}" 吗？',
      templateCount: "{count} 个模板",
      noCategories: "暂无分类",
      noTags: "暂无标签",
    },

    status: {
      ready: "就绪",
      loading: "处理中...",
      loadingTemplates: "加载模板列表...",
      loadingTemplateContent: "加载模板内容...",
      loadingTemplate: "加载模板...",
      exportingExcel: "导出Excel...",
      exportingJSON: "导出JSON...",
      readingExcel: "读取Excel文件...",
      creatingTemplate: "创建模板中...",
      creatingNewTemplate: "创建新模板...",
      savingTemplate: "保存模板...",
      saving: "保存中...",
      deletingTemplate: "删除模板...",
      callingAPI: "调用API...",
      writingData: "写入数据...",
      loadingData: "加载数据...",
      preparingPrint: "准备打印内容...",
    },

    launcher: {
      title: "本地服务器启动器",
      description: "点击按钮检查本地 Python 服务器是否正在运行。",
      button: "检查服务器",
      idle: '点击 "检查服务器" 来调用 health 接口。',
      checking: "正在检查 http://127.0.0.1:8080/health...",
      ok: "✅ 服务器已运行",
      error: "❌ 无法连接到服务器",
      noUrl: "未找到服务器地址",
      hintIdle:
        "如果尚未启动，请先运行 python launcher/UniverApiApp.py（或 UniverApiApp.exe）。",
      hintRunLauncher: '连接失败。请运行 UniverApiApp 后再点击 "检查服务器"。',
      hintSuccess: "服务器正常，可以继续使用侧栏。",
      hintNoUrl:
        "缺少 UNIVER_DATA_SERVER_PORT / URL 配置，请检查 index.html 或 user-config。",
    },

    serverDialog: {
      titleChecking: "正在检查服务器...",
      titleSuccess: "服务器正在运行",
      titleError: "服务器未启动",
      subtitleChecking: "请稍候",
      subtitleSuccess: "您可以开始工作了",
      subtitleError: "需要启动服务器才能保存数据",
      messageChecking: "正在检查与 Python 服务器的连接...",
      messageSuccess:
        "Python 服务器正在运行。您可以使用所有模板和数据保存功能。",
      messageError:
        "无法连接到服务器。要保存模板和数据，请使用以下命令启动 Python 服务器：",
      command: "python server.py",
      commandHint:
        "在项目文件夹中打开终端/命令提示符，然后运行上述命令。或者使用 UniverApiApp.exe（如果有）。",
      copyCommand: "复制",
      copied: "已复制!",
      btnCheckAgain: "重新检查",
      btnContinue: "继续",
      btnClose: "关闭",
      warningNoServer: "⚠️ 服务器未运行。模板保存功能将无法使用。",
    },

    success: {
      exportedExcel: "✅ 已导出Excel",
      downloadedJSON: "✅ 已下载JSON",
      printOpened: "✅ 已打开打印窗口",
      templateLoaded: "✅ 已加载：{name}",
      templateDeleted: "✅ 模板已删除",
      templateCreated: "✅ 已创建模板：{name}",
      templateSaved: "✅ 已保存：{name}",
      dataInserted: "✅ 已插入 {count} 行，从 {cell} 开始",
      insertedRowsCols: "✅ 已插入 {rows} 行 x {cols} 列，位于 {cell}",
      categoryCreated: "✅ 已创建分类：{name}",
      categoryUpdated: "✅ 已更新分类：{name}",
      categoryDeleted: "✅ 已删除分类",
      tagCreated: "✅ 已创建标签：{name}",
      tagDeleted: "✅ 已删除标签",
    },

    errors: {
      xlsxNotLoaded: "❌ SheetJS (XLSX) 未加载",
      generic: "❌ 错误：{message}",
      noWorkbook: "没有活动工作簿",
      noSheet: "没有活动工作表",
      emptySheet: "工作表为空，没有数据可打印",
      popupBlocked: "无法打开打印窗口（弹出窗口被阻止）",
      apiNotConfigured: "模板存储未配置",
      cancelled: "已取消",
      cancelledCreate: "已取消创建模板",
      cancelledSave: "已取消保存",
      selectDataType: "请选择数据类型",
      selectTemplateToDelete: "请选择要删除的模板",
      invalidPosition: "位置无效",
      tagCreateError: "❌ 创建标签错误：{message}",
      insertDataFormNotLoaded: "❌ 错误：insertDataWithForm 未加载",
    },

    modals: {
      templateName: "模板名称",
      createTemplate: "创建新模板",
      namePlaceholder: "输入模板名称...",
      nameLabel: "名称",
      tagsLabel: "标签",
      deleteTemplateTitle: "删除模板？",
      deleteTemplateMessage: '确定要删除模板 "{name}" 吗？',
      saveTemplateTitle: "保存模板？",
      saveTemplateMessage: '覆盖模板 "{name}" 的内容？',
      missingFieldsTitle: "缺少必填字段",
      missingFieldsMessage: "请填写：{fields}",
      importExcelName: "模板名称（留空使用文件名）",
      selectOrCreateTag: "选择或创建标签（用逗号分隔）",
      printTitle: "打印内容",
    },

    tags: {
      selectOrCreate: "选择或创建标签",
      selectOrCreateEllipsis: "选择或创建标签...",
      createTag: "创建标签：<b>{name}</b>",
      enterCommaSeparated: "输入标签，用逗号分隔",
    },

    fields: {
      from: "从",
      to: "到",
    },
  };

  global.UNIVER_LOCALES = global.UNIVER_LOCALES || {};
  global.UNIVER_LOCALES["zh-CN"] = locale;
})(window);
