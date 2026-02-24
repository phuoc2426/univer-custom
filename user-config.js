// =====================================================
// USER CONFIG - Minimal format for simplified param UI
// - Each field is a simple key => { label, type, placeholder, required, options }
// - For selects: options.source = 'static' (items) or 'api' (url + valueKey + labelKey)
// - For range: type = 'range' and provide rangeKeys: ["fromKey","toKey"] to map two values
// =====================================================
// console.log("✅ LOADED: user-config.js (simplified)");

const TEMPLATE_API_BASE = "http://127.0.0.1:8000";

// Global context (injected into templates / headers)
const GLOBAL_CONTEXT = {
  token: "your-jwt-token-here",
  tenantId: "tenant-001",
  userId: "user-123",
};

// Minimal DATA_APIS examples
const DATA_APIS = [
  // Simple GET with no params
  {
    id: "all_students",
    name: "👥 Tất cả sinh viên",
    method: "GET",
    url: "http://127.0.0.1:8000/users",
    mapping: {
      columns: [
        { key: "id", header: "ID" },
        { key: "name", header: "Họ tên" },
      ],
    },
  },
  {
    id: "products",
    name: "🛒 Sản phẩm",
    method: "GET",
    url: "https://dummyjson.com/products/search",
    mapping: {
      columns: [
        { key: "id", header: "ID" },
        { key: "title", header: "Tên sản phẩm" },
        { key: "price", header: "Giá" },
        { key: "description", header: "Mô tả" },
        { key: "category", header: "Danh mục" },
      ],
    },
    responseSource: "products",
    body: {
      filters: {
        q: "@q", // từ query param `?q=phone`
      },
    },
    fields: {
      q: {
        label: "Từ khóa tìm kiếm",
        type: "text",
        placeholder: "Nhập từ khóa...",
      },
    },
  },
  {
    id: "rick_morty_character_data",
    name: "Rick and Morty Character Data",
    method: "GET",
    url: "https://rickandmortyapi.com/api/character",
    body: {
      filters: {
        query:
          "query($name:String){ characters(filter:{name:$name}){ results{ id name status species } } }",
        variables: {
          // Minimal DATA_APIS examples
          // NOTE: If your API wraps returned array in an envelope (e.g. { data: [...]} or { result: [...] })
          // set `responseSource` to the path where the array lives (e.g. 'data', 'result', 'rows').
          // If omitted, helpers will try common keys: data, rows, items, result, records and fall back to whole response.
          name: "@name",
        },
      },
    },
    // API returns characters under `results` inside GraphQL response — helpers will try common keys,
    // but we set `responseSource` explicitly to 'results' when using GraphQL-like envelopes.
    responseSource: "results",
    mapping: {
      columns: [
        { key: "name", header: "Tên" },
        { key: "status", header: "Trạng thái" },
        { key: "species", header: "Loài" },
      ],
    },
    fields: {
      // Simple key/value fields (UI will render label + appropriate input)
      name: {
        label: "Tên nhân vật",
        type: "text",
        placeholder: "Tên nhân vật...",
      },
    },
  },
  // Filter endpoint: backend expects POST body.filters with simple keys
  {
    id: "student_report",
    name: "📊 Báo cáo sinh viên",
    method: "POST",
    url: "http://127.0.0.1:8000/reports/students",
    // Use @var placeholders matching field keys below
    body: {
      filters: {
        keyword: "@keyword",
        termId: "@termId",
        departmentId: "@departmentId",
        status: "@status",
        fromDate: "@fromDate",
        toDate: "@toDate",
      },
    },
    fields: {
      // Simple key/value fields (UI will render label + appropriate input)
      keyword: {
        label: "Từ khóa",
        type: "text",
        placeholder: "Tên, mã, email...",
      },
      termId: {
        label: "Học kỳ",
        type: "select",
        required: true,
        options: {
          source: "api",
          url: "http://127.0.0.1:8000/terms",
          valueKey: "id",
          labelKey: "name",
        },
      },
      departmentId: {
        label: "Khoa",
        type: "select",
        options: {
          source: "static",
          items: [
            { value: "", label: "-- Tất cả --" },
            { value: "IT", label: "CNTT" },
            { value: "BIZ", label: "Kinh tế" },
          ],
        },
      },
      status: {
        label: "Trạng thái",
        type: "select",
        options: {
          source: "static",
          items: [
            { value: "", label: "-- Tất cả --" },
            { value: "active", label: "Đang học" },
            { value: "graduated", label: "Tốt nghiệp" },
          ],
        },
      },
      // Range example: two inputs mapped to amountFrom / amountTo in body
      amountRange: {
        label: "Khoảng số tiền (VNĐ)",
        type: "range",
        rangeKeys: ["amountFrom", "amountTo"],
        placeholder: "Số tiền",
      },
      fromDate: { label: "Từ ngày", type: "date" },
      toDate: { label: "Đến ngày", type: "date" },
    },
    mapping: {
      columns: [
        { key: "id", header: "ID" },
        { key: "name", header: "Tên" },
        { key: "balance", header: "Số dư" },
      ],
    },
  },

  // Example: endpoint with URL params (GET) using @vars
  {
    id: "grade_report",
    name: "📈 Bảng điểm theo môn",
    method: "GET",
    url: "http://127.0.0.1:8000/grades?courseId=@courseId&semester=@semester",
    // API returns array under `rows`
    responseSource: "rows",
    fields: {
      courseId: {
        label: "Môn học",
        type: "select",
        required: true,
        options: {
          source: "api",
          url: "http://127.0.0.1:8000/courses",
          valueKey: "id",
          labelKey: "title",
        },
      },
      semester: {
        label: "Học kỳ",
        type: "select",
        options: {
          source: "static",
          items: [
            { value: "2024-1", label: "HK1 2024" },
            { value: "2024-2", label: "HK2 2024" },
          ],
        },
      },
    },
    mapping: {
      columns: [
        { key: "studentId", header: "Mã SV" },
        { key: "studentName", header: "Họ tên" },
        { key: "avg", header: "Điểm TB" },
      ],
    },
  },
];

// Export
window.USER_UNIVER_CONFIG = {
  workbookName: "Hệ thống quản lý",
  dataApis: DATA_APIS,

  // UI locale: "vi-VN" | "en-US" | "zh-CN" (controls all sidebar text)
  uiLocale: "vi-VN",

  // Template storage mode: "api" | "local" | "auto"
  // "api"   — use remote API (templateApi.baseUrl required)
  // "local" — use local JSON files via data server (localStorageClient)
  // "auto"  — use API if baseUrl is set, otherwise fall back to local
  templateMode: "local",

  // ── Data server (required for "local" mode) ──────────────────
  // Run:  python server.py --port 8080
  // The data server reads/writes JSON files in the data/ folder.
  dataServerPort: 8080,
  // Or set full URL directly (overrides dataServerPort):
  // dataServerUrl: "http://192.168.1.100:8080",

  // API mode settings (used when templateMode = "api" or "auto")
  templateApi: { baseUrl: TEMPLATE_API_BASE, headers: {} },

  // Local mode settings — paths relative to data server root
  localTemplatePath: "data/templates_store",
  templateIndexPath: "data/templates_index.json",
  categoriesPath: "data/categories.json",
  tagsPath: "data/tags.json",

  defaultTemplateCategory: "default",
  globalContext: GLOBAL_CONTEXT,
};
