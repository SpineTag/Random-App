const factions = [
  { id: 'player', name: 'House Aurelion', color: '#6cbef5', type: 'player' },
  { id: 'ryvan', name: 'Ryvan Concord', color: '#f39a52', type: 'ai' },
  { id: 'urel', name: 'Urel Dominion', color: '#8cd47d', type: 'ai' },
  { id: 'vesta', name: 'Vesta Pact', color: '#c46cff', type: 'ai' },
  { id: 'talon', name: 'Talon Empire', color: '#f76c8c', type: 'ai' }
];

const initialRegions = [
  { id: 'northmarch', name: 'Northmarch', owner: 'ryvan', income: 8, troops: 12, neighbors: ['harrond', 'ironcrest', 'stormhold'] },
  { id: 'harrond', name: 'Harrond Plains', owner: 'player', income: 5, troops: 6, neighbors: ['northmarch', 'ironcrest', 'mirevale'] },
  { id: 'ironcrest', name: 'Ironcrest Hills', owner: 'player', income: 6, troops: 9, neighbors: ['northmarch', 'harrond', 'stormhold', 'galecliff'] },
  { id: 'stormhold', name: 'Stormhold Coast', owner: 'vesta', income: 7, troops: 10, neighbors: ['northmarch', 'ironcrest', 'galecliff'] },
  { id: 'mirevale', name: 'Mirevale Swamp', owner: 'urel', income: 4, troops: 8, neighbors: ['harrond', 'galecliff'] },
  { id: 'galecliff', name: 'Galecliff Pass', owner: 'talon', income: 6, troops: 11, neighbors: ['ironcrest', 'stormhold', 'mirevale', 'sunspire'] },
  { id: 'sunspire', name: 'Sunspire Isle', owner: 'player', income: 9, troops: 7, neighbors: ['galecliff', 'dawnfield'] },
  { id: 'dawnfield', name: 'Dawnfield', owner: 'ryvan', income: 5, troops: 8, neighbors: ['sunspire', 'opalvale'] },
  { id: 'opalvale', name: 'Opalvale', owner: 'urel', income: 6, troops: 9, neighbors: ['dawnfield', 'stonefen'] },
  { id: 'stonefen', name: 'Stonefen', owner: 'vesta', income: 5, troops: 10, neighbors: ['opalvale'] }
];

let regions = initialRegions.map(region => ({ ...region, neighbors: [...region.neighbors] }));
let turn = 1;
let selectedRegionId = null;
let selectedAction = null;

const state = {
  gold: 50,
  income: 0,
  armies: 0,
};

const elements = {
  turnNumber: document.getElementById('turnNumber'),
  playerName: document.getElementById('playerName'),
  playerGold: document.getElementById('playerGold'),
  playerIncome: document.getElementById('playerIncome'),
  playerArmies: document.getElementById('playerArmies'),
  selectedRegionName: document.getElementById('selectedRegionName'),
  selectedRegionOwner: document.getElementById('selectedRegionOwner'),
  selectedRegionIncome: document.getElementById('selectedRegionIncome'),
  selectedRegionTroops: document.getElementById('selectedRegionTroops'),
  selectedRegionNeighbors: document.getElementById('selectedRegionNeighbors'),
  actionHint: document.getElementById('actionHint'),
  mapBoard: document.getElementById('mapBoard'),
  log: document.getElementById('log'),
  endTurnButton: document.getElementById('endTurnButton'),
  recruitButton: document.getElementById('recruitButton'),
  fortifyButton: document.getElementById('fortifyButton'),
  moveButton: document.getElementById('moveButton'),
  attackButton: document.getElementById('attackButton'),
  resetButton: document.getElementById('resetButton'),
};

function log(text, type = 'info') {
  const p = document.createElement('p');
  p.textContent = text;
  if (type === 'success') p.style.color = '#98d8ae';
  if (type === 'warning') p.style.color = '#f3b84a';
  if (type === 'danger') p.style.color = '#f58a93';
  elements.log.prepend(p);
}

function getRegion(id) {
  return regions.find(region => region.id === id);
}

function getFaction(id) {
  return factions.find(faction => faction.id === id);
}

function updateStats() {
  const playerRegions = regions.filter(r => r.owner === 'player');
  state.income = playerRegions.reduce((sum, region) => sum + region.income, 0);
  state.armies = playerRegions.reduce((sum, region) => sum + region.troops, 0);
  elements.turnNumber.textContent = turn;
  elements.playerGold.textContent = state.gold;
  elements.playerIncome.textContent = state.income;
  elements.playerArmies.textContent = state.armies;

  if (selectedRegionId) {
    const region = getRegion(selectedRegionId);
    elements.selectedRegionName.textContent = region.name;
    elements.selectedRegionOwner.textContent = getFaction(region.owner).name;
    elements.selectedRegionIncome.textContent = region.income;
    elements.selectedRegionTroops.textContent = region.troops;
    elements.selectedRegionNeighbors.textContent = region.neighbors
      .map(id => getRegion(id).name)
      .join(', ');
  } else {
    elements.selectedRegionName.textContent = 'None';
    elements.selectedRegionOwner.textContent = '-';
    elements.selectedRegionIncome.textContent = '-';
    elements.selectedRegionTroops.textContent = '-';
    elements.selectedRegionNeighbors.textContent = '-';
  }

  refreshActionButtons();
}

function renderMap() {
  elements.mapBoard.innerHTML = '';
  regions.forEach(region => {
    const faction = getFaction(region.owner);
    const cell = document.createElement('div');
    const isSelected = region.id === selectedRegionId;
    cell.className = 'region';
    if (isSelected) cell.classList.add('selected');
    if (selectedAction && selectedRegionId && region.id !== selectedRegionId) {
      if (selectedAction === 'move' && canMoveTo(selectedRegionId, region.id)) cell.classList.add('target');
      if (selectedAction === 'attack' && canAttackFrom(selectedRegionId, region.id)) cell.classList.add('target');
    }
    cell.style.borderColor = faction.color;
    cell.innerHTML = `
      <h3>${region.name}</h3>
      <p class="owner">${faction.name}</p>
      <p class="troops">Troops: ${region.troops}</p>
      <p class="income">Income: ${region.income}</p>
    `;
    cell.addEventListener('click', () => selectRegion(region.id));
    elements.mapBoard.appendChild(cell);
  });
}

function updateActionHint(message) {
  elements.actionHint.textContent = message;
}

function resetActionMode(message = 'Select one of your regions to continue.') {
  selectedAction = null;
  updateActionHint(message);
  renderMap();
}

function selectRegion(id) {
  const region = getRegion(id);

  if (selectedAction && selectedRegionId && id !== selectedRegionId) {
    if (selectedAction === 'move') {
      if (attemptMove(selectedRegionId, id)) return;
    }
    if (selectedAction === 'attack') {
      if (attemptAttack(selectedRegionId, id)) return;
    }
  }

  selectedRegionId = id;
  selectedAction = null;
  renderMap();
  updateStats();
  updateActionHint(region.owner === 'player'
    ? `Selected ${region.name}. Choose an action or prepare a move/attack.`
    : `Selected ${region.name}. Choose a friendly region first if you want to attack it.`);
  log(`Selected ${region.name}.`);
}

function setActionMode(action) {
  if (!selectedRegionId) {
    log('Select a source region first.', 'warning');
    return;
  }
  const region = getRegion(selectedRegionId);
  if (region.owner !== 'player') {
    log('You must select one of your regions first.', 'warning');
    return;
  }
  if (action === 'move' && !region.neighbors.some(id => getRegion(id).owner === 'player')) {
    log('No adjacent friendly region is available for movement.', 'warning');
    return;
  }
  if (action === 'attack' && !region.neighbors.some(id => getRegion(id).owner !== 'player')) {
    log('No adjacent enemy region is available for attack.', 'warning');
    return;
  }
  selectedAction = action;
  const hint = action === 'move'
    ? `Click an adjacent friendly region to move troops.`
    : `Click a neighboring enemy region to attack.`;
  updateActionHint(hint);
  renderMap();
}

function refreshActionButtons() {
  const region = selectedRegionId ? getRegion(selectedRegionId) : null;
  const hasPlayerRegion = region && region.owner === 'player';
  elements.recruitButton.disabled = !hasPlayerRegion || state.gold < 20;
  elements.fortifyButton.disabled = !hasPlayerRegion;
  elements.moveButton.disabled = !hasPlayerRegion;
  elements.attackButton.disabled = !hasPlayerRegion;
}

function canMoveTo(sourceId, targetId) {
  const source = getRegion(sourceId);
  const target = getRegion(targetId);
  return source.owner === 'player' && target.owner === 'player' && source.neighbors.includes(targetId) && source.troops > 3;
}

function canAttackFrom(sourceId, targetId) {
  const source = getRegion(sourceId);
  const target = getRegion(targetId);
  return source.owner === 'player' && target.owner !== 'player' && source.neighbors.includes(targetId) && source.troops > 4;
}

function attemptMove(sourceId, targetId) {
  if (!canMoveTo(sourceId, targetId)) {
    log('Choose a valid adjacent friendly region for movement.', 'warning');
    return false;
  }
  const source = getRegion(sourceId);
  const target = getRegion(targetId);
  const moved = Math.min(3, source.troops - 3);
  source.troops -= moved;
  target.troops += moved;
  log(`Moved ${moved} troops from ${source.name} to ${target.name}.`, 'success');
  resetActionMode('Move complete. Select another region or end turn.');
  updateStats();
  renderMap();
  return true;
}

function attemptAttack(sourceId, targetId) {
  if (!canAttackFrom(sourceId, targetId)) {
    log('Choose a valid adjacent enemy region to attack.', 'warning');
    return false;
  }
  const attacker = getRegion(sourceId);
  const target = getRegion(targetId);
  const attackPower = attacker.troops + Math.floor(Math.random() * 6);
  const defensePower = target.troops + Math.floor(Math.random() * 6);

  if (attackPower > defensePower) {
    const loss = Math.max(1, Math.floor(target.troops * 0.4));
    attacker.troops = Math.max(3, attacker.troops - loss);
    target.owner = 'player';
    target.troops = Math.max(4, attacker.troops - 2);
    log(`Victory! ${target.name} was captured with ${target.troops} occupying troops.`, 'success');
  } else {
    const loss = Math.max(1, Math.floor(attacker.troops * 0.5));
    attacker.troops -= loss;
    log(`Attack failed at ${target.name}. Lost ${loss} troops.`, 'danger');
  }

  resetActionMode('Attack complete. Choose your next move.');
  updateStats();
  renderMap();
  return true;
}

function endTurn() {
  state.gold += state.income;
  turn += 1;
  log(`Turn ${turn - 1} ended. You earned ${state.income} gold.`);
  resetActionMode('Your turn ended. AI empires are moving.');
  aiTurn();
  updateStats();
  renderMap();
  checkVictory();
}

function recruitArmy() {
  if (state.gold < 20) {
    log('Not enough gold to recruit.', 'warning');
    return;
  }
  if (!selectedRegionId) {
    log('Select one of your regions first.', 'warning');
    return;
  }
  const region = getRegion(selectedRegionId);
  if (region.owner !== 'player') {
    log('You can only recruit in your own region.', 'warning');
    return;
  }
  state.gold -= 20;
  region.troops += 5;
  log(`Recruited 5 troops in ${region.name}.`, 'success');
  updateStats();
  renderMap();
}

function fortifyRegion() {
  if (!selectedRegionId) {
    log('Select one of your regions to fortify.', 'warning');
    return;
  }
  const region = getRegion(selectedRegionId);
  if (region.owner !== 'player') {
    log('You can only fortify your own region.', 'warning');
    return;
  }
  region.troops += 5;
  log(`Fortified ${region.name}: +5 troops.`, 'success');
  updateStats();
  renderMap();
}

function moveTroops() {
  setActionMode('move');
}

function attack() {
  setActionMode('attack');
}

function aiTurn() {
  log('AI empires take their turn...', 'warning');
  const aiFactions = factions.filter(f => f.type === 'ai');
  aiFactions.forEach(faction => {
    const ownedRegions = regions.filter(r => r.owner === faction.id);
    if (!ownedRegions.length) return;

    const borderRegions = ownedRegions.filter(region => region.neighbors.some(id => getRegion(id).owner !== faction.id));
    if (borderRegions.length) {
      const attacker = borderRegions.reduce((strongest, region) => region.troops > strongest.troops ? region : strongest, borderRegions[0]);
      const targetCandidates = attacker.neighbors
        .map(id => getRegion(id))
        .filter(region => region.owner !== faction.id);

      if (targetCandidates.length) {
        const target = targetCandidates.sort((a, b) => (a.troops + a.income) - (b.troops + b.income))[0];
        const attackPower = attacker.troops + Math.floor(Math.random() * 5);
        const defensePower = target.troops + Math.floor(Math.random() * 5);

        if (attackPower > defensePower + 1) {
          target.owner = faction.id;
          target.troops = Math.max(4, attacker.troops - 3);
          attacker.troops = Math.max(3, attacker.troops - 4);
          log(`${faction.name} captured ${target.name}.`, 'danger');
          return;
        }

        attacker.troops = Math.max(3, attacker.troops - 3);
        log(`${faction.name} failed an assault on ${target.name}.`, 'warning');
        return;
      }
    }

    const reinforcement = ownedRegions[Math.floor(Math.random() * ownedRegions.length)];
    reinforcement.troops += 2;
    log(`${faction.name} reinforced ${reinforcement.name}.`, 'warning');
  });

  regions.forEach(region => {
    if (region.owner !== 'player') {
      region.troops = Math.min(region.troops + 1, 20);
    }
  });
}

function checkVictory() {
  const playerControl = regions.filter(r => r.owner === 'player').length;
  const enemyControl = regions.filter(r => r.owner !== 'player').length;
  if (playerControl >= 8 || enemyControl === 0) {
    log('You have become the supreme ruler of the realm!', 'success');
    disableButtons();
  }
  if (enemyControl >= 8) {
    log('Your enemies have overwhelmed the realm!', 'danger');
    disableButtons();
  }
}

function resetGame() {
  regions = initialRegions.map(region => ({ ...region, neighbors: [...region.neighbors] }));
  turn = 1;
  selectedRegionId = null;
  selectedAction = null;
  state.gold = 50;
  state.income = 0;
  state.armies = 0;
  updateStats();
  renderMap();
  updateActionHint('The realm resets. Select a region to begin again.');
  elements.log.innerHTML = '';
  log('The game has been reset. A new campaign begins.');
}

function disableButtons() {
  elements.endTurnButton.disabled = true;
  elements.recruitButton.disabled = true;
  elements.fortifyButton.disabled = true;
  elements.moveButton.disabled = true;
  elements.attackButton.disabled = true;
}

function bindEvents() {
  elements.endTurnButton.addEventListener('click', endTurn);
  elements.recruitButton.addEventListener('click', recruitArmy);
  elements.fortifyButton.addEventListener('click', fortifyRegion);
  elements.moveButton.addEventListener('click', moveTroops);
  elements.attackButton.addEventListener('click', attack);
  elements.resetButton.addEventListener('click', resetGame);
}

function initialize() {
  bindEvents();
  updateStats();
  renderMap();
  updateActionHint('Welcome, commander. Select a region to begin your campaign.');
  log('Welcome, commander. Seize opportunity and conquer the map.');
}

initialize();
