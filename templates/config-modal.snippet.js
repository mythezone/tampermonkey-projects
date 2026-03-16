const MODAL_ID = 'your-script-modal';
const OVERLAY_ID = 'your-script-overlay';
const SHORTCUT_HINT = 'Alt+C';

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

function isShortcutPressed(event) {
  return event.altKey
    && !event.ctrlKey
    && !event.metaKey
    && !event.shiftKey
    && event.code === 'KeyC';
}

function installConfigModal() {
  if (document.getElementById(OVERLAY_ID)) {
    return;
  }

  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.dataset.open = 'false';
  overlay.innerHTML = `
    <div id="${MODAL_ID}" role="dialog" aria-modal="true">
      <header>
        <h2>Config</h2>
      </header>
      <form id="${MODAL_ID}-form"></form>
      <footer>
        <button type="button" data-action="cancel">Cancel</button>
        <button type="submit" form="${MODAL_ID}-form">Save</button>
      </footer>
    </div>
  `;

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      closeConfigModal();
    }
  });

  document.body.appendChild(overlay);
}

function isModalOpen() {
  const overlay = document.getElementById(OVERLAY_ID);
  return !!overlay && overlay.dataset.open === 'true';
}

function openConfigModal() {
  const overlay = document.getElementById(OVERLAY_ID);
  if (!overlay) {
    return;
  }

  overlay.dataset.open = 'true';
  document.body.style.overflow = 'hidden';
}

function closeConfigModal() {
  const overlay = document.getElementById(OVERLAY_ID);
  if (!overlay) {
    return;
  }

  overlay.dataset.open = 'false';
  document.body.style.overflow = '';
}

