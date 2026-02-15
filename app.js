const page = document.body.dataset.page;
const inferApiBase = () => {
  const protocol = window.location.protocol;
  const host = window.location.hostname;
  const port = window.location.port;
  if (protocol === "file:") return "http://localhost:3000";
  const isLoopback = host === "localhost" || host === "127.0.0.1";
  if (isLoopback && port && port !== "3000") return `${protocol}//${host}:3000`;
  return "";
};
const apiBase = inferApiBase();

const MOCK_DATA_KEY = "gl_mock_data";
const MOCK_SESSIONS_KEY = "gl_mock_sessions";
const MOCK_ACTIVE_TOKEN_KEY = "gl_mock_token";
const ENABLE_INSECURE_MOCK_FALLBACK =
  window.location.protocol === "file:" ||
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

const uiText = (ar, en) => (document.body.classList.contains("rtl") ? ar : en);

let __notyf = null;
let __nativeAlert = null;

const getNotifier = () => {
  if (__notyf) return __notyf;
  if (typeof window === "undefined") return null;
  if (typeof window.Notyf !== "function") return null;
  __notyf = new window.Notyf({
    duration: 3800,
    dismissible: true,
    ripple: true,
    position: { x: "right", y: "top" },
    types: [
      {
        type: "info",
        background: "rgba(22, 12, 14, 0.96)",
        icon: false,
      },
      {
        type: "success",
        background: "linear-gradient(120deg, #22c55e, #0f766e)",
        icon: false,
      },
      {
        type: "error",
        background: "linear-gradient(120deg, #ff3a44, #9b101f)",
        icon: false,
      },
    ],
  });
  return __notyf;
};

const toast = (message, type = "info") => {
  const msg = String(message ?? "");
  const notifier = getNotifier();
  if (notifier) {
    if (type === "success") return notifier.success(msg);
    if (type === "error") return notifier.error(msg);
    return notifier.open({ type, message: msg });
  }
  if (!__nativeAlert && typeof window !== "undefined" && typeof window.alert === "function") {
    __nativeAlert = window.alert.bind(window);
  }
  return __nativeAlert ? __nativeAlert(msg) : console.log(msg);
};

const initThirdPartyUi = () => {
  if (typeof window === "undefined") return;

  // Make legacy alert() calls non-blocking when Notyf is available.
  if (!__nativeAlert && typeof window.alert === "function") {
    __nativeAlert = window.alert.bind(window);
  }
  window.alert = (msg) => {
    const text = String(msg ?? "");
    const type =
      /(فشل|تعذر|خطأ|error|failed|unable|unauthorized|denied)/i.test(text)
        ? "error"
        : /(تم|نجاح|success|confirmed|saved|sent)/i.test(text)
          ? "success"
          : "info";
    toast(text, type);
  };

  if (window.AOS && typeof window.AOS.init === "function") {
    document.body.classList.add("aos-enabled");
    const revealEls = Array.from(document.querySelectorAll(".reveal"));
    revealEls.forEach((el, idx) => {
      if (!el.hasAttribute("data-aos")) el.setAttribute("data-aos", "fade-up");
      if (!el.hasAttribute("data-aos-duration")) el.setAttribute("data-aos-duration", "650");
      if (!el.hasAttribute("data-aos-delay")) el.setAttribute("data-aos-delay", String(Math.min(220, idx * 35)));
      if (!el.hasAttribute("data-aos-once")) el.setAttribute("data-aos-once", "true");
    });
    window.AOS.init({ once: true, duration: 650, offset: 80, easing: "ease-out-quart" });
  }

  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }
};

initThirdPartyUi();

const formatAmountSpaces = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value ?? "");
  // Use spaces for thousands separators to match existing UI (e.g., "2 000").
  return String(Math.trunc(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

const uniqueSortedNumbers = (values) =>
  Array.from(new Set((values || []).map((v) => Number(v)).filter((n) => Number.isFinite(n) && n > 0))).sort((a, b) => a - b);

// Central game top-up price catalog used by Dashboard + Wallet payment pages.
// Keeping it global allows Wallet pages to show only game-related prices when needed.
const topupOfferCatalog = {
  "PUBG UC": {
    subtitle: uiText("باقات UC الأكثر طلبًا + أولوية تنفيذ بعد التحقق", "Most requested UC bundles + priority after verification"),
    offers: [
      { label: "Starter UC", amount: 99, tags: ["Fast", "Verified"] },
      { label: "Popular UC", amount: 250, tags: ["Best value", "Updates"] },
      { label: "Pro UC", amount: 500, tags: ["Priority", "Secure"] },
      { label: "Ultra UC", amount: 1000, tags: ["Priority", "Fast"] },
    ],
  },
  "Free Fire": {
    subtitle: uiText("ماس/جواهر مع مراجعة سريعة وتأكيد ID", "Diamonds with quick review and ID confirmation"),
    offers: [
      { label: "Quick Pack", amount: 70, tags: ["Quick", "Verified"] },
      { label: "Value Pack", amount: 150, tags: ["Best value", "Updates"] },
      { label: "Boost Pack", amount: 300, tags: ["Fast", "ID check"] },
      { label: "Elite Pack", amount: 600, tags: ["Priority", "Secure"] },
    ],
  },
  "Valorant Points": {
    subtitle: uiText("VP مع فحص أمني واعتماد قبل التنفيذ", "VP with security checks and approval before execution"),
    offers: [
      { label: "VP Mini", amount: 150, tags: ["Secure", "Approval"] },
      { label: "VP Standard", amount: 350, tags: ["Verified", "Updates"] },
      { label: "VP Pro", amount: 600, tags: ["Priority", "Secure"] },
      { label: "VP Ultra", amount: 1500, tags: ["Priority", "Fast"] },
    ],
  },
  "Mobile Legends": {
    subtitle: uiText("Diamonds مع تتبع كامل وتحديثات الحالة", "Diamonds with full tracking and status updates"),
    offers: [
      { label: "Diamonds Mini", amount: 99, tags: ["Deals", "Tracking"] },
      { label: "Diamonds Value", amount: 250, tags: ["Best value", "Updates"] },
      { label: "Diamonds Pro", amount: 500, tags: ["Priority", "Fast"] },
      { label: "Diamonds Ultra", amount: 1000, tags: ["Priority", "Secure"] },
    ],
  },
  "League of Legends": {
    subtitle: uiText("RP عبر مسار دفع موثق وإثبات قبل التنفيذ", "RP via secure wallet flow and proof verification"),
    offers: [
      { label: "RP Starter", amount: 150, tags: ["Verify", "Quick"] },
      { label: "RP Value", amount: 400, tags: ["Best value", "Updates"] },
      { label: "RP Pro", amount: 800, tags: ["Priority", "Secure"] },
      { label: "RP Ultra", amount: 2000, tags: ["Priority", "Fast"] },
    ],
  },
  "Call of Duty Mobile": {
    subtitle: uiText("CP مع تدقيق إثبات الدفع وتحديثات مستمرة", "CP with proof verification and continuous updates"),
    offers: [
      { label: "CP Mini", amount: 99, tags: ["Fast", "Verified"] },
      { label: "CP Value", amount: 250, tags: ["Best value", "Tracking"] },
      { label: "CP Pro", amount: 600, tags: ["Priority", "Secure"] },
      { label: "CP Ultra", amount: 1500, tags: ["Priority", "Fast"] },
    ],
  },
};

const getTopupGameAmounts = (game) => {
  const key = String(game || "").trim();
  return uniqueSortedNumbers((topupOfferCatalog[key]?.offers || []).map((o) => o.amount));
};

const getAllTopupAmounts = () => {
  const amounts = [];
  Object.values(topupOfferCatalog).forEach((entry) => {
    (entry?.offers || []).forEach((offer) => amounts.push(offer.amount));
  });
  return uniqueSortedNumbers(amounts);
};

const renderQuickAmounts = ({ container, amounts, onPick }) => {
  if (!container) return;
  const values = uniqueSortedNumbers(amounts);
  container.innerHTML = "";
  values.forEach((amount) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ghost-btn quick-amount-btn";
    btn.dataset.amount = String(amount);
    btn.textContent = formatAmountSpaces(amount);
    container.appendChild(btn);
  });
  // Store latest handler; the event listener reads this value so repeated renders remain correct.
  container._onQuickAmountPick = typeof onPick === "function" ? onPick : null;
  if (!container.dataset.bound) {
    container.dataset.bound = "1";
    container.addEventListener("click", (event) => {
      const btn = event.target.closest(".quick-amount-btn");
      if (!btn || !container.contains(btn)) return;
      const amount = Number(btn.dataset.amount || 0);
      if (!Number.isFinite(amount) || amount <= 0) return;
      container._onQuickAmountPick?.(amount);
    });
  }
};

const clearSession = () => {
  localStorage.removeItem("gl_user");
  localStorage.removeItem(MOCK_ACTIVE_TOKEN_KEY);
  fetch(`${apiBase}/api/logout`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  }).catch(() => {});
};

const saveSession = (payload) => {
  if (!payload?.user) return;
  localStorage.setItem("gl_user", JSON.stringify(payload.user));
  if (payload?.token) {
    localStorage.setItem(MOCK_ACTIVE_TOKEN_KEY, String(payload.token));
  }
};

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("gl_user") || "null");
  } catch (error) {
    return null;
  }
};

const readMockData = () => {
  try {
    const raw = localStorage.getItem(MOCK_DATA_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      tickets: Array.isArray(parsed.tickets) ? parsed.tickets : [],
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
      accessRequests: Array.isArray(parsed.accessRequests) ? parsed.accessRequests : [],
      notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
      receipts: Array.isArray(parsed.receipts) ? parsed.receipts : [],
      supportRequests: Array.isArray(parsed.supportRequests) ? parsed.supportRequests : [],
    };
  } catch (error) {
    return { users: [], tickets: [], orders: [], accessRequests: [], notifications: [], receipts: [], supportRequests: [] };
  }
};

const writeMockData = (data) => {
  localStorage.setItem(MOCK_DATA_KEY, JSON.stringify(data));
};

const readMockSessions = () => {
  try {
    const raw = localStorage.getItem(MOCK_SESSIONS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    return {};
  }
};

const writeMockSessions = (sessions) => {
  localStorage.setItem(MOCK_SESSIONS_KEY, JSON.stringify(sessions));
};

const makeId = () => {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
const isStrongPassword = (value) => {
  const text = String(value || "");
  return text.length >= 10 && /[a-z]/.test(text) && /[A-Z]/.test(text) && /\d/.test(text);
};

const normalizeWallet = (value) => String(value || "").trim().toLowerCase();

const walletLabel = (wallet) => {
  const map = {
    vodafone_cash: "Vodafone Cash",
    orange_cash: "Orange Cash",
    etisalat_cash: "Etisalat Cash",
    instapay: "InstaPay",
    fawry: "Fawry",
    meeza: "Meeza",
  };
  return map[wallet] || wallet || "-";
};

const walletReceiverNumber = (wallet) =>
  normalizeWallet(wallet) === "instapay" ? "01147794004" : "01143813016";

const paymentUiConfig = {
  instapay: {
    logo: "assets/wallet-instapay.jpg",
    notice: "Use InstaPay transfer then upload payment proof.",
    transferLabel: "InstaPay number:",
    amountRange: "Amount (Min 70.00 EGP / Max 2 000.00 EGP):",
    senderLabel: "Your InstaPay address or phone",
    senderPlaceholder: "fouadbeehtaher@instapay or 01xxxxxxxxx",
    note: "InstaPay only - use @instapay or QR",
    instructions: "Transfer via InstaPay, add transaction reference, then upload proof.",
    min: 70,
    max: 2000,
  },
  vodafone_cash: {
    logo: "assets/wallet-vodafone.svg",
    notice: "Before creating a request, transfer funds within 10 minutes using the payment details below.",
    transferLabel: "Vodafone Cash number:",
    amountRange: "Amount (Min 70.00 EGP / Max 2 000.00 EGP):",
    senderLabel: "Your Vodafone Cash number",
    senderPlaceholder: "010xxxxxxxx",
    note: "Wallet transfer number: 01143813016",
    instructions: "Enter sender number and upload payment proof before confirm.",
    min: 70,
    max: 2000,
  },
  orange_cash: {
    logo: "assets/wallet-orange.svg",
    notice: "Before creating a request, transfer funds within 10 minutes using the payment details below.",
    transferLabel: "Orange Cash number:",
    amountRange: "Amount (Min 70.00 EGP / Max 2 000.00 EGP):",
    senderLabel: "Your Orange Cash number",
    senderPlaceholder: "012xxxxxxxx",
    note: "Wallet transfer number: 01143813016",
    instructions: "Enter sender number and transaction reference, then upload proof.",
    min: 70,
    max: 2000,
  },
  etisalat_cash: {
    logo: "assets/wallet-etisalat.svg",
    notice: "Before creating a request, transfer funds within 10 minutes using the payment details below.",
    transferLabel: "Etisalat Cash number:",
    amountRange: "Amount (Min 70.00 EGP / Max 2 000.00 EGP):",
    senderLabel: "Your Etisalat Cash number",
    senderPlaceholder: "011xxxxxxxx",
    note: "Wallet transfer number: 01143813016",
    instructions: "After transfer, upload proof and press Confirm.",
    min: 70,
    max: 2000,
  },
  fawry: {
    logo: "assets/wallet-fawry.jpg",
    notice: "Enter the details, then click Confirm. You will receive and track your request status from dashboard.",
    transferLabel: "Fawry payment number:",
    amountRange: "Amount (Min 70.00 EGP / Max 2 000.00 EGP):",
    senderLabel: "Your phone number",
    senderPlaceholder: "01xxxxxxxxx",
    note: "Use Fawry then submit proof to 01143813016",
    instructions: "After Fawry payment, complete details and upload proof.",
    min: 70,
    max: 2000,
  },
  meeza: {
    logo: "assets/wallet-meeza.svg",
    notice: "Before creating a request, transfer funds within 10 minutes using the payment details below.",
    transferLabel: "Meeza number:",
    amountRange: "Amount (Min 70.00 EGP / Max 2 000.00 EGP):",
    senderLabel: "Your Meeza / phone number",
    senderPlaceholder: "01xxxxxxxxx",
    note: "Wallet transfer number: 01143813016",
    instructions: "After transfer, upload proof and press Confirm.",
    min: 70,
    max: 2000,
  },
};

const lockButton = (button, busyLabel = "Please wait...") => {
  if (!button) return () => {};
  const prevText = button.textContent;
  const prevHtml = button.innerHTML;
  button.disabled = true;
  button.dataset.prevText = prevText;
  button.dataset.prevHtml = prevHtml;
  button.textContent = busyLabel;
  return () => {
    button.disabled = false;
    if (button.dataset.prevHtml) {
      button.innerHTML = button.dataset.prevHtml;
    } else {
      button.textContent = button.dataset.prevText || prevText;
    }
    delete button.dataset.prevText;
    delete button.dataset.prevHtml;
  };
};

const normalizeRole = (role) => {
  const value = String(role || "").trim().toLowerCase();
  if (value === "admin") return "admin";
  if (value === "supervisor") return "supervisor";
  return "user";
};

const inferRoleFromEmail = (email) => {
  const value = String(email || "").trim().toLowerCase();
  if (value.includes("admin")) return "admin";
  if (value.includes("supervisor")) return "supervisor";
  return "user";
};

const isAdminRole = (role) => normalizeRole(role) === "admin";
const isStaffRole = (role) => {
  const normalized = normalizeRole(role);
  return normalized === "admin" || normalized === "supervisor";
};

const roleLabel = (role) => {
  const normalized = normalizeRole(role);
  if (normalized === "admin") return uiText("مسؤول", "Admin");
  if (normalized === "supervisor") return uiText("مشرف", "Supervisor");
  return uiText("مستخدم", "User");
};

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    if (!file) return resolve("");
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("File read failed"));
    reader.readAsDataURL(file);
  });

const uploadProofFile = async (file) => {
  if (!file) return "";
  const response = await fetch(`${apiBase}/api/uploads/proof`, {
    method: "POST",
    credentials: "include",
    headers: {
      "X-Filename": file.name || "proof.png",
      "X-Filetype": file.type || "application/octet-stream",
    },
    body: file,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || "Upload failed");
  }
  const data = await response.json();
  if (!data.fileUrl) throw new Error("Upload failed");
  return data.fileUrl;
};

const pushMockAdminNotification = (data, payload) => {
  const notification = {
    id: makeId(),
    scope: "admin",
    read: false,
    createdAt: new Date().toISOString(),
    ...payload,
  };
  data.notifications.unshift(notification);
  return notification;
};

const mockApiRequest = (path, options = {}, token) => {
  const method = (options.method || "GET").toUpperCase();
  const body = options.body ? JSON.parse(options.body) : {};
  const sessions = readMockSessions();
  const data = readMockData();
  data.accessRequests = Array.isArray(data.accessRequests) ? data.accessRequests : [];
  const userId = token ? sessions[token] : null;
  const currentUser = data.users.find((item) => item.id === userId) || null;

  if (path === "/api/login" && method === "POST") {
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!isValidEmail(email) || password.length < 1) throw new Error("Invalid credentials");

    let user = data.users.find((item) => item.email === email);
    if (!user) {
      const namePart = email.split("@")[0].replace(/[._-]/g, " ").trim();
      const name = namePart
        .split(" ")
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
      user = {
        id: makeId(),
        name: name || "User",
        email,
        role: inferRoleFromEmail(email),
        password: password,
      };
      data.users.push(user);
      writeMockData(data);
    } else {
      if (user.password && user.password !== password) {
        throw new Error("Invalid credentials");
      }
      const role = normalizeRole(user.role);
      if (role !== user.role) {
        user.role = role;
        writeMockData(data);
      }
    }

    const newToken = makeId();
    sessions[newToken] = user.id;
    writeMockSessions(sessions);
    return { token: newToken, user };
  }

  if (path === "/api/signup" && method === "POST") {
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!isValidEmail(email)) throw new Error("Invalid email");
    if (!isStrongPassword(password)) {
      throw new Error("Password must be 10+ chars and include upper/lower letters and a digit.");
    }

    const existing = data.users.find((item) => item.email === email);
    if (existing) {
      throw new Error("Email already registered");
    }

    const namePart = email.split("@")[0].replace(/[._-]/g, " ").trim();
    const name = namePart
      .split(" ")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");

    const user = {
      id: makeId(),
      name: name || "User",
      email,
      role: inferRoleFromEmail(email),
      password,
    };
    data.users.push(user);
    writeMockData(data);

    const newToken = makeId();
    sessions[newToken] = user.id;
    writeMockSessions(sessions);
    return { token: newToken, user };
  }

  if (path === "/api/me" && method === "GET") {
    if (!currentUser) throw new Error("Unauthorized");
    const role = normalizeRole(currentUser.role);
    if (role !== currentUser.role) {
      currentUser.role = role;
      writeMockData(data);
    }
    return { user: currentUser };
  }

  if (path === "/api/tickets" && method === "GET") {
    if (!currentUser) throw new Error("Unauthorized");
    const tickets =
      isStaffRole(currentUser.role)
        ? data.tickets
        : data.tickets.filter((ticket) => ticket.userId === currentUser.id);
    return { tickets };
  }

  if (path === "/api/tickets" && method === "POST") {
    if (!currentUser) throw new Error("Unauthorized");
    const title = String(body.title || "").trim();
    if (!title) throw new Error("Title required");
    const priority = ["high", "medium", "low"].includes(body.priority)
      ? body.priority
      : "medium";
    const ticket = {
      id: makeId(),
      title,
      priority,
      status: "open",
      createdAt: new Date().toISOString(),
      userId: currentUser.id,
    };
    data.tickets.unshift(ticket);
    pushMockAdminNotification(data, {
      type: "ticket_created",
      title: "New support ticket",
      message: `${currentUser.name} created a ticket: ${ticket.title}`,
      details: {
        ticketId: ticket.id,
        title: ticket.title,
        priority: ticket.priority,
        status: ticket.status,
        createdBy: currentUser.name,
        email: currentUser.email,
      },
    });
    writeMockData(data);
    return { ticket };
  }

  if (path.startsWith("/api/tickets/") && method === "PATCH") {
    if (!currentUser || !isStaffRole(currentUser.role)) throw new Error("Unauthorized");
    const id = path.split("/").pop();
    const ticket = data.tickets.find((item) => item.id === id);
    if (!ticket) throw new Error("Ticket not found");
    ticket.status = body.status === "closed" ? "closed" : "open";
    pushMockAdminNotification(data, {
      type: "ticket_status_updated",
      title: "Ticket status changed",
      message: `Ticket ${ticket.id} status changed to ${ticket.status}`,
      details: {
        ticketId: ticket.id,
        title: ticket.title,
        status: ticket.status,
        reviewedBy: currentUser.name,
      },
    });
    writeMockData(data);
    return { ticket };
  }

  if (path === "/api/access-requests" && method === "GET") {
    if (!currentUser) throw new Error("Unauthorized");
    const accessRequests = isStaffRole(currentUser.role)
      ? data.accessRequests
      : data.accessRequests.filter((item) => item.userId === currentUser.id);
    return { accessRequests };
  }

  if (path === "/api/access-requests" && method === "POST") {
    if (!currentUser) throw new Error("Unauthorized");
    const resource = String(body.resource || "").trim().toLowerCase();
    const useCase = String(body.useCase || "").trim();
    const duration = String(body.duration || "single_task").trim();
    if (!["research_vault", "security_lab", "engineering_hub"].includes(resource) || !useCase) {
      throw new Error("Missing required fields");
    }
    const accessRequest = {
      id: makeId(),
      resource,
      useCase,
      duration,
      status: "pending",
      createdAt: new Date().toISOString(),
      userId: currentUser.id,
    };
    data.accessRequests.unshift(accessRequest);
    pushMockAdminNotification(data, {
      type: "access_request_created",
      title: "New access request",
      message: `${currentUser.name} requested ${resource}`,
      details: {
        accessRequestId: accessRequest.id,
        resource: accessRequest.resource,
        useCase: accessRequest.useCase,
        duration: accessRequest.duration,
        createdBy: currentUser.name,
        email: currentUser.email,
      },
    });
    writeMockData(data);
    return { accessRequest };
  }

  if (path.startsWith("/api/access-requests/") && method === "PATCH") {
    if (!currentUser || !isStaffRole(currentUser.role)) throw new Error("Unauthorized");
    const id = path.split("/").pop();
    const nextStatus = String(body.status || "").trim().toLowerCase();
    if (!["pending", "approved", "rejected"].includes(nextStatus)) throw new Error("Invalid status");
    const item = data.accessRequests.find((entry) => entry.id === id);
    if (!item) throw new Error("Access request not found");
    item.status = nextStatus;
    item.reviewedAt = new Date().toISOString();
    item.reviewedBy = currentUser.id;
    pushMockAdminNotification(data, {
      type: "access_request_updated",
      title: "Access request updated",
      message: `${currentUser.name} set access request ${item.id} to ${item.status}`,
      details: {
        accessRequestId: item.id,
        resource: item.resource,
        status: item.status,
        reviewedBy: currentUser.name,
      },
    });
    writeMockData(data);
    return { accessRequest: item };
  }

  if (path === "/api/orders" && method === "GET") {
    if (!currentUser) throw new Error("Unauthorized");
    const orders =
      isStaffRole(currentUser.role)
        ? data.orders
        : data.orders.filter((order) => order.userId === currentUser.id);
    return { orders };
  }

  if (path === "/api/orders" && method === "POST") {
    if (!currentUser) throw new Error("Unauthorized");
    const game = String(body.game || "").trim();
    const playerId = String(body.playerId || "").trim();
    const wallet = normalizeWallet(body.wallet);
    const amount = Number(body.amount);
    const sender = String(body.sender || "").trim();
    const paymentRef = String(body.paymentRef || "").trim();
    const proofUrl = String(body.proofUrl || "").trim();
    if (
      !game ||
      !playerId ||
      !wallet ||
      !sender ||
      !paymentRef ||
      !proofUrl ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      throw new Error("Missing required fields");
    }

    const order = {
      id: makeId(),
      game,
      playerId,
      amount,
      wallet,
      sender,
      paymentRef,
      proofUrl,
      status: "pending",
      createdAt: new Date().toISOString(),
      userId: currentUser.id,
    };
    data.orders.unshift(order);
    pushMockAdminNotification(data, {
      type: "order_created",
      title: "New game top-up order",
      message: `${currentUser.name} submitted ${order.game} order for ${order.amount} EGP`,
      details: {
        orderId: order.id,
        game: order.game,
        playerId: order.playerId,
        amount: order.amount,
        wallet: order.wallet,
        sender: order.sender,
        paymentRef: order.paymentRef,
        hasProofImage: Boolean(order.proofUrl),
        createdBy: currentUser.name,
        email: currentUser.email,
      },
    });
    writeMockData(data);
    return { order };
  }

  if (path.startsWith("/api/orders/") && method === "PATCH") {
    if (!currentUser || !isStaffRole(currentUser.role)) throw new Error("Unauthorized");
    const id = path.split("/").pop();
    const order = data.orders.find((item) => item.id === id);
    if (!order) throw new Error("Order not found");
    if (!["pending", "approved", "rejected"].includes(body.status)) {
      throw new Error("Invalid status");
    }
    order.status = body.status;
    order.reviewedAt = new Date().toISOString();
    pushMockAdminNotification(data, {
      type: "order_status_updated",
      title: "Order status updated",
      message: `Order ${order.id} changed to ${order.status}`,
      details: {
        orderId: order.id,
        game: order.game,
        playerId: order.playerId,
        amount: order.amount,
        status: order.status,
        reviewedBy: currentUser.name,
      },
    });
    writeMockData(data);
    return { order };
  }

  if (path === "/api/notifications" && method === "GET") {
    if (!currentUser || !isStaffRole(currentUser.role)) throw new Error("Unauthorized");
    const notifications = data.notifications.filter((item) => item.scope === "admin");
    return { notifications };
  }

  if (path.startsWith("/api/notifications/") && path.endsWith("/read") && method === "PATCH") {
    if (!currentUser || !isStaffRole(currentUser.role)) throw new Error("Unauthorized");
    const id = path.split("/")[3];
    const notification = data.notifications.find((item) => item.id === id && item.scope === "admin");
    if (!notification) throw new Error("Notification not found");
    notification.read = true;
    notification.readAt = new Date().toISOString();
    writeMockData(data);
    return { notification };
  }

  if (path === "/api/notifications/read-all" && method === "PATCH") {
    if (!currentUser || !isStaffRole(currentUser.role)) throw new Error("Unauthorized");
    const now = new Date().toISOString();
    data.notifications.forEach((item) => {
      if (item.scope === "admin") {
        item.read = true;
        item.readAt = now;
      }
    });
    writeMockData(data);
    return { success: true };
  }

  if (path === "/api/integrations/status" && method === "GET") {
    if (!currentUser || !isAdminRole(currentUser.role)) throw new Error("Unauthorized");
    return {
      integrations: {
        n8n: false,
        telegram: false,
        slack: false,
        webhook: false,
        aiSync: true,
      },
    };
  }

  if (path === "/api/integrations/test" && method === "POST") {
    if (!currentUser || !isAdminRole(currentUser.role)) throw new Error("Unauthorized");
    return {
      results: [
        { provider: "n8n", ok: false, error: "Not configured" },
        { provider: "telegram", ok: false, error: "Not configured" },
        { provider: "slack", ok: false, error: "Not configured" },
        { provider: "webhook", ok: false, error: "Not configured" },
      ],
    };
  }

  if (path === "/api/integrations/n8n/check" && method === "GET") {
    if (!currentUser || !isAdminRole(currentUser.role)) throw new Error("Unauthorized");
    return {
      configured: false,
      reachable: false,
      error: "n8n webhook is not configured",
    };
  }

  if (path === "/api/ai/status" && method === "GET") {
    if (!currentUser) throw new Error("Unauthorized");
    return {
      aiSync: {
        enabled: true,
        intervalMs: 300000,
        engine: "mock-local",
        lastRunAt: new Date().toISOString(),
      },
    };
  }

  if (path === "/api/ai/insights" && method === "GET") {
    if (!currentUser) throw new Error("Unauthorized");
    const orders = Array.isArray(data.orders) ? data.orders : [];
    const tickets = Array.isArray(data.tickets) ? data.tickets : [];
    const pendingOrders = orders.filter((o) => o.status === "pending").length;
    const openTickets = tickets.filter((t) => t.status === "open").length;
    const score = Math.max(0, Math.min(100, 88 - pendingOrders * 3 - openTickets * 2));
    return {
      insights: {
        generatedAt: new Date().toISOString(),
        health: {
          level: score >= 75 ? "healthy" : score >= 45 ? "watch" : "critical",
          score,
          pendingOrders,
          openTickets,
        },
        recommendations: [
          "Process pending orders first.",
          "Keep support queue under control.",
        ],
      },
    };
  }

  if (path === "/api/storage/health" && method === "GET") {
    if (!currentUser || !isAdminRole(currentUser.role)) throw new Error("Unauthorized");
    const dataSize = JSON.stringify(data).length;
    return {
      storage: {
        driver: "mock-local",
        file: "localStorage",
        exists: true,
        sizeBytes: dataSize,
        backup: {
          enabled: false,
          intervalMs: 0,
          dir: "localStorage",
          writable: true,
          lastRunAt: null,
          lastFile: null,
          lastError: null,
        },
        records: {
          users: data.users.length,
          tickets: data.tickets.length,
          orders: data.orders.length,
          accessRequests: data.accessRequests.length,
          notifications: data.notifications.length,
          receipts: data.receipts.length,
          supportRequests: data.supportRequests.length,
        },
      },
    };
  }

  if (path === "/api/storage/backup" && method === "POST") {
    if (!currentUser || !isAdminRole(currentUser.role)) throw new Error("Unauthorized");
    return {
      skipped: true,
      reason: "mock-local does not persist file backups",
    };
  }

  if (path === "/api/metrics/performance" && method === "GET") {
    if (!currentUser || !isAdminRole(currentUser.role)) throw new Error("Unauthorized");
    return {
      performance: {
        fiveMin: {
          successRate: 98,
          avgLatencyMs: 42,
          p95LatencyMs: 95,
          total: 120,
        },
        oneHour: {
          successRate: 97,
          avgLatencyMs: 50,
          p95LatencyMs: 110,
          total: 1460,
          topPaths: [
            { path: "/api/orders", count: 330 },
            { path: "/api/tickets", count: 280 },
            { path: "/api/payment-receipts", count: 220 },
          ],
        },
        recentErrors: [
          {
            at: new Date().toISOString(),
            method: "POST",
            path: "/api/orders",
            status: 400,
            latencyMs: 35,
          },
        ],
        sampleCount: 1460,
      },
    };
  }

  if (path === "/api/ai/assistant" && method === "POST") {
    if (!currentUser) throw new Error("Unauthorized");
    const message = String(body.message || "").trim();
    if (!message) throw new Error("Invalid message");
    return {
      source: "local-fallback",
      answer: `Mock assistant: received "${message}". Use backend with n8n for live AI orchestration.`,
    };
  }

  if (path === "/api/public/assistant" && method === "POST") {
    const message = String(body.message || "").trim();
    if (!message) throw new Error("Invalid message");
    return {
      source: "public-local-fallback",
      answer:
        "Your question was received. Payment route: InstaPay 01147794004, other wallets 01143813016. Upload payment proof after transfer.",
    };
  }

  if (path === "/api/public/support-request" && method === "POST") {
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim();
    const message = String(body.message || "").trim();
    const channel = String(body.channel || "whatsapp").trim();
    if (!name || !email || !message) throw new Error("Missing required fields");
    const request = {
      id: makeId(),
      name,
      email,
      message,
      channel,
      status: "new",
      createdAt: new Date().toISOString(),
    };
    data.supportRequests = Array.isArray(data.supportRequests) ? data.supportRequests : [];
    data.supportRequests.unshift(request);
    writeMockData(data);
    return { request };
  }

  if (path === "/api/uploads/proof" && method === "POST") {
    throw new Error("Upload endpoint requires direct file upload");
  }

  if (path === "/api/payment-receipts" && method === "POST") {
    if (!currentUser) throw new Error("Unauthorized");
    const amount = Number(body.amount);
    if (!body.sender || !body.paymentRef || !body.proofUrl || !Number.isFinite(amount) || amount <= 0) {
      throw new Error("Missing required fields");
    }
    const receipt = {
      id: makeId(),
      userId: currentUser.id,
      method: String(body.method || "instapay"),
      receiver: String(body.receiver || ""),
      sender: String(body.sender || ""),
      amount,
      paymentRef: String(body.paymentRef || ""),
      note: String(body.note || ""),
      proofUrl: String(body.proofUrl || ""),
      createdAt: new Date().toISOString(),
      status: "pending",
    };
    data.receipts = Array.isArray(data.receipts) ? data.receipts : [];
    data.receipts.unshift(receipt);
    pushMockAdminNotification(data, {
      type: "payment_receipt_created",
      title: "New payment receipt",
      message: `${currentUser.name} submitted a payment receipt (${receipt.amount} EGP)`,
      details: {
        receiptId: receipt.id,
        method: receipt.method,
        amount: receipt.amount,
        sender: receipt.sender,
        paymentRef: receipt.paymentRef,
        proofUrl: receipt.proofUrl,
        createdBy: currentUser.name,
        email: currentUser.email,
      },
    });
    writeMockData(data);
    return { receipt };
  }

  if (path === "/api/payment-receipts" && method === "GET") {
    if (!currentUser) throw new Error("Unauthorized");
    const receipts = Array.isArray(data.receipts) ? data.receipts : [];
    return {
      receipts:
        isStaffRole(currentUser.role)
          ? receipts
          : receipts.filter((item) => item.userId === currentUser.id),
    };
  }

  throw new Error("Request failed");
};

const apiRequest = async (path, options = {}) => {
  const headers = { ...(options.headers || {}) };
  const hasBody = typeof options.body !== "undefined";
  if (hasBody && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const url = path.startsWith("http") ? path : `${apiBase}${path}`;
  let response;
  try {
    response = await fetch(url, { ...options, headers, credentials: "include" });
  } catch (error) {
    if (ENABLE_INSECURE_MOCK_FALLBACK) {
      const mockToken = localStorage.getItem(MOCK_ACTIVE_TOKEN_KEY) || null;
      const mockResponse = mockApiRequest(path, options, mockToken);
      if (mockResponse?.token) {
        localStorage.setItem(MOCK_ACTIVE_TOKEN_KEY, String(mockResponse.token));
      }
      return mockResponse;
    }
    throw new Error("Network request failed");
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Request failed");
  return body;
};

const applyRoleGates = async () => {
  const staffOnly = Array.from(document.querySelectorAll("[data-staff-only]"));
  const adminOnly = Array.from(document.querySelectorAll("[data-admin-only]"));
  if (staffOnly.length === 0 && adminOnly.length === 0) return;

  // Hide by default to avoid leaking admin/staff links on public pages.
  staffOnly.forEach((el) => (el.style.display = "none"));
  adminOnly.forEach((el) => (el.style.display = "none"));

  try {
    const me = await apiRequest("/api/me");
    const role = me?.user?.role;
    if (isStaffRole(role)) staffOnly.forEach((el) => (el.style.display = ""));
    if (isAdminRole(role)) adminOnly.forEach((el) => (el.style.display = ""));
  } catch (_) {
    // Not logged in (or backend unreachable): keep hidden.
  }
};
applyRoleGates();

const setDirection = (dir) => {
  document.body.classList.toggle("rtl", dir === "rtl");
  document.body.classList.toggle("ltr", dir === "ltr");
  document.documentElement.setAttribute("dir", dir);
  localStorage.setItem("dir", dir);
};

const storedDir =
  localStorage.getItem("dir") ||
  (document.body.classList.contains("ltr") ? "ltr" : "rtl");
setDirection(storedDir);

document.querySelectorAll("[data-action='toggle-dir']").forEach((button) => {
  button.addEventListener("click", () => {
    const nextDir = document.body.classList.contains("rtl") ? "ltr" : "rtl";
    setDirection(nextDir);
  });
});

const copyToClipboard = async (text) => {
  const value = String(text || "");
  if (!value) return false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch (_) {
    // Fall back below.
  }
  try {
    const el = document.createElement("textarea");
    el.value = value;
    el.setAttribute("readonly", "true");
    el.style.position = "fixed";
    el.style.top = "-9999px";
    el.style.left = "-9999px";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    el.remove();
    return ok;
  } catch (_) {
    return false;
  }
};

document.addEventListener("click", async (event) => {
  const trigger = event.target.closest("[data-copy-text]");
  if (!trigger) return;
  const value = trigger.getAttribute("data-copy-text");
  const ok = await copyToClipboard(value);
  if (!ok) {
    alert(uiText("تعذر النسخ. انسخ يدويًا.", "Copy failed. Please copy manually."));
    return;
  }
  const prev = trigger.textContent;
  trigger.textContent = uiText("تم النسخ", "Copied");
  setTimeout(() => {
    trigger.textContent = prev;
  }, 900);
});

const openModal = (modal) => {
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
};

const closeModal = (modal) => {
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
};

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  document.querySelectorAll(".modal.show").forEach((modal) => closeModal(modal));
});

document.querySelectorAll(".modal").forEach((modal) => {
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal(modal);
  });
});

const initScrollProgress = () => {
  const bar = document.createElement("div");
  bar.className = "scroll-progress";
  document.body.appendChild(bar);

  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = max > 0 ? (window.scrollY / max) * 100 : 0;
    bar.style.width = `${Math.min(100, Math.max(0, ratio))}%`;
  };

  update();
  window.addEventListener("scroll", update, { passive: true });
};

const initRevealStagger = () => {
  document.querySelectorAll(".reveal").forEach((el, index) => {
    el.style.animationDelay = `${Math.min(index * 70, 700)}ms`;
  });
};

const initTiltCards = () => {
  document.querySelectorAll("[data-tilt]").forEach((card) => {
    card.addEventListener("mousemove", (event) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `rotateX(${(-y * 4).toFixed(2)}deg) rotateY(${(x * 6).toFixed(2)}deg) translateY(-4px)`;
    });
    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
    });
  });
};

initScrollProgress();
initRevealStagger();
initTiltCards();

const isNativeInteractive = (target) =>
  Boolean(target?.closest("a,button,input,select,textarea,label,[role='button']"));

const makeElementClickable = (element, activate) => {
  if (!element || typeof activate !== "function") return;
  if (element.dataset.clickReady === "1") return;
  element.dataset.clickReady = "1";
  element.classList.add("clickable-card");
  if (!element.hasAttribute("tabindex")) element.setAttribute("tabindex", "0");
  if (!element.hasAttribute("role")) element.setAttribute("role", "button");
  element.addEventListener("click", (event) => {
    if (isNativeInteractive(event.target)) return;
    activate();
  });
  element.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    activate();
  });
};

const goToHref = (href) => {
  if (!href) return;
  if (/^https?:\/\//i.test(href)) {
    window.open(href, "_blank", "noopener,noreferrer");
    return;
  }
  window.location.href = href;
};

const wireDeclarativeClickTargets = () => {
  document.querySelectorAll("[data-click-target]").forEach((element) => {
    const target = String(element.getAttribute("data-click-target") || "").trim();
    if (!target) return;
    makeElementClickable(element, () => {
      if (target.startsWith("#")) {
        const section = document.querySelector(target);
        if (section) {
          section.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
      }
      goToHref(target);
    });
  });
};
wireDeclarativeClickTargets();

const appendChatMessage = (container, role, text, label) => {
  if (!container) return;
  const bubble = document.createElement("div");
  bubble.className = `chat-message ${role === "user" ? "user" : "agent"}`;
  const message = document.createElement("p");
  message.textContent = text;
  const by = document.createElement("span");
  by.textContent = label;
  bubble.append(message, by);
  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
};

const bindAiAssistant = ({
  form,
  input,
  windowEl,
  scope = "dashboard",
  loadingLabel = uiText("جارٍ تحضير الرد...", "AI is thinking..."),
  endpoint = "/api/ai/assistant",
}) => {
  if (!form || !input || !windowEl) return;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const question = input.value.trim();
    if (!question) return;
    appendChatMessage(windowEl, "user", question, uiText("أنت", "You"));
    input.value = "";
    appendChatMessage(windowEl, "agent", loadingLabel, "AI");
    const loadingBubble = windowEl.lastElementChild;
    const sendBtn = form.querySelector("button[type='submit']");
    const unlock = lockButton(sendBtn, uiText("جارٍ الإرسال...", "Sending..."));
    try {
      const response = await apiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify({ message: question, scope }),
      });
      if (loadingBubble) loadingBubble.remove();
      appendChatMessage(windowEl, "agent", response.answer || uiText("لا يوجد رد", "No response"), `AI (${response.source || "local"})`);
    } catch (error) {
      if (loadingBubble) loadingBubble.remove();
      appendChatMessage(
        windowEl,
        "agent",
        uiText("فشل المساعد", "Assistant failed") + `: ${error.message || uiText("خطأ في الطلب", "request error")}`,
        "AI"
      );
    } finally {
      unlock();
    }
  });
};

if (page === "landing") {
  const adminLink = document.getElementById("landing-admin-link");
  const assistantForm = document.getElementById("landing-assistant-form");
  const assistantInput = document.getElementById("landing-assistant-input");
  const assistantWindow = document.getElementById("landing-assistant-window");
  const requestForm = document.getElementById("landing-request-form");
  const requestStatus = document.getElementById("landing-request-status");
  const requestName = document.getElementById("landing-request-name");
  const requestEmail = document.getElementById("landing-request-email");
  const requestChannel = document.getElementById("landing-request-channel");
  const requestMessage = document.getElementById("landing-request-message");
  const offersModal = document.getElementById("landing-topup-offers-modal");
  const offersTitle = document.getElementById("landing-topup-offers-title");
  const offersSubtitle = document.getElementById("landing-topup-offers-subtitle");
  const offersGrid = document.getElementById("landing-topup-offers-grid");
  const offersGoBtn = document.getElementById("landing-topup-offers-go-btn");
  let lastLandingGame = "";

  const goToTopup = (game, amount) => {
    const qs = new URLSearchParams();
    if (game) qs.set("game", String(game));
    if (Number.isFinite(Number(amount)) && Number(amount) > 0) qs.set("amount", String(Number(amount)));
    goToHref(`dashboard.html${qs.toString() ? `?${qs.toString()}` : ""}#game-charge`);
  };

  const openLandingOffers = (game) => {
    if (!offersModal || !offersGrid) {
      goToTopup(game);
      return;
    }
    const key = String(game || "").trim();
    const entry = topupOfferCatalog[key];
    if (!entry) {
      goToTopup(key);
      return;
    }
    lastLandingGame = key;
    if (offersTitle) {
      offersTitle.innerHTML = `<span class="lang-inline"><span class="ar">عروض: ${key}</span><span class="en">Offers: ${key}</span></span>`;
    }
    if (offersSubtitle) {
      offersSubtitle.textContent = entry.subtitle || uiText("اختر باقة للانتقال تلقائيًا.", "Pick a package to continue.");
    }
    offersGrid.innerHTML = "";
    uniqueSortedNumbers((entry.offers || []).map((o) => o.amount)).forEach((amount) => {
      const offer = (entry.offers || []).find((o) => Number(o.amount) === Number(amount));
      const card = document.createElement("div");
      card.className = "topup-offer clickable-card";
      card.setAttribute("tabindex", "0");
      card.setAttribute("role", "button");
      card.dataset.landingOfferGame = key;
      card.dataset.landingOfferAmount = String(amount);

      const title = document.createElement("h4");
      title.textContent = offer?.label || uiText("باقة", "Package");
      const price = document.createElement("p");
      price.className = "price";
      price.textContent = `${formatAmountSpaces(amount)} EGP`;
      const meta = document.createElement("div");
      meta.className = "offer-meta";
      (offer?.tags || []).slice(0, 3).forEach((tag) => {
        const span = document.createElement("span");
        span.textContent = String(tag);
        meta.appendChild(span);
      });
      const actions = document.createElement("div");
      actions.className = "offer-actions";
      const choose = document.createElement("button");
      choose.className = "primary-btn btn-sm";
      choose.type = "button";
      choose.dataset.landingOfferGo = "1";
      choose.dataset.landingOfferGame = key;
      choose.dataset.landingOfferAmount = String(amount);
      choose.innerHTML = `<span class="lang-inline"><span class="ar">اختيار</span><span class="en">Choose</span></span>`;
      const start = document.createElement("button");
      start.className = "outline-btn btn-sm";
      start.type = "button";
      start.dataset.landingStart = key;
      start.innerHTML = `<span class="lang-inline"><span class="ar">بدء الشحن</span><span class="en">Start</span></span>`;
      actions.append(choose, start);
      card.append(title, price, meta, actions);
      offersGrid.appendChild(card);

      makeElementClickable(card, () => goToTopup(key, amount));
    });
    if (offersGoBtn) offersGoBtn.setAttribute("href", `dashboard.html?game=${encodeURIComponent(key)}#game-charge`);
    openModal(offersModal);
  };

  const wireLandingClickableCards = () => {
    const startCards = document.querySelectorAll("#start-here .feature-grid .feature-card");
    makeElementClickable(startCards[0], () => {
      const el = document.getElementById("quick-features");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    makeElementClickable(startCards[1], () => {
      const el = document.getElementById("support-hub");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    makeElementClickable(startCards[2], () => goToHref("dashboard.html"));

    const quickCards = document.querySelectorAll("#quick-features .feature-card");
    makeElementClickable(quickCards[0], () => {
      const el = document.getElementById("remote-support");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    makeElementClickable(quickCards[1], () => goToHref("dashboard.html#payments"));
    makeElementClickable(quickCards[2], () => goToHref("dashboard.html#support"));

    document.querySelectorAll("#pricing .feature-card").forEach((card) => {
      makeElementClickable(card, () => goToHref("dashboard.html#payments"));
    });

    document.querySelectorAll("#game-topup .topup-catalog .game-card").forEach((card) => {
      makeElementClickable(card, () => {
        const game = String(card.getAttribute("data-game") || card.querySelector("h3")?.textContent || "").trim();
        if (game) openLandingOffers(game);
        else goToHref("dashboard.html#game-charge");
      });
    });

    const remoteCards = document.querySelectorAll("#remote-support .feature-grid .feature-card");
    makeElementClickable(remoteCards[0], () => goToHref("https://anydesk.com/downloads"));
    makeElementClickable(remoteCards[1], () => goToHref("dashboard.html#support"));
    makeElementClickable(remoteCards[2], () => goToHref("dashboard.html#support"));

    const remoteChecklist = document.querySelector("#remote-support .remote-checklist");
    makeElementClickable(remoteChecklist, () => goToHref("dashboard.html#payments"));

    const toolImages = document.querySelectorAll("#remote-support .tool-gallery .media-tool");
    makeElementClickable(toolImages[0], () => goToHref("https://anydesk.com/downloads"));
    makeElementClickable(toolImages[1], () => goToHref("https://www.teamviewer.com/en/download/"));

    const trustCards = document.querySelectorAll("#visual-trust .feature-grid .feature-card");
    makeElementClickable(trustCards[0], () => goToHref("dashboard.html#game-charge"));
    makeElementClickable(trustCards[1], () => goToHref("dashboard.html#device-security-check"));
    makeElementClickable(trustCards[2], () => goToHref("about.html#contact"));
  };
  wireLandingClickableCards();

  if (adminLink) adminLink.style.display = "none";
  (async () => {
    try {
      const me = await apiRequest("/api/me");
      if (adminLink) adminLink.style.display = isStaffRole(me?.user?.role) ? "" : "none";
    } catch (_) {
      // Not logged in (public page): keep hidden.
    }
  })();

  document.addEventListener("click", (event) => {
    const offersBtn = event.target.closest("[data-landing-offers]");
    if (offersBtn) {
      const game = String(offersBtn.getAttribute("data-landing-offers") || "").trim();
      if (game) openLandingOffers(game);
      return;
    }
    const startBtn = event.target.closest("[data-landing-start]");
    if (startBtn) {
      const game = String(startBtn.getAttribute("data-landing-start") || "").trim();
      goToTopup(game);
      return;
    }
    const goOffer = event.target.closest("[data-landing-offer-go]");
    if (goOffer) {
      const game = String(goOffer.getAttribute("data-landing-offer-game") || lastLandingGame || "").trim();
      const amount = Number(goOffer.getAttribute("data-landing-offer-amount") || 0);
      goToTopup(game, amount);
      return;
    }
  });

  offersGoBtn?.addEventListener("click", (event) => {
    if (!lastLandingGame) return;
    // Keep link behavior but include game if missing.
    if (!String(offersGoBtn.getAttribute("href") || "").includes("game=")) {
      event.preventDefault();
      goToTopup(lastLandingGame);
    }
  });

  bindAiAssistant({
    form: assistantForm,
    input: assistantInput,
    windowEl: assistantWindow,
    scope: "landing",
    loadingLabel: uiText("جارٍ تجهيز الرد...", "Preparing response..."),
    endpoint: "/api/public/assistant",
  });

  requestForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = {
      name: requestName?.value.trim() || "",
      email: requestEmail?.value.trim() || "",
      channel: requestChannel?.value || "whatsapp",
      message: requestMessage?.value.trim() || "",
      source: "landing",
    };
    if (!payload.name || !payload.email || !payload.message) {
      if (requestStatus) requestStatus.textContent = uiText("يرجى استكمال كل الحقول المطلوبة.", "Please complete all required fields.");
      return;
    }
    const submitBtn = requestForm.querySelector("button[type='submit']");
    const unlock = lockButton(submitBtn, uiText("جارٍ الإرسال...", "Submitting..."));
    try {
      await apiRequest("/api/public/support-request", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (requestStatus) {
        requestStatus.textContent = uiText(
          "تم إرسال طلبك بنجاح. سيتم التواصل معك قريبًا.",
          "Request sent successfully. We will contact you soon."
        );
      }
      requestForm.reset();
    } catch (error) {
      if (requestStatus) {
        requestStatus.textContent =
          uiText("فشل إرسال الطلب", "Request failed") + `: ${error.message || uiText("خطأ في الطلب", "request error")}`;
      }
    } finally {
      unlock();
    }
  });
}

if (page === "help") {
  const cards = document.querySelectorAll(".feature-card");
  cards.forEach((card) => {
    const firstLink = card.querySelector("a[href]");
    if (!firstLink) return;
    makeElementClickable(card, () => goToHref(firstLink.getAttribute("href") || ""));
  });
}

if (page === "login") {
  const loginForm = document.getElementById("login-form");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const signupModal = document.getElementById("signup-modal");
  const signupForm = document.getElementById("signup-form");
  const signupEmail = document.getElementById("signup-email");
  const signupPassword = document.getElementById("signup-password");
  const toDashboard = () => {
    window.location.href = "dashboard.html";
  };

  const isValidEmailInput = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
  const isStrongPasswordInput = (value) => {
    const text = String(value || "");
    return text.length >= 10 && /[a-z]/.test(text) && /[A-Z]/.test(text) && /\d/.test(text);
  };
  const authErrorMessage = (error, fallback) => {
    const message = String(error?.message || "").trim();
    if (!message) return fallback;
    if (message.includes("Origin not allowed")) {
      return uiText(
        "تم حظر الوصول بسبب سياسة المصدر. افتح الموقع من localhost أو اضبط ALLOWED_ORIGINS.",
        "Access blocked by origin policy. Open from localhost or configure ALLOWED_ORIGINS."
      );
    }
    if (message.includes("Too many attempts")) {
      return uiText("محاولات دخول كثيرة. انتظر 15 دقيقة ثم أعد المحاولة.", "Too many login attempts. Please wait 15 minutes then retry.");
    }
    if (message.includes("Invalid credentials")) {
      return uiText("البريد الإلكتروني أو كلمة المرور غير صحيحة.", "Invalid email or password.");
    }
    if (message.includes("Network request failed")) {
      return uiText("تعذر الاتصال بالخادم. تأكد من تشغيل السيرفر على localhost:3000.", "Unable to reach server. Make sure backend is running on localhost:3000.");
    }
    if (message.includes("Password must be")) {
      return uiText(
        "كلمة المرور يجب أن تكون 10 أحرف على الأقل وتحتوي على حروف كبيرة وصغيرة ورقم.",
        "Password must be 10+ chars and include upper/lower letters and a digit."
      );
    }
    if (message.includes("Email already registered")) {
      return uiText("البريد مسجل بالفعل. استخدم تسجيل الدخول.", "Email already registered. Use Login instead.");
    }
    return message || fallback;
  };

  (async () => {
    try {
      const me = await apiRequest("/api/me");
      if (me?.user) {
        saveSession({ user: me.user });
        toDashboard();
      }
    } catch (error) {
      clearSession();
    }
  })();

  loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = emailInput?.value?.trim() || "";
    const password = passwordInput?.value || "";
    if (!isValidEmailInput(email) || !password) {
      alert(uiText("يرجى إدخال بريد وكلمة مرور صحيحين.", "Please enter a valid email and password."));
      return;
    }
    const submitBtn = loginForm.querySelector("button[type='submit']");
    const unlock = lockButton(submitBtn, uiText("جارٍ تسجيل الدخول...", "Signing in..."));
    try {
      const payload = await apiRequest("/api/login", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
        }),
      });
      saveSession(payload);
      toDashboard();
    } catch (error) {
      alert(`${uiText("فشل تسجيل الدخول", "Login failed")}: ${authErrorMessage(error, uiText("تعذر تسجيل الدخول", "Unable to sign in"))}`);
    } finally {
      unlock();
    }
  });

  document.querySelectorAll("[data-open='signup']").forEach((button) => {
    button.addEventListener("click", () => signupModal && openModal(signupModal));
  });

  document.querySelectorAll("[data-close]").forEach((button) => {
    button.addEventListener("click", () => signupModal && closeModal(signupModal));
  });

  signupForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = signupEmail?.value?.trim() || "";
    const password = signupPassword?.value || "";
    if (!isValidEmailInput(email)) {
      alert(uiText("يرجى إدخال بريد إلكتروني صحيح.", "Please enter a valid email."));
      return;
    }
    if (!isStrongPasswordInput(password)) {
      alert(
        uiText(
          "كلمة المرور يجب أن تكون 10 أحرف على الأقل وتحتوي على حروف كبيرة وصغيرة ورقم.",
          "Password must be 10+ chars and include upper/lower letters and a digit."
        )
      );
      return;
    }
    const submitBtn = signupForm.querySelector("button[type='submit']");
    const unlock = lockButton(submitBtn, uiText("جارٍ إنشاء الحساب...", "Creating..."));
    try {
      const payload = await apiRequest("/api/signup", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
        }),
      });
      saveSession(payload);
      toDashboard();
    } catch (error) {
      alert(`${uiText("فشل إنشاء الحساب", "Signup failed")}: ${authErrorMessage(error, uiText("تعذر إنشاء الحساب", "Unable to create account"))}`);
    } finally {
      unlock();
    }
  });
}

if (page === "wallet-payment") {
  const toLogin = () => {
    clearSession();
    window.location.href = "index.html";
  };

  const bodyData = document.body.dataset;
  const wallet = normalizeWallet(bodyData.wallet || "instapay");
  const receiver = String(bodyData.receiver || walletReceiverNumber(wallet)).trim();
  const minAmount = Number(bodyData.min || paymentUiConfig[wallet]?.min || 1);
  const maxAmount = Number(bodyData.max || paymentUiConfig[wallet]?.max || 100000);
  const walletTitle = String(bodyData.walletLabel || walletLabel(wallet));

  const form = document.getElementById("wallet-payment-form");
  const amountInput = document.getElementById("wallet-amount");
  const senderInput = document.getElementById("wallet-sender");
  const referenceInput = document.getElementById("wallet-reference");
  const proofInput = document.getElementById("wallet-proof-image");
  const proofPreview = document.getElementById("wallet-proof-preview");
  const quickAmountsWrap = document.querySelector(".quick-amounts");
  const params = new URLSearchParams(window.location.search || "");
  const gameParam = String(params.get("game") || "").trim();
  const prefillAmount = Number(params.get("amount") || 0);
  const hasGameCatalog = Boolean(gameParam && topupOfferCatalog[gameParam]);
  const gameAmounts = hasGameCatalog ? getTopupGameAmounts(gameParam) : [];
  const allGameAmounts = getAllTopupAmounts();
  const quickAmounts = (hasGameCatalog ? gameAmounts : allGameAmounts).filter((n) => n >= minAmount && n <= maxAmount);

  proofInput?.addEventListener("change", async () => {
    const file = proofInput.files?.[0];
    if (!file || !proofPreview) return;
    proofPreview.src = await fileToDataUrl(file);
    proofPreview.style.display = "block";
  });

  renderQuickAmounts({
    container: quickAmountsWrap,
    amounts: quickAmounts,
    onPick: (amount) => {
      if (!amountInput) return;
      amountInput.value = String(amount);
    },
  });
  if (amountInput) {
    if (Number.isFinite(prefillAmount) && prefillAmount > 0) {
      const ok = hasGameCatalog ? gameAmounts.includes(prefillAmount) : prefillAmount >= minAmount && prefillAmount <= maxAmount;
      if (ok) amountInput.value = String(prefillAmount);
    }
    // If a game is specified, keep amount strictly to that game's allowed prices.
    if (hasGameCatalog && gameAmounts.length > 0) {
      const current = Number(amountInput.value || 0);
      if (!gameAmounts.includes(current)) amountInput.value = String(gameAmounts[0]);
    }
  }

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const sender = senderInput?.value.trim() || "";
    const paymentRef = referenceInput?.value.trim() || "";
    const amount = Number(amountInput?.value || 0);
    const proofFile = proofInput?.files?.[0];

    if (!proofFile) {
      alert("صورة إثبات الدفع مطلوبة / Payment proof image is required");
      return;
    }
    if (!sender || !paymentRef || !Number.isFinite(amount)) {
      alert("يرجى استكمال جميع الحقول المطلوبة / Please complete all required fields");
      return;
    }
    if (amount < minAmount || amount > maxAmount) {
      alert(`المبلغ لـ ${walletTitle} يجب أن يكون بين ${minAmount} و ${maxAmount} جنيه / Amount for ${walletTitle} must be between ${minAmount} and ${maxAmount} EGP`);
      return;
    }
    if (hasGameCatalog && gameAmounts.length > 0 && !gameAmounts.includes(amount)) {
      alert(
        uiText("يرجى اختيار مبلغ من أسعار اللعبة فقط.", "Please pick an amount from the game's price list only.") +
          ` (${gameParam}: ${gameAmounts.map((n) => `${formatAmountSpaces(n)}`).join(", ")} EGP)`
      );
      return;
    }

    let proofUrl = "";
    try {
      proofUrl = await uploadProofFile(proofFile);
    } catch (error) {
      alert(`فشل رفع إثبات الدفع / Payment proof upload failed: ${error.message || "request failed"}`);
      return;
    }

    try {
      await apiRequest("/api/payment-receipts", {
        method: "POST",
        body: JSON.stringify({
          method: wallet,
          receiver,
          sender,
          amount,
          paymentRef,
          note: `${walletTitle} payment page`,
          proofUrl,
        }),
      });
      alert("تم إرسال طلب الدفع بنجاح / Payment request submitted successfully");
      window.location.href = "dashboard.html";
    } catch (error) {
      alert(`فشل إرسال إيصال الدفع / Payment receipt failed: ${error.message || "request failed"}`);
    }
  });

  (async () => {
    try {
      const me = await apiRequest("/api/me");
      saveSession({ user: me.user });
    } catch (error) {
      toLogin();
    }
  })();
}

if (page === "dashboard") {
  const toLogin = () => {
    clearSession();
    window.location.href = "index.html";
  };

  const usageBar = document.getElementById("usage-bar");
  const upgradeAccessBtn = document.getElementById("upgrade-access-btn");
  const upgradeContinueBtn = document.getElementById("upgrade-continue-btn");
  const upgradeSummary = document.getElementById("upgrade-summary");
  const planButtons = document.querySelectorAll(".plan");
  const accessItems = document.querySelectorAll("[data-access-resource]");
  const accessRequestButtons = document.querySelectorAll("[data-access-request]");
  const accessPendingCount = document.getElementById("access-pending-count");
  const accessApprovedCount = document.getElementById("access-approved-count");
  const accessLastUpdated = document.getElementById("access-last-updated");
  const accessRequestForm = document.getElementById("access-request-form");
  const accessResourceSelect = document.getElementById("access-resource-select");
  const accessUseCase = document.getElementById("access-use-case");
  const accessDuration = document.getElementById("access-duration");
  const accessRequestStatus = document.getElementById("access-request-status");
  const upgradeModal = document.getElementById("upgrade-modal");
  const paymentModal = document.getElementById("payment-modal");
  const paymentForm = document.getElementById("payment-form");
  const paymentWalletSelect = document.getElementById("payment-wallet");
  const paymentWalletLogo = document.getElementById("payment-wallet-logo");
  const paymentNotice = document.getElementById("payment-notice");
  const paymentTransferLabel = document.getElementById("payment-transfer-label");
  const paymentAmountInput = document.getElementById("payment-amount");
  const paymentAmountRange = document.getElementById("payment-amount-range");
  const paymentSenderInput = document.getElementById("payment-sender");
  const paymentSenderLabel = document.getElementById("payment-sender-label");
  const paymentReferenceInput = document.getElementById("payment-reference");
  const paymentReceiverNumber = document.getElementById("payment-receiver-number");
  const paymentReceiverNote = document.getElementById("payment-receiver-note");
  const paymentInstructions = document.getElementById("payment-instructions");
  const instapayQrWrap = document.getElementById("instapay-qr-wrap");
  const paymentQuickAmountsWrap = document.querySelector("#payment-modal .quick-amounts");
  const paymentProofImageInput = document.getElementById("payment-proof-image");
  const paymentProofPreview = document.getElementById("payment-proof-preview");
  const chatForm = document.getElementById("chat-form");
  const chatText = document.getElementById("chat-text");
  const chatWindow = document.getElementById("chat-window");
  const ticketForm = document.getElementById("ticket-form");
  const ticketInput = document.getElementById("ticket-text");
  const ticketList = document.getElementById("ticket-list");
  const securityCheckForm = document.getElementById("security-check-form");
  const securityGameName = document.getElementById("security-game-name");
  const securityDeviceOs = document.getElementById("security-device-os");
  const securityIssueSummary = document.getElementById("security-issue-summary");
  const securityServiceType = document.getElementById("security-service-type");
  const securityArtifacts = document.getElementById("security-artifacts");
  const securityCheckStatus = document.getElementById("security-check-status");
  const orderForm = document.getElementById("order-form");
  const orderGameSelect = document.getElementById("order-game");
  const orderAmountInput = document.getElementById("order-amount");
  const orderWalletSelect = document.getElementById("order-wallet");
  const topupQuickAmountsWrap = document.getElementById("topup-quick-amounts");
  const topupAmountHint = document.getElementById("topup-amount-hint");
  const openWalletPaymentLink = document.getElementById("open-wallet-payment-link");
  const orderProofImageInput = document.getElementById("order-proof-image");
  const orderProofPreview = document.getElementById("order-proof-preview");
  const orderList = document.getElementById("order-list");
  const adminLink = document.getElementById("dashboard-admin-link");
  const dashboardAiLink = document.getElementById("dashboard-ai-link");
  const dashboardAiCenter = document.getElementById("ai-center");
  const userName = document.querySelector(".user-name");
  const userRole = document.querySelector(".user-role");
  let userOrderCount = 0;
  const aiStatus = document.getElementById("ai-status");
  const aiHealthScore = document.getElementById("ai-health-score");
  const aiPendingOrders = document.getElementById("ai-pending-orders");
  const aiOpenTickets = document.getElementById("ai-open-tickets");
  const aiRecommendations = document.getElementById("ai-recommendations");
  const aiRefreshBtn = document.getElementById("ai-refresh-btn");
  const downloadInvoiceBtn = document.getElementById("download-invoice-btn");
  const aiChatForm = document.getElementById("ai-chat-form");
  const aiChatInput = document.getElementById("ai-chat-text");
  const aiChatWindow = document.getElementById("ai-chat-window");
  const topupOffersModal = document.getElementById("topup-offers-modal");
  const topupOffersTitle = document.getElementById("topup-offers-title");
  const topupOffersSubtitle = document.getElementById("topup-offers-subtitle");
  const topupOffersGrid = document.getElementById("topup-offers-grid");
  const topupOffersStartBtn = document.getElementById("topup-offers-start-btn");
  let lastTopupGame = "";

  const setTopupGameAndFocus = (game) => {
    const value = String(game || "").trim();
    if (!value) return;
    lastTopupGame = value;
    const gameSelect = document.getElementById("order-game");
    if (gameSelect) {
      const option = Array.from(gameSelect.options).find((item) => item.value === value);
      if (option) {
        gameSelect.value = option.value;
        // Sync amount presets for the selected game.
        gameSelect.dispatchEvent(new Event("change"));
      }
    }
    const form = document.getElementById("order-form");
    if (form) form.scrollIntoView({ behavior: "smooth", block: "start" });
    const idInput = document.getElementById("order-player-id");
    if (idInput) idInput.focus();
  };

  const walletPaymentPageByWallet = {
    vodafone_cash: "payment-vodafone.html",
    orange_cash: "payment-orange.html",
    etisalat_cash: "payment-etisalat.html",
    instapay: "payment-instapay.html",
    fawry: "payment-fawry.html",
    meeza: "payment-meeza.html",
  };

  const syncOpenWalletPaymentLink = () => {
    if (!openWalletPaymentLink) return;
    const wallet = normalizeWallet(orderWalletSelect?.value || "");
    const page = walletPaymentPageByWallet[wallet];
    if (!page) {
      openWalletPaymentLink.style.display = "none";
      return;
    }
    const game = String(orderGameSelect?.value || "").trim();
    const amount = Number(orderAmountInput?.value || 0);
    const qs = new URLSearchParams();
    if (game) qs.set("game", game);
    if (Number.isFinite(amount) && amount > 0) qs.set("amount", String(amount));
    openWalletPaymentLink.href = `${page}${qs.toString() ? `?${qs.toString()}` : ""}`;
    openWalletPaymentLink.style.display = "";
  };

  const syncTopupQuickAmounts = () => {
    if (!topupQuickAmountsWrap) return;
    const game = String(orderGameSelect?.value || "").trim();
    const amounts = getTopupGameAmounts(game);
    renderQuickAmounts({
      container: topupQuickAmountsWrap,
      amounts,
      onPick: (amount) => {
        if (!orderAmountInput) return;
        orderAmountInput.value = String(amount);
        syncOpenWalletPaymentLink();
      },
    });
    if (topupAmountHint) {
      topupAmountHint.textContent = amounts.length
        ? uiText("اختر مبلغًا من أسعار اللعبة:", "Pick an amount from the game's prices:") + ` ${amounts.map((n) => formatAmountSpaces(n)).join(", ")} EGP`
        : uiText("اختر اللعبة لعرض الأسعار المتاحة.", "Select a game to see available prices.");
    }
    if (orderAmountInput) {
      const current = Number(orderAmountInput.value || 0);
      if (amounts.length > 0) {
        orderAmountInput.min = String(Math.min(...amounts));
        orderAmountInput.max = String(Math.max(...amounts));
        // Keep current if valid, otherwise snap to first allowed amount.
        if (!amounts.includes(current)) orderAmountInput.value = String(amounts[0]);
      } else {
        orderAmountInput.min = "1";
        orderAmountInput.removeAttribute("max");
      }
    }
    syncOpenWalletPaymentLink();
  };

  const openTopupOffers = (game) => {
    if (!topupOffersModal || !topupOffersGrid) {
      setTopupGameAndFocus(game);
      return;
    }
    const key = String(game || "").trim();
    const entry = topupOfferCatalog[key];
    lastTopupGame = key;
    if (topupOffersTitle) {
      topupOffersTitle.innerHTML = `<span class="lang-inline"><span class="ar">عروض: ${key}</span><span class="en">Offers: ${key}</span></span>`;
    }
    if (topupOffersSubtitle) {
      topupOffersSubtitle.textContent = entry?.subtitle || uiText("اختر باقة لتعبئة المبلغ تلقائيًا.", "Pick a package to auto-fill amount.");
    }
    topupOffersGrid.innerHTML = "";
    (entry?.offers || []).forEach((offer) => {
      const card = document.createElement("div");
      card.className = "topup-offer clickable-card";
      card.setAttribute("tabindex", "0");
      card.setAttribute("role", "button");
      card.dataset.topupPackageGame = key;
      card.dataset.topupPackageAmount = String(offer.amount);

      const title = document.createElement("h4");
      title.textContent = `${offer.label}`;
      const price = document.createElement("p");
      price.className = "price";
      price.textContent = `${Number(offer.amount).toLocaleString()} EGP`;
      const meta = document.createElement("div");
      meta.className = "offer-meta";
      (offer.tags || []).slice(0, 3).forEach((tag) => {
        const span = document.createElement("span");
        span.textContent = String(tag);
        meta.appendChild(span);
      });
      const actions = document.createElement("div");
      actions.className = "offer-actions";
      const choose = document.createElement("button");
      choose.className = "primary-btn btn-sm";
      choose.type = "button";
      choose.dataset.topupPackageChoose = "1";
      choose.dataset.topupPackageGame = key;
      choose.dataset.topupPackageAmount = String(offer.amount);
      choose.innerHTML = `<span class="lang-inline"><span class="ar">اختيار</span><span class="en">Choose</span></span>`;
      const start = document.createElement("button");
      start.className = "outline-btn btn-sm";
      start.type = "button";
      start.dataset.topupStart = key;
      start.innerHTML = `<span class="lang-inline"><span class="ar">بدء الطلب</span><span class="en">Start</span></span>`;
      actions.append(choose, start);
      card.append(title, price, meta, actions);
      topupOffersGrid.appendChild(card);

      makeElementClickable(card, () => {
        const amountInput = document.getElementById("order-amount");
        if (amountInput) amountInput.value = String(offer.amount);
        setTopupGameAndFocus(key);
        closeModal(topupOffersModal);
      });
    });
    openModal(topupOffersModal);
  };

  const wireDashboardClickableCards = () => {
    const analyticsCards = document.querySelectorAll("#dashboard-analytics .metric-grid .metric-card");
    makeElementClickable(analyticsCards[0], () => {
      const el = document.getElementById("support");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    makeElementClickable(analyticsCards[1], () => {
      const el = document.getElementById("device-security-check");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    makeElementClickable(analyticsCards[2], () => {
      const el = document.getElementById("ticket-list");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    const accessSummaryCards = document.querySelectorAll("#access .access-summary .metric-card");
    makeElementClickable(accessSummaryCards[0], () => {
      const el = document.getElementById("access-request-form");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    makeElementClickable(accessSummaryCards[1], () => {
      const el = document.getElementById("access-request-form");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    makeElementClickable(accessSummaryCards[2], () => {
      const el = document.getElementById("access");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    const gameCards = document.querySelectorAll("#game-charge .topup-catalog .game-card");
    gameCards.forEach((card) => {
      makeElementClickable(card, () => {
        const title = String(card.getAttribute("data-game") || card.querySelector("h3")?.textContent || "").trim();
        if (!title) return;
        openTopupOffers(title);
      });
    });

    const stepCards = document.querySelectorAll("#game-charge .topup-steps .step-card");
    makeElementClickable(stepCards[0], () => {
      const el = document.getElementById("order-game");
      if (el) el.focus();
    });
    makeElementClickable(stepCards[1], () => {
      const el = document.getElementById("payments");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    makeElementClickable(stepCards[2], () => {
      const el = document.getElementById("order-proof-image");
      if (el) el.focus();
    });

    const supportGuideCard = document.querySelector("#device-security-check .feature-grid .feature-card");
    makeElementClickable(supportGuideCard, () => {
      const el = document.getElementById("security-check-form");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };
  wireDashboardClickableCards();

  // Top-up amount presets (game prices only) + convenience link to open the correct wallet payment page.
  orderGameSelect?.addEventListener("change", syncTopupQuickAmounts);
  orderWalletSelect?.addEventListener("change", syncOpenWalletPaymentLink);
  orderAmountInput?.addEventListener("input", syncOpenWalletPaymentLink);
  syncTopupQuickAmounts();

  // Allow landing page (or external links) to preselect game/amount in dashboard via query params.
  (() => {
    try {
      const params = new URLSearchParams(window.location.search || "");
      const game = String(params.get("game") || "").trim();
      const amount = Number(params.get("amount") || 0);
      if (!game) return;
      const allowed = getTopupGameAmounts(game);
      if (allowed.length === 0) return;
      setTopupGameAndFocus(game);
      if (orderAmountInput && Number.isFinite(amount) && allowed.includes(amount)) {
        orderAmountInput.value = String(amount);
        syncOpenWalletPaymentLink();
      }
    } catch (_) {
      // Ignore URL parsing errors.
    }
  })();

  document.addEventListener("click", (event) => {
    const offersBtn = event.target.closest("[data-topup-offers]");
    if (offersBtn) {
      const game = String(offersBtn.getAttribute("data-topup-offers") || "").trim();
      if (game) openTopupOffers(game);
      return;
    }
    const startBtn = event.target.closest("[data-topup-start]");
    if (startBtn) {
      const game = String(startBtn.getAttribute("data-topup-start") || "").trim();
      if (game) setTopupGameAndFocus(game);
      if (topupOffersModal && topupOffersModal.classList.contains("show")) closeModal(topupOffersModal);
      return;
    }
    const pkg = event.target.closest("[data-topup-package-amount]");
    if (pkg) {
      const game = String(pkg.dataset.topupPackageGame || lastTopupGame || "").trim();
      const amount = Number(pkg.dataset.topupPackageAmount || 0);
      const amountInput = document.getElementById("order-amount");
      if (amountInput && Number.isFinite(amount) && amount > 0) amountInput.value = String(amount);
      if (game) setTopupGameAndFocus(game);
      if (topupOffersModal && topupOffersModal.classList.contains("show")) closeModal(topupOffersModal);
    }
  });

  topupOffersStartBtn?.addEventListener("click", () => {
    if (lastTopupGame) setTopupGameAndFocus(lastTopupGame);
    if (topupOffersModal) closeModal(topupOffersModal);
  });

  if (usageBar) usageBar.style.width = "42%";

  const updateUserLabels = (user) => {
    if (!user) return;
    if (userName) userName.textContent = user.name || uiText("مستخدم", "User");
    if (userRole) userRole.textContent = roleLabel(user.role);
    if (adminLink) {
      adminLink.style.display = isStaffRole(user.role) ? "" : "none";
    }
    if (dashboardAiLink) {
      dashboardAiLink.style.display = isStaffRole(user.role) ? "" : "none";
    }
    if (dashboardAiCenter) {
      dashboardAiCenter.style.display = isStaffRole(user.role) ? "" : "none";
    }
  };

  const accessResourceCatalog = {
    research_vault: "Research Vault",
    security_lab: "Security Lab",
    engineering_hub: "Engineering Hub",
  };

  const accessStateByResource = {
    research_vault: { status: "not_requested", ticketId: null },
    security_lab: { status: "not_requested", ticketId: null },
    engineering_hub: { status: "not_requested", ticketId: null },
  };

  const setAccessButtonLabel = (button, key) => {
    if (!button) return;
    const map = {
      request: { ar: "طلب وصول", en: "Request access" },
      open: { ar: "مفتوح", en: "Open" },
      pending: { ar: "قيد المراجعة", en: "Pending" },
      update: { ar: "تحديث الطلب", en: "Request update" },
    };
    const label = map[key] || map.request;
    button.innerHTML = `<span class="lang-inline"><span class="ar">${label.ar}</span><span class="en">${label.en}</span></span>`;
  };

  const applyAccessUiState = () => {
    let pending = 0;
    let approved = 0;
    accessItems.forEach((item) => {
      const key = String(item.getAttribute("data-access-resource") || "").toLowerCase();
      const state = accessStateByResource[key] || { status: "not_requested", ticketId: null };
      const badge = item.querySelector("[data-access-status]");
      const button = item.querySelector("[data-access-request]");
      item.classList.remove("is-pending", "is-approved", "is-open");
      if (badge) {
        badge.classList.remove("status-open", "status-pending", "status-approved");
      }
      if (state.status === "pending") {
        pending += 1;
        item.classList.add("is-pending");
        if (badge) {
          badge.textContent = uiText("قيد المراجعة", "pending review");
          badge.classList.add("status-pending");
        }
        if (button) {
          button.disabled = true;
          setAccessButtonLabel(button, "pending");
        }
      } else if (state.status === "approved") {
        approved += 1;
        item.classList.add("is-approved");
        if (badge) {
          badge.textContent = uiText("معتمد", "approved");
          badge.classList.add("status-approved");
        }
        if (button) {
          button.disabled = false;
          setAccessButtonLabel(button, "update");
        }
      } else if (state.status === "rejected") {
        item.classList.add("is-open");
        if (badge) {
          badge.textContent = uiText("مرفوض", "rejected");
          badge.classList.add("status-open");
        }
        if (button) {
          button.disabled = false;
          setAccessButtonLabel(button, "request");
        }
      } else {
        if (badge) badge.textContent = uiText("غير مطلوب", "not requested");
        if (button) {
          button.disabled = false;
          setAccessButtonLabel(button, "request");
        }
      }
    });

    if (accessPendingCount) accessPendingCount.textContent = String(pending);
    if (accessApprovedCount) accessApprovedCount.textContent = String(approved);
    if (accessLastUpdated) accessLastUpdated.textContent = new Date().toLocaleString();
  };

  const syncAccessStateFromRequests = (accessRequests = []) => {
    Object.keys(accessStateByResource).forEach((key) => {
      accessStateByResource[key] = { status: "not_requested", ticketId: null };
    });

    const sortedRequests = [...accessRequests].sort((a, b) => {
      const aTime = Date.parse(a?.createdAt || 0) || 0;
      const bTime = Date.parse(b?.createdAt || 0) || 0;
      return bTime - aTime;
    });

    sortedRequests.forEach((request) => {
      const key = String(request?.resource || "").toLowerCase();
      if (!key) return;
      if (accessStateByResource[key]?.ticketId) return;
      const normalized = ["pending", "approved", "rejected"].includes(request.status)
        ? request.status
        : "pending";
      accessStateByResource[key] = {
        status: normalized,
        ticketId: request.id,
      };
    });

    applyAccessUiState();
  };

  const renderTicket = (ticket, options = {}) => {
    if (!ticketList) return;
    const prepend = options.prepend !== false;
    const returnNode = options.returnNode === true;
    const item = document.createElement("div");
    item.className = "ticket-item";

    const left = document.createElement("div");
    const title = document.createElement("h4");
    title.textContent = ticket.title;
    const status = document.createElement("p");
    status.className = "muted";
    status.textContent = ticket.status;
    left.append(title, status);

    const right = document.createElement("span");
    right.className = "status-pill";
    right.textContent =
      ticket.priority === "high"
        ? uiText("مرتفعة", "high")
        : ticket.priority === "low"
          ? uiText("منخفضة", "low")
          : uiText("متوسطة", "medium");

    item.append(left, right);
    if (returnNode) return item;
    if (prepend) {
      ticketList.prepend(item);
    } else {
      ticketList.append(item);
    }
  };

  const renderOrder = (order, options = {}) => {
    if (!orderList) return;
    const prepend = options.prepend !== false;
    const returnNode = options.returnNode === true;
    const item = document.createElement("div");
    item.className = "ticket-item";

    const left = document.createElement("div");
    const title = document.createElement("h4");
    title.textContent = `${order.game} - ${order.playerId}`;
    const meta = document.createElement("p");
    meta.className = "muted";
    meta.textContent = `${order.amount} EGP via ${walletLabel(order.wallet)}`;
    left.append(title, meta);
    if (order.proofUrl) {
      const image = document.createElement("img");
      image.src = order.proofUrl;
      image.alt = "Payment proof";
      image.className = "proof-preview inline clickable-proof";
      image.dataset.previewSrc = order.proofUrl;
      left.appendChild(image);
    }

    const status = document.createElement("span");
    status.className = "status-pill";
    status.textContent =
      order.status === "approved"
        ? uiText("مقبول", "approved")
        : order.status === "rejected"
          ? uiText("مرفوض", "rejected")
          : uiText("قيد المراجعة", "pending");
    item.append(left, status);
    if (returnNode) return item;
    if (prepend) {
      orderList.prepend(item);
    } else {
      orderList.append(item);
    }
  };

  const loadUser = async () => {
    const stored = getStoredUser();
    if (stored) updateUserLabels(stored);
    const response = await apiRequest("/api/me");
    updateUserLabels(response.user);
    saveSession({ user: response.user });
  };

  const loadTickets = async () => {
    if (!ticketList) return;
    const response = await apiRequest("/api/tickets");
    ticketList.innerHTML = "";
    const fragment = document.createDocumentFragment();
    response.tickets.forEach((ticket) => {
      fragment.appendChild(renderTicket(ticket, { prepend: false, returnNode: true }));
    });
    ticketList.appendChild(fragment);
    return response.tickets;
  };

  const loadAccessRequests = async () => {
    const response = await apiRequest("/api/access-requests");
    syncAccessStateFromRequests(response.accessRequests || []);
    return response.accessRequests || [];
  };

  const loadOrders = async () => {
    if (!orderList) return;
    const response = await apiRequest("/api/orders");
    userOrderCount = Array.isArray(response.orders) ? response.orders.length : 0;
    orderList.innerHTML = "";
    const fragment = document.createDocumentFragment();
    response.orders.forEach((order) => {
      fragment.appendChild(renderOrder(order, { prepend: false, returnNode: true }));
    });
    orderList.appendChild(fragment);
  };

  const refreshUpgradeSummary = () => {
    if (!upgradeSummary) return;
    if (userOrderCount <= 0) {
      upgradeSummary.textContent =
        uiText(
          "لا توجد جلسات مدفوعة سابقة. الجلسة الأولى مجانًا، ومن الجلسة الثانية 200 جنيه لكل جلسة.",
          "You have no previous paid sessions. First session is free; next sessions are 200 EGP each."
        );
      return;
    }
    upgradeSummary.textContent = uiText(
      `الطلبات المكتملة: ${userOrderCount}. تكلفة الجلسة الجديدة: 200 جنيه.`,
      `Completed requests: ${userOrderCount}. New session fee applies: 200 EGP.`
    );
  };

  const renderDashboardAi = (insights) => {
    if (!insights) return;
    if (aiStatus) {
      aiStatus.textContent = uiText(
        `حالة AI: ${insights.health.level} | الدرجة ${insights.health.score} | آخر تحديث ${new Date(insights.generatedAt).toLocaleString()}`,
        `AI Health: ${insights.health.level} | Score ${insights.health.score} | Updated ${new Date(insights.generatedAt).toLocaleString()}`
      );
    }
    if (aiHealthScore) aiHealthScore.textContent = String(insights.health.score);
    if (aiPendingOrders) aiPendingOrders.textContent = String(insights.health.pendingOrders);
    if (aiOpenTickets) aiOpenTickets.textContent = String(insights.health.openTickets);
    if (aiRecommendations) {
      aiRecommendations.innerHTML = "";
      (insights.recommendations || []).forEach((entry) => {
        const li = document.createElement("li");
        li.textContent = String(entry);
        aiRecommendations.appendChild(li);
      });
    }
  };

  const loadDashboardAi = async () => {
    const response = await apiRequest("/api/ai/insights");
    renderDashboardAi(response.insights);
  };

  applyAccessUiState();

  planButtons.forEach((button) => {
    button.addEventListener("click", () => {
      planButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
    });
  });

  accessRequestButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const item = button.closest("[data-access-resource]");
      const key = String(item?.getAttribute("data-access-resource") || "").toLowerCase();
      if (!key || !accessResourceCatalog[key]) return;
      if (accessResourceSelect) accessResourceSelect.value = key;
      if (accessUseCase) accessUseCase.focus();
      if (accessRequestStatus) {
        accessRequestStatus.textContent = uiText(
          `تم اختيار: ${accessResourceCatalog[key]}. أضف سبب الاستخدام ثم أرسل الطلب.`,
          `Selected: ${accessResourceCatalog[key]}. Add use case then submit.`
        );
      }
    });
  });

  accessRequestForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitBtn = accessRequestForm.querySelector("button[type='submit']");
    const unlock = lockButton(submitBtn, uiText("جارٍ الإرسال...", "Submitting..."));
    const resourceKey = String(accessResourceSelect?.value || "").toLowerCase();
    const useCase = accessUseCase?.value.trim() || "";
    const duration = accessDuration?.value || "single_task";

    if (!resourceKey || !accessResourceCatalog[resourceKey] || !useCase) {
      if (accessRequestStatus) {
        accessRequestStatus.textContent = uiText("يرجى استكمال المورد وسبب الاستخدام.", "Please complete resource and use case.");
      }
      unlock();
      return;
    }

    try {
      const response = await apiRequest("/api/access-requests", {
        method: "POST",
        body: JSON.stringify({
          resource: resourceKey,
          useCase,
          duration,
        }),
      });
      accessStateByResource[resourceKey] = {
        status: "pending",
        ticketId: response.accessRequest?.id || null,
      };
      applyAccessUiState();
      accessRequestForm.reset();
      if (accessResourceSelect) accessResourceSelect.value = resourceKey;
      if (accessRequestStatus) {
        accessRequestStatus.textContent = uiText(
          "تم إرسال طلب الوصول وهو الآن قيد المراجعة.",
          "Access request submitted and queued for review."
        );
      }
    } catch (error) {
      if (accessRequestStatus) {
        accessRequestStatus.textContent =
          uiText("فشل إرسال طلب الوصول", "Access request failed") +
          `: ${error.message || uiText("خطأ في الطلب", "request error")}`;
      }
    } finally {
      unlock();
    }
  });

  document.querySelectorAll("[data-open]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.id === "upgrade-access-btn" || button.id === "upgrade-continue-btn") return;
      const target = button.getAttribute("data-open");
      const presetWallet = button.getAttribute("data-wallet-preset");
      if (target === "upgrade" && upgradeModal) {
        refreshUpgradeSummary();
        openModal(upgradeModal);
      }
      if (target === "payment" && paymentModal) {
        if (presetWallet && paymentWalletSelect) {
          paymentWalletSelect.value = presetWallet;
          paymentWalletSelect.dispatchEvent(new Event("change"));
        }
        if (upgradeModal) closeModal(upgradeModal);
        openModal(paymentModal);
      }
    });
  });

  upgradeAccessBtn?.addEventListener("click", () => {
    if (!upgradeModal) return;
    refreshUpgradeSummary();
    openModal(upgradeModal);
  });

  upgradeContinueBtn?.addEventListener("click", () => {
    if (!paymentModal) return;
    if (upgradeModal) closeModal(upgradeModal);
    openModal(paymentModal);
  });

  const syncWalletPaymentView = () => {
    if (!paymentWalletSelect || !paymentReceiverNumber || !paymentReceiverNote) return;
    const wallet = normalizeWallet(paymentWalletSelect.value || "instapay");
    const config = paymentUiConfig[wallet] || paymentUiConfig.instapay;
    paymentReceiverNumber.textContent = walletReceiverNumber(wallet);
    if (paymentWalletLogo) paymentWalletLogo.src = config.logo;
    if (paymentNotice) paymentNotice.textContent = config.notice;
    if (paymentTransferLabel) paymentTransferLabel.textContent = config.transferLabel;
    if (paymentAmountRange) paymentAmountRange.textContent = config.amountRange;
    if (paymentSenderLabel) paymentSenderLabel.textContent = config.senderLabel;
    if (paymentSenderInput) paymentSenderInput.placeholder = config.senderPlaceholder;
    if (paymentReceiverNote) paymentReceiverNote.textContent = config.note;
    if (paymentInstructions) paymentInstructions.textContent = config.instructions;
    if (paymentAmountInput) {
      paymentAmountInput.min = String(config.min);
      paymentAmountInput.max = String(config.max);
      const current = Number(paymentAmountInput.value || 0);
      if (!Number.isFinite(current) || current < config.min || current > config.max) {
        paymentAmountInput.value = String(Math.max(config.min, 300));
      }
    }

    // Show quick amounts derived from game offer prices only (filtered per wallet min/max).
    renderQuickAmounts({
      container: paymentQuickAmountsWrap,
      amounts: getAllTopupAmounts().filter((n) => n >= config.min && n <= config.max),
      onPick: (amount) => {
        if (!paymentAmountInput) return;
        paymentAmountInput.value = String(amount);
      },
    });
    const insta = wallet === "instapay";
    if (instapayQrWrap) {
      instapayQrWrap.style.display = insta ? "block" : "none";
    }
  };

  paymentWalletSelect?.addEventListener("change", syncWalletPaymentView);
  syncWalletPaymentView();

  document.querySelectorAll("[data-close]").forEach((button) => {
    button.addEventListener("click", () => {
      if (upgradeModal) closeModal(upgradeModal);
      if (paymentModal) closeModal(paymentModal);
      if (topupOffersModal) closeModal(topupOffersModal);
    });
  });

  paymentProofImageInput?.addEventListener("change", async () => {
    const file = paymentProofImageInput.files?.[0];
    if (!file || !paymentProofPreview) return;
    paymentProofPreview.src = await fileToDataUrl(file);
    paymentProofPreview.style.display = "block";
  });

  orderProofImageInput?.addEventListener("change", async () => {
    const file = orderProofImageInput.files?.[0];
    if (!file || !orderProofPreview) return;
    orderProofPreview.src = await fileToDataUrl(file);
    orderProofPreview.style.display = "block";
  });

  paymentForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitBtn = paymentForm.querySelector("button[type='submit']");
    const unlock = lockButton(submitBtn, uiText("جارٍ المعالجة...", "Processing..."));
    const paymentFile = paymentProofImageInput?.files?.[0];
    const wallet = normalizeWallet(paymentWalletSelect?.value || "instapay");
    const config = paymentUiConfig[wallet] || paymentUiConfig.instapay;
    const sender = paymentSenderInput?.value.trim() || "";
    const amount = Number(paymentAmountInput?.value || 0);
    const paymentRef = paymentReferenceInput?.value.trim() || "";
    if (!paymentFile) {
      alert("صورة إثبات الدفع مطلوبة / Payment proof image is required");
      unlock();
      return;
    }
    if (!sender || !paymentRef || !Number.isFinite(amount) || amount <= 0) {
      alert(uiText("يرجى إدخال المرسل والمبلغ ورقم العملية.", "Please complete sender, amount, and transaction reference"));
      unlock();
      return;
    }
    if (amount < config.min || amount > config.max) {
      alert(
        uiText("قيمة المبلغ غير صحيحة", "Amount for wallet is invalid") +
          `: ${walletLabel(wallet)} (${config.min} - ${config.max} EGP)`
      );
      unlock();
      return;
    }
    let proofUrl = "";
    try {
      proofUrl = await uploadProofFile(paymentFile);
    } catch (error) {
      alert(`${uiText("فشل رفع إثبات الدفع", "Payment proof upload failed")}: ${error.message || uiText("فشل الطلب", "request failed")}`);
      unlock();
      return;
    }
    try {
      await apiRequest("/api/payment-receipts", {
        method: "POST",
        body: JSON.stringify({
          method: wallet,
          receiver: walletReceiverNumber(wallet),
          sender,
          amount,
          paymentRef,
          note: "Payment modal receipt",
          proofUrl,
        }),
      });
    } catch (error) {
      alert(uiText("فشل إرسال إيصال الدفع.", "Payment receipt failed"));
      unlock();
      return;
    }
    if (paymentModal) closeModal(paymentModal);
    if (upgradeModal) closeModal(upgradeModal);
    alert(uiText("تم تأكيد الدفع (تجريبي).", "Payment confirmed (mock)"));
    unlock();
  });

  chatForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!chatText || !chatWindow) return;
    const message = chatText.value.trim();
    if (!message) return;

    const bubble = document.createElement("div");
    bubble.className = "chat-message user";
    const text = document.createElement("p");
    text.textContent = message;
    bubble.appendChild(text);
    chatWindow.appendChild(bubble);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    chatText.value = "";
  });

  ticketForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!ticketInput) return;
    const submitBtn = ticketForm.querySelector("button[type='submit']");
    const unlock = lockButton(submitBtn, uiText("جارٍ الإرسال...", "Submitting..."));
    const title = ticketInput.value.trim();
    if (!title) {
      unlock();
      return;
    }
    try {
      const response = await apiRequest("/api/tickets", {
        method: "POST",
        body: JSON.stringify({ title, priority: "medium" }),
      });
      renderTicket(response.ticket);
      ticketInput.value = "";
    } catch (error) {
      alert(uiText("فشل إرسال التذكرة.", "Ticket failed"));
    } finally {
      unlock();
    }
  });

  securityCheckForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitBtn = securityCheckForm.querySelector("button[type='submit']");
    const unlock = lockButton(submitBtn, uiText("جارٍ الإرسال...", "Submitting..."));
    const game = securityGameName?.value.trim() || "";
    const device = securityDeviceOs?.value.trim() || "";
    const issue = securityIssueSummary?.value.trim() || "";
    const serviceType = securityServiceType?.value.trim() || "repair_and_tuning";
    const artifacts = securityArtifacts?.value.trim() || "registry, dll, windows audit";
    if (!game || !device || !issue || !serviceType || !artifacts) {
      if (securityCheckStatus) securityCheckStatus.textContent = uiText("يرجى استكمال كل الحقول.", "Please complete all fields.");
      unlock();
      return;
    }
    const ticketTitle = `[Diagnostics] ${game} | ${device} | ${issue} | service=${serviceType} | files=${artifacts}`;
    try {
      const response = await apiRequest("/api/tickets", {
        method: "POST",
        body: JSON.stringify({ title: ticketTitle, priority: "high" }),
      });
      renderTicket(response.ticket);
      securityCheckForm.reset();
      if (securityCheckStatus) {
        securityCheckStatus.textContent = uiText("تم إرسال طلب التشخيص بنجاح.", "Diagnostic request submitted successfully.");
      }
    } catch (error) {
      if (securityCheckStatus) {
        securityCheckStatus.textContent =
          uiText("فشل إرسال الطلب", "Request failed") + `: ${error.message || uiText("خطأ في الطلب", "request error")}`;
      }
    } finally {
      unlock();
    }
  });

  orderForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitBtn = orderForm.querySelector("button[type='submit']");
    const unlock = lockButton(submitBtn, uiText("جارٍ الإرسال...", "Submitting..."));
    const game = document.getElementById("order-game")?.value.trim() || "";
    const playerId = document.getElementById("order-player-id")?.value.trim() || "";
    const amount = Number(document.getElementById("order-amount")?.value || 0);
    const wallet = normalizeWallet(document.getElementById("order-wallet")?.value || "");
    const sender = document.getElementById("order-sender")?.value.trim() || "";
    const paymentRef = document.getElementById("order-ref")?.value.trim() || "";
    const proofFile = orderProofImageInput?.files?.[0];
    if (!game || !playerId || !sender || !paymentRef || !wallet || !Number.isFinite(amount) || amount <= 0) {
      alert(uiText("يرجى استكمال كل بيانات طلب الشحن.", "Please complete all required order fields"));
      unlock();
      return;
    }
    if (!proofFile) {
      alert("صورة إثبات الدفع مطلوبة / Payment proof image is required");
      unlock();
      return;
    }
    const allowedAmounts = getTopupGameAmounts(game);
    if (allowedAmounts.length > 0 && !allowedAmounts.includes(amount)) {
      alert(
        uiText("المبلغ يجب أن يكون من أسعار اللعبة فقط.", "Amount must match the game's prices only.") +
          ` (${game}: ${allowedAmounts.map((n) => `${formatAmountSpaces(n)}`).join(", ")} EGP)`
      );
      unlock();
      return;
    }
    let proofUrl = "";
    try {
      proofUrl = await uploadProofFile(proofFile);
    } catch (error) {
      alert(`${uiText("فشل رفع إثبات الدفع", "Payment proof upload failed")}: ${error.message || uiText("فشل الطلب", "request failed")}`);
      unlock();
      return;
    }

    try {
      const response = await apiRequest("/api/orders", {
        method: "POST",
        body: JSON.stringify({ game, playerId, amount, wallet, sender, paymentRef, proofUrl }),
      });
      renderOrder(response.order);
      orderForm.reset();
      if (orderProofPreview) {
        orderProofPreview.removeAttribute("src");
        orderProofPreview.style.display = "none";
      }
    } catch (error) {
      alert(uiText("فشل إرسال طلب الشحن.", "Order failed"));
    } finally {
      unlock();
    }
  });

  aiRefreshBtn?.addEventListener("click", async () => {
    try {
      await loadDashboardAi();
    } catch (error) {
      alert(uiText("فشل تحديث تحليلات AI.", "AI insights refresh failed"));
    }
  });

  downloadInvoiceBtn?.addEventListener("click", () => {
    const user = getStoredUser();
    const now = new Date();
    const payload = {
      invoiceId: `INV-${now.getTime()}`,
      issuedAt: now.toISOString(),
      customer: user?.email || "unknown",
      policy: "First session is free. From the second session: 200 EGP per session.",
      receivers: {
        instapay: "01147794004",
        wallets: "01143813016",
      },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${payload.invoiceId}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  });

  bindAiAssistant({
    form: aiChatForm,
    input: aiChatInput,
    windowEl: aiChatWindow,
    scope: "dashboard",
  });

  (async () => {
    try {
      await loadUser();
      await Promise.all([loadTickets(), loadOrders(), loadDashboardAi(), loadAccessRequests()]);
    } catch (error) {
      toLogin();
    }
  })();
}

if (page === "admin") {
  const ADMIN_KPI_RANGE_KEY = "gl_admin_kpi_range";
  const adminTicketList = document.getElementById("admin-ticket-list");
  const adminAccessRequestList = document.getElementById("admin-access-request-list");
  const adminAccessPending = document.getElementById("admin-access-pending");
  const adminAccessApproved = document.getElementById("admin-access-approved");
  const adminAccessRejected = document.getElementById("admin-access-rejected");
  const adminTicketOpen = document.getElementById("admin-ticket-open");
  const adminTicketClosed = document.getElementById("admin-ticket-closed");
  const adminOrderPending = document.getElementById("admin-order-pending");
  const adminOrderApproved = document.getElementById("admin-order-approved");
  const adminOrderRejected = document.getElementById("admin-order-rejected");
  const adminOrderList = document.getElementById("admin-order-list");
  const adminReceiptList = document.getElementById("admin-receipt-list");
  const adminNotificationList = document.getElementById("admin-notification-list");
  const userName = document.querySelector(".user-name");
  const userRole = document.querySelector(".user-role");
  const adminOnlyEls = document.querySelectorAll("[data-admin-only]");
  const notificationBadge = document.getElementById("admin-notification-badge");
  const markAllReadBtn = document.getElementById("mark-notifications-read");
  const integrationStatusBox = document.getElementById("integration-status");
  const integrationTestBtn = document.getElementById("integration-test-btn");
  const integrationResultBox = document.getElementById("integration-test-result");
  const adminAiStatus = document.getElementById("admin-ai-status");
  const adminAiHealthScore = document.getElementById("admin-ai-health-score");
  const adminAiPendingOrders = document.getElementById("admin-ai-pending-orders");
  const adminAiOpenTickets = document.getElementById("admin-ai-open-tickets");
  const adminAiRecommendations = document.getElementById("admin-ai-recommendations");
  const adminAiRefreshBtn = document.getElementById("admin-ai-refresh-btn");
  const adminAiSyncBtn = document.getElementById("admin-ai-sync-btn");
  const adminAiSyncResult = document.getElementById("admin-ai-sync-result");
  const adminAiChatForm = document.getElementById("admin-ai-chat-form");
  const adminAiChatInput = document.getElementById("admin-ai-chat-text");
  const adminAiChatWindow = document.getElementById("admin-ai-chat-window");
  const storageHealthStatus = document.getElementById("storage-health-status");
  const storageDriver = document.getElementById("storage-driver");
  const storageSize = document.getElementById("storage-size");
  const storageBackupState = document.getElementById("storage-backup-state");
  const storageRecords = document.getElementById("storage-records");
  const storageRefreshBtn = document.getElementById("storage-refresh-btn");
  const storageBackupBtn = document.getElementById("storage-backup-btn");
  const storageBackupResult = document.getElementById("storage-backup-result");
  const perfStatus = document.getElementById("perf-status");
  const perfSuccess5m = document.getElementById("perf-success-5m");
  const perfLatency5m = document.getElementById("perf-latency-5m");
  const perfP95_1h = document.getElementById("perf-p95-1h");
  const perfRefreshBtn = document.getElementById("perf-refresh-btn");
  const perfSamples = document.getElementById("perf-samples");
  const perfTopPaths = document.getElementById("perf-top-paths");
  const perfRecentErrors = document.getElementById("perf-recent-errors");
  const proofModal = document.getElementById("proof-modal");
  const proofModalImage = document.getElementById("proof-modal-image");
  const proofModalClose = document.getElementById("proof-modal-close");
  const adminOverviewActiveUsers = document.getElementById("admin-overview-active-users");
  const adminOverviewOpenQueue = document.getElementById("admin-overview-open-queue");
  const adminOverviewMonthlyVolume = document.getElementById("admin-overview-monthly-volume");
  const adminOverviewActiveNote = document.getElementById("admin-overview-active-note");
  const adminOverviewOpenNote = document.getElementById("admin-overview-open-note");
  const adminOverviewMonthlyNote = document.getElementById("admin-overview-monthly-note");
  const adminRangeButtons = document.querySelectorAll("[data-admin-range]");
  const adminKpiRangeNote = document.getElementById("admin-kpi-range-note");
  const adminKpiRangeReset = document.getElementById("admin-kpi-range-reset");
  const overviewData = {
    tickets: [],
    orders: [],
    accessRequests: [],
    receipts: [],
  };
  const wireAdminClickableCards = () => {
    const introCards = document.querySelectorAll(".page-intro .feature-grid .feature-card");
    makeElementClickable(introCards[0], () => {
      const el = document.getElementById("tickets");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    makeElementClickable(introCards[1], () => {
      const el = document.getElementById("payment-receipts");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    makeElementClickable(introCards[2], () => {
      const el = document.getElementById("performance");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    const overviewCards = document.querySelectorAll(".section.reveal .metric-grid .access-kpi");
    makeElementClickable(overviewCards[0], () => {
      const el = document.getElementById("users");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    makeElementClickable(overviewCards[1], () => {
      const el = document.getElementById("tickets");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    makeElementClickable(overviewCards[2], () => {
      const el = document.getElementById("payment-receipts");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };
  wireAdminClickableCards();
  const getStoredAdminRange = () => {
    const raw = String(localStorage.getItem(ADMIN_KPI_RANGE_KEY) || "all").trim().toLowerCase();
    return ["all", "today", "7d", "30d"].includes(raw) ? raw : "all";
  };
  const setStoredAdminRange = (value) => {
    localStorage.setItem(ADMIN_KPI_RANGE_KEY, value);
  };
  const clearStoredAdminRange = () => {
    localStorage.removeItem(ADMIN_KPI_RANGE_KEY);
  };
  let adminKpiRange = getStoredAdminRange();
  let currentRole = "user";
  const t = (ar, en) => (document.body.classList.contains("rtl") ? ar : en);
  const animateCounter = (element, nextValue, options = {}) => {
    if (!element) return;
    const parse = options.parse || ((text) => Number(String(text || "").replace(/[^\d.-]/g, "")) || 0);
    const format = options.format || ((value) => String(value));
    const to = Math.max(0, Number(nextValue) || 0);
    const from = Math.max(0, parse(element.textContent));
    if (from === to) return;
    const duration = 260;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const value = Math.round(from + (to - from) * progress);
      element.textContent = format(value);
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    const card = element.closest(".access-kpi");
    if (card) {
      card.classList.add("kpi-updated");
      setTimeout(() => card.classList.remove("kpi-updated"), 320);
    }
  };

  const updateAdminOverview = () => {
    const tickets = overviewData.tickets || [];
    const orders = overviewData.orders || [];
    const accessRequests = overviewData.accessRequests || [];
    const receipts = overviewData.receipts || [];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const rangeMsMap = {
      "7d": 7 * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000,
    };
    const inSelectedRange = (item) => {
      if (adminKpiRange === "all") return true;
      const createdAtMs = Date.parse(String(item?.createdAt || ""));
      if (!Number.isFinite(createdAtMs)) return false;
      if (adminKpiRange === "today") return createdAtMs >= startOfToday;
      const ms = rangeMsMap[adminKpiRange];
      if (!ms) return true;
      return createdAtMs >= now.getTime() - ms;
    };

    const ticketsInRange = tickets.filter(inSelectedRange);
    const ordersInRange = orders.filter(inSelectedRange);
    const accessInRange = accessRequests.filter(inSelectedRange);
    const receiptsInRange = receipts.filter(inSelectedRange);

    const activeUserSet = new Set();
    [...ticketsInRange, ...ordersInRange, ...accessInRange, ...receiptsInRange].forEach((item) => {
      const id = String(item?.userId || "").trim();
      if (id) activeUserSet.add(id);
    });

    const openTickets = ticketsInRange.filter((item) => item.status === "open").length;
    const closedTickets = ticketsInRange.filter((item) => item.status === "closed").length;
    const pendingOrders = ordersInRange.filter((item) => item.status === "pending").length;
    const approvedOrders = ordersInRange.filter((item) => item.status === "approved").length;
    const rejectedOrders = ordersInRange.filter((item) => item.status === "rejected").length;
    const pendingAccess = accessInRange.filter((item) => item.status === "pending").length;
    const approvedAccess = accessInRange.filter((item) => item.status === "approved").length;
    const rejectedAccess = accessInRange.filter((item) => item.status === "rejected").length;
    const openQueue = openTickets + pendingOrders + pendingAccess;

    const rangeVolume = receiptsInRange.reduce((sum, receipt) => sum + (Number(receipt?.amount || 0) || 0), 0);

    animateCounter(adminOverviewActiveUsers, activeUserSet.size);
    animateCounter(adminOverviewOpenQueue, openQueue);
    animateCounter(adminOverviewMonthlyVolume, rangeVolume, {
      format: (value) => `${value.toLocaleString()} EGP`,
    });
    animateCounter(adminTicketOpen, openTickets);
    animateCounter(adminTicketClosed, closedTickets);
    animateCounter(adminOrderPending, pendingOrders);
    animateCounter(adminOrderApproved, approvedOrders);
    animateCounter(adminOrderRejected, rejectedOrders);
    animateCounter(adminAccessPending, pendingAccess);
    animateCounter(adminAccessApproved, approvedAccess);
    animateCounter(adminAccessRejected, rejectedAccess);

    if (adminOverviewActiveNote) {
      adminOverviewActiveNote.textContent = activeUserSet.size > 0 ? t("مستخدمون نشطون", "live users") : t("لا يوجد نشاط", "no activity");
    }
    if (adminOverviewOpenNote) {
      adminOverviewOpenNote.textContent =
        openQueue > 12
          ? t("ضغط مرتفع", "high load")
          : openQueue > 0
            ? t("ضغط طبيعي", "normal load")
            : t("بدون ضغط", "clear");
    }
    if (adminOverviewMonthlyNote) {
      const labels = {
        all: t("كل المدة", "all time"),
        today: t("اليوم", "today"),
        "7d": t("آخر 7 أيام", "last 7 days"),
        "30d": t("آخر 30 يوم", "last 30 days"),
      };
      adminOverviewMonthlyNote.textContent = labels[adminKpiRange] || "all time";
    }
    if (adminKpiRangeNote) {
      const labels = {
        all: t("المدى: كل المدة", "Range: All time"),
        today: t("المدى: اليوم", "Range: Today"),
        "7d": t("المدى: آخر 7 أيام", "Range: Last 7 days"),
        "30d": t("المدى: آخر 30 يوم", "Range: Last 30 days"),
      };
      adminKpiRangeNote.textContent = labels[adminKpiRange] || "Range: All time";
    }
  };

  const openProofModal = (src) => {
    if (!proofModal || !proofModalImage || !src) return;
    proofModalImage.src = src;
    proofModal.classList.add("show");
    proofModal.setAttribute("aria-hidden", "false");
  };

  const closeProofModal = () => {
    if (!proofModal || !proofModalImage) return;
    proofModal.classList.remove("show");
    proofModal.setAttribute("aria-hidden", "true");
    proofModalImage.removeAttribute("src");
  };

  const applyRoleVisibility = (role) => {
    currentRole = normalizeRole(role);
    const adminVisible = isAdminRole(currentRole);
    adminOnlyEls.forEach((element) => {
      element.style.display = adminVisible ? "" : "none";
    });
    if (userRole) userRole.textContent = roleLabel(currentRole);
  };

  const ensureStaffSession = async () => {
    try {
      const me = await apiRequest("/api/me");
      if (!isStaffRole(me.user?.role)) {
        throw new Error("Forbidden");
      }
      saveSession({ user: me.user });
      if (userName) userName.textContent = me.user.name || "Staff";
      applyRoleVisibility(me.user.role);
    } catch (error) {
      clearSession();
      window.location.href = "index.html";
      throw new Error("Unauthorized");
    }
  };

  const renderAdminTicket = (ticket) => {
    if (!adminTicketList) return;
    const row = document.createElement("div");
    row.className = "ticket-item";

    const left = document.createElement("div");
    const title = document.createElement("h4");
    title.textContent = ticket.title;
    const meta = document.createElement("p");
    meta.className = "muted";
    meta.textContent = ticket.priority;
    left.append(title, meta);

    const button = document.createElement("button");
    button.className = `status-btn ${ticket.status === "closed" ? "status-closed" : ""}`;
    button.dataset.status = ticket.status;
    button.dataset.id = ticket.id;
    button.textContent = ticket.status === "closed" ? t("مغلق", "Closed") : t("مفتوح", "Open");

    row.append(left, button);
    adminTicketList.appendChild(row);
  };

  const renderAdminOrder = (order) => {
    if (!adminOrderList) return;
    const row = document.createElement("div");
    row.className = "ticket-item";

    const left = document.createElement("div");
    const title = document.createElement("h4");
    title.textContent = `${order.game} - ${order.playerId}`;
    const meta = document.createElement("p");
    meta.className = "muted";
    meta.textContent = `${order.amount} EGP | ${walletLabel(order.wallet)} | ref: ${order.paymentRef || "-"}`;
    left.append(title, meta);
    if (order.proofUrl) {
      const image = document.createElement("img");
      image.src = order.proofUrl;
      image.alt = "Payment proof";
      image.className = "proof-preview inline clickable-proof";
      image.dataset.previewSrc = order.proofUrl;
      left.appendChild(image);
    }

    const actions = document.createElement("div");
    actions.className = "order-actions";

    const status = document.createElement("span");
    status.className = "status-pill";
    status.textContent =
      order.status === "approved"
        ? t("مقبول", "approved")
        : order.status === "rejected"
          ? t("مرفوض", "rejected")
          : t("قيد الانتظار", "pending");

    const approve = document.createElement("button");
    approve.className = "status-btn";
    approve.dataset.orderId = order.id;
    approve.dataset.nextStatus = "approved";
    approve.textContent = t("قبول", "Approve");

    const reject = document.createElement("button");
    reject.className = "status-btn status-closed";
    reject.dataset.orderId = order.id;
    reject.dataset.nextStatus = "rejected";
    reject.textContent = t("رفض", "Reject");

    actions.append(status, approve, reject);
    row.append(left, actions);
    adminOrderList.appendChild(row);
  };

  const loadAdminTickets = async () => {
    if (!adminTicketList) return;
    const response = await apiRequest("/api/tickets");
    const tickets = Array.isArray(response.tickets) ? response.tickets : [];
    overviewData.tickets = tickets;
    updateAdminOverview();
    adminTicketList.innerHTML = "";
    tickets.forEach(renderAdminTicket);
  };

  const loadAdminOrders = async () => {
    if (!adminOrderList) return;
    const response = await apiRequest("/api/orders");
    const orders = Array.isArray(response.orders) ? response.orders : [];
    overviewData.orders = orders;
    updateAdminOverview();
    adminOrderList.innerHTML = "";
    orders.forEach(renderAdminOrder);
  };

  const renderAdminAccessRequest = (accessRequest) => {
    if (!adminAccessRequestList) return;
    const row = document.createElement("div");
    row.className = "ticket-item";

    const left = document.createElement("div");
    const title = document.createElement("h4");
    title.textContent = `${accessRequest.resource} | ${accessRequest.useCase || "-"}`;
    const meta = document.createElement("p");
    meta.className = "muted";
    const accessStatus =
      accessRequest.status === "approved"
        ? t("مقبول", "approved")
        : accessRequest.status === "rejected"
          ? t("مرفوض", "rejected")
          : t("قيد الانتظار", "pending");
    meta.textContent = `${t("المدة", "duration")}: ${accessRequest.duration || "-"} | ${t("الحالة", "status")}: ${accessStatus}`;
    left.append(title, meta);

    const actions = document.createElement("div");
    actions.className = "order-actions";

    const status = document.createElement("span");
    status.className = "status-pill";
    status.textContent = accessStatus;

    const approve = document.createElement("button");
    approve.className = "status-btn";
    approve.dataset.accessRequestId = accessRequest.id;
    approve.dataset.nextStatus = "approved";
    approve.textContent = t("قبول", "Approve");

    const reject = document.createElement("button");
    reject.className = "status-btn status-closed";
    reject.dataset.accessRequestId = accessRequest.id;
    reject.dataset.nextStatus = "rejected";
    reject.textContent = t("رفض", "Reject");

    actions.append(status, approve, reject);
    row.append(left, actions);
    adminAccessRequestList.appendChild(row);
  };

  const loadAdminAccessRequests = async () => {
    if (!adminAccessRequestList) return;
    const response = await apiRequest("/api/access-requests");
    const requests = Array.isArray(response.accessRequests) ? response.accessRequests : [];
    overviewData.accessRequests = requests;
    updateAdminOverview();
    adminAccessRequestList.innerHTML = "";
    requests.forEach(renderAdminAccessRequest);
  };

  const renderAdminReceipt = (receipt) => {
    if (!adminReceiptList) return;
    const row = document.createElement("div");
    row.className = "ticket-item";

    const left = document.createElement("div");
    const title = document.createElement("h4");
    title.textContent = `${receipt.amount} EGP - ${receipt.method}`;
    const meta = document.createElement("p");
    meta.className = "muted";
    meta.textContent = `${t("المرسل", "sender")}: ${receipt.sender} | ${t("المرجع", "ref")}: ${receipt.paymentRef}`;
    left.append(title, meta);

    if (receipt.proofUrl) {
      const image = document.createElement("img");
      image.src = receipt.proofUrl;
      image.alt = "Payment proof";
      image.className = "proof-preview inline clickable-proof";
      image.dataset.previewSrc = receipt.proofUrl;
      left.appendChild(image);
    }

    const right = document.createElement("span");
    right.className = "status-pill";
    right.textContent =
      receipt.status === "approved"
        ? t("مقبول", "approved")
        : receipt.status === "rejected"
          ? t("مرفوض", "rejected")
          : t("قيد الانتظار", "pending");
    row.append(left, right);
    adminReceiptList.appendChild(row);
  };

  const loadAdminReceipts = async () => {
    if (!adminReceiptList) return;
    const response = await apiRequest("/api/payment-receipts");
    const receipts = Array.isArray(response.receipts) ? response.receipts : [];
    overviewData.receipts = receipts;
    updateAdminOverview();
    adminReceiptList.innerHTML = "";
    receipts.forEach(renderAdminReceipt);
  };

  const renderNotification = (notification) => {
    if (!adminNotificationList) return;
    const row = document.createElement("div");
    row.className = "ticket-item notification-item";
    row.dataset.notificationId = notification.id;

    const left = document.createElement("div");
    const title = document.createElement("h4");
    title.textContent = notification.title || "Notification";
    const message = document.createElement("p");
    message.className = "muted";
    message.textContent = notification.message || "";
    left.append(title, message);

    const details = document.createElement("div");
    details.className = "notification-details";
    Object.entries(notification.details || {}).forEach(([key, value]) => {
      if (key === "proofUrl" && value) {
        const image = document.createElement("img");
        image.src = String(value);
        image.alt = "Payment proof";
        image.className = "proof-preview inline clickable-proof";
        image.dataset.previewSrc = String(value);
        details.appendChild(image);
      }
      const line = document.createElement("p");
      line.className = "micro muted";
      line.textContent = `${key}: ${value ?? "-"}`;
      details.appendChild(line);
    });

    const right = document.createElement("div");
    right.className = "order-actions";
    const status = document.createElement("span");
    status.className = "status-pill";
    status.textContent = notification.read ? t("مقروء", "read") : t("جديد", "new");
    right.appendChild(status);
    if (!notification.read) {
      const button = document.createElement("button");
      button.className = "status-btn";
      button.dataset.notificationReadId = notification.id;
      button.textContent = t("تحديد كمقروء", "Mark read");
      right.appendChild(button);
    }

    const wrapper = document.createElement("div");
    wrapper.append(left, details);
    row.append(wrapper, right);
    adminNotificationList.appendChild(row);
  };

  const loadAdminNotifications = async () => {
    if (!adminNotificationList) return;
    const response = await apiRequest("/api/notifications");
    adminNotificationList.innerHTML = "";
    response.notifications.forEach(renderNotification);
    const unreadCount = response.notifications.filter((item) => !item.read).length;
    if (notificationBadge) {
      notificationBadge.textContent = unreadCount > 0 ? String(unreadCount) : "0";
    }
  };

  const loadIntegrationStatus = async () => {
    if (!integrationStatusBox) return;
    if (!isAdminRole(currentRole)) {
      integrationStatusBox.textContent = t("للأدمن فقط", "Admin only");
      return;
    }
    const response = await apiRequest("/api/integrations/status");
    const { integrations } = response;
    let telegramDetail = "telegram=off";
    let n8nDetail = `n8n=${integrations.n8n ? "on" : "off"}`;
    if (integrations.telegram) {
      try {
        const check = await apiRequest("/api/integrations/telegram/check");
        const botName = check?.bot?.username ? `@${check.bot.username}` : "unknown-bot";
        const chatText = check?.chat?.reachable ? "chat=ok" : `chat=error:${check?.chat?.error || "-"}`;
        telegramDetail = `telegram=on (${botName}, ${chatText})`;
      } catch (error) {
        telegramDetail = `telegram=on (error: ${error.message || "check failed"})`;
      }
    }
    if (integrations.n8n) {
      try {
        const n8nCheck = await apiRequest("/api/integrations/n8n/check");
        n8nDetail = `n8n=on (${n8nCheck.reachable ? "reachable" : "unreachable"})`;
      } catch (error) {
        n8nDetail = `n8n=on (error: ${error.message || "check failed"})`;
      }
    }
    integrationStatusBox.textContent = `${telegramDetail} | ${n8nDetail} | slack=${integrations.slack ? "on" : "off"} | webhook=${integrations.webhook ? "on" : "off"}`;
  };

  const renderAdminAi = (insights, syncInfo = null) => {
    if (!insights) return;
    if (adminAiStatus) {
      const syncText = syncInfo?.lastRunAt ? ` | last sync ${new Date(syncInfo.lastRunAt).toLocaleString()}` : "";
      adminAiStatus.textContent = `AI Health: ${insights.health.level} | score ${insights.health.score}${syncText}`;
    }
    if (adminAiHealthScore) adminAiHealthScore.textContent = String(insights.health.score);
    if (adminAiPendingOrders) adminAiPendingOrders.textContent = String(insights.health.pendingOrders);
    if (adminAiOpenTickets) adminAiOpenTickets.textContent = String(insights.health.openTickets);
    if (adminAiRecommendations) {
      adminAiRecommendations.innerHTML = "";
      (insights.recommendations || []).forEach((entry) => {
        const li = document.createElement("li");
        li.textContent = String(entry);
        adminAiRecommendations.appendChild(li);
      });
    }
  };

  const loadAdminAiInsights = async () => {
    const [aiResponse, statusResponse] = await Promise.all([
      apiRequest("/api/ai/insights"),
      apiRequest("/api/ai/status"),
    ]);
    renderAdminAi(aiResponse.insights, statusResponse.aiSync);
  };

  const formatBytes = (bytes) => {
    const n = Number(bytes || 0);
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  };

  const loadStorageHealth = async () => {
    if (!storageHealthStatus) return;
    const response = await apiRequest("/api/storage/health");
    const s = response.storage || {};
    storageHealthStatus.textContent = `${t("الملف", "File")}: ${s.file || "-"} | ${t("موجود", "Exists")}: ${s.exists ? t("نعم", "yes") : t("لا", "no")}`;
    if (storageDriver) storageDriver.textContent = String(s.driver || "-");
    if (storageSize) storageSize.textContent = formatBytes(s.sizeBytes);
    if (storageBackupState) {
      storageBackupState.textContent = s.backup?.enabled
        ? s.backup?.lastRunAt
          ? t("نشط", "Active")
          : t("بانتظار التشغيل", "Waiting")
        : t("معطل", "Disabled");
    }
    if (storageRecords) {
      storageRecords.innerHTML = "";
      Object.entries(s.records || {}).forEach(([key, value]) => {
        const line = document.createElement("p");
        line.className = "micro muted";
        line.textContent = `${key}: ${value}`;
        storageRecords.appendChild(line);
      });
      if (s.backup?.lastFile) {
        const last = document.createElement("p");
        last.className = "micro muted";
        last.textContent = `lastBackup: ${s.backup.lastFile}`;
        storageRecords.appendChild(last);
      }
      if (s.backup?.lastError) {
        const err = document.createElement("p");
        err.className = "micro muted";
        err.textContent = `backupError: ${s.backup.lastError}`;
        storageRecords.appendChild(err);
      }
    }
  };

  const loadPerformanceMetrics = async () => {
    if (!perfStatus) return;
    const response = await apiRequest("/api/metrics/performance");
    const perf = response.performance || {};
    const five = perf.fiveMin || {};
    const hour = perf.oneHour || {};
    perfStatus.textContent = `${t("نجاح API خلال 5 دقائق", "API health 5m success")} ${five.successRate ?? "-"}% | ${t("نجاح خلال ساعة", "1h success")} ${
      hour.successRate ?? "-"
    }%`;
    if (perfSuccess5m) perfSuccess5m.textContent = `${five.successRate ?? "-"}%`;
    if (perfLatency5m) perfLatency5m.textContent = `${five.avgLatencyMs ?? "-"} ms`;
    if (perfP95_1h) perfP95_1h.textContent = `${hour.p95LatencyMs ?? "-"} ms`;
    if (perfSamples) perfSamples.textContent = `samples: ${perf.sampleCount ?? 0}`;

    if (perfTopPaths) {
      perfTopPaths.innerHTML = "";
      (hour.topPaths || []).forEach((item) => {
        const p = document.createElement("p");
        p.className = "micro muted";
        p.textContent = `topPath ${item.path}: ${item.count}`;
        perfTopPaths.appendChild(p);
      });
    }

    if (perfRecentErrors) {
      perfRecentErrors.innerHTML = "";
      (perf.recentErrors || []).forEach((err) => {
        const p = document.createElement("p");
        p.className = "micro muted";
        p.textContent = `error ${err.status} ${err.method} ${err.path} (${err.latencyMs}ms)`;
        perfRecentErrors.appendChild(p);
      });
      if (!perf.recentErrors || perf.recentErrors.length === 0) {
        const ok = document.createElement("p");
        ok.className = "micro muted";
        ok.textContent = t("لا توجد أخطاء API حديثة.", "No recent API errors.");
        perfRecentErrors.appendChild(ok);
      }
    }
  };


  adminTicketList?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-status]");
    if (!button) return;
    const id = button.getAttribute("data-id");
    const nextStatus = button.dataset.status === "open" ? "closed" : "open";
    try {
      await apiRequest(`/api/tickets/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      button.dataset.status = nextStatus;
      button.classList.toggle("status-closed", nextStatus === "closed");
      button.textContent = nextStatus === "closed" ? t("مغلق", "Closed") : t("مفتوح", "Open");
    } catch (error) {
      alert(t("فشل تحديث الحالة", "Status update failed"));
    }
  });

  adminOrderList?.addEventListener("click", async (event) => {
    const proof = event.target.closest(".clickable-proof");
    if (proof) {
      openProofModal(proof.dataset.previewSrc || "");
      return;
    }
    const button = event.target.closest("[data-order-id]");
    if (!button) return;
    const id = button.dataset.orderId;
    const nextStatus = button.dataset.nextStatus;
    try {
      await apiRequest(`/api/orders/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      await loadAdminOrders();
    } catch (error) {
      alert(t("فشل تحديث الطلب", "Order update failed"));
    }
  });

  adminAccessRequestList?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-access-request-id]");
    if (!button) return;
    const id = button.dataset.accessRequestId;
    const nextStatus = button.dataset.nextStatus;
    try {
      await apiRequest(`/api/access-requests/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      await loadAdminAccessRequests();
      await loadAdminNotifications();
    } catch (error) {
      alert(t("فشل تحديث طلب الوصول", "Access request update failed"));
    }
  });

  adminReceiptList?.addEventListener("click", (event) => {
    const proof = event.target.closest(".clickable-proof");
    if (!proof) return;
    openProofModal(proof.dataset.previewSrc || "");
  });

  adminNotificationList?.addEventListener("click", async (event) => {
    const proof = event.target.closest(".clickable-proof");
    if (proof) {
      openProofModal(proof.dataset.previewSrc || "");
      return;
    }
    const button = event.target.closest("[data-notification-read-id]");
    if (!button) return;
    const id = button.dataset.notificationReadId;
    try {
      await apiRequest(`/api/notifications/${id}/read`, {
        method: "PATCH",
      });
      await loadAdminNotifications();
    } catch (error) {
      alert(t("فشل تحديث التنبيه", "Notification update failed"));
    }
  });

  markAllReadBtn?.addEventListener("click", async () => {
    try {
      await apiRequest("/api/notifications/read-all", {
        method: "PATCH",
      });
      await loadAdminNotifications();
    } catch (error) {
      alert(t("فشل تحديد التنبيهات كمقروءة", "Failed to mark notifications"));
    }
  });

  adminRangeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const range = String(button.getAttribute("data-admin-range") || "all").trim().toLowerCase();
      adminKpiRange = ["all", "today", "7d", "30d"].includes(range) ? range : "all";
      setStoredAdminRange(adminKpiRange);
      adminRangeButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      updateAdminOverview();
    });
  });

  adminKpiRangeReset?.addEventListener("click", () => {
    adminKpiRange = "all";
    clearStoredAdminRange();
    adminRangeButtons.forEach((btn) => btn.classList.remove("active"));
    const allBtn = Array.from(adminRangeButtons).find(
      (button) => String(button.getAttribute("data-admin-range") || "").trim().toLowerCase() === "all"
    );
    if (allBtn) allBtn.classList.add("active");
    updateAdminOverview();
  });

  const activeRangeButton = Array.from(adminRangeButtons).find(
    (button) => String(button.getAttribute("data-admin-range") || "").trim().toLowerCase() === adminKpiRange
  );
  adminRangeButtons.forEach((btn) => btn.classList.remove("active"));
  if (activeRangeButton) activeRangeButton.classList.add("active");

  proofModalClose?.addEventListener("click", closeProofModal);
  proofModal?.addEventListener("click", (event) => {
    if (event.target === proofModal) closeProofModal();
  });

  integrationTestBtn?.addEventListener("click", async () => {
    if (!isAdminRole(currentRole)) return;
    try {
      const response = await apiRequest("/api/integrations/test", {
        method: "POST",
      });
      if (integrationResultBox) {
        const summary = (response.results || [])
          .map((item) => `${item.provider}:${item.ok ? "ok" : "fail"}`)
          .join(" | ");
        integrationResultBox.textContent = summary || uiText("لا يوجد مزودات", "No providers");
      }
    } catch (error) {
      if (integrationResultBox) {
        integrationResultBox.textContent = `${uiText("فشل اختبار التكامل", "integration test failed")} (${error.message || uiText("خطأ في الطلب", "request error")})`;
      }
    }
  });

  adminAiRefreshBtn?.addEventListener("click", async () => {
    try {
      await loadAdminAiInsights();
    } catch (error) {
      alert(uiText("فشل تحديث تحليلات AI.", "AI insights refresh failed"));
    }
  });

  adminAiSyncBtn?.addEventListener("click", async () => {
    if (!isAdminRole(currentRole)) return;
    if (adminAiSyncResult) adminAiSyncResult.textContent = uiText("جارٍ التشغيل...", "running...");
    try {
      const response = await apiRequest("/api/ai/sync", {
        method: "POST",
        body: JSON.stringify({ force: true }),
      });
      if (adminAiSyncResult) {
        adminAiSyncResult.textContent = response.skipped
          ? uiText("تم تخطي مزامنة AI (لا توجد تغييرات مهمة)", "AI sync skipped (no significant changes)")
          : uiText("اكتملت مزامنة AI", "AI sync completed");
      }
      await Promise.all([loadAdminAiInsights(), loadAdminNotifications()]);
    } catch (error) {
      if (adminAiSyncResult) {
        adminAiSyncResult.textContent = `${uiText("فشلت مزامنة AI", "AI sync failed")}: ${error.message || uiText("خطأ في الطلب", "request error")}`;
      }
    }
  });

  storageRefreshBtn?.addEventListener("click", async () => {
    const unlock = lockButton(storageRefreshBtn, uiText("جارٍ التحديث...", "Refreshing..."));
    try {
      await loadStorageHealth();
    } catch (error) {
      alert(uiText("فشل تحميل حالة التخزين.", "Storage health load failed"));
    } finally {
      unlock();
    }
  });

  storageBackupBtn?.addEventListener("click", async () => {
    const unlock = lockButton(storageBackupBtn, uiText("جارٍ التشغيل...", "Running..."));
    if (storageBackupResult) storageBackupResult.textContent = uiText("بدء العملية...", "starting...");
    try {
      const response = await apiRequest("/api/storage/backup", { method: "POST" });
      if (storageBackupResult) storageBackupResult.textContent = `${uiText("تم النسخ الاحتياطي", "backup ok")}: ${response.file || "-"}`;
      await loadStorageHealth();
    } catch (error) {
      if (storageBackupResult) storageBackupResult.textContent = `${uiText("فشل النسخ الاحتياطي", "backup failed")}: ${error.message || uiText("خطأ في الطلب", "request error")}`;
    } finally {
      unlock();
    }
  });

  perfRefreshBtn?.addEventListener("click", async () => {
    const unlock = lockButton(perfRefreshBtn, uiText("جارٍ التحديث...", "Refreshing..."));
    try {
      await loadPerformanceMetrics();
    } catch (error) {
      alert(uiText("فشل تحميل مؤشرات الأداء.", "Performance metrics load failed"));
    } finally {
      unlock();
    }
  });

  bindAiAssistant({
    form: adminAiChatForm,
    input: adminAiChatInput,
    windowEl: adminAiChatWindow,
    scope: "admin",
    loadingLabel: uiText("جارٍ تحليل العمليات...", "Analyzing operations..."),
  });

  ensureStaffSession()
    .then(async () => {
      await Promise.all([
        loadAdminTickets(),
        loadAdminAccessRequests(),
        loadAdminOrders(),
        loadAdminReceipts(),
        loadAdminNotifications(),
        loadIntegrationStatus(),
        loadAdminAiInsights(),
        loadStorageHealth(),
        loadPerformanceMetrics(),
      ]);
      setInterval(() => {
        loadAdminNotifications().catch(() => {});
      }, 30000);
      setInterval(() => {
        Promise.all([loadAdminTickets(), loadAdminAccessRequests(), loadAdminOrders(), loadAdminReceipts()]).catch(() => {});
      }, 45000);
      setInterval(() => {
        loadPerformanceMetrics().catch(() => {});
      }, 30000);
    })
    .catch(() => {});
}
