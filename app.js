(function () {
  "use strict";

  var STORAGE_KEY = "payment_tracker_entries_v1";

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

  // ---------- State ----------
  var entries = load();

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (e) {
      alert("Could not save data in this browser.");
    }
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

  function newId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
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

    emptyEl.hidden = list.length !== 0;
  }

  function render() {
    renderStats();
    renderTable();
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

    if (f.id.value) {
      var idx = entries.findIndex(function (x) { return x.id === f.id.value; });
      if (idx !== -1) {
        data.id = entries[idx].id;
        data.created = entries[idx].created;
        entries[idx] = data;
      }
    } else {
      data.id = newId();
      data.created = Date.now();
      entries.push(data);
    }

    save();
    resetForm();
    render();
  });

  cancelBtn.addEventListener("click", resetForm);

  // ---------- Table actions ----------
  bodyEl.addEventListener("click", function (ev) {
    var btn = ev.target.closest("button[data-act]");
    if (!btn) return;

    var id = btn.getAttribute("data-id");
    var act = btn.getAttribute("data-act");

    if (act === "toggle") {
      var e = entries.find(function (x) { return x.id === id; });
      if (e) {
        e.status = e.status === "Completed" ? "Pending" : "Completed";
        save();
        render();
      }
    } else if (act === "edit") {
      startEdit(id);
    } else if (act === "delete") {
      if (confirm("Delete this entry?")) {
        entries = entries.filter(function (x) { return x.id !== id; });
        save();
        if (f.id.value === id) resetForm();
        render();
      }
    }
  });

  // ---------- Filters ----------
  [searchEl, filterStatusEl, filterCategoryEl, sortByEl].forEach(function (el) {
    el.addEventListener("input", renderTable);
    el.addEventListener("change", renderTable);
  });

  // ---------- Export / Clear ----------
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
    if (confirm("Delete ALL entries? This cannot be undone.")) {
      entries = [];
      save();
      resetForm();
      render();
    }
  });

  // ---------- Init ----------
  resetForm();
  render();
})();
