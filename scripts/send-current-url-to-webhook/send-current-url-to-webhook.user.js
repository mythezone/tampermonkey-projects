// ==UserScript==
// @name         Send Current URL to Webhook
// @namespace    https://github.com/mythezone/tampermonkey-projects
// @version      1.1.0
// @description  Add a slide-out button that POSTs the current page URL to a webhook.
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

  const BUTTON_ID = 'tm-send-url-to-webhook-button';
  const MODAL_ID = 'tm-send-url-to-webhook-modal';
  const OVERLAY_ID = 'tm-send-url-to-webhook-overlay';
  const STORAGE_KEY = 'tm-send-url-to-webhook-config';
  const SHORTCUT_HINT = 'Alt+C';
  const DEFAULT_LABEL = 'Send URL';
  const SENDING_LABEL = 'Sending...';
  const SUCCESS_LABEL = 'Sent';
  const ERROR_LABEL = 'Failed';
  const DEFAULT_CONFIG = {
    webhookUrl: '',
    auth: {
      user: '',
      password: '',
    },
    enabledDomains: [],
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
          description: '点击发送按钮时，当前页面 URL 会被 POST 到这里。',
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
          description: '留空则不发送 Authorization 请求头。',
        },
        {
          path: 'auth.password',
          label: 'Password',
          type: 'password',
          placeholder: 'password',
          description: '和用户名一起组成 Basic Auth。',
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
          placeholder: 'example.com\nnews.example.org\n*',
          description: '每行一个域名。支持子域名匹配，填 * 表示全部启用。',
        },
      ],
    },
  ];

  let config = loadConfig();
  let button = null;
  let overlay = null;
  let form = null;

  GM_addStyle(`
    #${BUTTON_ID} {
      position: fixed;
      top: 20px;
      right: -138px;
      z-index: 2147483647;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 176px;
      height: 46px;
      padding: 0 16px;
      border: 0;
      border-radius: 12px 0 0 12px;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.28);
      color: #f8fafc;
      cursor: pointer;
      font: 600 14px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      letter-spacing: 0.02em;
      transition: right 180ms ease, opacity 180ms ease, background 180ms ease;
      opacity: 0.94;
    }

    #${BUTTON_ID}:hover,
    #${BUTTON_ID}:focus-visible {
      right: 0;
      opacity: 1;
      outline: none;
    }

    #${BUTTON_ID}[data-state="sending"] {
      cursor: progress;
      background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%);
    }

    #${BUTTON_ID}[data-state="success"] {
      background: linear-gradient(135deg, #15803d 0%, #16a34a 100%);
    }

    #${BUTTON_ID}[data-state="error"] {
      background: linear-gradient(135deg, #b91c1c 0%, #dc2626 100%);
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
  renderButton();

  function sendCurrentUrl() {
    if (!button) {
      return;
    }

    if (button.dataset.state === 'sending') {
      return;
    }

    if (!config.webhookUrl) {
      setTemporaryState('error', 'No webhook');
      return;
    }

    const headers = {
      'Content-Type': 'application/json',
    };

    const authorization = buildBasicAuthHeader(config.auth);
    if (authorization) {
      headers.Authorization = authorization;
    }

    button.dataset.state = 'sending';
    button.textContent = SENDING_LABEL;

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
          setTemporaryState('success', SUCCESS_LABEL);
          return;
        }

        console.error('[Send Current URL to Webhook] Request failed with status:', response.status, response.responseText);
        setTemporaryState('error', ERROR_LABEL);
      },
      onerror(error) {
        console.error('[Send Current URL to Webhook] Request error:', error);
        setTemporaryState('error', ERROR_LABEL);
      },
      ontimeout() {
        console.error('[Send Current URL to Webhook] Request timeout.');
        setTemporaryState('error', ERROR_LABEL);
      },
    });
  }

  function setTemporaryState(state, label) {
    if (!button) {
      return;
    }

    button.dataset.state = state;
    button.textContent = label;

    window.setTimeout(() => {
      button.dataset.state = 'idle';
      button.textContent = DEFAULT_LABEL;
    }, 1800);
  }

  function renderButton() {
    const shouldShow = isDomainEnabled(window.location.hostname, config.enabledDomains);

    if (!shouldShow) {
      if (button) {
        button.remove();
        button = null;
      }
      return;
    }

    if (button) {
      return;
    }

    button = document.createElement('button');
    button.id = BUTTON_ID;
    button.type = 'button';
    button.textContent = DEFAULT_LABEL;
    button.title = `Send current page URL to webhook (${SHORTCUT_HINT} to configure)`;
    button.setAttribute('aria-label', button.title);
    button.dataset.state = 'idle';
    button.addEventListener('click', sendCurrentUrl);
    document.body.appendChild(button);

    if (!config.webhookUrl) {
      console.warn('[Send Current URL to Webhook] webhookUrl is not configured. Press Alt+C to configure.');
    }
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
            <p>按 ${SHORTCUT_HINT} 打开或关闭。保存后会在这个脚本的所有页面中通用。</p>
          </div>
          <button type="button" class="tm-close" aria-label="Close config dialog">×</button>
        </header>
        <form></form>
        <footer>
          <div class="tm-shortcut-hint">域名名单只影响右上角发送按钮，不影响配置界面。</div>
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
    GM_setValue(STORAGE_KEY, JSON.stringify(config));
    closeConfigModal();
    renderButton();
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
    const rawValue = GM_getValue(STORAGE_KEY, '');

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
})();
