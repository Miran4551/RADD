(() => {
  const STORAGE_KEY = 'radd_demo_state_v2';
  const CHANNEL_NAME = 'radd-family-demo';
  const channel = 'BroadcastChannel' in window ? new BroadcastChannel(CHANNEL_NAME) : null;

  const typeMeta = {
    show: {label:'أريد أن أريه شيئًا', short:'يريد أن يريك شيئًا', sample:'بابا.. شوف رسمتي!'},
    talk: {label:'أريد أن أتحدث معه', short:'يريد أن يتحدث معك', sample:'بابا، عندي شيء أريد أقوله لك.'},
    help: {label:'أحتاج مساعدته', short:'يحتاج مساعدتك', sample:'بابا، ممكن تساعدني؟'},
    share: {label:'أريد أن أشاركه شيئًا', short:'يريد أن يشاركك شيئًا', sample:'بابا، عندي خبر حلو!'}
  };

  const els = {
    interactionTypes: document.getElementById('interactionTypes'),
    childMessage: document.getElementById('childMessage'),
    send: document.getElementById('sendOpportunityBtn'),
    childDelivery: document.getElementById('childDeliveryState'),
    opportunityCard: document.getElementById('opportunityCard'),
    returnActions: document.getElementById('returnActions'),
    returnNow: document.getElementById('returnNowBtn'),
    reminderCard: document.getElementById('reminderCard'),
    reminderText: document.getElementById('reminderText'),
    demoRemind: document.getElementById('demoRemindBtn'),
    recoveryCard: document.getElementById('recoveryCard'),
    recoveryText: document.getElementById('recoveryText'),
    badge: document.getElementById('notificationBadge'),
    liveStatus: document.getElementById('liveStatusText'),
    liveSub: document.getElementById('liveStatusSubtext'),
    statusIcon: document.getElementById('statusIcon'),
    recoveredCount: document.getElementById('recoveredCount'),
    unrecoveredCount: document.getElementById('unrecoveredCount'),
    avgLatency: document.getElementById('avgLatency'),
    toast: document.getElementById('toast'),
    reset: document.getElementById('resetDemoBtn'),
    help: document.getElementById('helpBtn'),
    modal: document.getElementById('helpModal'),
    closeModal: document.getElementById('closeHelpBtn')
  };

  let selectedType = 'show';
  let state = loadState();

  function defaultState() {
    return {
      familyCode: 'RADD-2841',
      status: 'idle',
      opportunity: null,
      history: [],
      scheduledFor: null
    };
  }

  function loadState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || defaultState();
    } catch {
      return defaultState();
    }
  }

  function saveState(next, announce = true) {
    state = next;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (announce && channel) channel.postMessage({ type:'state', state });
    render();
  }

  function reset() {
    saveState(defaultState());
    els.childMessage.value = '';
    selectedType = 'show';
    document.querySelectorAll('.interaction-type').forEach((btn,i)=>btn.classList.toggle('active',i===0));
    toast('تمت إعادة التجربة إلى الحالة الأولى.');
  }

  function toast(message) {
    els.toast.textContent = message;
    els.toast.classList.remove('hidden');
    clearTimeout(window.__raddToast);
    window.__raddToast = setTimeout(()=>els.toast.classList.add('hidden'), 2600);
  }

  function fmtTime(ms) {
    if (!ms) return '—';
    const sec = Math.max(0, Math.round(ms/1000));
    if (sec < 60) return sec + ' ث';
    const min = Math.round(sec/60);
    return min + ' د';
  }

  function selectedMessage() {
    return (els.childMessage.value || '').trim() || typeMeta[selectedType].sample;
  }

  function sendOpportunity() {
    const now = Date.now();
    const opportunity = {
      id: 'opp-' + now,
      sender: 'محمد',
      type: selectedType,
      typeLabel: typeMeta[selectedType].short,
      message: selectedMessage(),
      createdAt: now,
      deliveredAt: now
    };
    saveState({
      ...state,
      status: 'waiting_parent',
      opportunity,
      scheduledFor: null
    });
    toast('تم إرسال فرصة التواصل إلى جهاز الأب.');
  }

  function returnNow() {
    if (!state.opportunity) return;
    const now = Date.now();
    const historyItem = {
      ...state.opportunity,
      returnedAt: now,
      latencyMs: now - state.opportunity.createdAt
    };
    saveState({
      ...state,
      status: 'recovered',
      history: [...state.history, historyItem],
      scheduledFor: null
    });
    toast('عاد الأب إلى فرصة التواصل ❤️');
  }

  function scheduleReturn(choice) {
    if (!state.opportunity) return;
    const now = Date.now();
    const mins = choice === 'end' ? null : Number(choice);
    const scheduledFor = mins ? now + mins*60*1000 : null;

    saveState({
      ...state,
      status: 'scheduled',
      scheduledFor
    });

    toast(choice === 'end'
      ? 'حُفظت الفرصة إلى أن ينتهي الأب من انشغاله.'
      : 'حُفظت الفرصة وسيأتي التذكير في الوقت المحدد.');
  }

  function demoReminder() {
    if (!state.opportunity || state.status !== 'scheduled') return;
    saveState({...state, status:'reminder_due'});
    toast('حان الآن وقت التذكير التجريبي.');
  }

  function openModal(){ els.modal.classList.remove('hidden'); }
  function closeModal(){ els.modal.classList.add('hidden'); }

  function renderChild() {
    const status = state.status;
    if (status === 'idle') {
      els.childDelivery.className = 'delivery-state idle-state';
      els.childDelivery.innerHTML = '<div class="state-icon">○</div><div><strong>لم تُرسل فرصة بعد</strong><span>عندما ترسل، ستظهر فورًا في جهاز الأب في هذه التجربة.</span></div>';
      return;
    }

    if (status === 'waiting_parent') {
      els.childDelivery.className = 'delivery-state sent';
      els.childDelivery.innerHTML = '<div class="state-icon">✓</div><div><strong>تم التسليم للأب</strong><span>رَدّ حفظ فرصة التواصل وأظهرها الآن في صندوق الأب.</span></div>';
      return;
    }

    if (status === 'scheduled') {
      els.childDelivery.className = 'delivery-state sent';
      els.childDelivery.innerHTML = '<div class="state-icon">⏳</div><div><strong>الأب اختار العودة لاحقًا</strong><span>لم تختفِ اللحظة؛ بقيت محفوظة حتى وقت العودة.</span></div>';
      return;
    }

    if (status === 'reminder_due' || status === 'recovered') {
      els.childDelivery.className = 'delivery-state sent';
      els.childDelivery.innerHTML = status === 'recovered'
        ? '<div class="state-icon">♥</div><div><strong>رجع أبي للتواصل</strong><span>تمت استعادة فرصة التواصل وتسجيل لحظة العودة.</span></div>'
        : '<div class="state-icon">🔔</div><div><strong>حان وقت العودة</strong><span>رَدّ نبّه الأب لأن فرصة محمد ما زالت محفوظة.</span></div>';
    }
  }

  function renderParent() {
    const opp = state.opportunity;
    const active = !!opp && ['waiting_parent','scheduled','reminder_due'].includes(state.status);

    els.badge.textContent = state.status === 'waiting_parent' ? '1' : '0';

    if (!opp) {
      els.opportunityCard.className = 'opportunity-card empty-opportunity';
      els.opportunityCard.innerHTML = '<div class="empty-state"><div class="empty-illustration">💜</div><strong>لا توجد فرصة جديدة</strong><span>عندما يرسل محمد فرصة، ستظهر هنا مع تنبيه واضح.</span></div>';
      els.returnActions.classList.add('hidden');
      els.reminderCard.classList.add('hidden');
      els.recoveryCard.classList.add('hidden');
      return;
    }

    if (active) {
      const meta = typeMeta[opp.type] || typeMeta.show;
      els.opportunityCard.className = 'opportunity-card pending';
      els.opportunityCard.innerHTML = '<div class="opp-header"><span class="opp-label">🔔 فرصة تواصل جديدة</span><span class="opp-time">وصلت الآن</span></div>' +
        '<div class="opp-person"><div class="opp-person-avatar">👦🏻</div><div><strong>محمد</strong><span>' + meta.short + '</span></div></div>' +
        '<div class="opp-message">«' + escapeHtml(opp.message) + '»</div>' +
        '<div class="opp-type-pill">نوع التفاعل: ' + meta.label + '</div>';
      els.returnActions.classList.remove('hidden');
    } else {
      els.returnActions.classList.add('hidden');
    }

    if (state.status === 'scheduled') {
      els.reminderCard.classList.remove('hidden');
      els.reminderText.textContent = state.scheduledFor
        ? 'سيذكّرك رَدّ بالعودة إلى فرصة محمد. موعد التذكير: ' + new Date(state.scheduledFor).toLocaleTimeString('ar-SA',{hour:'2-digit',minute:'2-digit'})
        : 'ستظل الفرصة محفوظة حتى ينتهي الأب من انشغاله.';
    } else {
      els.reminderCard.classList.add('hidden');
    }

    if (state.status === 'recovered') {
      els.recoveryCard.classList.remove('hidden');
      const latest = state.history[state.history.length - 1];
      els.recoveryText.textContent = latest ? 'تمت العودة بعد ' + fmtTime(latest.latencyMs) + ' من إنشاء الفرصة.' : 'عاد الأب إلى فرصة التواصل.';
    } else {
      els.recoveryCard.classList.add('hidden');
    }
  }

  function renderStatus() {
    const messages = {
      idle: ['◌','بانتظار أول فرصة تواصل','هذه الشاشة توضّح كيف تنتقل الفرصة من الطفل إلى الأب.'],
      waiting_parent: ['!','تم إرسال فرصة التواصل إلى الأب','يمكن للأب الآن اختيار العودة فورًا أو حفظها لوقت مناسب.'],
      scheduled: ['⏳','تم حفظ فرصة التواصل للعودة لاحقًا','الفرصة لم تختفِ؛ بقيت مرتبطة بالأب حتى وقت العودة.'],
      reminder_due: ['🔔','حان وقت العودة إلى محمد','ظهر التذكير لأن فرصة التواصل ما زالت بحاجة إلى إغلاق حلقتها.'],
      recovered: ['♥','تمت استعادة فرصة التواصل','هذه هي اللحظة التي يقيسها رَدّ: هل عادت فرصة التواصل فعلًا؟']
    };
    const msg = messages[state.status] || messages.idle;
    els.statusIcon.textContent = msg[0];
    els.liveStatus.textContent = msg[1];
    els.liveSub.textContent = msg[2];

    const recovered = state.history.length;
    const unrecovered = state.history.filter(x => !x.returnedAt).length;
    const avg = recovered ? Math.round(state.history.reduce((s,x)=>s+x.latencyMs,0)/recovered) : null;
    els.recoveredCount.textContent = recovered;
    els.unrecoveredCount.textContent = unrecovered;
    els.avgLatency.textContent = avg ? fmtTime(avg) : '—';
  }

  function render() {
    renderChild();
    renderParent();
    renderStatus();
  }

  function escapeHtml(value) {
    return value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  }

  document.querySelectorAll('.interaction-type').forEach(btn => {
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('.interaction-type').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      selectedType = btn.dataset.type;
    });
  });

  els.send.addEventListener('click', sendOpportunity);
  els.returnNow.addEventListener('click', returnNow);
  document.querySelectorAll('.later-row button').forEach(btn=>{
    btn.addEventListener('click',()=>scheduleReturn(btn.dataset.delay));
  });
  els.demoRemind.addEventListener('click', demoReminder);
  els.reset.addEventListener('click', reset);
  els.help.addEventListener('click', openModal);
  els.closeModal.addEventListener('click', closeModal);
  els.modal.addEventListener('click', e=>{if(e.target===els.modal)closeModal()});

  if (channel) {
    channel.addEventListener('message', e => {
      if (e.data?.type === 'state' && e.data.state) {
        state = e.data.state;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        render();
      }
    });
  }

  window.addEventListener('storage', e => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try { state = JSON.parse(e.newValue); render(); } catch {}
    }
  });

  setInterval(()=>{
    if (state.status === 'scheduled' && state.scheduledFor && Date.now() >= state.scheduledFor) {
      saveState({...state, status:'reminder_due'});
      toast('حان الآن وقت العودة إلى فرصة التواصل.');
    }
  },1000);

  render();
})();