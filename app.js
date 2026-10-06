/**
 * RADD | رَدّ — Master Timeline Runtime Engine
 * يعتمد كلياً على التايم لاين والمصدر الصوتي المركزي: AudioController
 * زمن العرض: 75 ثانية موزعة على 8 مشاهد متسلسلة بدقة سينمائية
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. تعريف التايم لاين الرئيسي الشامل
  const TOTAL_DURATION = 75.0; // 75 ثانية

  const timeline = [
    {
      id: 1,
      name: "البداية الإنسانية",
      start: 0.0,
      end: 11.0,
      image: "assets/images/scene1.jpg",
      audioSchedule: [
        { id: "child_call", start: 0.6, end: 4.0 },
        { id: "father_later", start: 4.1, end: 6.3 },
        { id: "intro_narrator", start: 6.5, end: 11.0 }
      ],
      subtitle: "بعض اللحظات لا تضيع لأننا لا نهتم... بل لأننا لم نستطع الرد في وقتها.",
      dialogueTriggers: [
        { elementId: 'chipChild1', time: 0.6 },
        { elementId: 'chipFather1', time: 4.1 }
      ]
    },
    {
      id: 2,
      name: "جوهر المشكلة",
      start: 11.0,
      end: 22.0,
      image: "assets/images/scene2.jpg",
      audioSchedule: [
        { id: "problem_narrator", start: 11.2, end: 22.0 }
      ],
      subtitle: "المشكلة ليست مجرد شاشة هاتف. المشكلة: ماذا يحدث للتفاعل بعد أن يتعذر الرد؟",
      dialogueTriggers: []
    },
    {
      id: 3,
      name: "فرصة تواصل",
      start: 22.0,
      end: 34.0,
      image: null,
      audioSchedule: [], // الصوت متزامن ومخصص لظهور الواجهة دون أصوات اصطناعية إضافية
      subtitle: "فرصة تواصل — حفظ محاولة التواصل بلمسة واحدة تصون الود.",
      dialogueTriggers: []
    },
    {
      id: 4,
      name: "حفظ الفرصة دون مراقبة",
      start: 34.0,
      end: 46.0,
      image: null,
      audioSchedule: [
        { id: "privacy_narrator", start: 34.5, end: 46.0 }
      ],
      subtitle: "رَدّ لا يراقب الأسرة، لا يسجل صوتاً ولا يفتح كاميرا.. بل يساعدها على تذكّر العودة.",
      dialogueTriggers: []
    },
    {
      id: 5,
      name: "استعادة اللحظة",
      start: 46.0,
      end: 57.0,
      image: "assets/images/scene5.jpg",
      audioSchedule: [
        { id: "father_restore", start: 46.5, end: 49.5 }
        /*
          ======================================================================
          TODO: إضافة ملف صوت الطفل الثاني لاحقًا:
          العبارة: "رسمت بيتنا... وإحنا كلنا مع بعض!"
          الملف الصوتي المستقبلي: assets/audio/رسمت_بيتنا.mp3
          نقطة البدء المقترحة: 49.6s إلى 53.0s
          ملاحظة: حاليًا تُعرض العبارة بصريًا على الشاشة بدقة دون كسر التزامن الزمني.
          ======================================================================
        */
      ],
      subtitle: "التفاعل الذي كان معرضًا للضياع… عاد من جديد.",
      dialogueTriggers: [
        { elementId: 'chipFather5', time: 46.5 },
        { elementId: 'chipChild5', time: 49.5 }
      ]
    },
    {
      id: 6,
      name: "القياس الإيجابي",
      start: 57.0,
      end: 65.0,
      image: null,
      audioSchedule: [],
      subtitle: "رَدّ لا يقيس جودة الوالد… بل يقيس استمرارية التواصل (بيانات تجريبية للنموذج الأولي).",
      dialogueTriggers: []
    },
    {
      id: 7,
      name: "مسار التواصل الأسري",
      start: 65.0,
      end: 72.0,
      image: "assets/images/scene7.jpg",
      audioSchedule: [],
      subtitle: "مسار التواصل الأسري: محاولة تواصل ← تعذر الرد ← حفظ الفرصة ← العودة ← استعادة التفاعل ← علاقة أقوى.",
      dialogueTriggers: []
    },
    {
      id: 8,
      name: "فرصة ثانية للتواصل",
      start: 72.0,
      end: 75.0,
      image: null,
      audioSchedule: [],
      subtitle: "إذا لم تستطع أن تكون حاضرًا الآن… لا تجعل فرصة التواصل تختفي. رَدّ | فرصة ثانية للتواصل.",
      dialogueTriggers: []
    }
  ];

  // 2. تهيئة متحكم الصوت المركزي
  const audioCtrl = new window.AudioController();

  // 3. حالة المشغل
  let currentTime = 0.0;
  let isPlaying = false;
  let animationFrameId = null;
  let lastTimestamp = null;

  // 4. عناصر واجهة المستخدم
  const cinemaFrame = document.getElementById('cinemaFrame');
  const sceneLayers = document.querySelectorAll('.scene-layer');
  const sceneTabs = document.querySelectorAll('.scene-nav-tab');
  const subtitleText = document.getElementById('subtitleText');
  const progressFill = document.getElementById('progressFill');
  const progressWrapper = document.getElementById('progressWrapper');
  const timeReadout = document.getElementById('timeReadout');
  const playPauseBtn = document.getElementById('playPauseBtn');
  const playIcon = document.getElementById('playIcon');
  const restartBtn = document.getElementById('restartBtn');
  const muteBtn = document.getElementById('muteBtn');
  const volumeIcon = document.getElementById('volumeIcon');
  const volumeSlider = document.getElementById('volumeSlider');
  const fullscreenBtn = document.getElementById('fullscreenBtn');
  const dockFullscreenBtn = document.getElementById('dockFullscreenBtn');
  const openDocsBtn = document.getElementById('openDocsBtn');
  const juryDrawer = document.getElementById('juryDrawer');
  const closeDrawerBtn = document.getElementById('closeDrawerBtn');
  const btnSaveOpportunity = document.getElementById('btnSaveOpportunity');
  const ambientGlow = document.getElementById('ambientGlow');

  // إنشاء علامات المشاهد على شريط التقدم
  const sceneNotches = document.getElementById('sceneNotches');
  if (sceneNotches) {
    sceneNotches.innerHTML = '';
    timeline.forEach(sc => {
      const notch = document.createElement('div');
      notch.className = 'scene-notch';
      // RTL: right offset
      const rightPercent = (sc.start / TOTAL_DURATION) * 100;
      notch.style.cssText = `position: absolute; right: ${rightPercent}%; top: -2px; width: 2px; height: 11px; background: rgba(255,255,255,0.25); pointer-events: none;`;
      sceneNotches.appendChild(notch);
    });
  }

  /**
   * استخراج المشهد النشط بناءً على الوقت الحالي
   */
  function getCurrentScene(time) {
    for (let i = 0; i < timeline.length; i++) {
      if (time >= timeline[i].start && time < timeline[i].end) {
        return timeline[i];
      }
    }
    return timeline[timeline.length - 1];
  }

  /**
   * تحديث الحالة المرئية والصوتية للتوقيت الحالي
   */
  function render(time) {
    const activeScene = getCurrentScene(time);

    // 1. تحديث طبقات المشاهد النشطة
    sceneLayers.forEach(layer => {
      const sceneNum = parseInt(layer.dataset.scene, 10);
      if (sceneNum === activeScene.id) {
        layer.classList.add('active');
      } else {
        layer.classList.remove('active');
      }
    });

    // 2. تحديث تبويبات المشاهد
    sceneTabs.forEach(tab => {
      const targetNum = parseInt(tab.dataset.target, 10);
      tab.classList.toggle('active', targetNum === activeScene.id);
    });

    // 3. تحديث شريط الترجمة/النص
    if (subtitleText && activeScene.subtitle) {
      subtitleText.textContent = activeScene.subtitle;
    }

    // 4. تحديث حوارات المشهد المتزامنة
    timeline.forEach(sc => {
      if (sc.dialogueTriggers) {
        sc.dialogueTriggers.forEach(trig => {
          const el = document.getElementById(trig.elementId);
          if (el) {
            if (time >= trig.time && sc.id === activeScene.id) {
              el.classList.add('visible');
            } else {
              el.classList.remove('visible');
            }
          }
        });
      }
    });

    // 5. مزامنة الصوت عبر AudioController
    audioCtrl.syncWithTimeline(time, activeScene.audioSchedule, isPlaying);

    // 6. تحديث شريط التقدم (RTL: تعبئة من اليمين)
    const percent = Math.min((time / TOTAL_DURATION) * 100, 100);
    progressFill.style.width = `${percent}%`;

    // 7. تحديث عداد الوقت
    const formatTime = (sec) => {
      const m = Math.floor(sec / 60).toString().padStart(2, '0');
      const s = Math.floor(sec % 60).toString().padStart(2, '0');
      return `${m}:${s}`;
    };
    timeReadout.textContent = `${formatTime(time)} / ${formatTime(TOTAL_DURATION)}`;

    // 8. لمسات إضاءة ناعمة متجاوبة مع المشهد
    if (activeScene.id === 3 || activeScene.id === 4) {
      ambientGlow.style.background = 'radial-gradient(circle, rgba(108, 92, 231, 0.16) 0%, rgba(162, 155, 254, 0.05) 50%, transparent 70%)';
    } else if (activeScene.id === 5 || activeScene.id === 7) {
      ambientGlow.style.background = 'radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, rgba(245, 158, 11, 0.06) 50%, transparent 70%)';
    } else {
      ambientGlow.style.background = 'radial-gradient(circle, rgba(108, 92, 231, 0.09) 0%, rgba(245, 158, 11, 0.03) 45%, transparent 70%)';
    }
  }

  /**
   * حلقة التحديث الزمني المستمر
   */
  function tick(timestamp) {
    if (!isPlaying) return;

    if (!lastTimestamp) lastTimestamp = timestamp;
    const delta = (timestamp - lastTimestamp) / 1000.0;
    lastTimestamp = timestamp;

    currentTime += delta;

    if (currentTime >= TOTAL_DURATION) {
      currentTime = TOTAL_DURATION;
      pause();
      render(currentTime);
      return;
    }

    render(currentTime);
    animationFrameId = requestAnimationFrame(tick);
  }

  /**
   * تشغيل العرض
   */
  function play() {
    isPlaying = true;
    playIcon.textContent = '⏸';
    lastTimestamp = null;
    animationFrameId = requestAnimationFrame(tick);
  }

  /**
   * إيقاف مؤقت
   */
  function pause() {
    isPlaying = false;
    playIcon.textContent = '▶';
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    lastTimestamp = null;
    audioCtrl.pauseAll();
  }

  /**
   * تبديل التشغيل / الإيقاف
   */
  function togglePlay() {
    if (isPlaying) {
      pause();
    } else {
      if (currentTime >= TOTAL_DURATION) {
        currentTime = 0.0;
        audioCtrl.stopAll();
      }
      play();
    }
  }

  /**
   * إعادة التشغيل من البداية
   */
  function restart() {
    pause();
    currentTime = 0.0;
    audioCtrl.stopAll();
    render(0.0);
    play();
  }

  /**
   * القفز إلى وقت محدد (Seek)
   */
  function seekTo(targetTime) {
    currentTime = Math.max(0.0, Math.min(TOTAL_DURATION, targetTime));
    render(currentTime);
  }

  // أحداث أزرار التحكم
  playPauseBtn.addEventListener('click', togglePlay);
  restartBtn.addEventListener('click', restart);

  // شريط التقدم التفاعلي (RTL: النقر من اليمين إلى اليسار)
  progressWrapper.addEventListener('click', (e) => {
    const rect = progressWrapper.getBoundingClientRect();
    const clickFromRight = rect.right - e.clientX;
    const ratio = Math.max(0, Math.min(1, clickFromRight / rect.width));
    seekTo(ratio * TOTAL_DURATION);
  });

  // التنقل السريع بين المشاهد
  sceneTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetNum = parseInt(tab.dataset.target, 10);
      const targetScene = timeline.find(sc => sc.id === targetNum);
      if (targetScene) {
        seekTo(targetScene.start + 0.05);
      }
    });
  });

  // التحكم بالصوت والكتم
  muteBtn.addEventListener('click', () => {
    const isMuted = audioCtrl.toggleMute();
    volumeIcon.textContent = isMuted ? '🔇' : '🔊';
  });

  volumeSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    audioCtrl.setVolume(val);
    volumeIcon.textContent = val === 0 ? '🔇' : '🔊';
  });

  // ملء الشاشة
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      cinemaFrame.requestFullscreen().catch(err => {
        console.warn(`Fullscreen error: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  }

  if (fullscreenBtn) fullscreenBtn.addEventListener('click', toggleFullscreen);
  if (dockFullscreenBtn) dockFullscreenBtn.addEventListener('click', toggleFullscreen);

  // نافذة وثائق التحكيم
  if (openDocsBtn) {
    openDocsBtn.addEventListener('click', () => {
      juryDrawer.classList.toggle('open');
    });
  }

  if (closeDrawerBtn) {
    closeDrawerBtn.addEventListener('click', () => {
      juryDrawer.classList.remove('open');
    });
  }

  // تجربة زر حفظ فرصة التواصل داخل الهاتف التفاعلي
  if (btnSaveOpportunity) {
    btnSaveOpportunity.addEventListener('click', () => {
      btnSaveOpportunity.style.background = 'linear-gradient(135deg, #10B981, #059669)';
      btnSaveOpportunity.innerHTML = '<span>✓</span> <span>تم حفظ فرصة التواصل</span>';
      setTimeout(() => {
        btnSaveOpportunity.style.background = 'linear-gradient(135deg, #6C5CE7, #533FE6)';
        btnSaveOpportunity.innerHTML = '<span class="action-icon">💾</span> <span>حفظ فرصة التواصل</span>';
      }, 2400);
    });
  }

  // اختصارات لوحة المفاتيح: المسافة للتشغيل والإيقاف، F لملء الشاشة
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      togglePlay();
    } else if (e.code === 'KeyF') {
      toggleFullscreen();
    }
  });

  // الرندرة الأولية عند التحميل
  render(0.0);
});
