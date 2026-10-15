(function () {
  "use strict";

  var AUTH_KEY = "payment_tracker_auth_v1";
  var SESSION_KEY = "payment_tracker_session";
  var LOCK_KEY = "payment_tracker_lock_v1";
  var MAX_TRIES = 5;
  var LOCK_MS = 60 * 1000;

  var form = document.getElementById("loginForm");
  var userEl = document.getElementById("username");
  var passEl = document.getElementById("password");
  var confirmEl = document.getElementById("confirm");
  var confirmField = document.getElementById("confirmField");
  var msgEl = document.getElementById("msg");
  var btn = document.getElementById("loginBtn");
  var subEl = document.getElementById("loginSub");
  var noteEl = document.getElementById("loginNote");

  // Already signed in
  try {
    if (sessionStorage.getItem(SESSION_KEY) === "1") {
      location.replace("index.html");
      return;
    }
  } catch (e) {}

  function getAuth() {
    try { return JSON.parse(localStorage.getItem(AUTH_KEY)); } catch (e) { return null; }
  }

  function showMsg(text) {
    msgEl.textContent = text;
    msgEl.hidden = !text;
  }

  // Fallback hash for contexts where crypto.subtle is unavailable
  function fallbackHash(str) {
    var h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (var i = 0; i < str.length; i++) {
      var ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h2 >>> 0).toString(16).padStart(8, "0") + (h1 >>> 0).toString(16).padStart(8, "0");
  }

  function hash(text) {
    if (window.crypto && crypto.subtle && window.TextEncoder) {
      return crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)).then(function (buf) {
        return Array.prototype.map.call(new Uint8Array(buf), function (b) {
          return b.toString(16).padStart(2, "0");
        }).join("");
      });
    }
    return Promise.resolve(fallbackHash(text));
  }

  function randomSalt() {
    if (window.crypto && crypto.getRandomValues) {
      var a = new Uint8Array(16);
      crypto.getRandomValues(a);
      return Array.prototype.map.call(a, function (b) {
        return b.toString(16).padStart(2, "0");
      }).join("");
    }
    return Date.now().toString(16) + Math.random().toString(16).slice(2);
  }

  // Lockout after repeated failures
  function getLock() {
    try { return JSON.parse(localStorage.getItem(LOCK_KEY)) || { tries: 0, until: 0 }; }
    catch (e) { return { tries: 0, until: 0 }; }
  }
  function setLock(l) {
    try { localStorage.setItem(LOCK_KEY, JSON.stringify(l)); } catch (e) {}
  }

  // Mode: setup (first time) or login
  var auth = getAuth();
  var setupMode = !auth;

  if (setupMode) {
    subEl.textContent = "CREATE YOUR LOGIN";
    btn.textContent = "CREATE ACCOUNT";
    confirmField.hidden = false;
    confirmEl.required = true;
    passEl.setAttribute("autocomplete", "new-password");
    noteEl.textContent = "First time here. Choose a username and password. Only these will open the tracker.";
  } else {
    noteEl.textContent = "Authorized access only.";
  }

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    showMsg("");

    var user = userEl.value.trim();
    var pass = passEl.value;

    if (setupMode) {
      if (user.length < 3) return showMsg("Username must be at least 3 characters.");
      if (pass.length < 6) return showMsg("Password must be at least 6 characters.");
      if (pass !== confirmEl.value) return showMsg("Passwords do not match.");

      var salt = randomSalt();
      hash(salt + ":" + pass).then(function (h) {
        try {
          localStorage.setItem(AUTH_KEY, JSON.stringify({
            user: user.toLowerCase(),
            salt: salt,
            hash: h
          }));
          sessionStorage.setItem(SESSION_KEY, "1");
        } catch (e) {
          return showMsg("Could not save login in this browser.");
        }
        location.replace("index.html");
      });
      return;
    }

    // Login
    var lock = getLock();
    var now = Date.now();
    if (lock.until > now) {
      var secs = Math.ceil((lock.until - now) / 1000);
      return showMsg("Too many attempts. Try again in " + secs + " seconds.");
    }

    hash(auth.salt + ":" + pass).then(function (h) {
      var ok = user.toLowerCase() === auth.user && h === auth.hash;

      if (ok) {
        setLock({ tries: 0, until: 0 });
        try { sessionStorage.setItem(SESSION_KEY, "1"); } catch (e) {}
        location.replace("index.html");
        return;
      }

      lock.tries = (lock.tries || 0) + 1;
      if (lock.tries >= MAX_TRIES) {
        lock = { tries: 0, until: Date.now() + LOCK_MS };
        setLock(lock);
        showMsg("Too many attempts. Locked for 60 seconds.");
      } else {
        setLock(lock);
        showMsg("Wrong username or password. " + (MAX_TRIES - lock.tries) + " tries left.");
      }
      passEl.value = "";
      passEl.focus();
    });
  });
})();
