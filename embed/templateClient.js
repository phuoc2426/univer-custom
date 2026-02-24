// =====================================================
// TEMPLATE CLIENT - API wrapper for template CRUD
// =====================================================
(function (global) {
  const Helpers = global.UNIVER_HELPERS;

  function createTemplateClient(baseUrl, headers) {
    const root = baseUrl.replace(/\/+$/, "");
    return {
      list: (params = {}) => {
        const qs = new URLSearchParams();
        if (params.category) qs.set("category", params.category);
        if (params.q) qs.set("q", params.q);
        // Tag filters (backend supports either tag_ids or tags(slugs))
        if (
          params.tag_ids &&
          Array.isArray(params.tag_ids) &&
          params.tag_ids.length
        )
          qs.set("tag_ids", params.tag_ids.join(","));
        if (params.tags && Array.isArray(params.tags) && params.tags.length)
          qs.set("tags", params.tags.join(","));
        if (params.tag_mode) qs.set("tag_mode", params.tag_mode);
        return Helpers.httpJson(`${root}/templates?${qs.toString()}`, {
          headers,
        });
      },
      get: (id) =>
        Helpers.httpJson(`${root}/templates/${encodeURIComponent(id)}`, {
          headers,
        }),
      create: (payload) =>
        Helpers.httpJson(`${root}/templates`, {
          method: "POST",
          body: Helpers.toJsonBody(payload),
          headers,
        }),
      patch: (id, payload) =>
        Helpers.httpJson(`${root}/templates/${encodeURIComponent(id)}`, {
          method: "PATCH",
          body: Helpers.toJsonBody(payload),
          headers,
        }),
      remove: (id) =>
        Helpers.httpJson(`${root}/templates/${encodeURIComponent(id)}`, {
          method: "DELETE",
          headers,
        }),
      uploadContent: async (content) => {
        const url = `${root}/template-files`;
        const payloadString =
          typeof content === "string" ? content : JSON.stringify(content);

        const baseFetchHeaders = {};
        for (const k of Object.keys(headers || {})) {
          if (k.toLowerCase() === "content-type") continue;
          baseFetchHeaders[k] = headers[k];
        }

        // Primary strategy: send JSON body with { content } as the controller expects
        try {
          // console.log("[templateClient] POST JSON { content } to", url);
          const resp = await fetch(url, {
            method: "POST",
            headers: {
              ...baseFetchHeaders,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ content }),
          });
          const text = await resp.text().catch(() => "");
          // console.log(
          //   "[templateClient] { content } response status=",
          //   resp.status,
          //   "text=",
          //   text.slice(0, 300),
          // );
          if (resp.ok) {
            const ct = resp.headers.get("content-type") || "";
            if (ct.includes("application/json")) return JSON.parse(text);
            return Helpers.safeJsonParse(text, { content_path: text });
          }
        } catch (err) {
          console.warn("[templateClient] POST { content } failed:", err);
        }

        // Strategy 1: multipart/form-data with octet-stream (pure binary file)
        const fieldNames = ["file", "template", "content", "upload", "data"];
        for (const field of fieldNames) {
          try {
            const form = new FormData();
            // Use octet-stream so backend doesn't try to parse file content as JSON body
            const blob = new Blob([payloadString], {
              type: "application/octet-stream",
            });
            form.append(field, blob, "template.json");

            // console.log(
            //   "[templateClient] POST multipart (octet-stream) to",
            //   url,
            //   "field=",
            //   field,
            // );

            const resp = await fetch(url, {
              method: "POST",
              body: form,
              headers: baseFetchHeaders,
            });
            const respText = await resp.text().catch(() => "");
            // console.log(
            //   "[templateClient] response field=",
            //   field,
            //   "status=",
            //   resp.status,
            //   "text=",
            //   respText.slice(0, 300),
            // );
            if (resp.ok) {
              const ct = resp.headers.get("content-type") || "";
              if (ct.includes("application/json")) return JSON.parse(respText);
              return Helpers.safeJsonParse(respText, {
                content_path: respText,
              });
            }
          } catch (err) {
            console.warn(
              "[templateClient] multipart failed for field",
              field,
              err,
            );
          }
        }

        // Strategy 2: PUT with raw body (some APIs use PUT for file upload)
        try {
          // console.log("[templateClient] PUT raw body to", url);
          const putResp = await fetch(url, {
            method: "PUT",
            body: payloadString,
            headers: {
              ...baseFetchHeaders,
              "Content-Type": "application/json",
            },
          });
          const putText = await putResp.text().catch(() => "");
          // console.log(
          //   "[templateClient] PUT response status=",
          //   putResp.status,
          //   "text=",
          //   putText.slice(0, 300),
          // );
          if (putResp.ok) {
            return Helpers.safeJsonParse(putText, { content_path: putText });
          }
        } catch (err) {
          console.warn("[templateClient] PUT failed:", err);
        }

        // Strategy 3: POST with { data: <string> } wrapper (content as string field)
        try {
          // console.log("[templateClient] POST { data: <json-string> } to", url);
          const wrapResp = await fetch(url, {
            method: "POST",
            body: JSON.stringify({ data: payloadString }),
            headers: { ...headers, "Content-Type": "application/json" },
          });
          const wrapText = await wrapResp.text().catch(() => "");
          // console.log(
          //   "[templateClient] { data } response status=",
          //   wrapResp.status,
          //   "text=",
          //   wrapText.slice(0, 300),
          // );
          if (wrapResp.ok) {
            return Helpers.safeJsonParse(wrapText, { content_path: wrapText });
          }
        } catch (err) {
          console.warn("[templateClient] { data } wrapper failed:", err);
        }

        // Strategy 4: Probe with empty object to see required fields
        try {
          // console.log(
          //   "[templateClient] Probing with empty {} to discover required fields",
          // );
          const probeResp = await fetch(url, {
            method: "POST",
            body: JSON.stringify({}),
            headers: { ...headers, "Content-Type": "application/json" },
          });
          const probeText = await probeResp.text().catch(() => "");
          // console.log(
          //   "[templateClient] Probe response status=",
          //   probeResp.status,
          //   "text=",
          //   probeText,
          // );
          // This will likely fail but the error message may reveal required fields
        } catch (err) {
          console.warn("[templateClient] Probe failed:", err);
        }

        throw new Error(
          "uploadContent: All upload strategies failed. Check backend /template-files endpoint requirements.",
        );
      },
    };
  }

  global.UNIVER_TEMPLATE_CLIENT = {
    create: createTemplateClient,
  };

  if (typeof console !== "undefined" && console.log) {
    // console.log("✅ LOADED: univer-embed/templateClient.js");
  }
})(window);
