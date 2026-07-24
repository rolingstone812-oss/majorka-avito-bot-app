/* ═══════════════════════════════════════
   MAJORKA LM — Console App Logic (TMA Edition)
   ═══════════════════════════════════════ */

// Initialize Telegram WebApp
const tg = window.Telegram.WebApp;
let currentChatId = '6940082004'; // Default test user (Кирилл)
let currentUserName = 'Кирилл';

document.addEventListener('DOMContentLoaded', () => {
  initTelegramUserInfo();
  initSplash();
  initNicheSelector();
  initLivePreviewListeners();
  loadBotsList();
  loadStats();
});

/* ── Welcome Splash Screen ── */
function initSplash() {
  // Update greeting with user's name once Telegram user is known
  const greetEl = document.getElementById('splashUserGreet');
  if (greetEl && currentUserName && currentUserName !== 'Кирилл') {
    greetEl.textContent = `👋 Привет, ${currentUserName}!`;
  }
}

function closeSplash() {
  const splash = document.getElementById('welcomeSplash');
  if (!splash) return;
  splash.style.animation = 'splashFadeOut 0.35s ease-out forwards';
  setTimeout(() => { splash.remove(); }, 380);
}

/* ── Telegram WebApp Initialization ── */
function initTelegramUserInfo() {
  if (tg) {
    tg.ready();
    tg.expand();
    // Force fullscreen for Desktop Telegram (newer API)
    if (typeof tg.requestFullscreen === 'function') {
      tg.requestFullscreen();
    }
    // Retry expand after short delay to override Desktop sidebar mode
    setTimeout(() => {
      tg.expand();
      if (typeof tg.requestFullscreen === 'function') {
        tg.requestFullscreen();
      }
    }, 300);
    
    const tgUser = tg.initDataUnsafe?.user;
    if (tgUser) {
      currentChatId = String(tgUser.id);
      currentUserName = tgUser.first_name || 'Пользователь';
      
      // Update sidebar greeting
      const nameEl = document.getElementById('tgUserName');
      const subEl = document.getElementById('tgUserSub');
      const avatarEl = document.getElementById('tgUserAvatar');
      
      if (nameEl) nameEl.textContent = `${tgUser.first_name} ${tgUser.last_name || ''}`.trim();
      if (subEl) subEl.textContent = `ID: ${tgUser.id}`;
      
      // Initials for avatar
      if (avatarEl && tgUser.first_name) {
        avatarEl.textContent = tgUser.first_name.charAt(0).toUpperCase();
      }

      // Update splash greeting with real name
      const splashGreet = document.getElementById('splashUserGreet');
      if (splashGreet) {
        splashGreet.textContent = `👋 Привет, ${tgUser.first_name}!`;
      }
    }
  }
}


/* ── View Switcher ── */
function switchView(viewName) {
  // Update sidebar active state
  document.querySelectorAll('.sidebar-menu-item').forEach(item => {
    item.classList.toggle('active', item.dataset.view === viewName);
  });

  // Update mobile bottom nav active state
  document.querySelectorAll('.mobile-nav-item').forEach(item => {
    item.classList.toggle('active', item.id === `mobile-nav-${viewName}`);
  });

  // Show corresponding panel
  document.querySelectorAll('.view-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `view-${viewName}`);
  });

  // Special actions when entering views
  if (viewName === 'bots') {
    loadBotsList();
  } else if (viewName === 'analytics') {
    loadStats();
  } else if (viewName === 'billing') {
    const labelInput = document.getElementById('billingLabel');
    if (labelInput) {
      labelInput.value = `slot_${currentChatId}_${Date.now()}`;
    }
  }
}

/* ── Billing Slot Purchase ── */
function confirmSlotPayment() {
  const billingArea = document.getElementById('billingPaymentArea');
  if (!billingArea) return;
  
  billingArea.innerHTML = '<div style="color: var(--color-ash-gray); font-family: var(--font-mono);">Проверка оплаты слота...</div>';
  
  fetch('https://immensurable-paleaceous-marcella.ngrok-free.dev/webhook/buy-slot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatId: currentChatId })
  })
  .then(res => res.json())
  .then(result => {
    if (result.success) {
      billingArea.innerHTML = `
        <div style="color: var(--color-pulse-green); font-size: 15px; font-weight: 600; margin-bottom: 8px;">🎉 Слот успешно добавлен!</div>
        <div style="color: var(--color-ash-gray); font-size: 13px;">
          Теперь вы можете создать еще одного активного бота.
        </div>
      `;
      alert("Оплата подтверждена! Вам добавлен 1 лимит на создание бота.");
      loadBotsList();
    } else {
      billingArea.innerHTML = `<div style="color: var(--color-alarm-red); font-family: var(--font-mono);">Ошибка подтверждения: ${result.error}</div>`;
    }
  })
  .catch(err => {
    billingArea.innerHTML = `<div style="color: var(--color-alarm-red); font-family: var(--font-mono);">Ошибка связи: ${err}</div>`;
  });
}

function simulateSlotPaymentDirect() {
  if (confirm("Выполнить быструю тестовую активацию нового слота без реальной оплаты?")) {
    confirmSlotPayment();
  }
}

/* ── Stats Caching and Period Switching ── */
let cachedStats = null;
let currentPeriod = 'today';

function switchPeriod(period) {
  currentPeriod = period;

  // Highlight active tab button
  const periods = ['today', 'yesterday', 'week', 'month'];
  periods.forEach(p => {
    const btn = document.getElementById(`period-${p}`);
    if (btn) {
      if (p === period) {
        btn.style.background = 'var(--gradient-iris)';
        btn.style.color = '#fff';
      } else {
        btn.style.background = 'transparent';
        btn.style.color = 'var(--color-ash-gray)';
      }
    }
  });

  // Update chart title based on period
  const titles = {
    today: 'Активность за сегодня',
    yesterday: 'Активность за вчера',
    week: 'Активность за неделю',
    month: 'Активность за последние 30 дней'
  };
  const titleEl = document.getElementById('chartTitle');
  if (titleEl) {
    titleEl.textContent = titles[period] || 'Активность';
  }

  const emptyState = document.getElementById('analyticsEmptyState');
  const chartBox   = document.getElementById('analyticsChartBox');
  const analyticsMessages = document.getElementById('analyticsMessages');
  const analyticsLeads    = document.getElementById('analyticsLeads');

  if (!cachedStats || !cachedStats.success || !cachedStats.periods || !cachedStats.periods[period]) {
    if (emptyState) emptyState.style.display = 'block';
    if (chartBox)   chartBox.style.display   = 'none';
    if (analyticsMessages) analyticsMessages.innerHTML = `<span style="font-size:13px;color:#6b7280;">Бот ещё не запущен</span>`;
    if (analyticsLeads)    analyticsLeads.innerHTML    = `<span style="font-size:13px;color:#6b7280;">Бот ещё не запущен</span>`;
    return;
  }

  const pData = cachedStats.periods[period];
  const hasData = pData.messages > 0;

  if (analyticsMessages) {
    analyticsMessages.innerHTML = pData.messages > 0
      ? `<span style="font-family:var(--font-display);font-size:36px;color:var(--color-pulse-green);">${pData.messages.toLocaleString('ru-RU')}</span>`
      : `<span style="font-size:13px;color:#6b7280;">Нет диалогов</span>`;
  }
  if (analyticsLeads) {
    analyticsLeads.innerHTML = pData.leads > 0
      ? `<span style="font-family:var(--font-display);font-size:36px;">${pData.leads.toLocaleString('ru-RU')}</span>`
      : `<span style="font-size:13px;color:#6b7280;">Нет контактов</span>`;
  }

  if (emptyState) emptyState.style.display = hasData ? 'none' : 'block';
  if (chartBox)   chartBox.style.display   = hasData ? 'block' : 'none';

  if (hasData && pData.hours && Array.isArray(pData.hours)) {
    drawSVGChart(pData.hours);
  }
}

/* ── Retrieve Stats from Server ── */
function loadStats() {
  const analyticsBots = document.getElementById('analyticsBots');

  fetch(`https://immensurable-paleaceous-marcella.ngrok-free.dev/webhook/stats?chatId=${currentChatId}`)
    .then(res => res.json())
    .then(result => {
      cachedStats = result;
      const totalMsg    = (result.success && result.total_messages) || 0;
      const totalLeads  = (result.success && result.total_leads)    || 0;
      const activeBots  = (result.success && result.active_bots)    || 0;

      // ── Update legacy counter spans ──
      const msgEl   = document.getElementById('totalMessagesCount');
      const leadsEl = document.getElementById('totalLeadsCount');
      if (msgEl)   msgEl.textContent   = totalMsg.toLocaleString('ru-RU');
      if (leadsEl) leadsEl.textContent = totalLeads.toLocaleString('ru-RU');

      // ── Update dashboard widgets (smart empty state) ──
      updateDashboardWidgets(activeBots, totalMsg, totalLeads);

      if (analyticsBots) {
        analyticsBots.innerHTML = `<span style="font-family:var(--font-display);font-size:36px;color:var(--color-pulse-green);">${activeBots}</span>`;
      }

      // ── Update period stats ──
      switchPeriod(currentPeriod);
    })
    .catch(() => {
      cachedStats = null;
      updateDashboardWidgets(0, 0, 0);
      if (analyticsBots) analyticsBots.innerHTML = `<span style="font-family:var(--font-display);font-size:36px;">—</span>`;
      switchPeriod(currentPeriod);
    });
}

/* ── Smart Dashboard Widget Updater ── */
function updateDashboardWidgets(activeBots, totalMsg, totalLeads) {
  const statusEl     = document.getElementById('widgetStatus');
  const efficiencyEl = document.getElementById('widgetEfficiency');
  const activityEl   = document.getElementById('widgetActivity');
  const botsCount    = document.getElementById('totalBotsCount');
  const msgCount     = document.getElementById('totalMessagesCount');
  const leadsCount   = document.getElementById('totalLeadsCount');

  if (botsCount)  botsCount.textContent  = activeBots;
  if (msgCount)   msgCount.textContent   = totalMsg.toLocaleString('ru-RU');
  if (leadsCount) leadsCount.textContent = totalLeads.toLocaleString('ru-RU');

  if (activeBots > 0) {
    if (statusEl)     statusEl.innerHTML     = `<span class="pulse-dot"></span><span style="color:var(--color-pulse-green);font-size:20px;">В сети 24/7</span>`;
    if (efficiencyEl) efficiencyEl.innerHTML = totalMsg > 0
      ? `<span style="color:var(--color-sky-blue);font-size:20px;">📈 ${totalMsg.toLocaleString('ru-RU')} диалогов</span>`
      : `<span style="color:var(--color-sky-blue);font-size:20px;">📈 Активен</span>`;
    if (activityEl)   activityEl.innerHTML   = totalLeads > 0
      ? `<span style="color:var(--color-iris-violet);font-size:20px;">👤 ${totalLeads.toLocaleString('ru-RU')} лидов</span>`
      : `<span style="color:var(--color-iris-violet);font-size:20px;">👤 Работает</span>`;
  } else {
    if (statusEl)     statusEl.innerHTML     = `<span style="font-size:13px;color:#6b7280;">⏳ Нет активных ботов</span>`;
    if (efficiencyEl) efficiencyEl.innerHTML = `<span style="font-size:13px;color:#6b7280;">💤 У вас пока нет бота</span>`;
    if (activityEl)   activityEl.innerHTML   = `<span style="font-size:13px;color:#6b7280;">➕ Создайте бота</span>`;
  }
}

/* ── Beautiful SVG Bar Chart ── */
function drawSVGChart(hours) {
  const barsG   = document.getElementById('chartBars');
  const labelsG = document.getElementById('chartLabels');
  const peakEl  = document.getElementById('chartPeakLabel');
  if (!barsG || !labelsG) return;

  const labels  = ['00–03','03–06','06–09','09–12','12–15','15–18','18–21','21–00'];
  const W = 640, H = 160, padding = 10;
  const barW = 54, gap = (W - padding * 2 - barW * 8) / 7;
  const maxVal = Math.max(...hours, 1);

  barsG.innerHTML   = '';
  labelsG.innerHTML = '';

  let peakIdx = hours.indexOf(Math.max(...hours));
  if (peakEl) peakEl.textContent = `Пик: ${labels[peakIdx]} · ${hours[peakIdx]} сообщ.`;

  hours.forEach((val, i) => {
    const barH    = Math.max(8, Math.round((val / maxVal) * (H - 30)));
    const x       = padding + i * (barW + gap);
    const y       = H - barH;
    const isNight = i <= 1; // 00-06 dim
    const isPeak  = i === peakIdx;
    const fill    = isNight ? 'url(#barGradDim)' : 'url(#barGrad)';
    const filter  = isPeak  ? 'filter:url(#barGlow)' : '';

    // Bar rect with rounded top
    const rect = document.createElementNS('http://www.w3.org/2000/svg','rect');
    rect.setAttribute('x', x);
    rect.setAttribute('y', y);
    rect.setAttribute('width', barW);
    rect.setAttribute('height', barH);
    rect.setAttribute('fill', fill);
    rect.setAttribute('rx', '6');
    if (filter) rect.setAttribute('style', filter);
    rect.style.transition = 'height 0.6s ease, y 0.6s ease';
    barsG.appendChild(rect);

    // Value label on top of bar (only if bar is tall enough)
    if (val > 0 && barH > 20) {
      const text = document.createElementNS('http://www.w3.org/2000/svg','text');
      text.setAttribute('x', x + barW / 2);
      text.setAttribute('y', y - 5);
      text.setAttribute('text-anchor','middle');
      text.setAttribute('fill', isPeak ? '#baa7ff' : '#9ca3af');
      text.setAttribute('font-size','11');
      text.setAttribute('font-family','monospace');
      text.textContent = val;
      barsG.appendChild(text);
    }

    // X-axis label
    const lbl = document.createElementNS('http://www.w3.org/2000/svg','text');
    lbl.setAttribute('x', x + barW / 2);
    lbl.setAttribute('y', H + 14);
    lbl.setAttribute('text-anchor','middle');
    lbl.setAttribute('fill','#6b7280');
    lbl.setAttribute('font-size','10');
    lbl.textContent = labels[i];
    labelsG.appendChild(lbl);
  });
}



/* ── Retrieve Bots from Server ── */
function loadBotsList() {
  const botsList = document.getElementById('botsList');
  const countBadge = document.getElementById('totalBotsCount');
  
  if (!botsList) return;

  // Filter bots belonging to this user
  fetch(`https://immensurable-paleaceous-marcella.ngrok-free.dev/webhook/my-bots?chatId=${currentChatId}`)
    .then(res => res.json())
    .then(result => {
      if (result.success) {
        const bots = result.bots;
        countBadge.textContent = bots.length;

        if (bots.length === 0) {
          botsList.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 64px; border: 1px dashed var(--color-graphite-hairline); border-radius: var(--radius-lg); background: rgba(255,255,255,0.01);">
              <div style="font-size: 40px; margin-bottom: 16px;">🤖</div>
              <h3 style="color: var(--color-white); margin-bottom: 8px;">Нет активных ботов</h3>
              <p style="color: var(--color-ash-gray); font-size: 14px; margin-bottom: 24px;">Создайте и настройте вашего первого ассистента прямо здесь.</p>
              <button class="btn btn-violet" onclick="switchView('create')">Настроить первого бота</button>
            </div>
          `;
          return;
        }

        botsList.innerHTML = '';
        bots.forEach(bot => {
          const isPaid = bot.is_paid === 1;
          const statusClass = isPaid ? 'active' : 'inactive';
          const statusText = isPaid ? '● Оплачен' : '● Требуется оплата';
          
          let actionButton = '';
          if (!isPaid) {
            actionButton = `
              <div id="pay-actions-${bot.chatId}" style="display: flex; flex-direction: column; gap: 8px; width: 100%;">
                <form action="https://yoomoney.ru/quickpay/confirm.xml" method="POST" target="_blank" style="margin: 0; width: 100%;">
                  <input type="hidden" name="receiver" value="4100119556996975">
                  <input type="hidden" name="quickpay-form" value="button">
                  <input type="hidden" name="targets" value="Подписка MAJORKA LM (Бот: ${bot.name})">
                  <input type="hidden" name="paymentType" value="AC">
                  <input type="hidden" name="sum" value="6290">
                  <input type="hidden" name="label" value="${bot.chatId}">
                  <button type="submit" class="btn btn-violet" style="width: 100%; justify-content: center; font-weight: 600;">
                    💳 Оплатить через ЮMoney (6 290 ₽)
                  </button>
                </form>
                <div style="display: flex; gap: 8px; width: 100%;">
                  <button onclick="confirmExistingPayment('${bot.chatId}')" class="btn btn-ghost" style="flex: 1; font-size: 11px; padding: 8px;">
                    ✓ Подтвердить платеж
                  </button>
                  <button onclick="simulateExistingPaymentDirect('${bot.chatId}')" class="btn btn-ghost" style="font-size: 11px; padding: 8px;" title="Тестовая активация без списания средств">
                    Быстрый тест
                  </button>
                </div>
              </div>
            `;
          } else {
            actionButton = `
              <button onclick="startTestdrive('${bot.chatId}', '${bot.name}')" class="btn btn-violet" style="width: 100%; justify-content: center;">
                💬 Тест-драйв бота
              </button>
              <a href="https://t.me/avito_deployer_bot/app" target="_blank" class="btn btn-ghost" style="width: 100%; justify-content: center;">
                ⚙️ Управление в Telegram
              </a>
            `;
          }

          const card = document.createElement('div');
          card.className = 'bot-card';
          card.innerHTML = `
            <div class="bot-card-header">
              <div class="bot-card-title">${bot.name}</div>
              <span class="status-badge ${statusClass}">${statusText}</span>
            </div>
            
            <div class="bot-card-detail" style="margin-top: 16px;">
              <span>Ниша:</span>
              <strong style="color: var(--color-white);">${bot.niche}</strong>
            </div>
            <div class="bot-card-detail">
              <span>Город:</span>
              <strong style="color: var(--color-white);">${bot.city || 'Не указан'}</strong>
            </div>
            <div class="bot-card-detail">
              <span>Режим работы:</span>
              <strong style="color: var(--color-white);">${bot.hours || 'Круглосуточно'}</strong>
            </div>
            <div class="bot-card-detail">
              <span>ID Сессии:</span>
              <span style="font-family: var(--font-mono); font-size: 12px; color: var(--color-iris-violet-glow);">${bot.chatId}</span>
            </div>
            <div class="bot-card-detail" style="margin-top: 8px;">
              <span>Оплачен до:</span>
              <span style="color: ${isPaid ? 'var(--color-pulse-green)' : 'var(--color-alarm-red)'}; font-weight: 500;">
                ${bot.paid_until ? bot.paid_until.split(' ')[0] : '—'}
              </span>
            </div>

            <div class="bot-card-actions">
              ${actionButton}
            </div>
          `;
          botsList.appendChild(card);
        });

      } else {
        console.error("Failed to load bots:", result.error);
      }
    })
    .catch(err => {
      console.error("API error:", err);
    });
}

function confirmExistingPayment(chatId) {
  fetch('https://immensurable-paleaceous-marcella.ngrok-free.dev/webhook/pay-bot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatId: chatId })
  })
  .then(res => res.json())
  .then(result => {
    if (result.success) {
      alert("Платеж успешно подтвержден! Бот запущен.");
      loadBotsList();
      loadStats();
    } else {
      alert("Ошибка проверки: " + result.error);
    }
  })
  .catch(err => {
    alert("Ошибка связи: " + err);
  });
}

function simulateExistingPaymentDirect(chatId) {
  if (confirm("Активировать этого бота в тестовом режиме (без реальной оплаты)?")) {
    confirmExistingPayment(chatId);
  }
}

/* ── AI Prompt Optimizer ── */
function optimizePrompt() {
  const instructionsArea = document.getElementById('bizInstructions');
  const optimizeBtn = document.getElementById('optimizeBtn');
  
  if (!instructionsArea || !optimizeBtn) return;
  
  const text = instructionsArea.value.trim();
  if (!text) {
    alert("Пожалуйста, сначала напишите хотя бы краткую инструкцию (например: 'продаем цемент, даем скидку 5% при покупке от 10 мешков')");
    return;
  }
  
  const originalText = optimizeBtn.textContent;
  optimizeBtn.textContent = "⌛ Оптимизация...";
  optimizeBtn.disabled = true;
  
  const data = {
    niche: selectedNiche,
    products: document.getElementById('bizProducts')?.value || '',
    tone: document.getElementById('bizTone')?.value || 'friendly',
    instructions: text
  };
  
  fetch('https://immensurable-paleaceous-marcella.ngrok-free.dev/webhook/optimize-prompt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  .then(res => res.json())
  .then(result => {
    optimizeBtn.textContent = originalText;
    optimizeBtn.disabled = false;
    
    if (result.success && result.optimizedPrompt) {
      instructionsArea.value = result.optimizedPrompt;
      alert("Робот успешно улучшил ваш промпт! Мы добавили SPIN-структуру продаж.");
    } else {
      alert("Не удалось оптимизировать промпт: " + (result.error || "Неизвестная ошибка"));
    }
  })
  .catch(err => {
    optimizeBtn.textContent = originalText;
    optimizeBtn.disabled = false;
    alert("Ошибка связи: " + err);
  });
}

/* ── Live Chat Simulator (Test Drive) ── */
let testdriveActiveChatId = '';

function startTestdrive(chatId, botName) {
  testdriveActiveChatId = chatId;
  const nameEl = document.getElementById('testdriveBotName');
  if (nameEl) nameEl.textContent = botName;
  
  // Clear messages and add greeting
  const chatMessages = document.getElementById('testdriveChatMessages');
  if (chatMessages) {
    chatMessages.innerHTML = `
      <div style="align-self: flex-start; background: #13131a; border: 1px solid var(--color-graphite-hairline); border-radius: 8px 8px 8px 0; padding: 10px 16px; color: var(--color-white); max-width: 80%; font-size: 13px;">
        Привет! Я готов притвориться покупателем на Авито. Напиши мне что-нибудь (например: "Привет, кроссовки в наличии?"), чтобы проверить мои ответы!
      </div>
    `;
  }
  
  switchView('testdrive');
}

function sendTestdriveMsg() {
  const input = document.getElementById('testdriveInput');
  const chatMessages = document.getElementById('testdriveChatMessages');
  
  if (!input || !chatMessages || !testdriveActiveChatId) return;
  
  const text = input.value.trim();
  if (!text) return;
  
  // Render user message
  const userMsg = document.createElement('div');
  userMsg.style.alignSelf = 'flex-end';
  userMsg.style.background = 'var(--gradient-iris)';
  userMsg.style.borderRadius = '8px 8px 0 8px';
  userMsg.style.padding = '10px 16px';
  userMsg.style.color = '#fff';
  userMsg.style.maxWidth = '80%';
  userMsg.style.fontSize = '13px';
  userMsg.textContent = text;
  chatMessages.appendChild(userMsg);
  
  input.value = '';
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  // Show typing indicator
  const typing = document.createElement('div');
  typing.style.alignSelf = 'flex-start';
  typing.style.background = '#13131a';
  typing.style.borderRadius = '8px 8px 8px 0';
  typing.style.padding = '10px 16px';
  typing.style.color = 'var(--color-ash-gray)';
  typing.style.fontSize = '12px';
  typing.style.fontFamily = 'var(--font-mono)';
  typing.textContent = "⌛ Думает...";
  chatMessages.appendChild(typing);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  fetch('https://immensurable-paleaceous-marcella.ngrok-free.dev/webhook/test-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chatId: testdriveActiveChatId,
      message: text
    })
  })
  .then(res => res.json())
  .then(result => {
    typing.remove();
    
    const botMsg = document.createElement('div');
    botMsg.style.alignSelf = 'flex-start';
    botMsg.style.background = '#13131a';
    botMsg.style.border = '1px solid var(--color-graphite-hairline)';
    botMsg.style.borderRadius = '8px 8px 8px 0';
    botMsg.style.padding = '10px 16px';
    botMsg.style.color = 'var(--color-white)';
    botMsg.style.maxWidth = '80%';
    botMsg.style.fontSize = '13px';
    
    if (result.success && result.reply) {
      botMsg.textContent = result.reply;
    } else {
      botMsg.textContent = "Не удалось связаться с сервером: " + (result.error || "Неизвестная ошибка");
      botMsg.style.color = 'var(--color-alarm-red)';
    }
    
    chatMessages.appendChild(botMsg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  })
  .catch(err => {
    typing.remove();
    const errorMsg = document.createElement('div');
    errorMsg.style.alignSelf = 'flex-start';
    errorMsg.style.background = '#13131a';
    errorMsg.style.border = '1px solid var(--color-graphite-hairline)';
    errorMsg.style.borderRadius = '8px 8px 8px 0';
    errorMsg.style.padding = '10px 16px';
    errorMsg.style.color = 'var(--color-alarm-red)';
    errorMsg.style.maxWidth = '80%';
    errorMsg.style.fontSize = '13px';
    errorMsg.textContent = "Ошибка связи: " + err;
    chatMessages.appendChild(errorMsg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
}

/* ── Wizard Flow ── */
let currentStep = 1;
const totalSteps = 5;
let selectedProduct = 'manager';
let selectedNiche = '';
let createdChatId = '';
let selectedAccountCount = null; // null = not chosen, 1 = ok, 2 = needs support

/* ── Account Count Selector ── */
function selectAccountCount(count) {
  selectedAccountCount = count;
  document.querySelectorAll('[data-accounts]').forEach(card => {
    const isSelected = parseInt(card.dataset.accounts) === count;
    card.style.borderColor = isSelected ? 'rgba(146,129,247,0.6)' : 'rgba(255,255,255,0.05)';
    card.style.background = isSelected ? 'rgba(146,129,247,0.08)' : 'rgba(255,255,255,0.01)';
    card.style.boxShadow = isSelected ? '0 0 16px rgba(146,129,247,0.15)' : 'none';
  });

  const warning = document.getElementById('accountsWarningBanner');
  if (warning) {
    warning.style.display = count === 2 ? 'block' : 'none';
  }
}

function selectProduct(prod) {
  selectedProduct = prod;
  document.querySelectorAll('.product-card').forEach(card => {
    const isSelected = card.dataset.product === prod;
    card.classList.toggle('selected', isSelected);
    card.style.opacity = isSelected ? '1' : '0.4';
  });
  
  const banner = document.getElementById('productWarningBanner');
  if (banner) {
    banner.style.display = prod !== 'manager' ? 'block' : 'none';
  }
}

function initNicheSelector() {
  document.querySelectorAll('.niche-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.niche-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedNiche = btn.dataset.niche;
      updateLivePreview();
    });
  });
}

/* ── Live Preview Manager Mockup ── */
function initLivePreviewListeners() {
  const bizNameInput = document.getElementById('bizName');
  const bizManagerInput = document.getElementById('bizManagerName');
  const bizToneSelect = document.getElementById('bizTone');

  if (bizNameInput) bizNameInput.addEventListener('input', updateLivePreview);
  if (bizManagerInput) bizManagerInput.addEventListener('input', updateLivePreview);
  if (bizToneSelect) bizToneSelect.addEventListener('change', updateLivePreview);

  updateLivePreview();
}

function updateLivePreview() {
  const name = document.getElementById('bizName')?.value || 'Без названия';
  const manager = document.getElementById('bizManagerName')?.value || 'Менеджер';
  const tone = document.getElementById('bizTone')?.value || 'friendly';
  const niche = selectedNiche || 'Другое';

  const labelEl = document.getElementById('previewBotManagerLabel');
  const msgEl = document.getElementById('previewBotWelcomeMsg');

  if (labelEl) {
    labelEl.textContent = `Автопилот (${manager}):`;
  }

  if (msgEl) {
    let welcome = '';
    if (tone === 'friendly') {
      welcome = `Здравствуйте! Вас приветствует ${manager}, менеджер магазина "${name}" (ниша: ${niche}). 😊 Да, всё в наличии! Какая модель вас интересует?`;
    } else if (tone === 'professional') {
      welcome = `Добрый день. Вас приветствует представитель компании "${name}" ${manager}. Да, указанная позиция в наличии. Какое количество планируете приобрести?`;
    } else {
      welcome = `Привет! На связи ${manager} из "${name}". 😎 Да, всё на складе, готово к отгрузке. Что подсказать по характеристикам?`;
    }
    msgEl.textContent = welcome;
  }
}

function wizardNext() {
  if (currentStep >= totalSteps) return;

  // Validation
  if (currentStep === 1) {
    if (selectedProduct !== 'manager') {
      const banner = document.getElementById('productWarningBanner');
      if (banner) shakeElement(banner);
      return;
    }
  }
  if (currentStep === 2) {
    // Check account count first
    if (selectedAccountCount === null) {
      const grid = document.getElementById('accountCountGrid');
      if (grid) shakeElement(grid);
      alert('Пожалуйста, укажите количество аккаунтов Авито на вашем номере');
      return;
    }
    if (selectedAccountCount === 2) {
      // Block further progress — send to support
      const warning = document.getElementById('accountsWarningBanner');
      if (warning) shakeElement(warning);
      return;
    }
    // Also validate niche
    if (!selectedNiche) {
      shakeElement(document.getElementById('nicheGrid'));
      return;
    }
  }

  // Submit to server when moving to last step (now step 4 to 5)
  if (currentStep === 4) {
    createBotOnServer();
  }

  currentStep++;
  updateWizardUI();
}

function wizardPrev() {
  if (currentStep <= 1) return;
  currentStep--;
  updateWizardUI();
}

function updateWizardUI() {
  document.querySelectorAll('.wizard-step').forEach(step => {
    step.classList.toggle('active', parseInt(step.dataset.step) === currentStep);
  });

  document.querySelectorAll('.wizard-progress-step').forEach(dot => {
    const step = parseInt(dot.dataset.step);
    dot.classList.remove('active', 'done');
    if (step === currentStep) dot.classList.add('active');
    if (step < currentStep) dot.classList.add('done');
  });

  // Hide live preview on the final step (Step 5 - Payment checkout)
  const previewContainer = document.getElementById('livePreviewContainer');
  if (previewContainer) {
    previewContainer.style.display = currentStep === 5 ? 'none' : 'block';
  }
}

function createBotOnServer() {
  const summary = document.getElementById('wizardSummary');
  summary.innerHTML = '<div style="text-align: center; color: var(--color-ash-gray); font-family: var(--font-mono);">Создание сессии в chats.sqlite...</div>';

  const data = {
    chatId: currentChatId, // Associate with current Telegram user ID!
    niche: selectedNiche,
    name: document.getElementById('bizName')?.value || 'Без названия',
    city: document.getElementById('bizCity')?.value || '',
    phone: document.getElementById('bizPhone')?.value || '',
    products: document.getElementById('bizProducts')?.value || '',
    tone: document.getElementById('bizTone')?.value || 'friendly',
    managerName: document.getElementById('bizManagerName')?.value || 'Менеджер',
    hours: document.getElementById('bizHours')?.value || 'Круглосуточно',
    instructions: document.getElementById('bizInstructions')?.value || ''
  };

  fetch('https://immensurable-paleaceous-marcella.ngrok-free.dev/webhook/create-bot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  .then(res => res.json())
  .then(result => {
    if (result.success) {
      createdChatId = result.chatId;
      updateWizardSummary(data, result.chatId);
    } else {
      summary.innerHTML = `<div style="color: var(--color-alarm-red); font-family: var(--font-mono);">Ошибка: ${result.error}</div>`;
    }
  })
  .catch(err => {
    summary.innerHTML = `<div style="color: var(--color-alarm-red); font-family: var(--font-mono);">Ошибка связи: ${err}</div>`;
  });
}

function updateWizardSummary(data, chatId) {
  const summary = document.getElementById('wizardSummary');
  summary.innerHTML = `
    <div style="font-family: var(--font-mono); font-size: 13px; color: var(--color-ash-gray); margin-bottom: 16px;">// Бот создан в базе данных</div>
    <div style="display: grid; gap: 12px; margin-bottom: 24px;">
      <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(146,129,247,0.1);">
        <span style="color: var(--color-ash-gray); font-size: 14px;">Ниша</span>
        <span style="color: var(--color-iris-violet-glow); font-size: 14px; font-weight: 500;">${data.niche}</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(146,129,247,0.1);">
        <span style="color: var(--color-ash-gray); font-size: 14px;">Имя бота</span>
        <span style="color: var(--color-bone-white); font-size: 14px; font-weight: 500;">${data.name}</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(146,129,247,0.1);">
        <span style="color: var(--color-ash-gray); font-size: 14px;">ID Сессии</span>
        <span style="color: var(--color-iris-violet-glow); font-size: 14px; font-family: var(--font-mono); font-weight: 500;">${chatId}</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(146,129,247,0.1);">
        <span style="color: var(--color-ash-gray); font-size: 14px;">Статус оплаты</span>
        <span id="paymentStatusBadge" style="color: var(--color-alarm-red); font-size: 13px; font-family: var(--font-mono); font-weight: 600;">❌ НЕ ОПЛАЧЕН</span>
      </div>
    </div>

    <div id="paymentArea" style="background: rgba(255,255,255,0.02); border: 1px solid var(--color-graphite-hairline); border-radius: 8px; padding: 20px; text-align: center;">
      <div style="font-size: 14px; color: var(--color-white); margin-bottom: 12px; font-weight: 500;">Стоимость активации: 6 290 ₽ / мес</div>
      
      <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px;">
        <form action="https://yoomoney.ru/quickpay/confirm.xml" method="POST" target="_blank" style="margin: 0; width: 100%;">
          <input type="hidden" name="receiver" value="4100119556996975">
          <input type="hidden" name="quickpay-form" value="button">
          <input type="hidden" name="targets" value="Подписка MAJORKA LM (Бот: ${data.name})">
          <input type="hidden" name="paymentType" value="AC">
          <input type="hidden" name="sum" value="6290">
          <input type="hidden" name="label" value="${chatId}">
          <button type="submit" class="btn btn-violet" style="width: 100%; justify-content: center; font-weight: 600;">
            💳 Оплатить через ЮMoney (6 290 ₽)
          </button>
        </form>
        <div style="display: flex; gap: 8px; width: 100%;">
          <button onclick="simulateWizardPayment('${chatId}')" class="btn btn-ghost" style="flex: 1; font-size: 11px; padding: 8px;">
            ✓ Подтвердить платеж
          </button>
          <button onclick="simulateWizardPaymentDirect('${chatId}')" class="btn btn-ghost" style="font-size: 11px; padding: 8px;" title="Тестовая активация без списания средств">
            Быстрый тест
          </button>
        </div>
      </div>
      <div style="font-size: 11px; color: var(--color-iron); line-height: 1.4;">
        После нажатия кнопки ЮMoney откроется окно безопасной оплаты. Вы можете также провести тестовую активацию кнопкой «Быстрый тест».
      </div>
    </div>
  `;
  
  const finishBtn = document.getElementById('wizardFinishBtn');
  if (finishBtn) {
    finishBtn.style.display = 'none';
  }
}

function simulateWizardPaymentDirect(chatId) {
  simulateWizardPayment(chatId);
}

function simulateWizardPayment(chatId) {
  const paymentArea = document.getElementById('paymentArea');
  const badge = document.getElementById('paymentStatusBadge');
  
  paymentArea.innerHTML = '<div style="color: var(--color-ash-gray); font-family: var(--font-mono);">Проверка транзакции...</div>';

  fetch('https://immensurable-paleaceous-marcella.ngrok-free.dev/webhook/pay-bot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatId: chatId })
  })
  .then(res => res.json())
  .then(result => {
    if (result.success) {
      badge.textContent = '✅ ОПЛАЧЕН & АКТИВИРОВАН';
      badge.style.color = 'var(--color-pulse-green)';
      
      paymentArea.innerHTML = `
        <div style="color: var(--color-pulse-green); font-size: 15px; font-weight: 600; margin-bottom: 8px;">🎉 Оплата успешно зачислена!</div>
        <div style="color: var(--color-ash-gray); font-size: 13px; line-height: 1.5;">
          Ваш бот запущен на сервере и готов к работе.
        </div>
      `;
      
      const finishBtn = document.getElementById('wizardFinishBtn');
      if (finishBtn) {
        finishBtn.style.display = 'inline-flex';
      }
    } else {
      paymentArea.innerHTML = `<div style="color: var(--color-alarm-red); font-family: var(--font-mono);">Ошибка оплаты: ${result.error}</div>`;
    }
  })
  .catch(err => {
    paymentArea.innerHTML = `<div style="color: var(--color-alarm-red); font-family: var(--font-mono);">Ошибка связи: ${err}</div>`;
  });
}

/* ── Utility: Shake ── */
function shakeElement(el) {
  el.style.animation = 'none';
  el.offsetHeight;
  el.style.animation = 'shake 0.4s ease';
  setTimeout(() => { el.style.animation = ''; }, 400);
}
