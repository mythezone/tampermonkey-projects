// ==UserScript==
// @name         Send Current URL to Webhook
// @namespace    https://github.com/mythezone/tampermonkey-projects
// @version      1.2.0
// @description  Add a slide-out control dock that POSTs the current page URL to a webhook.
// @author       mythezone
// @match        *://*/*
// @run-at       document-idle
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @connect      *
// ==/UserScript==

(function () {
  'use strict';

  const DOCK_ID = 'tm-send-url-to-webhook-dock';
  const MODAL_ID = 'tm-send-url-to-webhook-modal';
  const OVERLAY_ID = 'tm-send-url-to-webhook-overlay';
  const CONFIG_STORAGE_KEY = 'tm-send-url-to-webhook-config';
  const UI_STORAGE_KEY = 'tm-send-url-to-webhook-ui';
  const SHORTCUT_HINT = 'Alt+C';
  const DEFAULT_CONFIG = {
    webhookUrl: '',
    auth: {
      user: '',
      password: '',
    },
    enabledDomains: [],
  };
  const DEFAULT_UI_STATE = {
    pinned: false,
  };
  const CONFIG_SCHEMA = [
    {
      title: 'Webhook',
      fields: [
        {
          path: 'webhookUrl',
          label: 'Webhook URL',
          type: 'url',
          placeholder: 'https://your-webhook.example.com/endpoint',
          description: 'Click send to POST the current page URL to this webhook.',
        },
      ],
    },
    {
      title: 'Basic Auth',
      fields: [
        {
          path: 'auth.user',
          label: 'User',
          type: 'text',
          placeholder: 'username',
          description: 'Leave empty to skip the Authorization header.',
        },
        {
          path: 'auth.password',
          label: 'Password',
          type: 'password',
          placeholder: 'password',
          description: 'Paired with the username as Basic Auth.',
        },
      ],
    },
    {
      title: 'Enabled Domains',
      fields: [
        {
          path: 'enabledDomains',
          label: 'Domain List',
          type: 'textarea',
          placeholder: 'example.com\n*.github.io\n*',
          description: 'One domain per line. Supports subdomains and leading wildcard patterns. Use * for all domains.',
        },
      ],
    },
  ];

  let config = loadConfig();
  let uiState = loadUiState();
  let dock = null;
  let handleButton = null;
  let pinButton = null;
  let sendButton = null;
  let configButton = null;
  let overlay = null;
  let form = null;

  GM_addStyle(`
    #${DOCK_ID} {
      position: fixed;
      top: 20px;
      right: 0;
      z-index: 2147483647;
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 174px;
      padding: 8px 8px 8px 10px;
      border-radius: 16px 0 0 16px;
      background: linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.98) 100%);
      box-shadow: 0 16px 40px rgba(15, 23, 42, 0.32);
      transform: translateX(calc(100% - 18px));
      transition: transform 180ms ease, box-shadow 180ms ease;
      user-select: none;
      -webkit-user-select: none;
    }

    #${DOCK_ID}[data-open="true"],
    #${DOCK_ID}[data-pinned="true"],
    #${DOCK_ID}:hover,
    #${DOCK_ID}:focus-within {
      transform: translateX(0);
      box-shadow: 0 18px 46px rgba(15, 23, 42, 0.36);
    }

    #${DOCK_ID} * {
      box-sizing: border-box;
    }

    #${DOCK_ID} .tm-dock-handle {
      flex: 0 0 auto;
      width: 18px;
      height: 38px;
      margin-left: -2px;
      padding: 0;
      border: 0;
      border-radius: 999px 0 0 999px;
      background: linear-gradient(180deg, #38bdf8 0%, #2563eb 100%);
      color: #eff6ff;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      opacity: 0.96;
    }

    #${DOCK_ID} .tm-dock-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    #${DOCK_ID} .tm-icon-button {
      flex: 0 0 auto;
      width: 36px;
      height: 36px;
      padding: 0;
      border: 0;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.12);
      color: #f8fafc;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: background 140ms ease, transform 140ms ease, opacity 140ms ease;
    }

    #${DOCK_ID} .tm-icon-button:hover,
    #${DOCK_ID} .tm-icon-button:focus-visible,
    #${DOCK_ID} .tm-dock-handle:hover,
    #${DOCK_ID} .tm-dock-handle:focus-visible {
      outline: none;
      transform: translateY(-1px);
    }

    #${DOCK_ID} .tm-icon-button:hover,
    #${DOCK_ID} .tm-icon-button:focus-visible {
      background: rgba(255, 255, 255, 0.2);
    }

    #${DOCK_ID} .tm-dock-handle:hover,
    #${DOCK_ID} .tm-dock-handle:focus-visible {
      background: linear-gradient(180deg, #0ea5e9 0%, #1d4ed8 100%);
    }

    #${DOCK_ID} .tm-icon-button svg,
    #${DOCK_ID} .tm-dock-handle svg {
      width: 18px;
      height: 18px;
      display: block;
    }

    #${DOCK_ID} .tm-icon-button[data-active="true"] {
      background: rgba(56, 189, 248, 0.26);
      color: #7dd3fc;
    }

    #${DOCK_ID} .tm-icon-button[data-state="sending"] {
      background: rgba(37, 99, 235, 0.34);
      color: #bfdbfe;
      cursor: progress;
    }

    #${DOCK_ID} .tm-icon-button[data-state="success"] {
      background: rgba(22, 163, 74, 0.28);
      color: #bbf7d0;
    }

    #${DOCK_ID} .tm-icon-button[data-state="error"] {
      background: rgba(220, 38, 38, 0.3);
      color: #fecaca;
    }

    #${DOCK_ID} .tm-icon-button:disabled {
      background: rgba(255, 255, 255, 0.08);
      color: rgba(248, 250, 252, 0.42);
      cursor: not-allowed;
      transform: none;
    }

    #${OVERLAY_ID} {
      position: fixed;
      inset: 0;
      z-index: 2147483646;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: rgba(15, 23, 42, 0.48);
      backdrop-filter: blur(12px);
    }

    #${OVERLAY_ID}[data-open="true"] {
      display: flex;
    }

    #${MODAL_ID} {
      width: min(680px, 100%);
      max-height: min(760px, calc(100vh - 48px));
      overflow: auto;
      border: 1px solid rgba(148, 163, 184, 0.22);
      border-radius: 20px;
      background:
        radial-gradient(circle at top right, rgba(59, 130, 246, 0.16), transparent 28%),
        linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
      box-shadow: 0 24px 80px rgba(15, 23, 42, 0.28);
      color: #0f172a;
      font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    #${MODAL_ID} * {
      box-sizing: border-box;
    }

    #${MODAL_ID} header,
    #${MODAL_ID} footer {
      padding: 24px 28px;
    }

    #${MODAL_ID} header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.2);
    }

    #${MODAL_ID} h2 {
      margin: 0;
      font-size: 22px;
      line-height: 1.2;
    }

    #${MODAL_ID} header p {
      margin: 8px 0 0;
      color: #475569;
    }

    #${MODAL_ID} form {
      padding: 12px 28px 8px;
    }

    #${MODAL_ID} section {
      padding: 18px 0;
      border-bottom: 1px solid rgba(148, 163, 184, 0.16);
    }

    #${MODAL_ID} section:last-of-type {
      border-bottom: 0;
    }

    #${MODAL_ID} section h3 {
      margin: 0 0 14px;
      font-size: 15px;
      letter-spacing: 0.01em;
    }

    #${MODAL_ID} label {
      display: block;
      margin: 0 0 14px;
    }

    #${MODAL_ID} .tm-field-label {
      display: block;
      margin: 0 0 6px;
      font-weight: 600;
      color: #0f172a;
    }

    #${MODAL_ID} .tm-field-description {
      margin: 6px 0 0;
      color: #64748b;
      font-size: 12px;
    }

    #${MODAL_ID} input,
    #${MODAL_ID} textarea {
      width: 100%;
      padding: 12px 14px;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.9);
      color: #0f172a;
      font: inherit;
      transition: border-color 140ms ease, box-shadow 140ms ease;
    }

    #${MODAL_ID} textarea {
      min-height: 136px;
      resize: vertical;
    }

    #${MODAL_ID} input:focus,
    #${MODAL_ID} textarea:focus {
      outline: none;
      border-color: #2563eb;
      box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.14);
    }

    #${MODAL_ID} footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      border-top: 1px solid rgba(148, 163, 184, 0.2);
    }

    #${MODAL_ID} .tm-shortcut-hint {
      color: #64748b;
      font-size: 12px;
    }

    #${MODAL_ID} .tm-actions {
      display: flex;
      gap: 12px;
    }

    #${MODAL_ID} button {
      border: 0;
      border-radius: 12px;
      padding: 11px 16px;
      font: 600 14px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      cursor: pointer;
    }

    #${MODAL_ID} .tm-secondary {
      background: #e2e8f0;
      color: #0f172a;
    }

    #${MODAL_ID} .tm-primary {
      background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%);
      color: #ffffff;
    }

    #${MODAL_ID} .tm-close {
      flex: 0 0 auto;
      width: 40px;
      height: 40px;
      padding: 0;
      border-radius: 999px;
      background: #e2e8f0;
      color: #0f172a;
      font-size: 20px;
      line-height: 1;
    }
  `);

  installConfigModal();
  installKeyboardShortcut();
  renderDock();
  syncDockState();

  function renderDock() {
    if (document.getElementById(DOCK_ID)) {
      dock = document.getElementById(DOCK_ID);
      return;
    }

    dock = document.createElement('div');
    dock.id = DOCK_ID;
    dock.dataset.open = 'false';
    dock.dataset.pinned = String(!!uiState.pinned);

    handleButton = createIconButton('Open webhook tools', 'handle', iconGrip());
    handleButton.className = 'tm-dock-handle';
    handleButton.addEventListener('click', toggleDockOpen);

    const actions = document.createElement('div');
    actions.className = 'tm-dock-actions';

    pinButton = createIconButton('Pin dock', 'pin', iconPin());
    pinButton.addEventListener('click', togglePin);

    sendButton = createIconButton('Send current URL to webhook', 'send', iconSend());
    sendButton.addEventListener('click', sendCurrentUrl);

    configButton = createIconButton(`Open config (${SHORTCUT_HINT})`, 'config', iconSettings());
    configButton.addEventListener('click', openConfigModal);

    actions.appendChild(pinButton);
    actions.appendChild(sendButton);
    actions.appendChild(configButton);

    dock.appendChild(handleButton);
    dock.appendChild(actions);

    dock.addEventListener('mouseenter', () => {
      dock.dataset.open = 'true';
    });

    dock.addEventListener('mouseleave', () => {
      if (!uiState.pinned) {
        dock.dataset.open = 'false';
      }
    });

    dock.addEventListener('focusin', () => {
      dock.dataset.open = 'true';
    });

    dock.addEventListener('focusout', () => {
      window.setTimeout(() => {
        if (!dock.contains(document.activeElement) && !uiState.pinned) {
          dock.dataset.open = 'false';
        }
      }, 0);
    });

    document.body.appendChild(dock);
  }

  function createIconButton(title, action, iconMarkup) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tm-icon-button';
    button.dataset.action = action;
    button.title = title;
    button.setAttribute('aria-label', title);
    button.innerHTML = iconMarkup;
    return button;
  }

  function syncDockState() {
    if (!dock || !pinButton || !sendButton) {
      return;
    }

    dock.dataset.pinned = String(!!uiState.pinned);
    pinButton.dataset.active = String(!!uiState.pinned);
    pinButton.title = uiState.pinned ? 'Unpin dock' : 'Pin dock';
    pinButton.setAttribute('aria-label', pinButton.title);

    const currentDomainEnabled = isCurrentDomainEnabled();

    sendButton.disabled = !currentDomainEnabled;

    if (!currentDomainEnabled) {
      setSendButtonState('idle', 'Current domain is not enabled in config');
      return;
    }

    if (!config.webhookUrl) {
      setSendButtonState('idle', 'Webhook URL is not configured');
      return;
    }

    setSendButtonState('idle', 'Send current URL to webhook');
  }

  function toggleDockOpen() {
    if (!dock) {
      return;
    }

    if (uiState.pinned) {
      return;
    }

    dock.dataset.open = dock.dataset.open === 'true' ? 'false' : 'true';
  }

  function togglePin() {
    uiState.pinned = !uiState.pinned;
    saveUiState();

    if (dock) {
      dock.dataset.open = uiState.pinned ? 'true' : dock.dataset.open;
    }

    syncDockState();
  }

  function sendCurrentUrl() {
    if (!sendButton || sendButton.dataset.state === 'sending') {
      return;
    }

    if (!isCurrentDomainEnabled()) {
      setSendButtonState('error', 'Current domain is not enabled in config');
      resetSendButtonStateLater();
      return;
    }

    if (!config.webhookUrl) {
      setSendButtonState('error', 'Webhook URL is not configured');
      resetSendButtonStateLater();
      return;
    }

    const headers = {
      'Content-Type': 'application/json',
    };

    const authorization = buildBasicAuthHeader(config.auth);
    if (authorization) {
      headers.Authorization = authorization;
    }

    setSendButtonState('sending', 'Sending current URL');

    GM_xmlhttpRequest({
      method: 'POST',
      url: config.webhookUrl,
      headers,
      data: JSON.stringify({
        site: window.location.href,
      }),
      timeout: 10000,
      onload(response) {
        if (response.status >= 200 && response.status < 300) {
          setSendButtonState('success', 'Current URL sent');
          resetSendButtonStateLater();
          return;
        }

        console.error('[Send Current URL to Webhook] Request failed with status:', response.status, response.responseText);
        setSendButtonState('error', `Request failed: ${response.status}`);
        resetSendButtonStateLater();
      },
      onerror(error) {
        console.error('[Send Current URL to Webhook] Request error:', error);
        setSendButtonState('error', 'Request failed');
        resetSendButtonStateLater();
      },
      ontimeout() {
        console.error('[Send Current URL to Webhook] Request timeout.');
        setSendButtonState('error', 'Request timeout');
        resetSendButtonStateLater();
      },
    });
  }

  function setSendButtonState(state, title) {
    if (!sendButton) {
      return;
    }

    sendButton.dataset.state = state;
    sendButton.title = title;
    sendButton.setAttribute('aria-label', title);
  }

  function resetSendButtonStateLater() {
    window.setTimeout(syncDockState, 1800);
  }

  function installKeyboardShortcut() {
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && isModalOpen()) {
        event.preventDefault();
        closeConfigModal();
        return;
      }

      if (!isShortcutPressed(event)) {
        return;
      }

      event.preventDefault();

      if (isModalOpen()) {
        closeConfigModal();
        return;
      }

      openConfigModal();
    });
  }

  function installConfigModal() {
    if (document.getElementById(OVERLAY_ID)) {
      overlay = document.getElementById(OVERLAY_ID);
      form = overlay.querySelector('form');
      return;
    }

    overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.dataset.open = 'false';
    overlay.innerHTML = `
      <div id="${MODAL_ID}" role="dialog" aria-modal="true" aria-labelledby="${MODAL_ID}-title">
        <header>
          <div>
            <h2 id="${MODAL_ID}-title">Send URL Config</h2>
            <p>Press ${SHORTCUT_HINT} to open or close this modal. Saved values are shared across all pages.</p>
          </div>
          <button type="button" class="tm-close" aria-label="Close config dialog">x</button>
        </header>
        <form></form>
        <footer>
          <div class="tm-shortcut-hint">The dock is always visible. Domain config only controls whether send is allowed on the current site.</div>
          <div class="tm-actions">
            <button type="button" class="tm-secondary" data-action="cancel">Cancel</button>
            <button type="submit" form="${MODAL_ID}-form" class="tm-primary">Save</button>
          </div>
        </footer>
      </div>
    `;

    form = overlay.querySelector('form');
    form.id = `${MODAL_ID}-form`;
    form.appendChild(buildConfigFormFields());

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        closeConfigModal();
      }
    });

    overlay.querySelector('.tm-close').addEventListener('click', closeConfigModal);
    overlay.querySelector('[data-action="cancel"]').addEventListener('click', closeConfigModal);
    form.addEventListener('submit', handleConfigSubmit);

    document.body.appendChild(overlay);
  }

  function buildConfigFormFields() {
    const fragment = document.createDocumentFragment();

    CONFIG_SCHEMA.forEach((section) => {
      const sectionElement = document.createElement('section');
      const title = document.createElement('h3');
      title.textContent = section.title;
      sectionElement.appendChild(title);

      section.fields.forEach((field) => {
        sectionElement.appendChild(buildField(field));
      });

      fragment.appendChild(sectionElement);
    });

    return fragment;
  }

  function buildField(field) {
    const label = document.createElement('label');
    const labelText = document.createElement('span');
    labelText.className = 'tm-field-label';
    labelText.textContent = field.label;

    const control = field.type === 'textarea'
      ? document.createElement('textarea')
      : document.createElement('input');

    control.name = field.path;
    control.placeholder = field.placeholder || '';

    if (field.type !== 'textarea') {
      control.type = field.type || 'text';
    }

    label.appendChild(labelText);
    label.appendChild(control);

    if (field.description) {
      const description = document.createElement('p');
      description.className = 'tm-field-description';
      description.textContent = field.description;
      label.appendChild(description);
    }

    return label;
  }

  function openConfigModal() {
    if (!overlay || !form) {
      installConfigModal();
    }

    populateForm(config);
    overlay.dataset.open = 'true';
    document.body.style.overflow = 'hidden';

    const firstField = form.querySelector('input, textarea');
    if (firstField) {
      firstField.focus();
    }
  }

  function closeConfigModal() {
    if (!overlay) {
      return;
    }

    overlay.dataset.open = 'false';
    document.body.style.overflow = '';
  }

  function isModalOpen() {
    return !!overlay && overlay.dataset.open === 'true';
  }

  function populateForm(currentConfig) {
    CONFIG_SCHEMA.forEach((section) => {
      section.fields.forEach((field) => {
        const control = getFieldControl(field.path);
        if (!control) {
          return;
        }

        const value = getValueByPath(currentConfig, field.path);
        control.value = field.type === 'textarea' && Array.isArray(value)
          ? value.join('\n')
          : (value || '');
      });
    });
  }

  function handleConfigSubmit(event) {
    event.preventDefault();

    const nextConfig = cloneConfig(DEFAULT_CONFIG);

    CONFIG_SCHEMA.forEach((section) => {
      section.fields.forEach((field) => {
        const control = getFieldControl(field.path);
        const rawValue = control ? control.value : '';
        const normalizedValue = field.type === 'textarea'
          ? parseDomainList(rawValue)
          : rawValue.trim();

        setValueByPath(nextConfig, field.path, normalizedValue);
      });
    });

    config = normalizeConfig(nextConfig);
    GM_setValue(CONFIG_STORAGE_KEY, JSON.stringify(config));
    closeConfigModal();
    syncDockState();
  }

  function isCurrentDomainEnabled() {
    return isDomainEnabled(window.location.hostname, config.enabledDomains);
  }

  function isDomainEnabled(hostname, enabledDomains) {
    if (!Array.isArray(enabledDomains) || enabledDomains.length === 0) {
      return false;
    }

    const normalizedHost = hostname.trim().toLowerCase();

    return enabledDomains.some((domain) => {
      if (typeof domain !== 'string') {
        return false;
      }

      const normalizedDomain = domain.trim().toLowerCase();

      if (!normalizedDomain) {
        return false;
      }

      if (normalizedDomain === '*') {
        return true;
      }

      if (normalizedDomain.startsWith('*.') && normalizedDomain.length > 2) {
        const wildcardBase = normalizedDomain.slice(2);
        return normalizedHost.endsWith(`.${wildcardBase}`);
      }

      return normalizedHost === normalizedDomain || normalizedHost.endsWith(`.${normalizedDomain}`);
    });
  }

  function buildBasicAuthHeader(auth) {
    if (!auth || typeof auth.user !== 'string' || typeof auth.password !== 'string') {
      return '';
    }

    const user = auth.user.trim();
    const password = auth.password.trim();

    if (!user && !password) {
      return '';
    }

    return `Basic ${utf8ToBase64(`${user}:${password}`)}`;
  }

  function utf8ToBase64(value) {
    const bytes = new TextEncoder().encode(value);
    const chunkSize = 0x8000;
    let binary = '';

    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }

    return window.btoa(binary);
  }

  function loadConfig() {
    const rawValue = GM_getValue(CONFIG_STORAGE_KEY, '');

    if (!rawValue) {
      return cloneConfig(DEFAULT_CONFIG);
    }

    try {
      const parsed = typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue;
      return normalizeConfig(parsed);
    } catch (error) {
      console.error('[Send Current URL to Webhook] Failed to parse saved config:', error);
      return cloneConfig(DEFAULT_CONFIG);
    }
  }

  function loadUiState() {
    const rawValue = GM_getValue(UI_STORAGE_KEY, '');

    if (!rawValue) {
      return { ...DEFAULT_UI_STATE };
    }

    try {
      const parsed = typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue;
      return {
        pinned: !!parsed.pinned,
      };
    } catch (error) {
      console.error('[Send Current URL to Webhook] Failed to parse saved UI state:', error);
      return { ...DEFAULT_UI_STATE };
    }
  }

  function saveUiState() {
    GM_setValue(UI_STORAGE_KEY, JSON.stringify({
      pinned: !!uiState.pinned,
    }));
  }

  function normalizeConfig(source) {
    const normalized = cloneConfig(DEFAULT_CONFIG);

    if (source && typeof source === 'object') {
      normalized.webhookUrl = typeof source.webhookUrl === 'string' ? source.webhookUrl.trim() : '';
      normalized.auth.user = typeof source.auth?.user === 'string' ? source.auth.user.trim() : '';
      normalized.auth.password = typeof source.auth?.password === 'string' ? source.auth.password.trim() : '';
      normalized.enabledDomains = Array.isArray(source.enabledDomains)
        ? parseDomainList(source.enabledDomains.join('\n'))
        : [];
    }

    return normalized;
  }

  function parseDomainList(value) {
    return String(value || '')
      .split(/[\n,]/)
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
      .filter((item, index, array) => array.indexOf(item) === index);
  }

  function cloneConfig(source) {
    return {
      webhookUrl: source.webhookUrl,
      auth: {
        user: source.auth.user,
        password: source.auth.password,
      },
      enabledDomains: [...source.enabledDomains],
    };
  }

  function getValueByPath(source, path) {
    return path.split('.').reduce((current, key) => (current ? current[key] : undefined), source);
  }

  function getFieldControl(path) {
    return form ? form.querySelector(`[name="${path}"]`) : null;
  }

  function setValueByPath(target, path, value) {
    const parts = path.split('.');
    const last = parts.pop();
    let cursor = target;

    parts.forEach((part) => {
      if (!cursor[part] || typeof cursor[part] !== 'object') {
        cursor[part] = {};
      }
      cursor = cursor[part];
    });

    cursor[last] = value;
  }

  function isShortcutPressed(event) {
    return event.altKey
      && !event.ctrlKey
      && !event.metaKey
      && !event.shiftKey
      && event.code === 'KeyC';
  }

  function iconGrip() {
    return [
      '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">',
      '<path d="M8 6h8"></path>',
      '<path d="M8 12h8"></path>',
      '<path d="M8 18h8"></path>',
      '</svg>',
    ].join('');
  }

  function iconPin() {
    return [
      '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
      '<path d="M15 4l5 5"></path>',
      '<path d="M10 9l5 5"></path>',
      '<path d="M8 21l4-9"></path>',
      '<path d="M5 14l9-9"></path>',
      '</svg>',
    ].join('');
  }

  function iconSend() {
    return [
      '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
      '<path d="M22 2L11 13"></path>',
      '<path d="M22 2L15 22L11 13L2 9L22 2Z"></path>',
      '</svg>',
    ].join('');
  }

  function iconSettings() {
    return [
      '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
      '<circle cx="12" cy="12" r="3"></circle>',
      '<path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 1-3 0 1.7 1.7 0 0 0-1-.6 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 1 0-3 1.7 1.7 0 0 0 .6-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 1 3 0 1.7 1.7 0 0 0 1 .6 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c0 .38.22.74.6 1a1.7 1.7 0 0 1 0 3c-.38.26-.6.62-.6 1Z"></path>',
      '</svg>',
    ].join('');
  }
})();
