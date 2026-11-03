import { celebrate } from "./motion.js";
const base = location.pathname.startsWith("/cody-vault") ? "/cody-vault" : "";
const $ = (s) => document.querySelector(s);
const titles = [
  "A separate vault",
  "Private by design",
  "Choose your vaultskin",
  "Set the agent PIN",
  "Enter the agent PIN",
  "What are the four images?",
  "Enter your email",
  "Complete the CAPTCHA",
];
let state = {},
  step = 1,
  skin = localStorage.getItem("cody-vault-skin") || "enterprise",
  selectedId = null,
  lastField = null,
  pinMode = "numbers",
  busy = false,
  widgetId = null,
  widgetToken = "",
  verificationReady = false;
const skins = [
  "enterprise",
  "medieval",
  "kittens",
  "retro",
  "space",
  "savanna",
];
if (!skins.includes(skin)) skin = "enterprise";
document.body.dataset.skin = skin;
$("#skin").value = skin;
const message = (t) => {
  $("#message").textContent = t;
};
async function api(path, body) {
  const r = await fetch(base + "/api/" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? {} : { "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const j = await r.json();
  if (!r.ok) throw Error(j.error || "Action failed");
  return j;
}
async function run(fn) {
  if (busy) return;
  busy = true;
  const buttons = [...$("#wizard").querySelectorAll("button")];
  buttons.forEach((b) => (b.disabled = true));
  try {
    message("");
    await fn();
  } catch (e) {
    message(e.message);
  } finally {
    busy = false;
    buttons.filter((b) => b.isConnected).forEach((b) => (b.disabled = false));
  }
}
const heading = (title, description) => {
  const h = document.createElement("h2");
  h.textContent = title;
  const p = document.createElement("p");
  p.textContent = description;
  $("#wizard").append(h, p);
};
function form(fields, label, submit) {
  const f = document.createElement("form");
  f.autocomplete = "off";
  for (const a of fields) {
    const l = document.createElement("label");
    l.textContent = a.label;
    const input = document.createElement(a.multiline ? "textarea" : "input");
    input.id = a.id;
    input.name = a.id;
    input.type = a.type || "text";
    if (a.inputMode) input.inputMode = a.inputMode;
    input.required = a.required !== false;
    if (a.max) input.maxLength = a.max;
    if (a.autocomplete) input.autocomplete = a.autocomplete;
    l.append(input);
    f.append(l);
  }
  const b = document.createElement("button");
  b.textContent = label;
  b.type = "submit";
  f.append(b);
  f.addEventListener("submit", (event) => {
    event.preventDefault();
    run(() => submit(Object.fromEntries(new FormData(f)), f));
  });
  $("#wizard").append(f);
  return f;
}
function button(text, fn, cls = "") {
  const b = document.createElement("button");
  b.textContent = text;
  b.className = cls;
  b.addEventListener("click", () => run(fn));
  $("#wizard").append(b);
  return b;
}
function render() {
  const green = document.getElementById("greenZone");
  if (green) green.hidden = step !== "vault";
  const tools = document.getElementById("dashboardTools");
  if (tools) tools.hidden = step !== "vault";
  if (widgetId !== null && window.turnstile) {
    turnstile.remove(widgetId);
    widgetId = null;
  }
  widgetToken = "";
  $("#wizard").replaceChildren();
  message("");
  $("#stepLabel").textContent =
    typeof step === "number"
      ? `STEP ${String(step).padStart(2, "0")} / 08`
      : "CODY VAULT / UNLOCKED";
  $("#steps").replaceChildren();
  titles.forEach((t, i) => {
    const li = document.createElement("li");
    li.textContent = t;
    li.className =
      i + 1 === step
        ? "active"
        : i + 1 < step || step === "vault"
          ? "done"
          : "";
    $("#steps").append(li);
  });
  $("#connection").textContent =
    (state.remote ? "WEB · " : "LOCAL · ") +
    (step === "vault" ? "UNLOCKED" : "LOCKED");
  $("#footerStatus").textContent =
    step === "vault"
      ? "PRIVATE SESSION · 15 MINUTES"
      : "LOCKED / NO PIN VALUES DISPLAYED";
  if (step === "vault") {
    renderVault();
    loadNote();
    return;
  }
  if (step === "remote-locked") {
    heading(
      "Green Zone is locked.",
      "Complete the wizard in your local vault. Its one-use handoff opens an approved web session here.",
    );
    const link = document.createElement("a");
    link.href = "http://localhost:3215/";
    link.target = "_top";
    link.textContent = "Open local vault";
    $("#wizard").append(link);
    return;
  }
  if (step === 1) {
    heading(
      "A vault of your own.",
      "Cody’s credential handler. This setup is separate from Madeline’s vault. You enter private values directly here.",
    );
    button("Begin private setup", async () => {
      await api("session", {});
      step = 2;
      render();
    });
  }
  if (step === 2) {
    heading(
      "You keep the private parts.",
      "PINs and secret values are not included in source code, Git or screenshots. This local build binds to your computer. Programs using your Windows account can access its private files.",
    );
    const n = document.createElement("p");
    n.className = "notice";
    n.textContent =
      "This is Cody’s new setup sequence, not a reconstruction of Madeline’s unknown wizard steps.";
    $("#wizard").append(n);
    button("Continue", async () => {
      step = 3;
      render();
    });
  }
  if (step === 3) {
    heading(
      "Precision, with character.",
      "Choose a skin at the right. A local encryption key has been generated privately; no PIN has been prefilled. Online email and CAPTCHA will be checked before access.",
    );
    button("Continue to private PIN setup", async () => {
      step = 4;
      render();
    });
  }
  if (step === 4) {
    heading(
      "Set the assigned agent PIN.",
      "Type it privately twice. The server stores a salted, peppered verifier; this page never echoes the digits.",
    );
    form(
      [
        {
          id: "pin",
          label: "Agent PIN",
          type: "password",
          inputMode: "numeric",
          max: 4,
        },
        {
          id: "confirm",
          label: "Confirm PIN",
          type: "password",
          inputMode: "numeric",
          max: 4,
        },
      ],
      "Save PIN privately",
      async (v, f) => {
        await api("setup", { ...v, skin });
        f.reset();
        state.configured = true;
        step = 5;
        render();
      },
    );
  }
  if (step === 5) {
    heading(
      "Your permission to enter.",
      "Enter the four-digit agent PIN. Four symbolic-image positions are available as an alternative input method.",
    );
    const switcher = button(
      pinMode === "numbers" ? "Use image positions" : "Use numeric entry",
      async () => {
        pinMode = pinMode === "numbers" ? "images" : "numbers";
        render();
      },
      "secondary",
    );
    switcher.style.marginBottom = "18px";
    const f = form(
      [
        {
          id: "pin",
          label: "Agent PIN",
          type: "password",
          inputMode: "numeric",
          max: 4,
        },
      ],
      "Verify PIN",
      async (v, form) => {
        try {
          await api("pin", v);
          step = 6;
          render();
        } finally {
          form.reset();
        }
      },
    );
    if (pinMode === "images") {
      const pad = document.createElement("div");
      pad.className = "pinpad";
      for (let value = 0; value < 10; value++) {
        const b = document.createElement("button");
        b.type = "button";
        b.setAttribute("aria-label", `Symbol for digit ${value}`);
        const dots = Array.from(
          { length: value },
          (_, i) =>
            `<circle cx="${12 + (i % 3) * 14}" cy="${10 + Math.floor(i / 3) * 13}" r="2.5"/>`,
        ).join("");
        b.innerHTML = `<svg viewBox="0 0 52 46" aria-hidden="true">${dots || '<circle cx="26" cy="23" r="12" fill="none" stroke="currentColor"/>'}</svg>`;
        b.onclick = () => {
          const input = f.elements.pin;
          if (input.value.length < 4) input.value += String(value);
        };
        pad.append(b);
      }
      f.insertBefore(pad, f.lastElementChild);
      const clear = document.createElement("button");
      clear.textContent = "Clear positions";
      clear.type = "button";
      clear.className = "secondary";
      clear.onclick = () => {
        f.elements.pin.value = "";
      };
      f.insertBefore(clear, f.lastElementChild);
    }
  }
  if (step === 6) {
    heading(
      "What are the four images?",
      "Name each symbolic image in order. They represent the four positions; no PIN digits are encoded in the artwork.",
    );
    const f = document.createElement("form");
    const names = ["dinosaur", "tower", "archetype", "system"];
    names.forEach((name, i) => {
      const row = document.createElement("label");
      row.className = "challenge-item";
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const use = document.createElementNS(svg.namespaceURI, "use");
      use.setAttribute("href", base + "/symbols.svg#" + name);
      svg.append(use);
      svg.setAttribute("aria-hidden", "true");
      const wrap = document.createElement("span");
      wrap.textContent = "Image " + (i + 1);
      const input = document.createElement("input");
      input.required = true;
      input.maxLength = 40;
      input.name = "image" + i;
      input.autocomplete = "off";
      wrap.append(input);
      row.append(svg, wrap);
      f.append(row);
    });
    const b = document.createElement("button");
    b.textContent = "Verify the four images";
    f.append(b);
    f.onsubmit = (e) => {
      e.preventDefault();
      run(async () => {
        await api("images", {
          answers: [...f.querySelectorAll("input")].map((n) => n.value),
        });
        f.reset();
        step = 7;
        render();
      });
    };
    $("#wizard").append(f);
  }
  if (step === 7) {
    heading(
      "Your email, privately.",
      "Enter the address you chose. After the CAPTCHA, you can request a sign-in code. No phone/SMS verification is used in this flow.",
    );
    form(
      [
        {
          id: "email",
          label: "Email address",
          type: "email",
          max: 254,
          autocomplete: "email",
        },
      ],
      "Continue to CAPTCHA",
      async (v, f) => {
        await api("email", v);
        f.reset();
        step = 8;
        render();
      },
    );
  }
  if (step === 8) {
    heading(
      "The human step.",
      "Complete the CAPTCHA yourself, then request the email code. The final button stays locked until the server verifies that code.",
    );
    if (!state.captchaReady || !state.mailReady) {
      const p = document.createElement("p");
      p.className = "notice";
      p.textContent =
        "Email or CAPTCHA is not yet configured. No placeholder challenge will grant access.";
      $("#wizard").append(p);
      return;
    }
    const target = document.createElement("div");
    target.id = "captcha";
    $("#wizard").append(target);
    mountCaptcha();
    button("Verify CAPTCHA & send email code", async () => {
      if (!widgetToken) throw Error("Complete the CAPTCHA first.");
      try {
        await api("captcha", { token: widgetToken });
        showCodeForm();
        message("Email code requested. Enter the code from your inbox.");
      } finally {
        widgetToken = "";
        if (widgetId !== null) turnstile.reset(widgetId);
      }
    });
  }
}
function mountCaptcha() {
  if (window.turnstile) {
    widgetId = turnstile.render("#captcha", {
      sitekey: state.captchaSitekey,
      action: "vault_login",
      theme: "dark",
      callback: (t) => {
        widgetToken = t;
      },
      "expired-callback": () => {
        widgetToken = "";
      },
      "error-callback": () => {
        widgetToken = "";
        message("CAPTCHA could not load. Check connectivity and retry.");
      },
    });
    return;
  }
  if (!document.querySelector("#turnstile-script")) {
    const script = document.createElement("script");
    script.id = "turnstile-script";
    script.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.onload = () => {
      if (step === 8) mountCaptcha();
    };
    script.onerror = () =>
      message("CAPTCHA is unavailable. Your vault remains locked.");
    document.head.append(script);
  }
}
function showCodeForm() {
  if ($("#code")) return;
  form(
    [
      {
        id: "code",
        label: "Email sign-in code",
        type: "password",
        inputMode: "numeric",
        max: 6,
        autocomplete: "one-time-code",
      },
    ],
    "Verify email code",
    async (v, f) => {
      await api("verify-email", v);
      f.reset();
      verificationReady = true;
      $("#wizard").replaceChildren();
      heading(
        "Your checks are complete.",
        "The final action opens Cody’s vault. A short, skin-matched celebration follows only after the server grants access.",
      );
      button("Enter Cody’s vault", async () => {
        if (!verificationReady) throw Error("Verification required.");
        const finished = await api("finish", {});
        verificationReady = false;
        step = "vault";
        render();
        celebrate(skin);
        if (finished.handoffUrl)
          setTimeout(() => {
            if (window.parent !== window)
              window.parent.postMessage(
                { type: "cody-vault-handoff", url: finished.handoffUrl },
                location.origin,
              );
            else location.assign(finished.handoffUrl);
          }, 1400);
      });
    },
  );
}
async function renderVault() {
  heading(
    "Cody’s vault.",
    "Store a password, API key or private note. Secret values are encrypted before local database storage.",
  );
  const row = document.createElement("div");
  row.className = "row";
  const newBtn = document.createElement("button");
  newBtn.textContent = "New secret";
  newBtn.onclick = () => editSecret();
  const lock = document.createElement("button");
  lock.textContent = "Lock vault";
  lock.className = "secondary";
  lock.onclick = () => lockVault();
  row.append(newBtn, lock);
  $("#wizard").append(row);
  const list = document.createElement("div");
  list.className = "vault-list";
  list.style.marginTop = "25px";
  $("#wizard").append(list);
  try {
    const j = await api("secrets");
    if (!j.items.length) {
      const p = document.createElement("p");
      p.className = "muted";
      p.textContent = "Your vault is empty. Add the first item privately.";
      list.append(p);
    }
    for (const item of j.items) {
      const b = document.createElement("button");
      b.textContent = item.name + " · " + item.kind;
      b.onclick = () =>
        run(async () => {
          const value = await api("secrets/reveal", { id: item.id });
          editSecret({ ...value, id: item.id });
        });
      list.append(b);
    }
  } catch (e) {
    message(e.message);
  }
}
function editSecret(item = {}) {
  if (step !== "vault") {
    message("Unlock the vault first.");
    return;
  }
  selectedId = item.id || null;
  $("#wizard").replaceChildren();
  heading(
    item.id ? "Edit secret" : "New secret",
    "Save stores encrypted data locally. Delete removes this item from the active list; it is not a certified disk wipe.",
  );
  const f = form(
    [
      { id: "name", label: "Item name", max: 120 },
      { id: "value", label: "Secret value", type: "password", max: 16000 },
    ],
    "Save secret",
    async (v, form) => {
      await api("secrets/save", {
        ...v,
        id: selectedId,
        kind: item.kind || "password",
      });
      form.reset();
      selectedId = null;
      render();
      message("Saved encrypted locally.");
    },
  );
  f.elements.name.value = item.name || "";
  f.elements.value.value = item.value || "";
  if (item.id)
    button(
      "Delete this item",
      async () => {
        if (!confirm("Delete this saved item?")) return;
        await api("secrets/delete", { id: item.id });
        f.reset();
        selectedId = null;
        render();
      },
      "danger",
    );
}
async function lockVault() {
  try {
    await api("logout", {});
  } catch {}
  location.reload();
}
document.addEventListener("focusin", (e) => {
  if (e.target.matches("input,textarea")) lastField = e.target;
});
async function action(name) {
  document.querySelectorAll("nav details").forEach((d) => (d.open = false));
  if (name === "skin") {
    $("#skin").focus();
    return;
  }
  if (name === "config") {
    $("#configurationDetails").textContent =
      `Local encrypted store · Email ${state.mailReady ? "connected (delivery pending verification)" : "not configured"} · CAPTCHA ${state.captchaReady ? "configured" : "not configured"} · D1 backup not yet verified.`;
    $("#settingsDialog").showModal();
    return;
  }
  if (name === "preview") {
    celebrate(skin, { preview: true });
    message("Skin motion preview only — no authentication state changed.");
    return;
  }
  if (name === "exit") {
    await lockVault();
    return;
  }
  if (["cut", "copy", "paste"].includes(name)) {
    if (!lastField?.isConnected) throw Error("Select an editable field first.");
    const f = lastField;
    const start = f.selectionStart ?? 0,
      end = f.selectionEnd ?? f.value.length;
    if (name === "paste") {
      const text = await navigator.clipboard.readText();
      f.setRangeText(text, start, end, "end");
    } else {
      if (start === end) throw Error("Select the text to " + name + ".");
      await navigator.clipboard.writeText(f.value.slice(start, end));
      if (name === "cut") f.setRangeText("", start, end, "end");
    }
    message("Clipboard action completed on the selected field.");
    return;
  }
  if (step !== "vault") throw Error("Unlock the vault first.");
  if (name === "new" || name === "password") {
    editSecret();
    return;
  }
  if (name === "open") {
    render();
    return;
  }
  if (name === "save") {
    const f = $("#wizard form");
    if (f) f.requestSubmit();
    else message("Open or create an item first.");
    return;
  }
  if (name === "delete") {
    if (!selectedId) throw Error("Open the saved item to delete.");
    if (confirm("Delete the selected item?")) {
      await api("secrets/delete", { id: selectedId });
      selectedId = null;
      render();
    }
  }
}
document
  .querySelectorAll("[data-action]")
  .forEach((b) => (b.onclick = () => run(() => action(b.dataset.action))));
$("#skin").onchange = (e) => {
  skin = e.target.value;
  document.body.dataset.skin = skin;
  localStorage.setItem("cody-vault-skin", skin);
};
$("#previewMotion").onclick = () => action("preview");
$("#closeSettings").onclick = () => $("#settingsDialog").close();
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape")
    document.querySelectorAll("nav details").forEach((d) => (d.open = false));
});
async function loadNote() {
  if (step !== "vault") return;
  try {
    const dashboard = $("#noteDashboard").value;
    const saved = await api("notes?dashboard=" + encodeURIComponent(dashboard));
    if (step === "vault" && $("#noteDashboard").value === dashboard)
      $("#noteText").value = saved.text;
  } catch (e) {
    message(e.message);
  }
  $("#chatConnection").textContent = state.chatReady
    ? " Connected"
    : " Model connection not configured";
}
$("#noteDashboard").onchange = loadNote;
$("#saveNote").onclick = () =>
  run(async () => {
    await api("notes/save", {
      dashboard: $("#noteDashboard").value,
      text: $("#noteText").value,
    });
    message("Dashboard note saved encrypted.");
  });
$("#exitForm").onsubmit = (event) => {
  event.preventDefault();
  run(async () => {
    try {
      await api("exit", { pin: $("#exitPin").value });
      $("#chatMessages").replaceChildren();
      $("#chatInput").value = "";
      $("#noteText").value = "";
      selectedId = null;
      verificationReady = false;
      lastField = null;
      location.reload();
    } finally {
      $("#exitPin").value = "";
    }
  });
};
$("#chatForm").onsubmit = (event) => {
  event.preventDefault();
  run(async () => {
    const text = $("#chatInput").value.trim();
    if (!text) return;
    const line = document.createElement("div");
    line.className = "chat-line";
    line.textContent = "You: " + text;
    $("#chatMessages").append(line);
    $("#chatInput").value = "";
    try {
      const answer = await api("chat", { message: text });
      const reply = document.createElement("div");
      reply.className = "chat-line";
      reply.textContent = "Cody: " + answer.reply;
      $("#chatMessages").append(reply);
    } catch (e) {
      message(e.message);
    }
  });
};
$("#captureView").onclick = () =>
  run(async () => {
    const response = await fetch(base + "/browser/capture", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    if (!response.ok) {
      const result = await response.json();
      throw Error(result.error || "Capture unavailable");
    }
    const previous = $("#browserPreview").dataset.blob;
    if (previous) URL.revokeObjectURL(previous);
    const blob = URL.createObjectURL(await response.blob());
    $("#browserPreview").src = blob;
    $("#browserPreview").dataset.blob = blob;
    $("#browserPreview").hidden = false;
  });
try {
  if (/^#handoff=[a-f0-9]{64}$/.test(location.hash)) {
    const ticket = location.hash.slice(9);
    history.replaceState(null, "", location.pathname + location.search);
    await api("handoff", { ticket });
  }
  state = await api("status");
  step = state.step;
  if (!state.remote && step !== "vault" && step !== 1 && !state.sessionActive) {
    await api("session", {});
  }
  $("#integrationStatus").replaceChildren();
  for (const [label, ready] of [
    ["Email", state.mailReady],
    ["CAPTCHA", state.captchaReady],
  ]) {
    const p = document.createElement("p");
    p.textContent =
      label + " · " + (ready ? "connection available" : "setup needed");
    p.className = ready ? "ok" : "";
    $("#integrationStatus").append(p);
  }
  render();
} catch (e) {
  message(e.message);
}
