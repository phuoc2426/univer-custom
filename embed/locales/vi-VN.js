// =====================================================
// LOCALE: Vietnamese (vi-VN)
// =====================================================
(function (global) {
  const locale = {
    code: "vi-VN",

    sidebar: {
      title: "Công cụ chỉnh sửa Spreadsheet",
      insertPosition: "Vị trí chèn dữ liệu: ",
      clickToChange: "Click vào ô bất kỳ trong bảng để đổi vị trí",
      dataFrom: "Nhập dữ liệu từ",
      selectDataSource: "-- Chọn nguồn dữ liệu --",
      selectDataType: "-- Chọn loại dữ liệu --",
    },

    tabs: {
      data: "📊 Dữ liệu",
      templates: "📋 Templates",
      manage: "🏷️ Quản lý",
    },

    buttons: {
      insert: "Chèn dữ liệu",
      clearFilters: "Xóa bộ lọc",
      open: "Mở",
      delete: "Xóa",
      cancel: "Hủy",
      confirm: "Xác nhận",
      ok: "OK",
      execute: "Thực hiện",
      save: "Lưu",
      create: "Tạo",
      edit: "Sửa",
      add: "Thêm",
      close: "Đóng",
    },

    templates: {
      title: "Templates",
      searchByTags: "Tìm kiếm theo tags:",
      tagSearchHint: "Gõ để tìm tag. Nếu chưa có, nhấn Enter để tạo tag mới.",
      noActive: "Chưa chọn template",
      activeLabel: "📄 Đang mở: {name}",
      selectTemplate: "-- Chọn template --",
      createFromExcel: "Tạo template từ Excel",
      exportExcel: "Xuất nội dung ra Excel",
      printPDF: "In PDF",
      ctrlSHint: "💡 Nhấn Ctrl+S để lưu/tạo template",
      notConfigured: "Template API chưa được cấu hình",
      importFromExcel: "Nhập template từ Excel",
      exportToExcel: "Xuất ra file Excel",
      printContent: "In nội dung ra PDF",
      filterByCategory: "Lọc theo danh mục:",
      allCategories: "-- Tất cả danh mục --",
      category: "Danh mục",
      selectCategory: "-- Chọn danh mục --",
    },

    manage: {
      title: "Quản lý",
      categoriesTitle: "Danh mục (Categories)",
      tagsTitle: "Nhãn (Tags)",
      addCategory: "+ Thêm danh mục",
      addTag: "+ Thêm nhãn",
      editCategory: "Sửa danh mục",
      deleteCategory: "Xóa danh mục",
      editTag: "Sửa nhãn",
      deleteTag: "Xóa nhãn",
      categoryName: "Tên danh mục",
      categoryIcon: "Icon",
      parentCategory: "Danh mục cha",
      noParent: "-- Không có --",
      tagName: "Tên nhãn",
      confirmDeleteCategory: 'Bạn có chắc muốn xóa danh mục "{name}"?',
      confirmDeleteTag: 'Bạn có chắc muốn xóa nhãn "{name}"?',
      templateCount: "{count} template",
      noCategories: "Chưa có danh mục nào",
      noTags: "Chưa có nhãn nào",
    },

    status: {
      ready: "Sẵn sàng",
      loading: "Đang xử lý...",
      loadingTemplates: "Đang tải danh sách template...",
      loadingTemplateContent: "Đang tải nội dung template...",
      loadingTemplate: "Đang tải template...",
      exportingExcel: "Đang xuất Excel...",
      exportingJSON: "Đang xuất JSON...",
      readingExcel: "Đang đọc file Excel...",
      creatingTemplate: "Đang tạo template trên server...",
      creatingNewTemplate: "Đang tạo template mới...",
      savingTemplate: "Đang lưu template...",
      saving: "Đang lưu...",
      deletingTemplate: "Đang xóa template...",
      callingAPI: "Đang gọi API...",
      writingData: "Đang ghi dữ liệu...",
      loadingData: "Đang tải dữ liệu...",
      preparingPrint: "Chuẩn bị in nội dung...",
    },

    launcher: {
      title: "Launcher server dữ liệu",
      description:
        "Kiểm tra nhanh xem server local (Python) đã chạy chưa trước khi thao tác.",
      button: "Kiểm tra server",
      idle: 'Nhấn "Kiểm tra server" để chạy health check.',
      checking: "Đang gọi http://127.0.0.1:8080/health...",
      ok: "✅ Server đang chạy",
      error: "❌ Không thể kết nối server",
      noUrl: "Không tìm thấy URL server",
      hintIdle:
        "Nếu server chưa chạy, hãy dùng python launcher/UniverApiApp.py hoặc UniverApiApp.exe.",
      hintRunLauncher:
        'Không thể kết nối. Vui lòng chạy UniverApiApp rồi bấm lại "Kiểm tra server".',
      hintSuccess: "Server OK — bạn có thể thao tác trên sidebar.",
      hintNoUrl:
        "Không có cấu hình UNIVER_DATA_SERVER_PORT / URL. Kiểm tra lại index.html hoặc user-config.",
    },

    serverDialog: {
      titleChecking: "Đang kiểm tra server...",
      titleSuccess: "Server đang hoạt động",
      titleError: "Server chưa khởi động",
      subtitleChecking: "Vui lòng đợi trong giây lát",
      subtitleSuccess: "Bạn có thể bắt đầu làm việc",
      subtitleError: "Cần khởi động server để lưu dữ liệu",
      messageChecking: "Đang kiểm tra kết nối đến server Python...",
      messageSuccess:
        "Server Python đang chạy. Bạn có thể sử dụng đầy đủ các tính năng lưu template và dữ liệu.",
      messageError:
        "Không thể kết nối đến server. Để lưu template và dữ liệu, bạn cần khởi động server Python bằng lệnh sau:",
      command: "python server.py",
      commandHint:
        "Mở Terminal/Command Prompt tại thư mục dự án, sau đó chạy lệnh trên. Hoặc dùng UniverApiApp.exe nếu có.",
      copyCommand: "Sao chép",
      copied: "Đã sao chép!",
      btnCheckAgain: "Kiểm tra lại",
      btnContinue: "Tiếp tục",
      btnClose: "Đóng",
      warningNoServer:
        "⚠️ Server chưa chạy. Các tính năng lưu template sẽ không hoạt động.",
    },

    success: {
      exportedExcel: "✅ Đã xuất Excel",
      downloadedJSON: "✅ Đã tải JSON",
      printOpened: "✅ Đã mở cửa sổ in",
      templateLoaded: "✅ Đã tải: {name}",
      templateDeleted: "✅ Đã xóa template",
      templateCreated: "✅ Đã tạo template: {name}",
      templateSaved: "✅ Đã lưu: {name}",
      dataInserted: "✅ Đã đổ {count} dòng từ {cell}",
      insertedRowsCols: "✅ Đã chèn {rows} dòng x {cols} cột tại {cell}",
      categoryCreated: "✅ Đã tạo danh mục: {name}",
      categoryUpdated: "✅ Đã cập nhật danh mục: {name}",
      categoryDeleted: "✅ Đã xóa danh mục",
      tagCreated: "✅ Đã tạo nhãn: {name}",
      tagDeleted: "✅ Đã xóa nhãn",
    },

    errors: {
      xlsxNotLoaded: "❌ SheetJS (XLSX) chưa được tải",
      generic: "❌ Lỗi: {message}",
      noWorkbook: "Không có workbook hoạt động",
      noSheet: "Không có sheet hoạt động",
      emptySheet: "Sheet trống, không có dữ liệu để in",
      popupBlocked: "Không thể mở cửa sổ in (popup bị chặn)",
      apiNotConfigured: "Template API chưa được cấu hình",
      cancelled: "Đã hủy",
      cancelledCreate: "Đã hủy tạo template",
      cancelledSave: "Đã hủy lưu",
      selectDataType: "Vui lòng chọn loại dữ liệu",
      selectTemplateToDelete: "Vui lòng chọn template để xóa",
      invalidPosition: "Vị trí không hợp lệ",
      tagCreateError: "❌ Tạo tag lỗi: {message}",
      insertDataFormNotLoaded: "❌ Lỗi: insertDataWithForm chưa được load",
    },

    modals: {
      templateName: "Tên template",
      createTemplate: "Tạo template mới",
      namePlaceholder: "Nhập tên template...",
      nameLabel: "Tên",
      tagsLabel: "Tags",
      deleteTemplateTitle: "Xóa template?",
      deleteTemplateMessage: 'Bạn có chắc muốn xóa template "{name}"?',
      saveTemplateTitle: "Lưu template?",
      saveTemplateMessage: 'Bạn có muốn ghi đè nội dung template "{name}"?',
      missingFieldsTitle: "Thiếu trường bắt buộc",
      missingFieldsMessage: "Vui lòng điền: {fields}",
      importExcelName: "Tên template (để trống lấy tên file)",
      selectOrCreateTag: "Chọn hoặc tạo tag (phân tách bằng dấu phẩy)",
      printTitle: "In nội dung",
    },

    tags: {
      selectOrCreate: "Chọn hoặc tạo tag",
      selectOrCreateEllipsis: "Chọn hoặc tạo tag...",
      createTag: "Tạo tag: <b>{name}</b>",
      enterCommaSeparated: "Nhập tags, ngăn cách bằng dấu phẩy",
    },

    fields: {
      from: "Từ",
      to: "Đến",
    },
  };

  // Register locale
  global.UNIVER_LOCALES = global.UNIVER_LOCALES || {};
  global.UNIVER_LOCALES["vi-VN"] = locale;
})(window);
