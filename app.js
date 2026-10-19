(function () {
  "use strict";

  var TOKEN_KEY = "payment_tracker_token";
  var API = ((window.APP_CONFIG && window.APP_CONFIG.API_URL) || "").replace(/\/+$/, "");

  // ---------- Elements ----------
  var form = document.getElementById("entryForm");
  var formTitle = document.getElementById("formTitle");
  var submitBtn = document.getElementById("submitBtn");
  var cancelBtn = document.getElementById("cancelBtn");

  var f = {
    id: document.getElementById("entryId"),
    title: document.getElementById("title"),
    client: document.getElementById("client"),
    category: document.getElementById("category"),
    amount: document.getElementById("amount"),
    date: document.getElementById("date"),
    status: document.getElementById("status"),
    notes: document.getElementById("notes")
  };

  var searchEl = document.getElementById("search");
  var filterStatusEl = document.getElementById("filterStatus");
  var filterCategoryEl = document.getElementById("filterCategory");
  var sortByEl = document.getElementById("sortBy");

  var bodyEl = document.getElementById("entryBody");
  var emptyEl = document.getElementById("emptyMsg");

  var statTotal = document.getElementById("statTotal");
  var statPendingCount = document.getElementById("statPendingCount");
  var statPendingAmount = document.getElementById("statPendingAmount");
  var statDoneCount = document.getElementById("statDoneCount");
  var statDoneAmount = document.getElementById("statDoneAmount");
  var statAmount = document.getElementById("statAmount");

  // Spending elements
  var expForm = document.getElementById("expForm");
  var expFormTitle = document.getElementById("expFormTitle");
  var expSubmit = document.getElementById("expSubmit");
  var expCancel = document.getElementById("expCancel");
  var x = {
    id: document.getElementById("expId"),
    title: document.getElementById("expTitle"),
    category: document.getElementById("expCategory"),
    amount: document.getElementById("expAmount"),
    date: document.getElementById("expDate"),
    notes: document.getElementById("expNotes")
  };
  var expFilterEl = document.getElementById("expFilter");
  var expBodyEl = document.getElementById("expBody");
  var expEmptyEl = document.getElementById("expEmpty");
  var breakdownEl = document.getElementById("breakdown");
  var moneyIn = document.getElementById("moneyIn");
  var moneyOut = document.getElementById("moneyOut");
  var moneyOutCount = document.getElementById("moneyOutCount");
  var moneyLeft = document.getElementById("moneyLeft");
  var moneyUsed = document.getElementById("moneyUsed");

  // ---------- State ----------
  var entries = [];
  var loaded = false;
  var expenses = [];
  var expLoaded = false;

  // ---------- Session ----------
  function getToken() {
    try { return sessionStorage.getItem(TOKEN_KEY) || ""; } catch (e) { return ""; }
  }

  function goToLogin() {
    try { sessionStorage.removeItem(TOKEN_KEY); } catch (e) {}
    location.replace("login.html");
  }

  if (!getToken()) {
    goToLogin();
    return;
  }

  // ---------- API ----------
  function api(path, opts) {
    opts = opts || {};
    var headers = { Authorization: "Bearer " + getToken() };
    if (opts.body) headers["Content-Type"] = "application/json";

    return fetch(API + path, {
      method: opts.method || "GET",
      headers: headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined
    }).then(function (r) {
      if (r.status === 401) {
        goToLogin();
        throw new Error("Session ended. Please sign in again.");
      }
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) throw new Error(d.error || "Request failed.");
        return d;
      });
    });
  }

  function fail(err) {
    alert(err && err.message ? err.message : "Something went wrong.");
  }

  function loadEntries() {
    return api("/api/entries").then(function (d) {
      entries = d.entries || [];
      loaded = true;
      render();
    });
  }

  // ---------- Helpers ----------
  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  }

  function money(n) {
    return "PKR " + Number(n || 0).toLocaleString("en-US");
  }

  function esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatDate(iso) {
    if (!iso) return "";
    var p = iso.split("-");
    if (p.length !== 3) return iso;
    return p[2] + "/" + p[1] + "/" + p[0];
  }

  // ---------- Render ----------
  function getVisible() {
    var q = searchEl.value.trim().toLowerCase();
    var st = filterStatusEl.value;
    var cat = filterCategoryEl.value;

    var list = entries.filter(function (e) {
      if (st !== "All" && e.status !== st) return false;
      if (cat !== "All" && e.category !== cat) return false;
      if (q) {
        var hay = (e.title + " " + e.client + " " + (e.notes || "")).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });

    var sort = sortByEl.value;
    list.sort(function (a, b) {
      if (sort === "oldest") return a.date.localeCompare(b.date) || a.created - b.created;
      if (sort === "amountHigh") return b.amount - a.amount;
      if (sort === "amountLow") return a.amount - b.amount;
      return b.date.localeCompare(a.date) || b.created - a.created;
    });

    return list;
  }

  function renderStats() {
    var pending = entries.filter(function (e) { return e.status === "Pending"; });
    var done = entries.filter(function (e) { return e.status === "Completed"; });

    var sum = function (arr) {
      return arr.reduce(function (t, e) { return t + Number(e.amount); }, 0);
    };

    statTotal.textContent = entries.length;
    statPendingCount.textContent = pending.length;
    statPendingAmount.textContent = money(sum(pending));
    statDoneCount.textContent = done.length;
    statDoneAmount.textContent = money(sum(done));
    statAmount.textContent = money(sum(entries));
  }

  function renderTable() {
    var list = getVisible();
    bodyEl.innerHTML = "";

    list.forEach(function (e, i) {
      var tr = document.createElement("tr");
      var isDone = e.status === "Completed";

      tr.innerHTML =
        "<td>" + (i + 1) + "</td>" +
        "<td>" + esc(formatDate(e.date)) + "</td>" +
        "<td>" + esc(e.title) +
          (e.notes ? '<span class="sub-note">' + esc(e.notes) + "</span>" : "") +
        "</td>" +
        "<td>" + esc(e.client) + "</td>" +
        "<td>" + esc(e.category) + "</td>" +
        '<td class="num">' + esc(money(e.amount)) + "</td>" +
        '<td><span class="tag ' + (isDone ? "tag-completed" : "tag-pending") + '">' +
          esc(e.status) + "</span></td>" +
        '<td class="act-col"><div class="row-actions">' +
          '<button type="button" class="btn" data-act="toggle" data-id="' + esc(e.id) + '">' +
            (isDone ? "MARK PENDING" : "MARK PAID") + "</button>" +
          '<button type="button" class="btn" data-act="edit" data-id="' + esc(e.id) + '">EDIT</button>' +
          '<button type="button" class="btn" data-act="delete" data-id="' + esc(e.id) + '">DELETE</button>' +
        "</div></td>";

      bodyEl.appendChild(tr);
    });

    if (!loaded) {
      emptyEl.textContent = "LOADING...";
      emptyEl.hidden = false;
    } else {
      emptyEl.textContent = "NO ENTRIES FOUND";
      emptyEl.hidden = list.length !== 0;
    }
  }

  function render() {
    renderStats();
    renderTable();
    renderMoney();
  }

  // ---------- Money overview (received vs spent) ----------
  function sumAmount(arr) {
    return arr.reduce(function (t, e) { return t + Number(e.amount); }, 0);
  }

  function signedMoney(n) {
    return (n < 0 ? "-" : "") + money(Math.abs(n));
  }

  function renderMoney() {
    var received = sumAmount(entries.filter(function (e) { return e.status === "Completed"; }));
    var spent = sumAmount(expenses);
    var left = received - spent;
    var pct = received > 0 ? Math.round((spent / received) * 100) : (spent > 0 ? 100 : 0);

    moneyIn.textContent = money(received);
    moneyOut.textContent = money(spent);
    moneyOutCount.textContent = expenses.length + (expenses.length === 1 ? " expense" : " expenses");
    moneyLeft.textContent = signedMoney(left);
    moneyUsed.textContent = pct + "% of income spent" + (left < 0 ? " (OVERSPENT)" : "");
  }

  function renderBreakdown() {
    var totals = {};
    expenses.forEach(function (e) {
      totals[e.category] = (totals[e.category] || 0) + Number(e.amount);
    });
    var all = sumAmount(expenses);
    var cats = Object.keys(totals).sort(function (a, b) { return totals[b] - totals[a]; });

    if (!cats.length) {
      breakdownEl.innerHTML = '<p class="bd-empty">NO SPENDING YET</p>';
      return;
    }

    breakdownEl.innerHTML = cats.map(function (c) {
      var p = all > 0 ? (totals[c] / all) * 100 : 0;
      return '<div class="bd-row">' +
        '<span class="bd-name">' + esc(c) + "</span>" +
        '<div class="bd-bar"><div class="bd-fill" style="width:' + p.toFixed(1) + '%"></div></div>' +
        '<span class="bd-val">' + esc(money(totals[c])) + " (" + Math.round(p) + "%)</span>" +
        "</div>";
    }).join("");
  }

  function renderExpenses() {
    var cat = expFilterEl.value;
    var list = expenses.filter(function (e) { return cat === "All" || e.category === cat; });
    expBodyEl.innerHTML = "";

    list.forEach(function (e, i) {
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" + (i + 1) + "</td>" +
        "<td>" + esc(formatDate(e.date)) + "</td>" +
        "<td>" + esc(e.title) +
          (e.notes ? '<span class="sub-note">' + esc(e.notes) + "</span>" : "") +
        "</td>" +
        "<td>" + esc(e.category) + "</td>" +
        '<td class="num">' + esc(money(e.amount)) + "</td>" +
        '<td class="act-col"><div class="row-actions">' +
          '<button type="button" class="btn" data-act="edit" data-id="' + esc(e.id) + '">EDIT</button>' +
          '<button type="button" class="btn" data-act="delete" data-id="' + esc(e.id) + '">DELETE</button>' +
        "</div></td>";
      expBodyEl.appendChild(tr);
    });

    if (!expLoaded) {
      expEmptyEl.textContent = "LOADING...";
      expEmptyEl.hidden = false;
    } else {
      expEmptyEl.textContent = "NO EXPENSES YET";
      expEmptyEl.hidden = list.length !== 0;
    }
    renderBreakdown();
    renderMoney();
  }

  // ---------- Form ----------
  function resetForm() {
    form.reset();
    f.id.value = "";
    f.date.value = todayISO();
    f.status.value = "Pending";
    formTitle.textContent = "ADD NEW ENTRY";
    submitBtn.textContent = "ADD ENTRY";
    cancelBtn.hidden = true;
  }

  function startEdit(id) {
    var e = entries.find(function (x) { return x.id === id; });
    if (!e) return;

    f.id.value = e.id;
    f.title.value = e.title;
    f.client.value = e.client;
    f.category.value = e.category;
    f.amount.value = e.amount;
    f.date.value = e.date;
    f.status.value = e.status;
    f.notes.value = e.notes || "";

    formTitle.textContent = "EDIT ENTRY";
    submitBtn.textContent = "UPDATE ENTRY";
    cancelBtn.hidden = false;

    window.scrollTo({ top: form.offsetTop - 20, behavior: "smooth" });
    f.title.focus();
  }

  function entryPayload(e, overrides) {
    var p = {
      title: e.title,
      client: e.client,
      category: e.category,
      amount: e.amount,
      date: e.date,
      status: e.status,
      notes: e.notes || ""
    };
    Object.keys(overrides || {}).forEach(function (k) { p[k] = overrides[k]; });
    return p;
  }

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();

    var data = {
      title: f.title.value.trim(),
      client: f.client.value.trim(),
      category: f.category.value,
      amount: Number(f.amount.value),
      date: f.date.value,
      status: f.status.value,
      notes: f.notes.value.trim()
    };

    if (!data.title || !data.client || !data.date || isNaN(data.amount) || data.amount < 0) {
      alert("Please fill in all required fields correctly.");
      return;
    }

    var editingId = f.id.value;
    var label = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "SAVING...";

    var req = editingId
      ? api("/api/entries/" + encodeURIComponent(editingId), { method: "PUT", body: data })
      : api("/api/entries", { method: "POST", body: data });

    req
      .then(loadEntries)
      .then(resetForm)
      .catch(function (err) {
        submitBtn.textContent = label;
        fail(err);
      })
      .then(function () {
        submitBtn.disabled = false;
      });
  });

  cancelBtn.addEventListener("click", resetForm);

  // ---------- Table actions ----------
  bodyEl.addEventListener("click", function (ev) {
    var btn = ev.target.closest("button[data-act]");
    if (!btn || btn.disabled) return;

    var id = btn.getAttribute("data-id");
    var act = btn.getAttribute("data-act");
    var e = entries.find(function (x) { return x.id === id; });

    if (act === "edit") {
      startEdit(id);
      return;
    }

    if (act === "toggle" && e) {
      btn.disabled = true;
      var next = e.status === "Completed" ? "Pending" : "Completed";
      api("/api/entries/" + encodeURIComponent(id), {
        method: "PUT",
        body: entryPayload(e, { status: next })
      })
        .then(loadEntries)
        .catch(function (err) { btn.disabled = false; fail(err); });
      return;
    }

    if (act === "delete") {
      if (!confirm("Delete this entry?")) return;
      btn.disabled = true;
      api("/api/entries/" + encodeURIComponent(id), { method: "DELETE" })
        .then(function () {
          if (f.id.value === id) resetForm();
          return loadEntries();
        })
        .catch(function (err) { btn.disabled = false; fail(err); });
    }
  });

  // ---------- Filters ----------
  [searchEl, filterStatusEl, filterCategoryEl, sortByEl].forEach(function (el) {
    el.addEventListener("input", renderTable);
    el.addEventListener("change", renderTable);
  });

  // ---------- Export / Clear / Logout ----------
  document.getElementById("exportBtn").addEventListener("click", function () {
    if (!entries.length) {
      alert("Nothing to export yet.");
      return;
    }

    var cell = function (v) {
      return '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
    };

    var rows = [["Date", "Title", "Client", "Category", "Amount", "Status", "Notes"]];
    getVisible().forEach(function (e) {
      rows.push([e.date, e.title, e.client, e.category, e.amount, e.status, e.notes || ""]);
    });

    var csv = rows.map(function (r) { return r.map(cell).join(","); }).join("\r\n");
    var blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "payments-" + todayISO() + ".csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  document.getElementById("clearBtn").addEventListener("click", function () {
    if (!entries.length) return;
    if (!confirm("Delete ALL entries? This cannot be undone.")) return;
    api("/api/entries", { method: "DELETE" })
      .then(function () {
        resetForm();
        return loadEntries();
      })
      .catch(fail);
  });

  document.getElementById("logoutBtn").addEventListener("click", function () {
    var done = function () { goToLogin(); };
    api("/api/logout", { method: "POST" }).then(done, done);
  });

  // ---------- Spending: load / form / actions ----------
  function loadExpenses() {
    return api("/api/expenses").then(function (d) {
      expenses = d.expenses || [];
      expLoaded = true;
      renderExpenses();
    });
  }

  function resetExpForm() {
    expForm.reset();
    x.id.value = "";
    x.date.value = todayISO();
    expFormTitle.textContent = "ADD NEW EXPENSE";
    expSubmit.textContent = "ADD EXPENSE";
    expCancel.hidden = true;
  }

  expForm.addEventListener("submit", function (ev) {
    ev.preventDefault();

    var data = {
      title: x.title.value.trim(),
      category: x.category.value,
      amount: Number(x.amount.value),
      date: x.date.value,
      notes: x.notes.value.trim()
    };

    if (!data.title || !data.date || isNaN(data.amount) || data.amount <= 0) {
      alert("Please fill in all required fields correctly.");
      return;
    }

    var editingId = x.id.value;
    var label = expSubmit.textContent;
    expSubmit.disabled = true;
    expSubmit.textContent = "SAVING...";

    var req = editingId
      ? api("/api/expenses/" + encodeURIComponent(editingId), { method: "PUT", body: data })
      : api("/api/expenses", { method: "POST", body: data });

    req
      .then(loadExpenses)
      .then(resetExpForm)
      .catch(function (err) {
        expSubmit.textContent = label;
        fail(err);
      })
      .then(function () {
        expSubmit.disabled = false;
      });
  });

  expCancel.addEventListener("click", resetExpForm);
  expFilterEl.addEventListener("change", renderExpenses);

  expBodyEl.addEventListener("click", function (ev) {
    var btn = ev.target.closest("button[data-act]");
    if (!btn || btn.disabled) return;

    var id = btn.getAttribute("data-id");
    var act = btn.getAttribute("data-act");

    if (act === "edit") {
      var e = expenses.find(function (r) { return r.id === id; });
      if (!e) return;
      x.id.value = e.id;
      x.title.value = e.title;
      x.category.value = e.category;
      x.amount.value = e.amount;
      x.date.value = e.date;
      x.notes.value = e.notes || "";
      expFormTitle.textContent = "EDIT EXPENSE";
      expSubmit.textContent = "UPDATE EXPENSE";
      expCancel.hidden = false;
      window.scrollTo({ top: expForm.getBoundingClientRect().top + window.pageYOffset - 20, behavior: "smooth" });
      x.title.focus();
      return;
    }

    if (act === "delete") {
      if (!confirm("Delete this expense?")) return;
      btn.disabled = true;
      api("/api/expenses/" + encodeURIComponent(id), { method: "DELETE" })
        .then(function () {
          if (x.id.value === id) resetExpForm();
          return loadExpenses();
        })
        .catch(function (err) { btn.disabled = false; fail(err); });
    }
  });

  document.getElementById("expExport").addEventListener("click", function () {
    if (!expenses.length) {
      alert("No expenses to export yet.");
      return;
    }
    var cell = function (v) {
      return '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
    };
    var cat = expFilterEl.value;
    var rows = [["Date", "Spent On", "Category", "Amount", "Notes"]];
    expenses.forEach(function (e) {
      if (cat === "All" || e.category === cat) {
        rows.push([e.date, e.title, e.category, e.amount, e.notes || ""]);
      }
    });
    var csv = rows.map(function (r) { return r.map(cell).join(","); }).join("\r\n");
    var blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "expenses-" + todayISO() + ".csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  // ---------- Init ----------
  resetForm();
  resetExpForm();
  render();
  renderExpenses();
  loadEntries().catch(function (err) {
    emptyEl.textContent = "COULD NOT LOAD DATA";
    emptyEl.hidden = false;
    if (err && err.message) alert(err.message);
  });
  loadExpenses().catch(function (err) {
    expEmptyEl.textContent = "COULD NOT LOAD EXPENSES";
    expEmptyEl.hidden = false;
  });
})();
