// =====================================================
// TAG CLIENT - API wrapper for tag search/create
// =====================================================
(function (global) {
  const Helpers = global.UNIVER_HELPERS;

  function createTagClient(baseUrl, headers) {
    const root = baseUrl.replace(/\/+$/, "");
    return {
      search: (q = "") => {
        const qs = new URLSearchParams();
        if (q) qs.set("q", q);
        return Helpers.httpJson(`${root}/tags?${qs.toString()}`, { headers });
      },
      create: (name) =>
        Helpers.httpJson(`${root}/tags`, {
          method: "POST",
          headers,
          body: Helpers.toJsonBody({ name }),
        }),
    };
  }

  global.UNIVER_TAG_CLIENT = {
    create: createTagClient,
  };

  if (typeof console !== "undefined" && console.log) {
    // console.log("✅ LOADED: univer-embed/tagClient.js");
  }
})(window);
