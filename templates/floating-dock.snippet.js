const DOCK_ID = 'your-script-dock';

function renderDock() {
  if (document.getElementById(DOCK_ID)) {
    return;
  }

  const dock = document.createElement('div');
  dock.id = DOCK_ID;
  dock.dataset.open = 'false';
  dock.dataset.pinned = 'false';

  const handleButton = createIconButton('Open tools', 'handle', iconGrip());
  handleButton.className = 'tm-dock-handle';
  handleButton.addEventListener('click', () => {
    if (dock.dataset.pinned === 'true') {
      return;
    }

    dock.dataset.open = dock.dataset.open === 'true' ? 'false' : 'true';
  });

  const actions = document.createElement('div');
  actions.className = 'tm-dock-actions';

  const pinButton = createIconButton('Pin dock', 'pin', iconPin());
  const actionButton = createIconButton('Run action', 'action', iconSend());
  const configButton = createIconButton('Open config', 'config', iconSettings());

  actions.appendChild(pinButton);
  actions.appendChild(actionButton);
  actions.appendChild(configButton);

  dock.appendChild(handleButton);
  dock.appendChild(actions);

  dock.addEventListener('mouseenter', () => {
    dock.dataset.open = 'true';
  });

  dock.addEventListener('mouseleave', () => {
    if (dock.dataset.pinned !== 'true') {
      dock.dataset.open = 'false';
    }
  });

  document.body.appendChild(dock);
}

