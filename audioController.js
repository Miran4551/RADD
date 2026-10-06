/**
 * RADD | رَدّ — Central Audio Controller
 * المسؤول عن: preload, play, pause, seek, stop, currentTime, scene synchronization, volume, mute, replay
 * المصدر الوحيد للصوت: ملفات MP3 الفعلية (بدون توليد صوتي صناعي أو Web Audio TTS).
 */

class AudioController {
  constructor() {
    this.audioClips = {};
    this.currentPlayingId = null;
    this.volume = 1.0;
    this.isMuted = false;
    this.isInitialized = false;

    // تعريف ملفات الصوت الفعلية
    this.manifest = [
      {
        id: 'child_call',
        title: 'صوت الطفل محمد (بابا شوف رسمتي)',
        sources: [
          'assets/audio/بابا... شوف رسمتي.mp3',
          'assets/audio/child_call.mp3'
        ],
        duration: 6.35
      },
      {
        id: 'father_later',
        title: 'صوت الأب (بعد شوي يا حبيبي)',
        sources: [
          'assets/audio/بعد شوي يا حبيبي.mp3',
          'assets/audio/father_later.mp3'
        ],
        duration: 1.57
      },
      {
        id: 'intro_narrator',
        title: 'الراوي: في زحام اليوم',
        sources: [
          'assets/audio/في زحام اليوم.mp3',
          'assets/audio/intro.mp3'
        ],
        duration: 17.24
      },
      {
        id: 'problem_narrator',
        title: 'الراوي: المشكلة الحقيقية',
        sources: [
          'assets/audio/المشكلة الحقيقية.mp3',
          'assets/audio/problem.mp3'
        ],
        duration: 27.56
      },
      {
        id: 'privacy_narrator',
        title: 'الراوي: لا يراقب الأسرة',
        sources: [
          'assets/audio/لا يراقب الاسرة.mp3',
          'assets/audio/privacy.mp3'
        ],
        duration: 25.16
      },
      {
        id: 'father_restore',
        title: 'صوت الأب: ورني وش كنت تبي توريني',
        sources: [
          'assets/audio/ورني وش كنت تبي توريني.mp3',
          'assets/audio/father_restore.mp3'
        ],
        duration: 2.77
      }
      /*
        TODO: إضافة ملف صوت الطفل الثاني لاحقًا:
        العبارة: "رسمت بيتنا... وإحنا كلنا مع بعض!"
        الملف المتوقع: assets/audio/رسمت_بيتنا.mp3
        ملاحظة: حاليًا تُعرض العبارة بصريًا على الشاشة في المشهد 5 دون كسر التزامن.
      */
    ];

    this.init();
  }

  /**
   * تحميل مسبق لملفات الصوت مع مسارات بديلة
   */
  init() {
    this.manifest.forEach(item => {
      const audio = new Audio();
      audio.preload = 'auto';

      // تجربة المسار الأول (العربي المرمّز) ثم المسار البديل عند الخطأ
      let sourceIndex = 0;
      audio.src = encodeURI(item.sources[sourceIndex]);

      audio.addEventListener('error', () => {
        if (sourceIndex < item.sources.length - 1) {
          sourceIndex++;
          audio.src = encodeURI(item.sources[sourceIndex]);
          audio.load();
        }
      });

      this.audioClips[item.id] = {
        meta: item,
        element: audio,
        isPlaying: false
      };
    });

    this.isInitialized = true;
  }

  /**
   * إيقاف كل المقاطع الصوتية الجارية فوراً لمنع التداخل
   */
  stopAll() {
    Object.values(this.audioClips).forEach(clip => {
      try {
        clip.element.pause();
        clip.element.currentTime = 0;
        clip.isPlaying = false;
      } catch (e) {
        // تجاهل أي استثناء إيقاف
      }
    });
    this.currentPlayingId = null;
  }

  /**
   * إيقاف مؤقت دون إعادة ضبط الوقت
   */
  pauseAll() {
    Object.values(this.audioClips).forEach(clip => {
      try {
        if (!clip.element.paused) {
          clip.element.pause();
          clip.isPlaying = false;
        }
      } catch (e) {}
    });
  }

  /**
   * تشغيل مقطع محدد مع تعيين نقطة البدء (offset)
   */
  playClip(clipId, offsetSec = 0) {
    const clip = this.audioClips[clipId];
    if (!clip) return;

    // إذا كان المقطع الحالي مختلفاً، أوقف المقاطع السابقة لمنع تداخل أصوات الراوي
    if (this.currentPlayingId && this.currentPlayingId !== clipId) {
      const prev = this.audioClips[this.currentPlayingId];
      if (prev && !prev.element.paused) {
        prev.element.pause();
        prev.isPlaying = false;
      }
    }

    try {
      clip.element.volume = this.isMuted ? 0 : this.volume;
      clip.element.muted = this.isMuted;

      // ضبط وقت البدء الداخلي للمقطع
      if (Math.abs(clip.element.currentTime - offsetSec) > 0.25) {
        clip.element.currentTime = Math.max(0, offsetSec);
      }

      if (clip.element.paused) {
        const playPromise = clip.element.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              clip.isPlaying = true;
              this.currentPlayingId = clipId;
            })
            .catch(err => {
              // قد تمنع سياسة المتصفح التشغيل التلقائي قبل تفاعل المستخدم
              console.warn(`[AudioController] تعذر تشغيل ${clipId} مؤقتاً:`, err.message);
            });
        }
      } else {
        clip.isPlaying = true;
        this.currentPlayingId = clipId;
      }
    } catch (err) {
      console.warn(`[AudioController] خطأ في تشغيل المقطع: ${clipId}`, err);
    }
  }

  /**
   * مزامنة الصوت بدقة مع التايم لاين الرئيسي للفيديو
   * @param {number} currentTime الوقت الحالي بالثواني
   * @param {Array} activeAudioSchedule قائمة المقاطع الصوتية المجدولة للمشهد
   * @param {boolean} isVideoPlaying هل المشغل يعمل حالياً؟
   */
  syncWithTimeline(currentTime, activeAudioSchedule, isVideoPlaying) {
    if (!isVideoPlaying) {
      this.pauseAll();
      return;
    }

    // تحديد المقطع الذي يجب أن يعمل في هذه اللحظة بالضبط
    let activeClipSpec = null;
    if (activeAudioSchedule && activeAudioSchedule.length > 0) {
      for (const spec of activeAudioSchedule) {
        if (currentTime >= spec.start && currentTime < spec.end) {
          activeClipSpec = spec;
          break;
        }
      }
    }

    if (activeClipSpec) {
      const offset = currentTime - activeClipSpec.start;
      // إذا لم يكن المقطع الحالي هو المطلوب، أو كان متوقفاً
      if (this.currentPlayingId !== activeClipSpec.id) {
        this.playClip(activeClipSpec.id, offset);
      } else {
        // فحص الانجراف الزمني وإصلاحه
        const currentClip = this.audioClips[activeClipSpec.id];
        if (currentClip && Math.abs(currentClip.element.currentTime - offset) > 0.4) {
          currentClip.element.currentTime = offset;
        }
        if (currentClip && currentClip.element.paused) {
          currentClip.element.play().catch(() => {});
        }
      }
    } else {
      // لا يوجد مقطع صوتي مجدول في هذا الجزء من التايم لاين -> إيقاف الصوت النشط
      if (this.currentPlayingId) {
        this.pauseAll();
        this.currentPlayingId = null;
      }
    }
  }

  /**
   * تغيير مستوى الصوت العام (0.0 إلى 1.0)
   */
  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    Object.values(this.audioClips).forEach(clip => {
      clip.element.volume = this.isMuted ? 0 : this.volume;
    });
  }

  /**
   * كتم أو تفعيل الصوت
   */
  toggleMute() {
    this.isMuted = !this.isMuted;
    Object.values(this.audioClips).forEach(clip => {
      clip.element.muted = this.isMuted;
      clip.element.volume = this.isMuted ? 0 : this.volume;
    });
    return this.isMuted;
  }

  /**
   * إعادة التشغيل من البداية
   */
  replay() {
    this.stopAll();
  }
}

// تصدير الكائن على نطاق النافذة العامة لسهولة الاستخدام
window.AudioController = AudioController;
