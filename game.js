const factions = [
  { id: 'player', name: 'House Aurelion', color: '#6cbef5', type: 'player' },
  { id: 'ryvan', name: 'Ryvan Concord', color: '#f39a52', type: 'ai' },
  { id: 'urel', name: 'Urel Dominion', color: '#8cd47d', type: 'ai' },
  { id: 'vesta', name: 'Vesta Pact', color: '#c46cff', type: 'ai' },
  { id: 'talon', name: 'Talon Empire', color: '#f76c8c', type: 'ai' }
];

const regions = [
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

let turn = 1;
let selectedRegionId = null;
const state = {
  gold: 50,
  income: 0,
  armies: 22,
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
  mapBoard: document.getElementById('mapBoard'),
  log: document.getElementById('log'),
  endTurnButton: document.getElementById('endTurnButton'),
  recruitButton: document.getElementById('recruitButton'),
  fortifyButton: document.getElementById('fortifyButton'),
  moveButton: document.getElementById('moveButton'),
  attackButton: document.getElementById('attackButton'),
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
  } else {
    elements.selectedRegionName.textContent = 'None';
    elements.selectedRegionOwner.textContent = '-';
    elements.selectedRegionIncome.textContent = '-';
    elements.selectedRegionTroops.textContent = '-';
  }
}

function renderMap() {
  elements.mapBoard.innerHTML = '';
  regions.forEach(region => {
    const faction = getFaction(region.owner);
    const cell = document.createElement('div');
    cell.className = 'region';
    if (region.id === selectedRegionId) cell.classList.add('selected');
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

function selectRegion(id) {
  selectedRegionId = id;
  renderMap();
  updateStats();
  log(`Selected ${getRegion(id).name}.`);
}

function endTurn() {
  state.gold += state.income;
  turn += 1;
  log(`Turn ${turn - 1} ended. You earned ${state.income} gold.`);
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
  log(`Recruited 5 troops in ${region.name}.`,'success');
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
  if (!selectedRegionId) {
    log('Select a source region first.', 'warning');
    return;
  }
  const source = getRegion(selectedRegionId);
  if (source.owner !== 'player') {
    log('Select one of your regions to move troops.', 'warning');
    return;
  }
  const target = regions.find(r => source.neighbors.includes(r.id) && r.owner === 'player' && r.id !== source.id);
  if (!target) {
    log('No friendly adjacent region available for movement.', 'warning');
    return;
  }
  if (source.troops <= 3) {
    log('Keep at least 3 troops behind.', 'warning');
    return;
  }
  source.troops -= 3;
  target.troops += 3;
  log(`Moved 3 troops from ${source.name} to ${target.name}.`, 'success');
  updateStats();
  renderMap();
}

function attack() {
  if (!selectedRegionId) {
    log('Select an attacking region first.', 'warning');
    return;
  }
  const attacker = getRegion(selectedRegionId);
  if (attacker.owner !== 'player') {
    log('Select one of your regions to attack from.', 'warning');
    return;
  }
  const target = regions.find(r => attacker.neighbors.includes(r.id) && r.owner !== 'player');
  if (!target) {
    log('No enemy adjacent region to attack.', 'warning');
    return;
  }
  if (attacker.troops <= 4) {
    log('You need at least 5 troops to launch an attack.', 'warning');
    return;
  }
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
  updateStats();
  renderMap();
}

function aiTurn() {
  log('AI empires take their turn...', 'warning');
  const aiFactions = factions.filter(f => f.type === 'ai');
  aiFactions.forEach(faction => {
    const ownedRegions = regions.filter(r => r.owner === faction.id);
    const nearbyEnemyTargets = ownedRegions.flatMap(region => region.neighbors.map(id => getRegion(id))).filter(r => r.owner !== faction.id);

    if (ownedRegions.length === 0) return;
    const strongest = ownedRegions.reduce((best, region) => region.troops > best.troops ? region : best, ownedRegions[0]);
    if (strongest.troops >= 12 && nearbyEnemyTargets.length > 0) {
      const target = nearbyEnemyTargets[Math.floor(Math.random() * nearbyEnemyTargets.length)];
      const attackPower = strongest.troops + Math.floor(Math.random() * 5);
      const defensePower = target.troops + Math.floor(Math.random() * 5);
      if (attackPower > defensePower) {
        target.owner = faction.id;
        target.troops = Math.max(4, strongest.troops - 4);
        strongest.troops = Math.max(3, strongest.troops - 3);
        log(`${faction.name} captured ${target.name}.`, 'danger');
      } else {
        strongest.troops = Math.max(3, strongest.troops - 4);
        log(`${faction.name} failed an assault on ${target.name}.`, 'warning');
      }
    } else {
      const reinf = ownedRegions[Math.floor(Math.random() * ownedRegions.length)];
      reinf.troops += 2;
      log(`${faction.name} reinforced ${reinf.name}.`, 'warning');
    }
  });

  regions.forEach(region => {
    if (region.owner === 'player') return;
    region.troops = Math.min(region.troops + 1, 18);
  });
}

function checkVictory() {
  const playerControl = regions.filter(r => r.owner === 'player').length;
  const enemyControl = regions.filter(r => r.owner !== 'player').length;
  if (playerControl >= 8) {
    log('You have become the supreme ruler of the realm!', 'success');
    disableButtons();
  }
  if (enemyControl >= 8) {
    log('Your enemies have overwhelmed the realm!', 'danger');
    disableButtons();
  }
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
}

function initialize() {
  bindEvents();
  renderMap();
  updateStats();
  log('Welcome, commander. Seize opportunity and conquer the map.');
}

initialize();
