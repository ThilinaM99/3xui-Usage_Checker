(function () {
  "use strict";
  const VERSION = "v2.0.13";
  const STATE = {
    theme: localStorage.getItem("xui_theme") || "dark",
    lang: localStorage.getItem("xui_lang") || "en",
    subUrl: "",
    raw: null,
  };
  const I18N = {
    en: {
      title: "My Subscription",
      limit: "Data Limit",
      used: "Used",
      rem: "Remaining",
      exp: "Expires",
      nodes: "Configuration Links",
      copy: "Copy Link",
      qr: "QR Code",
      online: "Online",
      offline: "Offline",
      unlimited: "Unlimited",
      refresh: "Refresh Status",
      upload: "Upload",
      download: "Download",
      copied: "Copied!",
    },
    cn: {
      title: "我的订阅",
      limit: "流量限制",
      used: "已用",
      rem: "剩余",
      exp: "到期时间",
      nodes: "配置链接",
      copy: "复制链接",
      qr: "二维码",
      online: "在线",
      offline: "离线",
      unlimited: "不限流量",
      refresh: "刷新状态",
      upload: "上传",
      download: "下载",
      copied: "已复制!",
    },
    fa: {
      title: "اشتراک من",
      limit: "محدودیت داده",
      used: "استفاده شده",
      rem: "باقی‌مانده",
      exp: "انقضا",
      nodes: "لینک‌های اتصال",
      copy: "کپی لینک",
      qr: "کد QR",
      online: "آنلاین",
      offline: "آفلاین",
      unlimited: "نامحدود",
      refresh: "بروزرسانی وضعیت",
      upload: "آپلود",
      download: "دانلود",
      copied: "کپی شد!",
    },
  };
  function t(key) {
    return I18N[STATE.lang][key] || key;
  }
  const getEl = (id) => document.getElementById(id);
  const mkEl = (tag, cls, html) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (html) el.innerHTML = html;
    return el;
  };
  function cleanupName(raw) {
    if (!raw) return "User";
    try {
      let name = decodeURIComponent(raw);
      name = name.replace(/^(⛔️|N\/A|\s|-)+/i, "");
      name = name.replace(/-\s*\d+(\.\d+)?\s*([GMKT]B|[dhmy]|min|mo).*$/i, "");
      name = name.replace(
        /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2700}-\u{27BF}\u{1F680}-\u{1F6FF}\u{24C2}-\u{1F251}].*$/u,
        "",
      );
      return name.trim() || "User";
    } catch (e) {
      return raw;
    }
  }
  function getStatusInfo() {
    const now = Date.now();
    const total = STATE.raw.total || 0;
    const used = (STATE.raw.up || 0) + (STATE.raw.down || 0);
    const expired = STATE.raw.expire > 0 && now > STATE.raw.expire;
    const depleted = total > 0 && used >= total;
    let state = "active",
      colorVar = "--usage-active",
      label = "Active";
    if (expired) {
      state = "warn";
      colorVar = "var(--usage-expired)";
      label = "Expired";
    } else if (depleted) {
      state = "depleted";
      colorVar = "var(--usage-depleted)";
      label = "Limited";
    } else if (total === 0) {
      state = "unlimited";
      colorVar = "var(--accent)";
      label = "Active";
    } else {
      state = "active";
      colorVar = "var(--usage-active)";
      label = "Active";
    }
    const pct = total === 0 ? 0 : Math.min(100, (used / total) * 100);
    return {
      active: !expired && !depleted,
      expired,
      depleted,
      label,
      color: colorVar,
      pct,
      used,
      total,
      state,
    };
  }
  function init() {
    document.documentElement.classList.add("premium-theme");
    document.body.classList.add("premium-theme");
    renderLoader();
    if (!STATE.raw) {
      const dataEl = getEl("subscription-data");
      if (!dataEl) return;
      STATE.raw = {
        sid:
          dataEl.getAttribute("data-email") ||
          dataEl.getAttribute("data-sid") ||
          "User",
        total: parseInt(dataEl.getAttribute("data-totalbyte") || 0),
        up: parseInt(dataEl.getAttribute("data-uploadbyte") || 0),
        down: parseInt(dataEl.getAttribute("data-downloadbyte") || 0),
        expire: parseInt(dataEl.getAttribute("data-expire") || 0) * 1000,
        subUrl: dataEl.getAttribute("data-sub-url") || "",
        lastOnline: parseInt(dataEl.getAttribute("data-lastonline") || 0),
        isp: "Detecting...",
        location: "Detecting...",
        serverIp: dataEl.getAttribute("data-ip") || "Self",
      };
      STATE.subUrl = STATE.raw.subUrl;
    }
    if (!document.querySelector('link[href*="premium.css"]')) {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = `./assets/css/premium.css?v=${VERSION}`;
      document.head.appendChild(css);
    }
    renderApp();
    applyTheme();
    startStatsPolling();
    setupOfflineDetection();
    cacheData();
    if (!window.statusLoop) {
      window.statusLoop = setInterval(updateStatus, 60000);
    }
    if (!window.networkBg) {
      window.networkBg = new NeuralNetwork();
    }
  }
  function renderApp() {
    const old = getEl("app-root");
    if (old) old.remove();
    const app = mkEl("div", "app-container");
    app.id = "app-root";
    app.appendChild(renderHeader());
    const grid = mkEl("div", "dashboard-grid");
    grid.appendChild(renderUsageCard());
    grid.appendChild(renderInfoCard());
    grid.appendChild(renderCountdownTimer());
    grid.appendChild(renderStatsGrid());
    grid.appendChild(renderInfrastructureSection());
    app.appendChild(grid);
    const footer = mkEl("div", "custom-footer");
    const footerText = "Powered with ❤️ by TMS-VPN";
    footer.innerHTML = `<div class="footer-glitch-wrap" data-text="${footerText}">Powered with <span class="heart-pulse">❤️</span> by&nbsp;<a class="footer-link" href="https://github.com/ThilinaM99/3xui-Usage_Checker/" target="_blank" rel="noopener noreferrer">TMS-VPN</a></div>`;
    app.appendChild(footer);
    app.appendChild(renderQRModal());
    app.appendChild(renderToast());
    app.appendChild(renderBottomNav());
    app.appendChild(renderOfflineBanner());
    app.appendChild(renderPullToRefresh());
    app.appendChild(renderSessionTimer());
    app.appendChild(renderQuickActions());
    document.body.appendChild(app);
    requestAnimationFrame(() => {
      setTimeout(() => {
        document.body.classList.add("ready");
        hideLoader();
        const bar = getEl("prog-bar");
        if (bar) {
          const s = getStatusInfo();
          setTimeout(() => {
            bar.style.transform = `translateX(-${100 - s.pct}%)`;
          }, 400);
        }
        
        // Trigger Counting Animations
        setTimeout(() => {
          startCounters();
        }, 300);
      }, 600);
    });
  }
  function renderHeader() {
    const h = mkEl("header", "dashboard-header");
    let dispName = STATE.raw.sid;
    const linksEl = getEl("subscription-links");
    const links = linksEl ? linksEl.value.split("\n").filter(Boolean) : [];
    if (!STATE.raw.sid.includes("@") && links.length > 0) {
      if (links[0].includes("#")) {
        dispName = links[0].split("#")[1];
      }
    }
    dispName = cleanupName(dispName);
    const s = getStatusInfo();
    const profile = mkEl("div", "user-profile");
    profile.innerHTML = `<div class="avatar-premium"><img src="https://i.ibb.co/v4WPzWBb/image.png" alt="T" class="logo-img"></div><div class="user-text-group"><div class="dashboard-title">User Dashboard</div><div class="user-main-row"><div class="username-display" data-text="${dispName}">${dispName}</div><div class="status-indicator-wrap"><span class="status-text-inline" style="color: ${s.color}">${s.label}</span><div class="status-dot-inline" style="background:${s.color}; box-shadow: 0 0 10px ${s.color}; border-color: ${s.color}44;"></div></div></div></div>`;
    const ctrls = mkEl("div", "controls");
    ctrls.style.position = "relative";
    ctrls.style.zIndex = "200";
    const themeBtn = mkEl("div", "icon-btn");
    themeBtn.innerHTML =
      STATE.theme === "dark"
        ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`
        : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
    themeBtn.onclick = (e) => {
      themeBtn.style.animation =
        "bounce 0.6s cubic-bezier(0.68,-0.55,0.265,1.55)";
      setTimeout(() => {
        themeBtn.style.animation = "";
      }, 600);
      toggleTheme(e);
    };
    themeBtn.id = "theme-btn";
    ctrls.appendChild(themeBtn);
    
    // Connection Quality Indicator
    const qualityIndicator = mkEl("div", "connection-quality");
    qualityIndicator.id = "connection-quality";
    qualityIndicator.innerHTML = `
      <div class="signal-bars">
        <div class="signal-bar" data-level="1"></div>
        <div class="signal-bar" data-level="2"></div>
        <div class="signal-bar" data-level="3"></div>
        <div class="signal-bar" data-level="4"></div>
      </div>
      <span class="quality-label" id="quality-label">--</span>
    `;
    ctrls.appendChild(qualityIndicator);
    
    h.appendChild(profile);
    h.appendChild(ctrls);
    return h;
  }
  function renderUsageCard() {
    const card = mkEl("div", "span-8 usage-overview");
    const s = getStatusInfo();
    const limitHtml = s.total === 0 ? `<span class="glitch-text" data-text="${t("unlimited")}">${t("unlimited")}</span>` : formatBytes(s.total);
    card.innerHTML = `
      <div class="usage-header">
        <span class="usage-title">Data Usage Metrics</span>
        <div class="usage-status-group">
          <span class="usage-percentage">${s.pct.toFixed(1)}%</span>
        </div>
      </div>
      <div class="usage-main-content">
        <div class="usage-big-number" id="usage-val">0 B</div>
        <div class="live-visualizer-container">
          <canvas id="traffic-waveform"></canvas>
          <div class="visualizer-overlay"></div>
        </div>
      </div>
      <div class="progress-container">
        <div class="progress-bar ${s.total === 0 ? "unlimited-bar" : ""}" id="prog-bar" style="transform:translateX(${s.total === 0 ? "0" : "-100%"});"><div class="bloom"></div></div>
      </div>
      <div class="usage-footer">
        <div class="usage-sub">${t("limit")}: ${limitHtml}</div>
        <div id="smart-insight" class="insight-pill">Analyzing connection...</div>
      </div>
    `;
    return card;
  }
  function renderInfoCard() {
    const card = mkEl("div", "span-4 stat-mini-grid");
    const s = getStatusInfo();
    let remText = "∞";
    if (STATE.raw.total > 0) {
      const left = STATE.raw.total - (STATE.raw.up + STATE.raw.down);
      remText = formatBytes(left < 0 ? 0 : left);
    }
    const rem = mkEl("div", "stat-mini");
    rem.innerHTML = `<div class="stat-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--theme-rem)"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg></div><div class="stat-value" id="rem-val">${STATE.raw.total > 0 ? "0 B" : remText}</div><div class="stat-label">${t("rem")}</div>`;
    let expText = "∞";
    if (STATE.raw.expire > 0) {
      const diff = STATE.raw.expire - Date.now();
      if (diff < 0) expText = "Expired";
      else expText = Math.ceil(diff / (1000 * 60 * 60 * 24)) + "d";
    }
    const exp = mkEl("div", "stat-mini");
    exp.innerHTML = `<div class="stat-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--theme-exp)"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></div><div class="stat-value">${expText}</div><div class="stat-label">${t("exp")}</div>`;
    const up = mkEl("div", "stat-mini");
    up.innerHTML = `<div class="stat-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--theme-up)"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg></div><div class="stat-value" id="up-total-val">0 B</div><div class="stat-label">${t("upload")}</div>`;
    const down = mkEl("div", "stat-mini");
    down.innerHTML = `<div class="stat-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--theme-down)"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg></div><div class="stat-value" id="down-total-val">0 B</div><div class="stat-label">${t("download")}</div>`;
    const lastOnline = mkEl("div", "stat-mini");
    let lastOnlineText = "Never";
    if (STATE.raw.lastOnline > 0) {
      const now = Date.now(),
        diff = now - STATE.raw.lastOnline,
        minutes = Math.floor(diff / (1000 * 60)),
        hours = Math.floor(diff / (1000 * 60 * 60)),
        days = Math.floor(diff / (1000 * 60 * 60 * 24));
      if (minutes < 1) lastOnlineText = "Just now";
      else if (minutes < 60) lastOnlineText = minutes + "m ago";
      else if (hours < 24) lastOnlineText = hours + "h ago";
      else lastOnlineText = days + "d ago";
    }
    lastOnline.innerHTML = `<div class="stat-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--status-online)"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg></div><div class="stat-value">${lastOnlineText}</div><div class="stat-label">Last Online</div>`;
    
    // Data Usage Prediction
    const prediction = mkEl("div", "stat-mini prediction-card");
    let predText = "N/A";
    if (STATE.raw.total > 0) {
      const used = STATE.raw.up + STATE.raw.down;
      const daysSinceStart = Math.max(1, Math.floor((Date.now() - STATE.raw.lastOnline) / (1000 * 60 * 60 * 24)) || 1);
      const dailyAvg = used / daysSinceStart;
      const remaining = STATE.raw.total - used;
      const daysLeft = Math.floor(remaining / dailyAvg);
      predText = daysLeft > 0 ? `~${daysLeft}d left` : "Soon";
    }
    prediction.innerHTML = `<div class="stat-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--accent)"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg></div><div class="stat-value" id="prediction-val">${predText}</div><div class="stat-label">Est. Duration</div>`;
    
    card.appendChild(up);
    card.appendChild(down);
    card.appendChild(rem);
    card.appendChild(exp);
    card.appendChild(lastOnline);
    card.appendChild(prediction);
    
    // Add notification badges
    renderNotificationBadges(card, s);
    
    return card;
  }
  
  function renderNotificationBadges(container, statusInfo) {
    const badges = [];
    
    // Low data warning
    if (statusInfo.total > 0 && statusInfo.pct > 80) {
      badges.push({
        type: 'warning',
        icon: '⚠️',
        text: statusInfo.pct > 95 ? 'Critical: Data almost out!' : 'Warning: Data running low',
        color: statusInfo.pct > 95 ? '#ef4444' : '#f59e0b'
      });
    }
    
    // Expiry warning
    if (STATE.raw.expire > 0) {
      const daysLeft = Math.ceil((STATE.raw.expire - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysLeft <= 7 && daysLeft > 0) {
        badges.push({
          type: 'warning',
          icon: '⏰',
          text: daysLeft === 1 ? 'Expires tomorrow!' : `Expires in ${daysLeft} days`,
          color: daysLeft <= 3 ? '#ef4444' : '#f59e0b'
        });
      }
    }
    
    if (badges.length > 0) {
      const badgeContainer = mkEl("div", "notification-badges");
      badges.forEach(badge => {
        const badgeEl = mkEl("div", `notification-badge ${badge.type}`);
        badgeEl.style.setProperty('--badge-color', badge.color);
        badgeEl.innerHTML = `<span class="badge-icon">${badge.icon}</span><span class="badge-text">${badge.text}</span>`;
        badgeContainer.appendChild(badgeEl);
      });
      container.appendChild(badgeContainer);
    }
  }
  function renderCountdownTimer() {
    const wrap = mkEl("div", "span-12 countdown-wrapper");
    wrap.innerHTML = `
      <div class="countdown-header">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
        Subscription Expires In
      </div>
      <div class="countdown-grid">
        <div class="countdown-item">
          <div class="countdown-circle">
            <svg viewBox="0 0 100 100">
              <defs>
                <linearGradient id="countdown-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color:var(--accent)"/>
                  <stop offset="100%" style="stop-color:var(--accent-hover)"/>
                </linearGradient>
              </defs>
              <circle class="countdown-bg" cx="50" cy="50" r="40"></circle>
              <circle class="countdown-progress" id="days-progress" cx="50" cy="50" r="40" style="stroke:var(--accent)"></circle>
            </svg>
            <div class="countdown-value" id="days-value">00</div>
          </div>
          <div class="countdown-label">Days</div>
        </div>
        <div class="countdown-item">
          <div class="countdown-circle">
            <svg viewBox="0 0 100 100">
              <circle class="countdown-bg" cx="50" cy="50" r="40"></circle>
              <circle class="countdown-progress" id="hours-progress" cx="50" cy="50" r="40" style="stroke:var(--accent)"></circle>
            </svg>
            <div class="countdown-value" id="hours-value">00</div>
          </div>
          <div class="countdown-label">Hours</div>
        </div>
        <div class="countdown-item">
          <div class="countdown-circle">
            <svg viewBox="0 0 100 100">
              <circle class="countdown-bg" cx="50" cy="50" r="40"></circle>
              <circle class="countdown-progress" id="minutes-progress" cx="50" cy="50" r="40" style="stroke:var(--accent)"></circle>
            </svg>
            <div class="countdown-value" id="minutes-value">00</div>
          </div>
          <div class="countdown-label">Minutes</div>
        </div>
        <div class="countdown-item">
          <div class="countdown-circle">
            <svg viewBox="0 0 100 100">
              <circle class="countdown-bg" cx="50" cy="50" r="40"></circle>
              <circle class="countdown-progress" id="seconds-progress" cx="50" cy="50" r="40" style="stroke:var(--accent)"></circle>
            </svg>
            <div class="countdown-value" id="seconds-value">00</div>
          </div>
          <div class="countdown-label">Seconds</div>
        </div>
      </div>
    `;
    
    // Start countdown
    setTimeout(() => startCountdown(), 100);
    
    return wrap;
  }
  
  function startCountdown() {
    const expireTime = STATE.raw.expire;
    
    if (!expireTime || expireTime <= 0) {
      // No expiry set - show unlimited
      const daysEl = getEl("days-value");
      const hoursEl = getEl("hours-value");
      const minsEl = getEl("minutes-value");
      const secsEl = getEl("seconds-value");
      if (daysEl) daysEl.textContent = "∞";
      if (hoursEl) hoursEl.textContent = "∞";
      if (minsEl) minsEl.textContent = "∞";
      if (secsEl) secsEl.textContent = "∞";
      return;
    }
    
    function updateCountdown() {
      const now = Date.now();
      const diff = expireTime - now;
      
      if (diff <= 0) {
        // Expired
        const daysEl = getEl("days-value");
        const hoursEl = getEl("hours-value");
        const minsEl = getEl("minutes-value");
        const secsEl = getEl("seconds-value");
        if (daysEl) daysEl.textContent = "00";
        if (hoursEl) hoursEl.textContent = "00";
        if (minsEl) minsEl.textContent = "00";
        if (secsEl) secsEl.textContent = "00";
        return;
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      // Update values
      const daysEl = getEl("days-value");
      const hoursEl = getEl("hours-value");
      const minsEl = getEl("minutes-value");
      const secsEl = getEl("seconds-value");
      
      if (daysEl) daysEl.textContent = String(days).padStart(2, "0");
      if (hoursEl) hoursEl.textContent = String(hours).padStart(2, "0");
      if (minsEl) minsEl.textContent = String(minutes).padStart(2, "0");
      if (secsEl) secsEl.textContent = String(seconds).padStart(2, "0");
      
      // Update progress circles
      const daysProgress = getEl("days-progress");
      const hoursProgress = getEl("hours-progress");
      const minsProgress = getEl("minutes-progress");
      const secsProgress = getEl("seconds-progress");
      
      // Calculate max values for progress
      const maxDays = 365; // Assume max 1 year
      const daysPct = Math.min(days / maxDays, 1);
      const hoursPct = hours / 24;
      const minsPct = minutes / 60;
      const secsPct = seconds / 60;
      
      // Update stroke-dashoffset (circumference = 2 * PI * 40 ≈ 251)
      const circumference = 251;
      
      if (daysProgress) daysProgress.style.strokeDashoffset = circumference * (1 - daysPct);
      if (hoursProgress) hoursProgress.style.strokeDashoffset = circumference * (1 - hoursPct);
      if (minsProgress) minsProgress.style.strokeDashoffset = circumference * (1 - minsPct);
      if (secsProgress) secsProgress.style.strokeDashoffset = circumference * (1 - secsPct);
    }
    
    // Initial update
    updateCountdown();
    
    // Update every second
    if (!window.countdownInterval) {
      window.countdownInterval = setInterval(updateCountdown, 1000);
    }
  }
  function renderInfrastructureSection() {
    const wrap = mkEl("div", "span-12");
    wrap.innerHTML = `<div class="nodes-header" style="margin-top:20px;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19L19 19C20.1046 19 21 18.1046 21 17C21 15.8954 20.1046 15 19 15L18.1 15C17.55 12.15 15.05 10 12 10C9.6 10 7.55 11.35 6.55 13.35C4.55 13.7 3 15.45 3 17.5C3 19.433 4.567 21 6.5 21L7.5 21"></path></svg> Infrastructure Insights</div>`;
    const grid = mkEl("div", "infra-grid");
    const hosting = mkEl("div", "infra-card");
    hosting.innerHTML = `<div class="infra-icon" id="infra-isp-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--theme-isp)"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg></div><div class="infra-details"><div class="infra-value" id="infra-isp">${STATE.raw.isp}</div><div class="infra-label">Provider</div></div>`;
    const locCard = mkEl("div", "infra-card");
    locCard.innerHTML = `<div class="infra-icon" id="infra-loc-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--theme-loc)"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg></div><div class="infra-details"><div class="infra-value" id="infra-loc">${STATE.raw.location}</div><div class="infra-label">Region</div></div>`;
    const ping = mkEl("div", "infra-card");
    ping.innerHTML = `<div class="infra-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--theme-ping)"><path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg></div><div class="infra-details"><div class="infra-value" id="ping-value">Check Latency</div><div class="infra-label">Client to Server</div></div><div class="ping-action-wrap"><div class="ping-dot" id="ping-dot"></div><div class="icon-btn-mini" id="btn-ping" title="Check Ping"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg></div></div>`;
    ping.querySelector("#btn-ping").onclick = () => checkPing();
    grid.appendChild(hosting);
    grid.appendChild(locCard);
    grid.appendChild(ping);
    wrap.appendChild(grid);
    return wrap;
  }
  function renderStatsGrid() {
    const wrap = mkEl("div", "span-12");
    wrap.innerHTML = `<div class="nodes-header"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg> Server Monitor</div>`;
    const grid = mkEl("div", "stats-grid-horizontal");
    grid.id = "stats-grid";
    const cpuCard = mkEl("div", "stat-card-mini");
    cpuCard.innerHTML = `<div class="stat-mini-icon" style="color:var(--theme-cpu)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3"/></svg></div><div class="stat-mini-content"><div class="stat-mini-label">CPU Usage</div><div class="stat-mini-value"><span id="cpu-val">0</span>%</div></div>`;
    const ramCard = mkEl("div", "stat-card-mini");
    ramCard.innerHTML = `<div class="stat-mini-icon" style="color:var(--theme-ram)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 6h16M4 12h16M4 18h16M8 2v20M12 2v20M16 2v20"/></svg></div><div class="stat-mini-content"><div class="stat-mini-label">Memory</div><div class="stat-mini-value"><span id="ram-val">0</span>%</div></div>`;
    const uploadCard = mkEl("div", "stat-card-mini");
    uploadCard.innerHTML = `<div class="stat-mini-icon" style="color:var(--theme-up)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg></div><div class="stat-mini-content"><div class="stat-mini-label">Upload</div><div class="stat-mini-value" id="upload-val">0 KB/s</div></div>`;
    const downloadCard = mkEl("div", "stat-card-mini");
    downloadCard.innerHTML = `<div class="stat-mini-icon" style="color:var(--theme-down)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="8 12 12 16 16 12"/><line x1="12" y1="16" x2="12" y2="3"/><path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg></div><div class="stat-mini-content"><div class="stat-mini-label">Download</div><div class="stat-mini-value" id="download-val">0 KB/s</div></div>`;
    grid.appendChild(cpuCard);
    grid.appendChild(ramCard);
    grid.appendChild(uploadCard);
    grid.appendChild(downloadCard);
    wrap.appendChild(grid);
    return wrap;
  }
  function startStatsPolling() {
    if (window.statsPollingActive) return;
    window.statsPollingActive = true;
    const formatSpeed = (kbps) =>
      kbps >= 1024 ? (kbps / 1024).toFixed(1) + " MB/s" : kbps + " KB/s";
    const poll = async () => {
      try {
        const res = await fetch("assets/css/status.json?t=" + Date.now());
        if (res.ok) {
          const data = await res.json();
          const cpuEl = getEl("cpu-val"),
            ramEl = getEl("ram-val");
          if (cpuEl) cpuEl.textContent = data.cpu || 0;
          if (ramEl) ramEl.textContent = data.ram || 0;
          const uploadEl = getEl("upload-val"),
            downloadEl = getEl("download-val");
          
          const upSpeed = data.net_out || 0;
          const downSpeed = data.net_in || 0;
          
          if (uploadEl) uploadEl.textContent = formatSpeed(upSpeed);
          if (downloadEl) downloadEl.textContent = formatSpeed(downSpeed);
          
          // Update Waveform and Insights
          updateTrafficWaveform(upSpeed, downSpeed);
          updateSmartInsights(upSpeed, downSpeed, data.cpu, data.ram);
          
          if (data.isp) {
            const ispEl = getEl("infra-isp");
            if (ispEl) ispEl.textContent = data.isp;
            if (STATE.raw) STATE.raw.isp = data.isp;
          }
          if (data.region) {
            const locEl = getEl("infra-loc");
            if (locEl) locEl.textContent = data.region;
            if (STATE.raw) STATE.raw.location = data.region;
          }
          applyTheme();
        }
      } catch (e) {}
      setTimeout(poll, 2000);
    };
    poll();
  }
  
  function updateTrafficWaveform(up, down) {
    const canvas = getEl("traffic-waveform");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!window._waveformPoints) window._waveformPoints = [];
    
    // Add current speed to points
    const totalSpeed = (up + down) / 1024;
    window._waveformPoints.push(totalSpeed);
    if (window._waveformPoints.length > 50) window._waveformPoints.shift();

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
    ctx.beginPath();
    ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue("--accent").trim() || "#6366f1";
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";

    const step = canvas.offsetWidth / 49;
    window._waveformPoints.forEach((p, i) => {
      const x = i * step;
      const h = Math.min(canvas.offsetHeight * 0.8, p * 10 + 2);
      const y = canvas.offsetHeight - h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }
  
  function updateSmartInsights(up, down, cpu, ram) {
    const el = getEl("smart-insight");
    if (!el) return;
    let tip = "Connection Stable ✓";
    const totalSpeed = (up + down) / 1024; // MB/s

    if (totalSpeed > 5) tip = "Optimal for 4K Streaming 🎬";
    else if (totalSpeed > 2) tip = "Great for HD Video 📺";
    
    const latency = parseInt(getEl("ping-value")?.textContent) || 0;
    if (latency > 0 && latency < 100) tip = "Perfect for Gaming 🎮";
    
    if (cpu > 80 || ram > 80) tip = "Server Under Heavy Load ⚠️";

    el.textContent = tip;
    el.classList.add("pulse-insight");
    setTimeout(() => el.classList.remove("pulse-insight"), 1000);
    
    // Update connection quality indicator
    updateConnectionQuality(totalSpeed, latency);
  }
  
  function updateConnectionQuality(speed, latency) {
    const container = getEl("connection-quality");
    const label = getEl("quality-label");
    if (!container) return;
    
    const bars = container.querySelectorAll(".signal-bar");
    let level = 0;
    let qualityText = "Poor";
    let qualityColor = "#ef4444";
    
    // Calculate quality based on speed and latency
    if (latency > 0 && latency < 50 && speed > 3) {
      level = 4;
      qualityText = "Excellent";
      qualityColor = "#22c55e";
    } else if (latency < 100 && speed > 1.5) {
      level = 3;
      qualityText = "Good";
      qualityColor = "#84cc16";
    } else if (latency < 200 && speed > 0.5) {
      level = 2;
      qualityText = "Fair";
      qualityColor = "#eab308";
    } else if (speed > 0) {
      level = 1;
      qualityText = "Weak";
      qualityColor = "#f97316";
    }
    
    bars.forEach((bar, i) => {
      const barLevel = parseInt(bar.dataset.level);
      if (barLevel <= level) {
        bar.classList.add("active");
        bar.style.background = qualityColor;
        bar.style.boxShadow = `0 0 8px ${qualityColor}`;
      } else {
        bar.classList.remove("active");
        bar.style.background = "";
        bar.style.boxShadow = "";
      }
    });
    
    if (label) {
      label.textContent = qualityText;
      label.style.color = qualityColor;
    }
  }
  function checkPing() {
    const valEl = getEl("ping-value"),
      dot = getEl("ping-dot"),
      btn = getEl("btn-ping");
    if (!valEl || !btn || btn.classList.contains("loading")) return;
    btn.classList.add("loading");
    dot.className = "ping-dot pinging";
    valEl.className = "infra-value";
    valEl.textContent = "Testing...";
    const startTime = Date.now();
    fetch(window.location.href, { method: "HEAD", cache: "no-cache" })
      .then(() => {
        const latency = Date.now() - startTime;
        valEl.textContent = latency + "ms";
        btn.classList.remove("loading");
        btn.style.animation = "";
        dot.classList.remove("pinging", "success", "warn", "error");
        valEl.classList.remove("text-green", "text-yellow", "text-red");
        if (latency < 150) {
          dot.classList.add("success");
          valEl.classList.add("text-green");
        } else if (latency < 400) {
          dot.classList.add("warn");
          valEl.classList.add("text-yellow");
        } else {
          dot.classList.add("error");
          valEl.classList.add("text-red");
        }
        showToast("Latency: " + latency + "ms");
      })
      .catch(() => {
        valEl.textContent = "Error";
        btn.classList.remove("loading");
        btn.style.animation = "";
        dot.classList.remove("pinging");
        dot.classList.add("error");
        valEl.classList.add("text-red");
      });
  }
  function renderQRModal() {
    const overlay = mkEl("div", "modal-overlay");
    overlay.id = "qr-modal";
    overlay.onclick = (e) => {
      if (e.target === overlay) overlay.classList.remove("open");
    };
    overlay.style.opacity = "0";
    overlay.style.visibility = "hidden";
    overlay.style.pointerEvents = "none";
    const content = mkEl("div", "qr-modal");
    content.innerHTML = `<div class="qr-header"><div class="qr-spacer"></div><h3 id="qr-title">${t("qr")}</h3><div class="qr-close" onclick="document.getElementById('qr-modal').classList.remove('open')"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></div></div><div class="qr-container"><canvas id="qr-canv"></canvas><div class="qr-scan-line"></div></div><div class="qr-footer">Scan this QR code to import configuration</div>`;
    overlay.appendChild(content);
    setTimeout(() => {
      const loadQR = () =>
        new QRious({
          element: getEl("qr-canv"),
          value: STATE.subUrl,
          size: 250,
        });
      if (window.QRious) loadQR();
      else {
        const s = document.createElement("script");
        s.src =
          "https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js";
        s.onload = loadQR;
        document.body.appendChild(s);
      }
    }, 100);
    return overlay;
  }
  function showQR(val, title) {
    const modal = getEl("qr-modal"),
      canv = getEl("qr-canv"),
      titleEl = getEl("qr-title");
    if (titleEl) titleEl.textContent = title || t("qr");
    if (window.QRious) {
      requestAnimationFrame(() => {
        new QRious({ element: canv, value: val, size: 250 });
        modal.style.opacity = "";
        modal.style.visibility = "";
        modal.style.pointerEvents = "";
        modal.classList.add("open");
      });
    }
  }
  function renderLoader() {
    const loader = mkEl("div", "preloader");
    loader.id = "app-loader";
    loader.innerHTML = `<div class="loader-content"><div class="loader-spinner"></div><div class="loader-text">USER DASHBOARD</div></div>`;
    document.body.appendChild(loader);
  }
  function hideLoader() {
    const loader = getEl("app-loader");
    if (loader) {
      loader.style.opacity = "0";
      setTimeout(() => {
        loader.remove();
        document.body.style.overflow = "";
        document.body.style.overflowY = "auto";
        document.body.style.height = "auto";
      }, 800);
    }
  }
  function renderToast() {
    const toastEl = mkEl("div", "premium-toast");
    toastEl.id = "toast";
    toastEl.style.top = "max(24px, env(safe-area-inset-top) + 24px)";
    toastEl.innerText = t("copied");
    return toastEl;
  }
  
  // ===== MOBILE OPTIMIZATIONS =====
  
  function renderBottomNav() {
    const nav = mkEl("div", "bottom-nav");
    nav.innerHTML = `
      <div class="nav-item active haptic" data-section="home">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
        <span class="nav-label">Home</span>
      </div>
      <div class="nav-item haptic" data-section="stats">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="20" x2="18" y2="10"></line>
          <line x1="12" y1="20" x2="12" y2="4"></line>
          <line x1="6" y1="20" x2="6" y2="14"></line>
        </svg>
        <span class="nav-label">Stats</span>
      </div>
      <div class="nav-item haptic" data-section="refresh" id="nav-refresh">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="23 4 23 10 17 10"></polyline>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
        </svg>
        <span class="nav-label">Refresh</span>
      </div>
      <div class="nav-item haptic" data-section="settings">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
        <span class="nav-label">More</span>
      </div>
    `;
    
    // Add click handlers
    nav.querySelectorAll('.nav-item').forEach(item => {
      item.onclick = () => {
        hapticVibrate();
        nav.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        
        const section = item.dataset.section;
        if (section === 'refresh') {
          refreshData();
        } else if (section === 'home') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (section === 'stats') {
          const statsGrid = getEl('stats-grid');
          if (statsGrid) statsGrid.scrollIntoView({ behavior: 'smooth' });
        }
      };
    });
    
    return nav;
  }
  
  function renderOfflineBanner() {
    const banner = mkEl("div", "offline-banner");
    banner.id = "offline-banner";
    banner.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="1" y1="1" x2="23" y2="23"></line>
        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path>
        <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path>
        <path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path>
        <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path>
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
        <line x1="12" y1="20" x2="12.01" y2="20"></line>
      </svg>
      <span>You're offline - Showing cached data</span>
    `;
    return banner;
  }
  
  function renderPullToRefresh() {
    const ptr = mkEl("div", "ptr-indicator");
    ptr.id = "ptr-indicator";
    ptr.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="23 4 23 10 17 10"></polyline>
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
      </svg>
    `;
    
    // Pull to refresh logic
    let startY = 0;
    let pulling = false;
    
    document.addEventListener('touchstart', (e) => {
      if (window.scrollY === 0) {
        startY = e.touches[0].pageY;
        pulling = true;
      }
    }, { passive: true });
    
    document.addEventListener('touchmove', (e) => {
      if (!pulling) return;
      const y = e.touches[0].pageY;
      const diff = y - startY;
      
      if (diff > 60 && window.scrollY === 0) {
        ptr.classList.add('visible');
      }
    }, { passive: true });
    
    document.addEventListener('touchend', () => {
      if (ptr.classList.contains('visible')) {
        ptr.classList.add('refreshing');
        hapticVibrate();
        refreshData().then(() => {
          setTimeout(() => {
            ptr.classList.remove('visible', 'refreshing');
          }, 500);
        });
      }
      pulling = false;
    }, { passive: true });
    
    return ptr;
  }
  
  function hapticVibrate(duration = 10) {
    if (navigator.vibrate) {
      navigator.vibrate(duration);
    }
  }
  
  function refreshData() {
    return new Promise((resolve) => {
      // Clear and re-render
      const old = getEl("app-root");
      if (old) {
        old.style.opacity = "0.5";
        old.style.filter = "blur(2px)";
      }
      
      setTimeout(() => {
        init();
        showToast("Data refreshed");
        resolve();
      }, 300);
    });
  }
  
  // Offline detection
  function setupOfflineDetection() {
    const banner = getEl("offline-banner");
    
    window.addEventListener('online', () => {
      if (banner) banner.classList.remove('show');
      showToast("Back online");
    });
    
    window.addEventListener('offline', () => {
      if (banner) banner.classList.add('show');
      hapticVibrate(50);
    });
    
    // Initial check
    if (!navigator.onLine && banner) {
      banner.classList.add('show');
    }
  }
  
  // Cache data for offline
  function cacheData() {
    if (STATE.raw) {
      localStorage.setItem('tmsvpn_cached', JSON.stringify({
        raw: STATE.raw,
        timestamp: Date.now()
      }));
    }
  }
  
  function loadCachedData() {
    const cached = localStorage.getItem('tmsvpn_cached');
    if (cached) {
      const data = JSON.parse(cached);
      // Cache valid for 1 hour
      if (Date.now() - data.timestamp < 3600000) {
        return data.raw;
      }
    }
    return null;
  }
  
  // ===== SESSION TIMER =====
  function renderSessionTimer() {
    const timer = mkEl("div", "session-timer");
    timer.id = "session-timer";
    timer.innerHTML = `
      <div class="session-timer-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      </div>
      <div class="session-timer-info">
        <span class="session-label">Session</span>
        <span class="session-duration" id="session-duration">00:00:00</span>
      </div>
    `;
    
    // Start session timer
    if (!window.sessionStartTime) {
      window.sessionStartTime = Date.now();
    }
    
    setInterval(() => {
      const elapsed = Date.now() - window.sessionStartTime;
      const hours = Math.floor(elapsed / (1000 * 60 * 60));
      const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((elapsed % (1000 * 60)) / 1000);
      const durationEl = getEl("session-duration");
      if (durationEl) {
        durationEl.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      }
    }, 1000);
    
    return timer;
  }
  
  // ===== QUICK ACTIONS =====
  function renderQuickActions() {
    const actions = mkEl("div", "quick-actions");
    
    // Copy Subscription Link
    const copyBtn = mkEl("div", "quick-action-btn haptic");
    copyBtn.setAttribute("data-tooltip", "Copy Link");
    copyBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
      </svg>
    `;
    copyBtn.onclick = () => {
      hapticVibrate();
      if (STATE.subUrl) {
        copy(STATE.subUrl);
      } else {
        showToast("No link available");
      }
    };
    actions.appendChild(copyBtn);
    
    // Show QR Code
    const qrBtn = mkEl("div", "quick-action-btn haptic");
    qrBtn.setAttribute("data-tooltip", "QR Code");
    qrBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="7" height="7"></rect>
        <rect x="14" y="3" width="7" height="7"></rect>
        <rect x="14" y="14" width="7" height="7"></rect>
        <rect x="3" y="14" width="7" height="7"></rect>
      </svg>
    `;
    qrBtn.onclick = () => {
      hapticVibrate();
      if (STATE.subUrl) {
        showQR(STATE.subUrl, "Subscription");
      }
    };
    actions.appendChild(qrBtn);
    
    // Refresh Data
    const refreshBtn = mkEl("div", "quick-action-btn haptic");
    refreshBtn.setAttribute("data-tooltip", "Refresh");
    refreshBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="23 4 23 10 17 10"></polyline>
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
      </svg>
    `;
    refreshBtn.onclick = () => {
      hapticVibrate();
      refreshData();
    };
    actions.appendChild(refreshBtn);
    
    // Scroll to Top
    const topBtn = mkEl("div", "quick-action-btn haptic");
    topBtn.setAttribute("data-tooltip", "Top");
    topBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="19" x2="12" y2="5"></line>
        <polyline points="5 12 12 5 19 12"></polyline>
      </svg>
    `;
    topBtn.onclick = () => {
      hapticVibrate();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    actions.appendChild(topBtn);
    
    return actions;
  }
  function formatBytes(bytes) {
    if (bytes === 0) return "0 B";
    const k = 1024,
      sizes = ["B", "KB", "MB", "GB", "TB"],
      i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }
  
  function animateBytes(elId, endBytes, duration = 1200) {
    const el = getEl(elId);
    if (!el || endBytes <= 0) return;
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // easeOutExpo for dramatic slowdown at the end
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const currentBytes = Math.floor(easeProgress * endBytes);
      el.textContent = formatBytes(currentBytes);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        el.textContent = formatBytes(endBytes);
      }
    };
    window.requestAnimationFrame(step);
  }
  
  function startCounters() {
    const s = getStatusInfo();
    animateBytes("usage-val", s.used);
    
    if (STATE.raw.total > 0) {
      const left = STATE.raw.total - s.used;
      animateBytes("rem-val", left < 0 ? 0 : left);
    }
    
    animateBytes("up-total-val", STATE.raw.up);
    animateBytes("down-total-val", STATE.raw.down);
  }
  function copy(txt) {
    if (!txt) return;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard
        .writeText(txt)
        .then(() => showToast(t("copied")))
        .catch(() => {
          fallbackCopy(txt, () => showToast(t("copied")));
        });
    } else {
      fallbackCopy(txt, () => showToast(t("copied")));
    }
  }
  function fallbackCopy(txt, cb) {
    const textArea = document.createElement("textarea");
    textArea.value = txt;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand("copy");
      if (cb) cb();
    } catch (e) {}
    document.body.removeChild(textArea);
  }
  class NeuralNetwork {
    constructor() {
      if (document.getElementById("canvas-bg")) {
        this.canvas = document.getElementById("canvas-bg");
        this.ctx = this.canvas.getContext("2d");
      } else {
        this.canvas = document.createElement("canvas");
        this.canvas.id = "canvas-bg";
        document.body.prepend(this.canvas);
        this.ctx = this.canvas.getContext("2d");
      }
      this.canvas._network = this;
      this.particles = [];
      this.packets = [];
      this.mouse = { x: null, y: null, radius: 220 };
      this.isScrolling = false;
      this.styles = { pColor: "99, 102, 241", lColor: "148, 163, 184" };
      this.updateStyles();

      // Instant Reactivity: Watch body classes for theme/status changes
      if (!this.observer) {
        this.observer = new MutationObserver(() => this.updateStyles());
        this.observer.observe(document.body, {
          attributes: true,
          attributeFilter: ["class"],
        });
      }

      // Initial Stability: Retry style detection for the first second (accounts for CSS loading)
      let retries = 0;
      const retryStyles = setInterval(() => {
        this.updateStyles();
        if (++retries > 10) clearInterval(retryStyles);
      }, 100);

      this.resize();
      if (!this.handlersBound) {
        window.addEventListener("resize", () => {
          clearTimeout(this.resizeTimeout);
          this.resizeTimeout = setTimeout(() => this.resize(), 200);
        });
        window.addEventListener("mousemove", (e) => {
          if (this.isScrolling) return;
          this.mouse.x = e.x;
          this.mouse.y = e.y;
        });
        window.addEventListener("mouseout", () => {
          this.mouse.x = null;
          this.mouse.y = null;
        });
        window.addEventListener(
          "scroll",
          () => {
            this.isScrolling = true;
            this.mouse.x = null;
            this.mouse.y = null;
            clearTimeout(this.scrollTimeout);
            this.scrollTimeout = setTimeout(() => {
              this.isScrolling = false;
            }, 200);
          },
          { passive: true },
        );
        this.handlersBound = true;
      }
      this.initParticles();
      this.animate = this.animate.bind(this);
      if (this.animFrame) cancelAnimationFrame(this.animFrame);
      this.animFrame = requestAnimationFrame(this.animate);

      // Glitch State
      this.glitchTimer = 0;
      this.glitchInterval = 3 + Math.random() * 5; // seconds between glitches
      this.glitchActive = false;
      this.glitchDuration = 0;
      this.glitchElapsed = 0;
      this.glitchSlices = [];
    }
    updateStyles() {
      const style = getComputedStyle(document.body);
      this.styles.pColor =
        style.getPropertyValue("--node-color").trim() || "99, 102, 241";
      this.styles.lColor =
        style.getPropertyValue("--line-color").trim() || "148, 163, 184";
    }
    resize() {
      const dpr = window.devicePixelRatio || 1;
      this.canvas.width = window.innerWidth * dpr;
      this.canvas.height = window.innerHeight * dpr;
      this.canvas.style.width = window.innerWidth + "px";
      this.canvas.style.height = window.innerHeight + "px";
      this.ctx.scale(dpr, dpr);
      if (this.particles.length === 0) this.initParticles();
    }
    initParticles() {
      this.particles = [];
      // Screen area density mapping for natural spread
      let n = (window.innerWidth * window.innerHeight) / 11000;
      for (let i = 0; i < n; i++) {
        let size = Math.random() * 2.0 + 1.0;
        let x = Math.random() * window.innerWidth;
        let y = Math.random() * window.innerHeight;

        // Assign a persistent smooth movement heading and target cruise speed
        let moveAngle = Math.random() * Math.PI * 2;
        let baseSpeed = 0.2 + Math.random() * 0.15; // Reliable, slow coasting speed
        let vx = Math.cos(moveAngle) * baseSpeed;
        let vy = Math.sin(moveAngle) * baseSpeed;
        let pulseSpeed = 0.01 + Math.random() * 0.02;

        this.particles.push({
          x,
          y,
          vx,
          vy,
          baseSpeed,
          size,
          baseSize: size,
          angle: Math.random() * 6.28,
          pulseSpeed,
        });
      }
    }
    animate() {
      this.animFrame = requestAnimationFrame(this.animate);
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      const connectDist = 160,
        connectDistSq = connectDist * connectDist;
      const { pColor, lColor } = this.styles;

      // Update Packets
      for (let i = this.packets.length - 1; i >= 0; i--) {
        let pkt = this.packets[i];
        pkt.progress += pkt.speed;
        if (pkt.progress >= 1) {
          this.packets.splice(i, 1);
          continue;
        }
        let cx = pkt.p1.x + (pkt.p2.x - pkt.p1.x) * pkt.progress;
        let cy = pkt.p1.y + (pkt.p2.y - pkt.p1.y) * pkt.progress;

        this.ctx.beginPath();
        this.ctx.arc(cx, cy, 2, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(${pColor}, 1)`;
        this.ctx.shadowBlur = 8;
        this.ctx.shadowColor = `rgba(${pColor}, 0.8)`;
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
      }

      // Particles
      for (let i = 0; i < this.particles.length; i++) {
        let p = this.particles[i];

        // Apply constant, natural drift
        p.x += p.vx;
        p.y += p.vy;

        // Soft edge bounce
        if (p.x < 0 || p.x > window.innerWidth) p.vx *= -1;
        if (p.y < 0 || p.y > window.innerHeight) p.vy *= -1;

        if (p.angle !== undefined) {
          p.angle += p.pulseSpeed || 0.02;
          p.size = (p.baseSize || p.size) + Math.sin(p.angle) * 0.6;
        }

        // Mouse Repulsion (smooth slide)
        if (this.mouse.x != null) {
          let dx = p.x - this.mouse.x,
            dy = p.y - this.mouse.y;
          let dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < this.mouse.radius) {
            let force = (this.mouse.radius - dist) / this.mouse.radius;
            let angle = Math.atan2(dy, dx);
            p.x += Math.cos(angle) * force * 3;
            p.y += Math.sin(angle) * force * 3;
          }
        }

        // Personal Space (Fluid Anti-Clustering)
        for (let j = i + 1; j < this.particles.length; j++) {
          let p2 = this.particles[j];
          let dx = p.x - p2.x,
            dy = p.y - p2.y;
          let dist = Math.sqrt(dx * dx + dy * dy);
          let personalSpace = 85;
          if (dist < personalSpace && dist > 0) {
            let force = (personalSpace - dist) / personalSpace;
            // Micro-nudge for highly fluid separation without bouncing/jitter
            let push = force * 0.005;
            p.vx += (dx / dist) * push;
            p.vy += (dy / dist) * push;
            p2.vx -= (dx / dist) * push;
            p2.vy -= (dy / dist) * push;
          }
        }

        // Smooth Steering Behavior (Constant Fluid Flocking)
        let speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (speed > 0) {
          let moveAngle = Math.atan2(p.vy, p.vx);
          // Very subtly wander direction each frame for unforced biological movement
          moveAngle += (Math.random() - 0.5) * 0.035;

          // Smoothly interpolate real speed towards peaceful target base cruise speed
          let targetSpeed = p.baseSpeed || 0.25;
          let newSpeed = speed + (targetSpeed - speed) * 0.015;

          p.vx = Math.cos(moveAngle) * newSpeed;
          p.vy = Math.sin(moveAngle) * newSpeed;
        }

        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, Math.max(0, p.size), 0, Math.PI * 2, false);
        this.ctx.fillStyle = `rgba(${pColor},0.85)`;
        this.ctx.fill();

        // Connections
        for (let j = i + 1; j < this.particles.length; j++) {
          let p2 = this.particles[j],
            dx = p.x - p2.x,
            dy = p.y - p2.y,
            distSq = dx * dx + dy * dy;
          if (distSq < connectDistSq) {
            let dist = Math.sqrt(distSq),
              opacity = 1 - dist / connectDist;
            this.ctx.beginPath();
            this.ctx.strokeStyle = `rgba(${lColor},${opacity * 0.6})`; // Increased opacity
            this.ctx.lineWidth = 1.2; // Bolder lines
            this.ctx.moveTo(p.x, p.y);
            this.ctx.lineTo(p2.x, p2.y);
            this.ctx.stroke();

            // Random Packet Spawn - ONLY if line is visible
            // Opacity threshold (0.1) ensures packets don't float in void
            if (opacity > 0.1 && Math.random() < 0.0015) {
              this.packets.push({
                p1: p,
                p2: p2,
                progress: 0,
                speed: 0.02 + Math.random() * 0.03,
              });
            }
          }
        }
      }

      // Apply glitch effect on top of everything
      this._updateGlitch();
    }
    _updateGlitch() {
      const dt = 1 / 60;
      const ctx = this.ctx;
      const w = window.innerWidth;
      const h = window.innerHeight;

      if (!this.glitchActive) {
        this.glitchTimer += dt;
        if (this.glitchTimer >= this.glitchInterval) {
          this.glitchActive = true;
          this.glitchTimer = 0;
          this.glitchInterval = 12 + Math.random() * 6; // Less frequent: every 12-18s (professional rhythm)
          this.glitchDuration = 0.2 + Math.random() * 0.4; // Longer: 200-600ms
          this.glitchElapsed = 0;

          // Generate many heavy horizontal slices
          const numSlices = 6 + Math.floor(Math.random() * 8);
          this.glitchSlices = [];
          for (let i = 0; i < numSlices; i++) {
            this.glitchSlices.push({
              y: Math.random() * h,
              height: 5 + Math.random() * 50,        // Much taller slices
              offset: (Math.random() - 0.5) * 120,    // 3x displacement
            });
          }
        }
        return;
      }

      // Glitch is active
      this.glitchElapsed += dt;
      if (this.glitchElapsed >= this.glitchDuration) {
        this.glitchActive = false;
        // Reset any jittered particles back
        for (const p of this.particles) {
          if (p._jitterX) { p.x -= p._jitterX; p._jitterX = 0; }
          if (p._jitterY) { p.y -= p._jitterY; p._jitterY = 0; }
        }
        return;
      }

      const progress = this.glitchElapsed / this.glitchDuration;
      const intensity = Math.sin(progress * Math.PI);

      // Theme-aware glitch colors
      const { pColor, lColor } = this.styles;
      const isDark = document.body.classList.contains('s-dark');
      const bgMain = isDark ? '#020617' : '#f8fafc';
      // Derive complementary glitch colors from the theme's node color
      const glitchA = `rgba(${pColor}, `; // Primary accent channel
      const glitchB = `rgba(${lColor}, `; // Secondary line channel

      // 0. NODE JITTER — physically displace particles during glitch
      for (const p of this.particles) {
        // Undo previous jitter
        if (p._jitterX) { p.x -= p._jitterX; }
        if (p._jitterY) { p.y -= p._jitterY; }
        // Apply new jitter
        p._jitterX = (Math.random() - 0.5) * 25 * intensity;
        p._jitterY = (Math.random() - 0.5) * 12 * intensity;
        p.x += p._jitterX;
        p.y += p._jitterY;
      }

      // 1. Heavy Horizontal Slice Displacement — Optimized (No getImageData)
      for (const slice of this.glitchSlices) {
        const sliceH = slice.height * intensity;
        const offset = slice.offset * intensity;
        if (Math.abs(offset) < 1 || sliceH < 1) continue;

        const sy = Math.max(0, Math.floor(slice.y));
        const sh = Math.max(1, Math.min(Math.ceil(sliceH), h - sy));
        
        // Use drawImage to shift the slice (hardware accelerated)
        ctx.drawImage(this.canvas, 0, sy, w, sh, offset, sy, w, sh);
        // Paint gap fill behind the shift
        ctx.fillStyle = bgMain;
        if (offset > 0) ctx.fillRect(0, sy, offset, sh);
        else ctx.fillRect(w + offset, sy, -offset, sh);
      }

      // 2. Aggressive Chromatic Aberration (theme-aware)
      const numAberrations = Math.floor(4 + intensity * 8);
      for (let i = 0; i < numAberrations; i++) {
        const lineY = Math.random() * h;
        const lineH = 2 + Math.random() * 8 * intensity;
        const shift = (Math.random() - 0.5) * 40 * intensity;

        ctx.save();
        ctx.globalAlpha = (isDark ? 0.5 : 0.35) * intensity;
        ctx.globalCompositeOperation = isDark ? 'screen' : 'multiply';

        // Primary channel (accent color shifted left)
        ctx.fillStyle = glitchA + (0.7 * intensity) + ')';
        ctx.fillRect(shift, lineY, w, lineH);

        // Secondary channel (line color shifted right)
        ctx.fillStyle = glitchB + (0.6 * intensity) + ')';
        ctx.fillRect(-shift, lineY + 3, w, lineH * 0.8);

        ctx.restore();
      }

      // 3. Scanline Noise — Optimized (Batched blocks instead of per-line loop)
      ctx.save();
      ctx.globalAlpha = (isDark ? 0.18 : 0.1) * intensity;
      const numNoiseLines = Math.floor(15 + Math.random() * 10);
      for (let i = 0; i < numNoiseLines; i++) {
        const sy = Math.random() * h;
        const sh = 1 + Math.random() * 2;
        ctx.fillStyle = isDark
          ? (Math.random() > 0.5 ? `rgba(255,255,255,${0.3 * intensity})` : `rgba(0,0,0,${0.5 * intensity})`)
          : (Math.random() > 0.5 ? `rgba(0,0,0,${0.15 * intensity})` : glitchA + (0.15 * intensity) + ')');
        ctx.fillRect(0, sy, w, sh);
      }
      ctx.restore();

      // 4. Large Block Corruption (theme-aware)
      if (intensity > 0.3) {
        const numBlocks = 2 + Math.floor(Math.random() * 6);
        for (let b = 0; b < numBlocks; b++) {
          const bx = Math.random() * w;
          const by = Math.random() * h;
          const bw = 40 + Math.random() * 150;
          const bh = 3 + Math.random() * 15;
          ctx.save();
          ctx.globalAlpha = (isDark ? 0.25 : 0.15) * intensity;
          ctx.fillStyle = Math.random() > 0.5
            ? glitchA + (0.7 * intensity) + ')'
            : glitchB + (0.5 * intensity) + ')';
          ctx.fillRect(bx, by, bw, bh);
          ctx.restore();
        }
      }

      // 5. Full-Screen Color Flash (theme-aware)
      if (intensity > 0.7 && Math.random() < 0.3) {
        ctx.save();
        ctx.globalAlpha = (isDark ? 0.06 : 0.04) * intensity;
        ctx.fillStyle = Math.random() > 0.5 ? glitchA + '1)' : glitchB + '1)';
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }
    }
  }
  function applyTheme() {
    const s = getStatusInfo();
    document.body.classList.remove(
      "s-dark",
      "s-light",
      "status-active",
      "status-warn",
      "status-depleted",
      "status-unlimited",
    );
    document.body.classList.add(STATE.theme === "dark" ? "s-dark" : "s-light");
    document.body.classList.add(`status-${s.state}`);
    const bg = getEl("canvas-bg");
    if (bg && bg._network) bg._network.updateStyles();
  }
  function toggleTheme(e) {
    const nextTheme = STATE.theme === "dark" ? "light" : "dark";
    const status = getStatusInfo().state,
      mockClass = `premium-theme ${nextTheme === "dark" ? "s-dark" : "s-light"} status-${status}`,
      dummy = document.createElement("div");
    dummy.className = mockClass;
    dummy.style.display = "none";
    document.body.appendChild(dummy);
    const burstColor =
      getComputedStyle(dummy).getPropertyValue("--bg-main").trim() ||
      (nextTheme === "dark" ? "#020617" : "#f8fafc");
    document.body.removeChild(dummy);
    const btn = e.currentTarget,
      rect = btn.getBoundingClientRect(),
      burst = mkEl("div", "theme-burst");
    burst.style.background = burstColor;
    burst.style.left = rect.left + rect.width / 2 + "px";
    burst.style.top = rect.top + rect.height / 2 + "px";
    document.body.appendChild(burst);
    // Add global transition class to soften all color swaps
    document.documentElement.classList.add("theme-transitioning");

    setTimeout(() => {
      STATE.theme = nextTheme;
      localStorage.setItem("xui_theme", STATE.theme);
      applyTheme();
      const btnIcon = getEl("theme-btn");
      if (btnIcon)
        btnIcon.innerHTML =
          STATE.theme === "dark"
            ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`
            : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
    }, 250); // Fast snap behind burst

    setTimeout(() => {
      document.documentElement.classList.remove("theme-transitioning");
      burst.remove();
    }, 1600);
  }
  function showToast(msg) {
    const toastEl = getEl("toast");
    if (toastEl) {
      toastEl.innerText = msg;
      toastEl.classList.add("show");
      if (toastEl._timeout) clearTimeout(toastEl._timeout);
      toastEl._timeout = setTimeout(
        () => toastEl.classList.remove("show"),
        2000,
      );
    }
  }
  function updateStatus() {}
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
  else init();
})();
