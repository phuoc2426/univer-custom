// =====================================================
// LOCAL TEMPLATE CLIENT - File-based template storage
// =====================================================
// Implements same interface as API templateClient but uses
// local JSON files: templates_index.json + templates_store/*.json
// Requires a simple static file server that can serve/write files.
// For read-only mode (no server writes), templates are loaded from
// pre-existing files. For full CRUD, uses fetch PUT/POST to a writable endpoint.
// =====================================================
(function (global) {
  const Helpers = global.UNIVER_HELPERS;

  /**
   * Create a local file-based template client
   * @param {string} basePath - Base path to templates directory (e.g. 'data/templates_store')
   * @param {string} indexPath - Path to index file (e.g. 'data/templates_index.json')
   * @param {object} [options] - Options
   * @param {string} [options.categoriesPath] - Path to categories.json
   * @param {string} [options.tagsPath] - Path to tags.json
   * @param {string} [options.serverUrl] - Data server base URL (e.g. 'http://127.0.0.1:8080')
   */
  function createLocalTemplateClient(basePath, indexPath, options = {}) {
    const serverUrl = (options.serverUrl || "").replace(/\/+$/, "");
    const storePath = basePath.replace(/\/+$/, "");
    const idxPath = indexPath || "data/templates_index.json";
    const categoriesPath = options.categoriesPath || "data/categories.json";
    const tagsPath = options.tagsPath || "data/tags.json";

    // Build full URL: serverUrl + "/" + relativePath
    function url(relativePath) {
      const clean = relativePath.replace(/^\.?\//, ""); // strip leading ./ or /
      return serverUrl ? serverUrl + "/" + clean : clean;
    }

    // In-memory cache
    let indexCache = null;
    let categoriesCache = null;
    let tagsCache = null;

    // UUID generator
    function uuid() {
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
        /[xy]/g,
        function (c) {
          const r = (Math.random() * 16) | 0;
          const v = c === "x" ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        },
      );
    }

    function slugify(str) {
      return (str || "")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9\-]/g, "")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
    }

    // ---- Index operations ----

    async function loadIndex() {
      if (indexCache) return indexCache;
      try {
        const resp = await fetch(url(idxPath) + "?t=" + Date.now());
        if (resp.ok) {
          const data = await resp.json();
          indexCache = Array.isArray(data) ? data : [];
        } else {
          indexCache = [];
        }
      } catch {
        indexCache = [];
      }
      return indexCache;
    }

    async function saveIndex(data) {
      indexCache = data;
      try {
        await fetch(url(idxPath), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data, null, 2),
        });
      } catch (e) {
        console.warn("[localTemplateClient] Could not persist index:", e);
      }
    }

    async function saveContentFile(filename, content) {
      const path = `${storePath}/${filename}`;
      try {
        await fetch(url(path), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: typeof content === "string" ? content : JSON.stringify(content),
        });
      } catch (e) {
        console.warn("[localTemplateClient] Could not save content file:", e);
      }
    }

    // ---- Categories ----

    async function loadCategories() {
      if (categoriesCache) return categoriesCache;
      try {
        const resp = await fetch(url(categoriesPath) + "?t=" + Date.now());
        if (resp.ok) {
          categoriesCache = await resp.json();
        } else {
          categoriesCache = [];
        }
      } catch {
        categoriesCache = [];
      }
      return categoriesCache;
    }

    async function saveCategories(data) {
      categoriesCache = data;
      try {
        await fetch(url(categoriesPath), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data, null, 2),
        });
      } catch (e) {
        console.warn("[localTemplateClient] Could not save categories:", e);
      }
    }

    // ---- Tags ----

    async function loadTags() {
      if (tagsCache) return tagsCache;
      try {
        const resp = await fetch(url(tagsPath) + "?t=" + Date.now());
        if (resp.ok) {
          tagsCache = await resp.json();
        } else {
          tagsCache = [];
        }
      } catch {
        tagsCache = [];
      }
      return tagsCache;
    }

    async function saveTags(data) {
      tagsCache = data;
      try {
        await fetch(url(tagsPath), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data, null, 2),
        });
      } catch (e) {
        console.warn("[localTemplateClient] Could not save tags:", e);
      }
    }

    // ---- Template CRUD (same interface as API templateClient) ----

    const client = {
      list: async function (params = {}) {
        let items = await loadIndex();

        // Filter by category (support both category string and category_ids array)
        if (params.category) {
          items = items.filter(function (it) {
            // Match by category_ids array
            if (
              it.category_ids &&
              Array.isArray(it.category_ids) &&
              it.category_ids.length > 0
            ) {
              return it.category_ids.includes(params.category);
            }
            // Fallback: match by legacy category string field
            return it.category === params.category;
          });
        }

        // Filter by category_id (single category ID)
        if (params.category_id) {
          items = items.filter(function (it) {
            if (it.category_ids && Array.isArray(it.category_ids)) {
              return it.category_ids.includes(params.category_id);
            }
            return false;
          });
        }

        // Filter by tag_ids
        if (
          params.tag_ids &&
          Array.isArray(params.tag_ids) &&
          params.tag_ids.length
        ) {
          const mode = params.tag_mode === "any" ? "any" : "all";
          items = items.filter(function (it) {
            const tplTagIds = (it.tag_ids || []).map(String);
            if (mode === "all") {
              return params.tag_ids.every(function (tid) {
                return tplTagIds.includes(String(tid));
              });
            } else {
              return params.tag_ids.some(function (tid) {
                return tplTagIds.includes(String(tid));
              });
            }
          });
        }

        // Search by name
        if (params.q) {
          const q = params.q.toLowerCase();
          items = items.filter(function (it) {
            return (it.name || "").toLowerCase().includes(q);
          });
        }

        // Resolve tags for each template
        const allTags = await loadTags();
        items = items.map(function (it) {
          const tags = (it.tag_ids || [])
            .map(function (tid) {
              return allTags.find(function (t) {
                return String(t.id) === String(tid);
              });
            })
            .filter(Boolean);
          return Object.assign({}, it, { tags: tags });
        });

        return items;
      },

      get: async function (id) {
        const items = await loadIndex();
        const entry = items.find(function (it) {
          return it.id === id;
        });
        if (!entry) throw new Error("Template not found: " + id);

        // Load content
        let content = null;
        if (entry.content_path) {
          try {
            const resp = await fetch(
              url(entry.content_path) + "?t=" + Date.now(),
            );
            if (resp.ok) content = await resp.json();
          } catch (e) {
            console.warn("[localTemplateClient] Could not load content:", e);
          }
        }
        if (!content && entry.content) {
          content = entry.content;
        }

        // Resolve tags
        const allTags = await loadTags();
        const tags = (entry.tag_ids || [])
          .map(function (tid) {
            return allTags.find(function (t) {
              return String(t.id) === String(tid);
            });
          })
          .filter(Boolean);

        return Object.assign({}, entry, { content: content, tags: tags });
      },

      create: async function (payload) {
        const items = await loadIndex();
        const id = uuid();
        const contentId = uuid();
        const filename = contentId + ".json";

        // Save content to file
        if (payload.content) {
          await saveContentFile(filename, payload.content);
        }

        // Build category_ids: from explicit array, or from category string
        let categoryIds = payload.category_ids || [];
        if (categoryIds.length === 0 && payload.category) {
          // Check if category is a valid category ID
          const cats = await loadCategories();
          const cat = cats.find(function (c) {
            return c.id === payload.category || c.slug === payload.category;
          });
          if (cat) {
            categoryIds = [cat.id];
          }
        }

        const now = new Date().toISOString();
        const entry = {
          id: id,
          name: payload.name || "Untitled",
          category: payload.category || "",
          category_ids: categoryIds,
          content_path: storePath + "/" + filename,
          start_cell: payload.start_cell || "A1",
          tag_ids: payload.tag_ids || [],
          created_at: now,
          updated_at: now,
        };

        items.push(entry);
        await saveIndex(items);

        // Resolve tags for return
        const allTags = await loadTags();
        const tags = (entry.tag_ids || [])
          .map(function (tid) {
            return allTags.find(function (t) {
              return String(t.id) === String(tid);
            });
          })
          .filter(Boolean);

        return Object.assign({}, entry, { tags: tags });
      },

      patch: async function (id, payload) {
        const items = await loadIndex();
        const idx = items.findIndex(function (it) {
          return it.id === id;
        });
        if (idx === -1) throw new Error("Template not found: " + id);

        const entry = items[idx];

        if (payload.content_path) entry.content_path = payload.content_path;
        if (payload.start_cell) entry.start_cell = payload.start_cell;
        if (payload.tag_ids) entry.tag_ids = payload.tag_ids;
        if (payload.category_ids) entry.category_ids = payload.category_ids;
        if (payload.category) {
          entry.category = payload.category;
          // Also update category_ids if a valid category ID is given
          if (!payload.category_ids) {
            const cats = await loadCategories();
            const cat = cats.find(function (c) {
              return c.id === payload.category || c.slug === payload.category;
            });
            if (cat) {
              entry.category_ids = [cat.id];
            }
          }
        }
        if (payload.name) entry.name = payload.name;
        entry.updated_at = new Date().toISOString();

        items[idx] = entry;
        await saveIndex(items);

        return entry;
      },

      remove: async function (id) {
        let items = await loadIndex();
        const entry = items.find(function (it) {
          return it.id === id;
        });
        // Delete the content file if it exists
        if (entry && entry.content_path) {
          try {
            await fetch(url(entry.content_path), { method: "DELETE" });
          } catch {
            // ignore — file may not exist or server may not support DELETE
          }
        }
        items = items.filter(function (it) {
          return it.id !== id;
        });
        await saveIndex(items);
      },

      uploadContent: async function (content) {
        const contentId = uuid();
        const filename = contentId + ".json";
        await saveContentFile(filename, content);
        return { content_path: storePath + "/" + filename };
      },

      // ---- Category CRUD ----

      listCategories: async function () {
        return await loadCategories();
      },

      createCategory: async function (payload) {
        const cats = await loadCategories();
        const id = uuid();
        const entry = {
          id: id,
          name: payload.name,
          slug: slugify(payload.name),
          parent_id: payload.parent_id || null,
          icon: payload.icon || "",
          created_at: new Date().toISOString(),
        };
        cats.push(entry);
        await saveCategories(cats);
        return entry;
      },

      updateCategory: async function (id, payload) {
        const cats = await loadCategories();
        const idx = cats.findIndex(function (c) {
          return c.id === id;
        });
        if (idx === -1) throw new Error("Category not found: " + id);

        if (payload.name !== undefined) {
          cats[idx].name = payload.name;
          cats[idx].slug = slugify(payload.name);
        }
        if (payload.parent_id !== undefined)
          cats[idx].parent_id = payload.parent_id;
        if (payload.icon !== undefined) cats[idx].icon = payload.icon;

        await saveCategories(cats);
        return cats[idx];
      },

      removeCategory: async function (id) {
        let cats = await loadCategories();
        // Also re-parent children
        cats = cats.map(function (c) {
          if (c.parent_id === id)
            return Object.assign({}, c, { parent_id: null });
          return c;
        });
        cats = cats.filter(function (c) {
          return c.id !== id;
        });

        // Remove category from templates
        let items = await loadIndex();
        items = items.map(function (it) {
          if (it.category_ids && Array.isArray(it.category_ids)) {
            return Object.assign({}, it, {
              category_ids: it.category_ids.filter(function (cid) {
                return cid !== id;
              }),
            });
          }
          return it;
        });

        await saveCategories(cats);
        await saveIndex(items);
      },

      getCategoryTree: async function () {
        const cats = await loadCategories();
        const roots = cats.filter(function (c) {
          return !c.parent_id;
        });
        function buildTree(nodes) {
          return nodes.map(function (node) {
            const children = cats.filter(function (c) {
              return c.parent_id === node.id;
            });
            return Object.assign({}, node, { children: buildTree(children) });
          });
        }
        return buildTree(roots);
      },

      // ---- Tag CRUD ----

      listTags: async function () {
        return await loadTags();
      },

      searchTags: async function (q) {
        const tags = await loadTags();
        if (!q) return tags;
        const query = q.toLowerCase();
        return tags.filter(function (t) {
          return (t.name || "").toLowerCase().includes(query);
        });
      },

      createTag: async function (name) {
        const tags = await loadTags();
        // Check duplicate
        const existing = tags.find(function (t) {
          return (t.name || "").toLowerCase() === (name || "").toLowerCase();
        });
        if (existing) return existing;

        const entry = {
          id: uuid(),
          name: name,
          slug: slugify(name),
          created_at: new Date().toISOString(),
        };
        tags.push(entry);
        await saveTags(tags);
        return entry;
      },

      removeTag: async function (id) {
        let tags = await loadTags();
        tags = tags.filter(function (t) {
          return t.id !== id;
        });

        // Remove tag from templates
        let items = await loadIndex();
        items = items.map(function (it) {
          if (it.tag_ids && Array.isArray(it.tag_ids)) {
            return Object.assign({}, it, {
              tag_ids: it.tag_ids.filter(function (tid) {
                return tid !== id;
              }),
            });
          }
          return it;
        });

        await saveTags(tags);
        await saveIndex(items);
      },

      // Count templates per tag/category
      getTagTemplateCounts: async function () {
        const items = await loadIndex();
        const counts = {};
        for (const it of items) {
          for (const tid of it.tag_ids || []) {
            counts[tid] = (counts[tid] || 0) + 1;
          }
        }
        return counts;
      },

      getCategoryTemplateCounts: async function () {
        const items = await loadIndex();
        const cats = await loadCategories();
        const counts = {};
        for (const it of items) {
          // Count from category_ids array
          if (it.category_ids && Array.isArray(it.category_ids)) {
            for (const cid of it.category_ids) {
              counts[cid] = (counts[cid] || 0) + 1;
            }
          }
          // Also count legacy category string (resolve to ID)
          if (
            it.category &&
            (!it.category_ids || it.category_ids.length === 0)
          ) {
            const cat = cats.find(function (c) {
              return c.id === it.category || c.slug === it.category;
            });
            if (cat) {
              counts[cat.id] = (counts[cat.id] || 0) + 1;
            }
          }
        }
        return counts;
      },

      // Clear cache (force reload)
      clearCache: function () {
        indexCache = null;
        categoriesCache = null;
        tagsCache = null;
      },
    };

    return client;
  }

  global.UNIVER_LOCAL_STORAGE = {
    create: createLocalTemplateClient,
  };
})(window);
