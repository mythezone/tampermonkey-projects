// ==UserScript==
// @name         Script Name
// @namespace    https://github.com/mythezone/tampermonkey-projects
// @version      1.0.0
// @description  Short description.
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

  const STORAGE_KEY = 'your-script-storage-key';
  const DEFAULT_CONFIG = {
    enabledDomains: [],
  };

  let config = loadConfig();

  function loadConfig() {
    const rawValue = GM_getValue(STORAGE_KEY, '');

    if (!rawValue) {
      return cloneConfig(DEFAULT_CONFIG);
    }

    try {
      const parsed = typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue;
      return normalizeConfig(parsed);
    } catch (error) {
      console.error('[Script Name] Failed to parse saved config:', error);
      return cloneConfig(DEFAULT_CONFIG);
    }
  }

  function normalizeConfig(source) {
    const normalized = cloneConfig(DEFAULT_CONFIG);

    if (source && typeof source === 'object') {
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
      enabledDomains: [...source.enabledDomains],
    };
  }
})();

