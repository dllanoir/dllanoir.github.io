'use strict';

(() => {
  const root = document.documentElement;
  const body = document.body;
  const hudDate = document.getElementById('hud-date');
  const progressBar = document.getElementById('progress-bar');
  const soundButton = document.getElementById('sound-button');
  const soundtrack = document.getElementById('soundtrack');
  let ytPlayer = null;
  let ytReady = false;
  let isYtRequested = false;
  let userPaused = false;
  const modal = document.getElementById('letter-modal');
  const openLetter = document.getElementById('open-letter');
  const closeLetter = document.getElementById('close-letter');
  const calendarDays = document.getElementById('calendar-days');
  const birthday = document.getElementById('birthday');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = window.matchMedia('(max-width: 600px)').matches;

  const scenes = [...document.querySelectorAll('.scene[data-date]')];
  let previousFocus = null;
  let lenisInstance = null;

  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }

  function resetScrollToTop() {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    if (lenisInstance) {
      try {
        lenisInstance.scrollTo(0, { immediate: true });
      } catch (_) {}
    }
  }

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  function setHudDate(value) {
    if (hudDate && value) hudDate.textContent = value;
  }

  function updateProgress() {
    if (root.classList.contains('is-countdown-mode')) return;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    if (progressBar) progressBar.style.width = `${ratio * 100}%`;
  }

  function scrollToLetter() {
    document.getElementById('carta')?.scrollIntoView({behavior: reducedMotion ? 'auto' : 'smooth'});
    window.setTimeout(() => document.querySelector('.letter-paper .letter-greeting')?.focus?.(), 500);
  }

  function buildCalendar() {
    const ticks = document.getElementById('calendar-ticks');
    if (!ticks) return;
    ticks.innerHTML = '';
    for (let i = 0; i < 28; i += 1) {
      const tick = document.createElement('span');
      tick.className = `calendar-tick${i === 27 ? ' target' : ''}`;
      tick.style.setProperty('--tick-index', i);
      ticks.appendChild(tick);
    }
  }

  function formatDateProgress(progress) {
    const start = new Date(2026, 8, 7);
    const end = new Date(2026, 9, 4);
    const totalDays = Math.round((end - start) / 86400000);
    const dayIndex = Math.min(totalDays, Math.max(0, Math.round(progress * totalDays)));
    const current = new Date(start);
    current.setDate(start.getDate() + dayIndex);
    const day = pad(current.getDate());
    const month = pad(current.getMonth() + 1);
    return {
      display: `${day}.${month}`,
      index: dayIndex,
      final: dayIndex === totalDays
    };
  }

  function updateCalendarProgress(progress) {
    const display = document.getElementById('calendar-date');
    const label = document.getElementById('calendar-day-label');
    const face = document.querySelector('.calendar-face');
    const result = formatDateProgress(progress);
    if (display) display.textContent = result.display;
    if (label) label.textContent = result.final ? 'AGORA CHEGOU O DIA' : 'UM DIA DE CADA VEZ';
    face?.classList.toggle('is-final', result.final);
    document.querySelectorAll('.calendar-tick').forEach((tick, index) => {
      tick.classList.toggle('passed', index <= result.index);
      tick.classList.toggle('current', index === result.index);
    });
  }

  function prepareDrawPaths(selector) {
    document.querySelectorAll(selector).forEach((path) => {
      if (typeof path.getTotalLength !== 'function') return;
      const length = path.getTotalLength();
      path.style.strokeDasharray = `${length} ${length}`;
      path.style.strokeDashoffset = length;
    });
  }

  function animateDrawPaths(gsap, selector, trigger, options = {}) {
    const paths = [...document.querySelectorAll(selector)].filter((path) => typeof path.getTotalLength === 'function');
    if (!paths.length) return;
    paths.forEach((path) => {
      const length = path.getTotalLength();
      gsap.set(path, {strokeDasharray: length, strokeDashoffset: length});
    });
    gsap.to(paths, {
      strokeDashoffset: 0,
      duration: options.duration ?? 1.65,
      stagger: options.stagger ?? 0.14,
      ease: 'power2.out',
      scrollTrigger: {trigger, start: options.start ?? 'top 66%', once: true}
    });
  }

  function bindSceneObserver() {
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio > .25) {
          setHudDate(entry.target.dataset.date);
        }
      });
    }, {threshold:[.25,.55,.8]});
    scenes.forEach(scene => observer.observe(scene));
  }

  function setSoundPlaying(isPlaying) {
    if (!soundButton) return;
    soundButton.classList.toggle('is-open', isPlaying);
    soundButton.classList.toggle('is-playing', isPlaying);
    soundButton.setAttribute('aria-pressed', isPlaying ? 'true' : 'false');
    soundButton.setAttribute('aria-label', isPlaying ? 'Pausar nossa trilha sonora' : 'Tocar nossa trilha sonora');
  }

  function loadYouTubeFallback() {
    if (window.YT && window.YT.Player) {
      initYT();
      return;
    }
    const prevOnReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prevOnReady === 'function') prevOnReady();
      initYT();
    };
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
  }

  function initYT() {
    if (ytPlayer || !document.getElementById('youtube-player')) return;
    try {
      ytPlayer = new window.YT.Player('youtube-player', {
        height: '1',
        width: '1',
        videoId: 'OFcKm-5jSQE',
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          loop: 1,
          playlist: 'OFcKm-5jSQE',
          modestbranding: 1,
          playsinline: 1
        },
        events: {
          onReady: () => {
            ytReady = true;
            if (isYtRequested) {
              ytPlayer.playVideo();
              setSoundPlaying(true);
            }
          },
          onStateChange: (event) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              setSoundPlaying(true);
            } else if (event.data === window.YT.PlayerState.PAUSED || event.data === window.YT.PlayerState.ENDED) {
              setSoundPlaying(false);
            }
          }
        }
      });
    } catch (_) {}
  }

  function toggleSoundtrack() {
    if (soundtrack && !soundtrack.paused) {
      userPaused = true;
      soundtrack.pause();
      setSoundPlaying(false);
      return;
    }

    if (ytPlayer && ytReady && typeof ytPlayer.getPlayerState === 'function') {
      try {
        if (ytPlayer.getPlayerState() === window.YT.PlayerState.PLAYING) {
          userPaused = true;
          ytPlayer.pauseVideo();
          setSoundPlaying(false);
          return;
        }
      } catch (_) {}
    }

    userPaused = false;
    if (soundtrack) {
      soundtrack.volume = 0.85;
      const playPromise = soundtrack.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          setSoundPlaying(true);
        }).catch((err) => {
          console.warn('HTML5 áudio indisponível, iniciando YouTube fallback:', err);
          isYtRequested = true;
          if (!ytPlayer) {
            loadYouTubeFallback();
          } else if (ytReady && typeof ytPlayer.playVideo === 'function') {
            ytPlayer.playVideo();
            setSoundPlaying(true);
          }
        });
        return;
      }
    }

    isYtRequested = true;
    if (!ytPlayer) {
      loadYouTubeFallback();
    } else if (ytReady && typeof ytPlayer.playVideo === 'function') {
      ytPlayer.playVideo();
      setSoundPlaying(true);
    }
  }

  function attemptAutoplay() {
    if (!soundtrack) return;
    soundtrack.volume = 0.85;

    const startPlay = () => {
      if (userPaused) return;
      const playPromise = soundtrack.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          setSoundPlaying(true);
        }).catch(() => {
          setupInteractionUnlock();
        });
      }
    };

    const setupInteractionUnlock = () => {
      const unlock = () => {
        if (!userPaused && soundtrack.paused) {
          soundtrack.play().then(() => {
            setSoundPlaying(true);
          }).catch(() => {});
        }
        ['click', 'touchstart', 'scroll', 'keydown', 'wheel'].forEach(evt => {
          window.removeEventListener(evt, unlock, true);
        });
      };

      ['click', 'touchstart', 'scroll', 'keydown', 'wheel'].forEach(evt => {
        window.addEventListener(evt, unlock, {capture: true, passive: true, once: true});
      });
    };

    startPlay();
  }

  function openModal() {
    if (!modal) return;
    previousFocus = document.activeElement;
    modal.hidden = false;
    body.classList.add('is-locked');
    window.setTimeout(() => closeLetter?.focus(), 30);
  }

  function closeModal() {
    if (!modal) return;
    modal.hidden = true;
    body.classList.remove('is-locked');
    previousFocus?.focus?.();
  }

  function bindBasicUI() {
    soundButton?.addEventListener('click', toggleSoundtrack);
    if (soundtrack) {
      soundtrack.addEventListener('play', () => setSoundPlaying(true));
      soundtrack.addEventListener('pause', () => setSoundPlaying(false));
      soundtrack.addEventListener('ended', () => setSoundPlaying(false));
    }
    openLetter?.addEventListener('click', openModal);
    closeLetter?.addEventListener('click', closeModal);
    modal?.querySelectorAll('[data-close-letter]').forEach(el => el.addEventListener('click', () => {
      const shouldScroll = el.classList.contains('modal-continue');
      closeModal();
      if (shouldScroll) scrollToLetter();
    }));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        if (modal && !modal.hidden) closeModal();
      }
    });
  }

  function initLenis() {
    if (reducedMotion || typeof window.Lenis === 'undefined') return null;
    if (lenisInstance) return lenisInstance;
    lenisInstance = new window.Lenis({
      duration: 1.08,
      smoothWheel: true,
      smoothTouch: false,
      wheelMultiplier: .86,
      touchMultiplier: 1
    });
    const raf = (time) => {
      lenisInstance.raf(time);
      window.requestAnimationFrame(raf);
    };
    window.requestAnimationFrame(raf);
    return lenisInstance;
  }

  function initGSAP() {
    if (reducedMotion || typeof window.gsap === 'undefined' || typeof window.ScrollTrigger === 'undefined') return;
    window.gsap.registerPlugin(window.ScrollTrigger);

    const gsap = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;

    // Opening rain / hero copy.
    gsap.fromTo('.scene-01 .reveal',
      {opacity:0, y:24, filter:'blur(10px)'},
      {opacity:1, y:0, filter:'blur(0px)', duration:1.4, stagger:.25, ease:'power3.out', delay:.2}
    );

    // Memory sequence: one thought at a time.
    const sequence = document.querySelectorAll('.word-sequence span');
    if (sequence.length) {
      const tl = gsap.timeline({
        scrollTrigger:{trigger:'.scene-02', start:'top top', end:'+=230%', scrub:1.1, pin:true, anticipatePin:1}
      });
      sequence.forEach((node, index) => {
        if (index === 0) {
          tl.to(node,{opacity:0,y:-18,filter:'blur(8px)',duration:.55}, index ? '>' : .7);
        } else {
          tl.fromTo(node,{opacity:0,y:15,filter:'blur(8px)'},{opacity:1,y:0,filter:'blur(0px)',duration:.6},'>')
            .to(node,{opacity:0,y:-18,filter:'blur(8px)',duration:.6},'>+=.35');
        }
      });
      tl.to('.sequence-footer',{opacity:1,y:0,duration:.45},'>');
    }

    // Common scene reveal.
    gsap.utils.toArray('.copy-column,.memory-photo,.phone-shell,.ring-shape,.happening-copy, .happening-scene blockquote, .rain-memory, .letter-intro, .encounter-copy').forEach((el) => {
      gsap.fromTo(el,
        {opacity:0,y:24},
        {opacity:1,y:0,duration:1.1,ease:'power3.out',scrollTrigger:{trigger:el,start:'top 78%',once:true}}
      );
    });

    // Phone messages.
    gsap.to('.message-bubble',{opacity:1,y:0,duration:.8,stagger:.3,ease:'power2.out',scrollTrigger:{trigger:'.phone-shell',start:'top 68%'}});

    // “Você aconteceu”.
    const eventTl = gsap.timeline({scrollTrigger:{trigger:'.scene-05',start:'top top',end:'+=170%',pin:true,scrub:1.1,anticipatePin:1}});
    eventTl.to('.scene-05 .micro-line',{opacity:1,y:0,stagger:.8,duration:.9,ease:'power2.out'})
      .to('.scene-05 .event-word',{opacity:1,scale:1.02,duration:.7,ease:'power3.out'},'>+.45')
      .to('.scene-05 .event-word',{opacity:0,filter:'blur(8px)',duration:.55},'>+.5')
      .to('.scene-05 .event-answer',{opacity:1,y:0,duration:1,ease:'power3.out'},'>-.15')
      .to('.scene-05 .light-dot',{opacity:1,scale:1.7,duration:.65,ease:'power2.out'},'<')
      .to('.scene-05 .light-dot',{x:260,y:-80,opacity:0,duration:1.7,ease:'power2.inOut'},'>+.2');

    // Draw the rose like a memory being sketched by hand.
    animateDrawPaths(gsap, '.scene-03 .draw-path', '.scene-03', {duration: 1.85, stagger: .18, start: 'top 70%'});
    gsap.fromTo('.rose-drawing', {opacity: .25, y: 16, scale: .96}, {opacity: 1, y: 0, scale: 1, duration: 1.2, ease: 'power3.out', scrollTrigger: {trigger: '.scene-03', start: 'top 72%', once: true}});

    // Solitaire diamond: facet lines draw in, then the stone catches light.
    animateDrawPaths(gsap, '.scene-06 .draw-path', '.scene-06', {duration: 1.45, stagger: .12, start: 'top 68%'});
    gsap.fromTo('.diamond-wrap', {opacity: 0, y: 18, scale: .88}, {opacity: 1, y: 0, scale: 1, duration: 1.15, ease: 'power3.out', scrollTrigger: {trigger: '.scene-06', start: 'top 70%', once: true}});
    gsap.to('.diamond-glint', {x: 42, y: 30, opacity: .05, duration: 1.9, ease: 'sine.inOut', repeat: -1, repeatDelay: .9});

    // The two overlapping circles are the two alliances.
    animateDrawPaths(gsap, '.scene-07 .draw-path', '.scene-07', {duration: 1.4, stagger: .18, start: 'top 68%'});
    gsap.fromTo('.rings-drawing', {scale: .84, opacity: .2}, {scale: 1, opacity: 1, duration: 1.2, ease: 'power3.out', scrollTrigger: {trigger: '.scene-07', start: 'top 68%', once: true}});
    gsap.to('.ring-two', {x: 2, y: -1, duration: 1.6, repeat: -1, yoyo: true, ease: 'sine.inOut'});


    // Photo stack drift.
    gsap.utils.toArray('.stack-card').forEach((card,index)=>{
      gsap.fromTo(card,{y:50},{y:index===1?-10:(index===2?8:0),duration:1.2,scrollTrigger:{trigger:'.scene-09',start:'top 70%',once:true},delay:index*.1,ease:'power3.out'});
    });

    // Turn.
    const turnTl = gsap.timeline({scrollTrigger:{trigger:'.scene-11',start:'top top',end:'+=160%',pin:true,scrub:1,anticipatePin:1}});
    turnTl.to('.scene-11 .turn-line',{opacity:1,y:0,stagger:.9,duration:1,ease:'power3.out'})
      .to('.scene-11 .turn-line:not(.final-turn)',{opacity:0,y:-15,duration:.7,stagger:.4},'>+.3')
      .to('.scene-11 .final-turn',{scale:1.03,color:'#e7e1cf',duration:1.2},'>+.2');

    // Encounter dots move together.
    const encounterTl = gsap.timeline({scrollTrigger:{trigger:'.scene-13',start:'top top',end:'+=170%',pin:true,scrub:1.1,anticipatePin:1}});
    encounterTl.fromTo('.dot-a',{x:0,y:0},{x:'18vw',y:'4vh',duration:1.7,ease:'power2.inOut'})
      .fromTo('.dot-b',{x:0,y:0},{x:'-18vw',y:'-4vh',duration:1.7,ease:'power2.inOut'},'<')
      .to('.encounter-final',{scale:1.05,duration:.9,ease:'power3.out'},'>-.2');

    // The calendar is one long take: every bit of scroll advances one day from 07.09 to 04.10.
    const calendarScene = document.querySelector('.scene-14');
    if (calendarScene) {
      const calendarTl = gsap.timeline({
        scrollTrigger: {
          trigger: calendarScene,
          start: 'top top',
          end: '+=210%',
          pin: true,
          scrub: 1.15,
          anticipatePin: 1,
          onUpdate: self => {
            const result = formatDateProgress(self.progress);
            updateCalendarProgress(self.progress);
            setHudDate(`${result.display}.2026`);
          }
        }
      });
      calendarTl.to('.calendar-face', {scale: 1, opacity: 1, duration: .2});
      gsap.fromTo('.calendar-label', {opacity: 0, y: 20}, {opacity: 1, y: 0, duration: 1, ease: 'power3.out', scrollTrigger: {trigger: calendarScene, start: 'top 72%', once: true}});
      gsap.fromTo('.calendar-copy', {opacity: 0, y: 20}, {opacity: 1, y: 0, duration: 1, ease: 'power3.out', scrollTrigger: {trigger: calendarScene, start: 'top 64%', once: true}});
      gsap.fromTo('.calendar-face', {y: 40, opacity: 0.2}, {y: 0, opacity: 1, duration: 1.1, ease: 'power3.out', scrollTrigger: {trigger: calendarScene, start: 'top 70%', once: true}});
      updateCalendarProgress(0);
    }

    // Umbrella draws itself while the rain remains alive around it.
    animateDrawPaths(gsap, '.scene-10 .draw-path', '.scene-10', {duration: 1.6, stagger: .14, start: 'top 70%'});
    gsap.to('.umbrella-rain-lines', {opacity: .15, duration: .7, repeat: -1, yoyo: true, ease: 'sine.inOut'});
    gsap.utils.toArray('.rain-drop').forEach((drop, index) => {
      gsap.to(drop, {y: 24, x: index % 2 ? -4 : 4, opacity: 0, duration: 1.25 + (index % 3) * .18, delay: index * .17, repeat: -1, ease: 'none'});
    });

    // Birthday climax: make the last number breathe.
    const birthdayTl = gsap.timeline({scrollTrigger:{trigger:'.scene-birthday',start:'top top',end:'+=135%',pin:true,scrub:1.1,anticipatePin:1}});
    birthdayTl.fromTo('.birthday-date',{opacity:0,y:18},{opacity:1,y:0,duration:.65})
      .fromTo('.birthday-number',{opacity:0,scale:.88,filter:'blur(12px)'},{opacity:1,scale:1,filter:'blur(0px)',y:-35,duration:1.2,ease:'power3.out'},'>+.15')
      .fromTo('.birthday-eyebrow,.birthday-title,.birthday-soft,.letter-trigger',{opacity:0,y:20},{opacity:1,y:0,stagger:.25,duration:.7,ease:'power3.out'},'>+.25')
      .to('.birthday-radial',{scale:1.12,opacity:.85,duration:1.8,ease:'sine.inOut',repeat:1,yoyo:true},'>-.2');

    // Final symbolic language.
    gsap.fromTo('.final-rose',{x:-20,opacity:0},{x:0,opacity:1,duration:1.1,ease:'power3.out',scrollTrigger:{trigger:'.scene-final',start:'top 72%',once:true}});
    gsap.fromTo('.final-light',{x:25,opacity:0,scale:.4},{x:0,opacity:1,scale:1,duration:.9,ease:'power3.out',scrollTrigger:{trigger:'.scene-final',start:'top 66%',once:true,delay:.2}});
    gsap.fromTo('.final-circle',{scale:.55,opacity:0},{scale:1,opacity:1,duration:1.1,ease:'power3.out',scrollTrigger:{trigger:'.scene-final',start:'top 60%',once:true,delay:.15}});
    gsap.fromTo('.final-words p',{opacity:0,y:16},{opacity:1,y:0,duration:.8,stagger:.28,ease:'power3.out',scrollTrigger:{trigger:'.scene-final',start:'top 56%',once:true}});
    gsap.fromTo('.final-symbolic h2',{opacity:0,y:20},{opacity:1,y:0,duration:1.2,ease:'power3.out',scrollTrigger:{trigger:'.scene-final',start:'top 50%',once:true}});
  }

  function ensureBirthdayFocus() {
    if (!birthday) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('scene') === 'birthday') {
      birthday.scrollIntoView({behavior: reducedMotion ? 'auto' : 'smooth'});
    }
  }

  function onScroll() {
    updateProgress();
  }

  // Target: Midnight turning into 04.10.2026 (Brasília time UTC-03:00)
  const TARGET_DATE_STRING = '2026-10-04T00:00:00-03:00';
  const STORY_START_STRING = '2026-09-07T00:00:00-03:00';
  const targetTimestamp = new Date(TARGET_DATE_STRING).getTime();
  const storyStartTimestamp = new Date(STORY_START_STRING).getTime();

  const urlParams = new URLSearchParams(window.location.search);
  const previewParam = urlParams.get('preview');
  const isForcedUnlock = urlParams.get('unlock') === 'true' || urlParams.get('unlock') === '1' || previewParam === 'birthday';
  const isForcedCountdown = previewParam === 'countdown';

  let simulatedOffset = 0;
  const simulatedTimeParam = urlParams.get('simulatedTime') || urlParams.get('time');
  if (simulatedTimeParam) {
    const parsedSim = new Date(simulatedTimeParam).getTime();
    if (!isNaN(parsedSim)) {
      simulatedOffset = parsedSim - Date.now();
    }
  }

  function getNowTime() {
    return Date.now() + simulatedOffset;
  }

  function isBeforeTarget() {
    if (isForcedUnlock) return false;
    if (isForcedCountdown) return true;
    return getNowTime() < targetTimestamp;
  }

  const countdownView = document.getElementById('countdown-view');
  const cdDays = document.getElementById('cd-days');
  const cdHours = document.getElementById('cd-hours');
  const cdMinutes = document.getElementById('cd-minutes');
  const cdSeconds = document.getElementById('cd-seconds');
  const cdGrid = document.getElementById('countdown-grid');
  const cdBanner = document.getElementById('countdown-unlocked-banner');
  const enterBtn = document.getElementById('enter-experience-btn');
  const hudKicker = document.getElementById('hud-kicker');

  let countdownInterval = null;
  let experienceInitialized = false;

  function updateCountdownUI() {
    const now = getNowTime();
    const remainingMs = targetTimestamp - now;

    // Progress in HUD towards target date
    if (progressBar) {
      const progressRatio = Math.min(1, Math.max(0, (now - storyStartTimestamp) / (targetTimestamp - storyStartTimestamp)));
      progressBar.style.width = `${progressRatio * 100}%`;
    }

    if (remainingMs <= 0 && !isForcedCountdown) {
      if (cdDays) cdDays.textContent = '00';
      if (cdHours) cdHours.textContent = '00';
      if (cdMinutes) cdMinutes.textContent = '00';
      if (cdSeconds) cdSeconds.textContent = '00';
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
      onCountdownReachedZero();
      return;
    }

    const safeMs = Math.max(0, remainingMs);
    const totalSec = Math.floor(safeMs / 1000);
    const days = Math.floor(totalSec / 86400);
    const hours = Math.floor((totalSec % 86400) / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;

    if (cdDays) cdDays.textContent = pad(days);
    if (cdHours) cdHours.textContent = pad(hours);
    if (cdMinutes) cdMinutes.textContent = pad(minutes);
    if (cdSeconds) cdSeconds.textContent = pad(seconds);
  }

  function onCountdownReachedZero() {
    cdGrid?.classList.add('is-finished');
    if (cdBanner) {
      cdBanner.hidden = false;
    }
    setHudDate('04.10.2026');
    if (hudKicker) hudKicker.textContent = 'O MOMENTO CHEGOU';
  }

  function unlockAndStartExperience() {
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }

    // Immediately reset scroll to 0 before switching views
    resetScrollToTop();

    root.classList.remove('is-countdown-mode');
    if (countdownView) {
      countdownView.style.display = 'none';
    }
    const experienceEl = document.getElementById('experience');
    if (experienceEl) {
      experienceEl.style.display = '';
    }

    // Force scroll to top after switching views
    resetScrollToTop();

    if (hudKicker) hudKicker.textContent = 'UMA LEMBRANÇA QUE GANHOU VIDA';
    setHudDate('07.09.2026');
    if (progressBar) progressBar.style.width = '0%';

    initExperienceOnce();

    // Ensure scroll position is strictly 0 and recalculate all ScrollTriggers
    resetScrollToTop();
    window.requestAnimationFrame(() => {
      resetScrollToTop();
      if (typeof window.ScrollTrigger !== 'undefined') {
        window.ScrollTrigger.refresh();
      }
      updateProgress();
    });
    window.setTimeout(() => {
      resetScrollToTop();
      updateProgress();
    }, 60);
  }

  function initExperienceOnce() {
    if (experienceInitialized) return;
    experienceInitialized = true;

    resetScrollToTop();
    buildCalendar();
    bindSceneObserver();
    ensureBirthdayFocus();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', updateProgress, { passive: true });
    updateProgress();
    initLenis();
    resetScrollToTop();

    const runGSAP = () => {
      resetScrollToTop();
      initGSAP();
      if (typeof window.ScrollTrigger !== 'undefined') {
        window.setTimeout(() => {
          resetScrollToTop();
          window.ScrollTrigger.refresh();
          updateProgress();
        }, 120);
      }
    };

    if (document.readyState === 'complete') {
      runGSAP();
    } else {
      window.addEventListener('load', runGSAP, { once: true });
    }

    // Small touch-friendly interaction: tap the final “04.10” to reveal the letter.
    birthday?.addEventListener('dblclick', () => {
      if (isMobile) openModal();
    });
  }

  function initCountdown() {
    root.classList.add('is-countdown-mode');
    if (hudKicker) hudKicker.textContent = 'CONTAGEM REGRESSIVA';
    setHudDate('04.10.2026');

    document.querySelector('.hud-brand')?.addEventListener('click', (e) => {
      if (root.classList.contains('is-countdown-mode')) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });

    prepareDrawPaths('.countdown-rose .draw-path');
    updateCountdownUI();
    countdownInterval = setInterval(updateCountdownUI, 1000);

    enterBtn?.addEventListener('click', unlockAndStartExperience);

    const triggerCountdownAnim = () => {
      if (typeof window.gsap !== 'undefined') {
        window.gsap.fromTo('.countdown-view .reveal',
          { opacity: 0, y: 22 },
          { opacity: 1, y: 0, duration: 1.15, stagger: 0.14, ease: 'power3.out', delay: 0.15 }
        );
        animateDrawPaths(window.gsap, '.countdown-rose .draw-path', '.countdown-view', { duration: 1.9, stagger: 0.16 });
      }
    };

    if (document.readyState === 'complete') {
      triggerCountdownAnim();
    } else {
      window.addEventListener('load', triggerCountdownAnim, { once: true });
    }
  }

  bindBasicUI();
  attemptAutoplay();

  if (isBeforeTarget()) {
    initCountdown();
  } else {
    root.classList.remove('is-countdown-mode');
    resetScrollToTop();
    initExperienceOnce();
  }
})();
