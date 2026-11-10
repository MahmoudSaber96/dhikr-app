(function(){
  const KEYS = { DATA: 'dhikr_data_v7', THEME: 'dhikr_theme_v7', SET: 'dhikr_set_v7', PROG: 'dhikr_prog_v7', ONBOARD: 'dhikr_onboard_v3' };

  const PALETTE = [
    'linear-gradient(135deg, rgba(99,102,241,0.45), rgba(139,92,246,0.35))',
    'linear-gradient(135deg, rgba(236,72,153,0.45), rgba(244,63,94,0.35))',
    'linear-gradient(135deg, rgba(59,130,246,0.45), rgba(14,165,233,0.35))',
    'linear-gradient(135deg, rgba(249,115,22,0.45), rgba(234,179,8,0.35))',
    'linear-gradient(135deg, rgba(20,184,166,0.45), rgba(34,211,238,0.35))',
    'linear-gradient(135deg, rgba(168,85,247,0.45), rgba(217,70,239,0.35))'
  ];

  const ACHIEVEMENTS = [
    { id: 'first_target', icon: '🌟', title: 'بداية الطريق', desc: 'أتممت أول هدف', req: (p) => p.targetsCompleted >= 1 },
    { id: 'dhikr_100', icon: '🌱', title: 'الذاكر', desc: 'أتممت 100 ذكر', req: (p) => p.totalDhikr >= 100 },
    { id: 'dhikr_1000', icon: '🌳', title: 'المثابر', desc: 'أتممت 1000 ذكر', req: (p) => p.totalDhikr >= 1000 },
    { id: 'targets_10', icon: '🔥', title: 'الهمة العالية', desc: 'أتممت 10 أهداف', req: (p) => p.targetsCompleted >= 10 }
  ];

  let data = [];
  let settings = { soundClick: true, soundTarget: true };
  let progress = { totalDhikr: 0, targetsCompleted: 0, unlocked: [] };
  
  let audioCtx = null;
  let pressTimer = null;
  let longPressed = false;
  let pendingDelete = null;

  let isFocusMode = false;
  let focusItemId = null;
  let focusPaused = false;

  const grid = document.getElementById('grid');
  let currentDailyMsg = null;

  /* ---------- التخزين ---------- */
  function load() {
    try {
      data = JSON.parse(localStorage.getItem(KEYS.DATA)) || [];
      settings = { ...settings, ...JSON.parse(localStorage.getItem(KEYS.SET)) };
      progress = { ...progress, ...JSON.parse(localStorage.getItem(KEYS.PROG)) };
    } catch(e) {}
    
    document.getElementById('soundToggle').checked = settings.soundClick;
    document.getElementById('targetSoundToggle').checked = settings.soundTarget;
    updateStatsUI();
  }

  function save() {
    localStorage.setItem(KEYS.DATA, JSON.stringify(data));
    localStorage.setItem(KEYS.SET, JSON.stringify(settings));
    localStorage.setItem(KEYS.PROG, JSON.stringify(progress));
    updateStatsUI();
  }

  /* ---------- الثيم ---------- */
  function applyTheme(mode) {
    document.body.classList.toggle('dark', mode === 'dark');
    document.getElementById('themeBtn').textContent = mode === 'dark' ? '☀️' : '🌙';
    document.querySelector('meta[name="theme-color"]').setAttribute('content', mode === 'dark' ? '#0b1120' : '#eef2f7');
  }
  let themeMode = localStorage.getItem(KEYS.THEME) || 'light';
  applyTheme(themeMode);
  
  document.getElementById('themeBtn').onclick = () => {
    themeMode = themeMode === 'dark' ? 'light' : 'dark';
    localStorage.setItem(KEYS.THEME, themeMode);
    applyTheme(themeMode);
  };

  /* ---------- الأصوات ---------- */
  function playTick(isTarget = false) {
    if (!isTarget && !settings.soundClick) return;
    if (isTarget && !settings.soundTarget) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'sine'; 
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      if (isTarget) {
        osc.frequency.setValueAtTime(1000, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.6, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.15);
      } else {
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.04);
        gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.04);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.04);
      }
    } catch(e) {}
  }

  /* ---------- الإعدادات ---------- */
  document.getElementById('settingsBtn').addEventListener('click', () => {
    document.getElementById('settingsOverlay').classList.add('show');
  });

  document.getElementById('soundToggle').onchange = (e) => { settings.soundClick = e.target.checked; save(); if(e.target.checked) playTick(false); };
  document.getElementById('targetSoundToggle').onchange = (e) => { settings.soundTarget = e.target.checked; save(); if(e.target.checked) playTick(true); };

  /* ---------- الإحصائيات ---------- */
  function updateStatsUI() {
    document.getElementById('targetsDisplay').textContent = progress.targetsCompleted || 0;
    document.getElementById('dhikrDisplay').textContent = progress.totalDhikr || 0;
  }

  function addDhikr(count = 1) {
    progress.totalDhikr += count;
    checkAchievements();
  }

  function checkAchievements() {
    ACHIEVEMENTS.forEach(ach => {
      if (!progress.unlocked.includes(ach.id) && ach.req(progress)) {
        progress.unlocked.push(ach.id);
        showToast(`🏆 إنجاز جديد: ${ach.title}`);
      }
    });
    save();
  }

  /* ---------- الاحتفال ---------- */
  function celebrate(name) {
    playTick(true);
    progress.targetsCompleted++;
    checkAchievements();
    
    document.getElementById('celebrateMsg').textContent = `أتممت هدف "${name}". تقبل الله منك وجعله في ميزان حسناتك.`;
    document.getElementById('celebrateOverlay').classList.add('show');
    
    setTimeout(() => {
      document.getElementById('celebrateOverlay').classList.remove('show');
    }, 4000);
    save();
  }

  /* ---------- رسم المسبحات ---------- */
  function render() {
    grid.innerHTML = '';
    document.getElementById('emptyState').style.display = data.length ? 'none' : 'block';

    data.forEach(item => {
      const el = document.createElement('div');
      el.className = 'counter';
      el.style.setProperty('--tint', item.tint || PALETTE[0]);
      
      if (item.target && item.count >= item.target) el.classList.add('target-reached');
      
      let hint = item.count === 0 ? 'اضغط للزيادة • ضغطة مطولة للحذف' : 'اضغط للزيادة • ضغطة مطولة للتصفير';
      
      el.innerHTML = `
        <button class="focus-mini-btn" data-id="${item.id}" title="وضع التركيز">🎯</button>
        <div class="name">${escapeHtml(item.name)}</div>
        <div class="count">${item.count}</div>
        ${item.target ? `<div class="target-info">الهدف: ${item.target}</div>` : ''}
        <div class="hint">${hint}</div>
      `;

      el.querySelector('.focus-mini-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        startFocusMode(item);
      });

      let touchMoved = false;
      el.addEventListener('touchstart', () => { touchMoved = false; }, { passive: true });
      el.addEventListener('touchmove', () => { touchMoved = true; }, { passive: true });

      el.addEventListener('touchend', (e) => {
        if (touchMoved) return; 
        if (e.target.closest('.focus-mini-btn')) return;
        if (longPressed) { longPressed = false; return; }
        handleTap(item.id, el);
      });

      el.addEventListener('click', (e) => {
        if (e.pointerType === 'mouse' || e.pointerType === 'pen') {
          if (e.target.closest('.focus-mini-btn')) return;
          if (longPressed) { longPressed = false; return; }
          handleTap(item.id, el);
        }
      });

      el.addEventListener('pointerdown', (e) => {
        if (e.target.closest('.focus-mini-btn')) return;
        longPressed = false;
        pressTimer = setTimeout(() => {
          longPressed = true;
          const it = data.find(d => d.id === item.id);
          if (!it) return;
          if (it.count > 0) {
            it.count = 0;
            el.querySelector('.count').textContent = 0;
            el.querySelector('.hint').textContent = 'اضغط للزيادة • ضغطة مطولة للحذف';
            el.classList.remove('target-reached');
            save();
            showToast('تم تصفير: ' + it.name);
          } else {
            pendingDelete = item.id;
            document.getElementById('delText').textContent = `حذف "${it.name}"؟`;
            document.getElementById('delOverlay').classList.add('show');
          }
        }, 600);
      });
      
      ['pointerup','pointerleave','pointercancel'].forEach(evt => el.addEventListener(evt, () => clearTimeout(pressTimer)));
      grid.appendChild(el);
    });
  }

  function handleTap(id, el) {
    const it = data.find(d => d.id === id);
    if (!it) return;
    
    it.count++;
    addDhikr();
    playTick(false);
    
    if (el) {
      el.querySelector('.count').textContent = it.count;
      el.querySelector('.hint').textContent = 'اضغط للزيادة • ضغطة مطولة للتصفير';
      if (it.target && it.count === it.target) {
        el.classList.add('target-reached');
        celebrate(it.name);
      }
    }
    save();
  }

  /* ---------- وضع التركيز ---------- */
  function startFocusMode(item) {
    if (!item) return;
    isFocusMode = true;
    focusItemId = item.id;
    focusPaused = false;
    
    document.getElementById('focusTitle').textContent = item.name;
    document.getElementById('focusCount').textContent = item.count;
    document.getElementById('focusHint').textContent = item.target ? `الهدف: ${item.target}` : 'استمر في الذكر';
    document.getElementById('focusOverlay').classList.add('show');
    
    document.querySelector('.topbar').style.display = 'none';
    grid.style.display = 'none';
    document.getElementById('dailyBar').style.display = 'none';
  }

  window.exitFocusMode = function() {
    isFocusMode = false;
    document.getElementById('focusOverlay').classList.remove('show');
    document.getElementById('pauseOverlay').classList.remove('show');
    document.querySelector('.topbar').style.display = 'flex';
    grid.style.display = 'grid';
    document.getElementById('dailyBar').style.display = 'flex';
    render();
  };

  document.getElementById('focusCount').addEventListener('touchend', (e) => {
    if (!isFocusMode || focusPaused) return;
    const it = data.find(d => d.id === focusItemId);
    if (!it) return;
    
    it.count++;
    addDhikr();
    playTick(false);
    
    const display = document.getElementById('focusCount');
    display.textContent = it.count;
    display.style.transform = 'scale(1.05)';
    setTimeout(() => display.style.transform = 'scale(1)', 100);
    
    if (it.target && it.count === it.target) {
      celebrate(it.name);
    }
    save();
  });

  document.addEventListener('visibilitychange', () => {
    if (isFocusMode && document.hidden) {
      focusPaused = true;
      document.getElementById('pauseOverlay').classList.add('show');
    }
  });

  window.resumeFocusMode = function() {
    focusPaused = false;
    document.getElementById('pauseOverlay').classList.remove('show');
  };

  /* ---------- الإنجازات ---------- */
  document.getElementById('achievementsBtn').onclick = () => {
    document.getElementById('totalDhikrDisplay').textContent = progress.totalDhikr;
    document.getElementById('totalTargetsDisplay').textContent = progress.targetsCompleted;
    const list = document.getElementById('achievementsList');
    list.innerHTML = '';
    
    ACHIEVEMENTS.forEach(ach => {
      const unlocked = progress.unlocked.includes(ach.id);
      const div = document.createElement('div');
      div.className = 'ach-item ' + (unlocked ? '' : 'locked');
      div.innerHTML = `
        <span class="ach-icon">${ach.icon}</span>
        <div>
          <div style="color: ${unlocked ? '#10b981' : 'inherit'}">${ach.title}</div>
          <div style="font-size: 11px; font-weight: normal; opacity: 0.8;">${ach.desc}</div>
        </div>
      `;
      list.appendChild(div);
    });
    
    document.getElementById('achievementsOverlay').classList.add('show');
  };

  /* ---------- إضافة ذكر ---------- */
  document.getElementById('addBtn').onclick = () => {
    document.getElementById('nameInput').value = '';
    document.getElementById('targetInput').value = '';
    document.getElementById('addOverlay').classList.add('show');
  };

  window.addPreset = function(name, target) {
    document.getElementById('nameInput').value = name;
    document.getElementById('targetInput').value = target;
  };

  document.getElementById('confirmAdd').onclick = () => {
    const name = document.getElementById('nameInput').value.trim();
    const targetVal = parseInt(document.getElementById('targetInput').value);
    if (!name) return document.getElementById('nameInput').focus();
    
    let color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
    if (data.length < PALETTE.length) {
      const used = data.map(d => d.tint);
      const avail = PALETTE.filter(c => !used.includes(c));
      if(avail.length) color = avail[0];
    }

    data.push({
      id: 'c_' + Date.now(),
      name: name,
      count: 0,
      target: (targetVal > 0) ? targetVal : null,
      tint: color
    });
    
    save();
    document.getElementById('addOverlay').classList.remove('show');
    render();
    showToast('تمت الإضافة بنجاح');
  };

  /* ---------- الحذف ---------- */
  document.getElementById('confirmDel').onclick = () => {
    if (pendingDelete) {
      data = data.filter(d => d.id !== pendingDelete);
      save();
      render();
    }
    pendingDelete = null;
    document.getElementById('delOverlay').classList.remove('show');
  };

  /* ---------- أدوات مساعدة ---------- */
  function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  ['addOverlay', 'settingsOverlay', 'delOverlay', 'achievementsOverlay', 'messageOverlay'].forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener('click', e => { if(e.target === el) el.classList.remove('show'); });
  });

  /* ---------- شاشة الترحيب ---------- */
  window.nextOnboarding = function(step) {
    document.querySelectorAll('.onboarding-card').forEach(c => c.classList.remove('active'));
    document.getElementById('ob-card-' + step).classList.add('active');
  };

  window.finishOnboarding = function() {
    localStorage.setItem(KEYS.ONBOARD, 'done');
    document.getElementById('onboardingOverlay').classList.remove('show');
  };

  /* ---------- رسالة اليوم ---------- */
  function loadDailyMessage() {
    if (typeof DAILY_MESSAGES === 'undefined' || DAILY_MESSAGES.length === 0) {
      document.getElementById('dailyBar').style.display = 'none';
      return;
    }
    
    const todayStr = new Date().toDateString();
    if (localStorage.getItem('dhikr_daily_closed') === todayStr) {
      document.getElementById('dailyBar').style.display = 'none';
    }

    const today = new Date();
    const dateString = today.getFullYear().toString() + today.getMonth().toString() + today.getDate().toString();
    let hash = 0;
    for (let i = 0; i < dateString.length; i++) {
        hash = dateString.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % DAILY_MESSAGES.length;
    currentDailyMsg = DAILY_MESSAGES[index];
  }

  window.openDailyMessage = function(e) {
    if (e.target.classList.contains('daily-close-btn')) return;
    if (!currentDailyMsg) return;
    
    document.getElementById('msgType').textContent = currentDailyMsg.type;
    document.getElementById('msgText').textContent = `"${currentDailyMsg.text}"`;
    document.getElementById('msgSource').textContent = currentDailyMsg.source;
    document.getElementById('messageOverlay').classList.add('show');
  };

  window.closeDailyBar = function(e) {
    e.stopPropagation();
    document.getElementById('dailyBar').style.display = 'none';
    localStorage.setItem('dhikr_daily_closed', new Date().toDateString());
  };

  window.copyMessage = function() {
    if (!currentDailyMsg) return;
    const textToCopy = `"${currentDailyMsg.text}"\n(${currentDailyMsg.source})`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      showToast('تم نسخ الرسالة بنجاح');
    }).catch(() => {
      showToast('حدث خطأ أثناء النسخ');
    });
  };

  window.closeMsgAndBar = function() {
    document.getElementById('messageOverlay').classList.remove('show');
    document.getElementById('dailyBar').style.display = 'none';
    localStorage.setItem('dhikr_daily_closed', new Date().toDateString());
  };

  // التشغيل
  load();
  render();
  loadDailyMessage();

  if (!localStorage.getItem(KEYS.ONBOARD)) {
    document.getElementById('onboardingOverlay').classList.add('show');
  }
})();