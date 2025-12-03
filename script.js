/* FocusQuest script.js
 - Implements a Pomodoro timer with XP, levels, and badge unlocking.
 - Saves state to localStorage so progress persists across pages.
*/

// -------------------- Configuration --------------------
const CONFIG = {
  pomodoroSec: 25 * 60,   // default pomodoro (25m)
  shortBreakSec: 5 * 60,  // short break (5m)
  longBreakSec: 15 * 60,  // long break (15m)
  xpPerPomo: 50,
  xpPerLevel: 200
};

// -------------------- Persistent State --------------------
const STORAGE_KEY = 'focusquest_state_v1';
const defaultState = {
  xp: 0,
  completed: 0,
  lastCompletedAt: null
};

let state = loadState();

// -------------------- Utility --------------------
function loadState(){
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return {...defaultState};
    return {...defaultState, ...JSON.parse(raw)};
  } catch(e){
    console.error('loadState error', e);
    return {...defaultState};
  }
}
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function addXP(amount){
  state.xp += amount;
  saveState();
}
function completePomo(){
  state.completed += 1;
  state.lastCompletedAt = Date.now();
  addXP(CONFIG.xpPerPomo);
  saveState();
}

// Level calculation
function getLevel(){
  return Math.floor(state.xp / CONFIG.xpPerLevel) + 1;
}
function xpIntoLevel(){
  return state.xp % CONFIG.xpPerLevel;
}
function xpProgressPct(){
  return (xpIntoLevel() / CONFIG.xpPerLevel) * 100;
}

// -------------------- Badges (simple thresholds) --------------------
const BADGES = [
  { id: 'first', name: 'Blossom Starter', icon: '🌸', threshold: 1 },
  { id: 'streak3', name: 'Sweet Streak', icon: '🍬', threshold: 3 },
  { id: 'ribbon5', name: 'Ribbon of Focus', icon: '🎀', threshold: 5 },
  { id: 'galaxy10', name: 'Galaxy Mind', icon: '🌟', threshold: 10 },
  { id: 'queen15', name: 'Focus Queen', icon: '👑', threshold: 15 }
];

// -------------------- DOM Helpers (update UI) --------------------
document.addEventListener('DOMContentLoaded', () => {
  // update homepage mini stats if present
  const hx = document.getElementById('home-xp');
  const hl = document.getElementById('home-level');
  const hs = document.getElementById('home-sessions');
  if(hx) hx.textContent = `XP: ${state.xp}`;
  if(hl) hl.textContent = `Lvl: ${getLevel()}`;
  if(hs) hs.textContent = `Pomos: ${state.completed}`;

  // inject badges where needed
  renderBadges();

  // attach timer behaviour on timer pages
  initTimerPage();

  // update achievements page if present
  updateAchievementsPage();
});

// Render badges in timer and achievements pages
function renderBadges(){
  const grid = document.getElementById('badgesGrid');
  const achGrid = document.getElementById('ach-badges');
  if(grid){
    grid.innerHTML = '';
    BADGES.forEach(b => {
      const unlocked = state.completed >= b.threshold;
      const div = document.createElement('div');
      div.className = `badge ${unlocked ? '' : 'locked'}`;
      div.innerHTML = `<div class="icon" aria-hidden="true">${b.icon}</div><strong>${b.name}</strong><div style="font-size:12px;color:#6a4f72">${unlocked ? 'Unlocked' : `Requires ${b.threshold}`}</div>`;
      grid.appendChild(div);
    });
  }
  if(achGrid){
    achGrid.innerHTML = '';
    BADGES.forEach(b => {
      const unlocked = state.completed >= b.threshold;
      const div = document.createElement('div');
      div.className = `badge ${unlocked ? '' : 'locked'}`;
      div.innerHTML = `<div class="icon">${b.icon}</div><strong>${b.name}</strong><div style="font-size:12px;color:#6a4f72">${unlocked ? 'Unlocked' : `Locked`}</div>`;
      achGrid.appendChild(div);
    });
  }
}

// -------------------- Timer Implementation --------------------
function initTimerPage(){
  const timeEl = document.getElementById('time');
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const resetBtn = document.getElementById('resetBtn');
  const tabs = document.querySelectorAll('.tab');
  const xpLabel = document.getElementById('xpLabel');
  const levelLabel = document.getElementById('levelLabel');
  const xpBar = document.getElementById('xpBar');
  const completedCount = document.getElementById('completedCount');

  if(!timeEl) return; // not on timer page

  // stateful timer variables
  let currentMode = 'pomodoro';
  let remaining = CONFIG.pomodoroSec;
  let timerInterval = null;
  let running = false;

  // helper format
  function fmt(sec){
    const m = Math.floor(sec/60).toString().padStart(2,'0');
    const s = Math.floor(sec%60).toString().padStart(2,'0');
    return `${m}:${s}`;
  }

  // update display
  function refreshUI(){
    timeEl.textContent = fmt(remaining);
    xpLabel.textContent = `${state.xp} XP`;
    levelLabel.textContent = `Lvl ${getLevel()}`;
    xpBar.style.width = `${xpProgressPct()}%`;
    completedCount.textContent = state.completed;
  }

  // switch mode
  function setMode(mode){
    currentMode = mode;
    // update tab UI
    tabs.forEach(t => t.classList.toggle('active', t.dataset.mode === mode));
    if(mode === 'pomodoro') remaining = CONFIG.pomodoroSec;
    if(mode === 'short') remaining = CONFIG.shortBreakSec;
    if(mode === 'long') remaining = CONFIG.longBreakSec;
    stopTimer();
    refreshUI();
  }

  // timer controls
  function startTimer(){
    if(running) return;
    running = true;
    timerInterval = setInterval(() => {
      remaining -= 1;
      if(remaining <= 0){
        clearInterval(timerInterval);
        running = false;
        onTimerComplete();
      }
      refreshUI();
    }, 1000);
  }
  function stopTimer(){
    running = false;
    if(timerInterval) clearInterval(timerInterval);
    timerInterval = null;
  }
  function resetTimer(){
    stopTimer();
    if(currentMode === 'pomodoro') remaining = CONFIG.pomodoroSec;
    if(currentMode === 'short') remaining = CONFIG.shortBreakSec;
    if(currentMode === 'long') remaining = CONFIG.longBreakSec;
    refreshUI();
  }

  // finishing logic
  function onTimerComplete(){
    // If a pomodoro finished: award XP & increment completed
    if(currentMode === 'pomodoro'){
      // small animation/feedback
      alert('Pomodoro complete! +50 XP 🌸');
      completePomo();
      // update UI and badges
      renderBadges();
      updateAchievementsPage();
      refreshUI();
    } else {
      // break finished
      alert('Break is over — back to focus!');
    }
    // auto-switch to pomodoro after break
    setMode('pomodoro');
  }

  // attach events
  startBtn.addEventListener('click', startTimer);
  pauseBtn.addEventListener('click', () => {
    if(running) stopTimer();
  });
  resetBtn.addEventListener('click', () => {
    resetTimer();
  });

  tabs.forEach(t => {
    t.addEventListener('click', () => setMode(t.dataset.mode));
  });

  // initial render
  setMode('pomodoro');
  refreshUI();
}

// -------------------- Achievements & home page updater --------------------
function updateAchievementsPage(){
  const achXP = document.getElementById('ach-xp');
  const achLV = document.getElementById('ach-level');
  const achS = document.getElementById('ach-sessions');

  if(achXP) achXP.textContent = `XP: ${state.xp}`;
  if(achLV) achLV.textContent = `Level ${getLevel()}`;
  if(achS) achS.textContent = `${state.completed}`;

  // also update homepage stat if present
  const hx = document.getElementById('home-xp');
  const hl = document.getElementById('home-level');
  const hs = document.getElementById('home-sessions');
  if(hx) hx.textContent = `XP: ${state.xp}`;
  if(hl) hl.textContent = `Lvl: ${getLevel()}`;
  if(hs) hs.textContent = `Pomos: ${state.completed}`;

  // render badges
  renderBadges();
}
