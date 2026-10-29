'use strict';
document.getElementById('year').textContent = new Date().getFullYear();
const toggle = document.querySelector('.menu-toggle');
const navigation = document.getElementById('navigation');
function setMenuOpen(open) {
  navigation.classList.toggle('open', open);
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  toggle.textContent = open ? '×' : '☰';
}
toggle.addEventListener('click', () => setMenuOpen(!navigation.classList.contains('open')));
navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenuOpen(false)));
document.addEventListener('click', event => {
  if (!navigation.contains(event.target) && !toggle.contains(event.target)) setMenuOpen(false);
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && navigation.classList.contains('open')) { setMenuOpen(false); toggle.focus(); }
});

// Accessible accordion and scroll-driven preparation timeline.
const prepTimeline = document.querySelector('.prep-grid');
const prepSteps = [...prepTimeline.querySelectorAll('.prep-step')];
const prepTriggers = [...prepTimeline.querySelectorAll('.prep-trigger')];
function setPrepOpen(trigger, open) {
  trigger.setAttribute('aria-expanded', String(open));
  document.getElementById(trigger.getAttribute('aria-controls')).hidden = !open;
}
prepTriggers.forEach(trigger => {
  setPrepOpen(trigger, false);
  trigger.addEventListener('click', () => {
    const open = trigger.getAttribute('aria-expanded') !== 'true';
    prepTriggers.forEach(other => setPrepOpen(other, other === trigger && open));
    updatePrepProgress();
    // Center the tile after the accordion has its final layout height.
    requestAnimationFrame(() => {
      const tile = trigger.closest('.prep-step');
      const timelineTop = prepTimeline.getBoundingClientRect().top + window.scrollY;
      const target = timelineTop + tile.offsetTop + tile.offsetHeight / 2 - window.innerHeight / 2;
      window.scrollTo({
        top: Math.max(0, target),
        behavior: reducedMotion.matches ? 'instant' : 'smooth'
      });
    });
  });
});
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const prepProgress = prepTimeline.querySelector('.prep-progress');
const clampPrep = value => Math.max(0, Math.min(1, value));
const smoothPrep = value => value * value * (3 - 2 * value);
// One rendering loop: read geometry first, then update visual styles.
let prepFrame = 0;
let prepLastTime = 0;
const prepScales = prepSteps.map(() => 1);
function updatePrepProgress() {
  if (!prepFrame) prepFrame = requestAnimationFrame(renderPrepFrame);
}
function renderPrepFrame(time) {
  prepFrame = 0;
  const elapsed = prepLastTime ? Math.min(64, time - prepLastTime) : 16.67;
  prepLastTime = time;
  const rect = prepTimeline.getBoundingClientRect();
  const viewport = window.innerHeight;
  const mobile = window.innerWidth <= 700;
  // Complete every layout read before writing any styles.
  const offsets = prepSteps.map(step => step.offsetTop + step.offsetHeight / 2);
  const focusY = viewport / 2;
  const lineHeight = focusY - rect.top;
  const progress = clampPrep(lineHeight / Math.max(1, rect.height));
  const centers = offsets.map(offset => rect.top + offset);
  let activeIndex = -1;
  let nearestDistance = Infinity;
  const heights = prepSteps.map(step => step.offsetHeight);
  centers.forEach((center, index) => {
    const visible = center + heights[index] / 2 > 0 && center - heights[index] / 2 < viewport;
    const distance = Math.abs(center - focusY);
    if (visible && distance < nearestDistance) {
      nearestDistance = distance;
      activeIndex = index;
    }
  });
  const blend = reducedMotion.matches ? 1 : 1 - Math.exp(-elapsed / 65);
  let settling = false;
  prepProgress.style.transform = `scaleY(${progress})`;
  prepSteps.forEach((step, index) => {
    const active = index === activeIndex;
    // Finish revealing before the gold line reaches the tile: no opacity jump on selection.
    const reveal = reducedMotion.matches ? 1 : smoothPrep(clampPrep((viewport * 1.08 - centers[index]) / (viewport * 0.2)));
    const targetScale = reducedMotion.matches ? 1 : active ? (mobile ? 1.035 : 1.06) : 0.93;
    prepScales[index] += (targetScale - prepScales[index]) * blend;
    if (Math.abs(targetScale - prepScales[index]) < 0.0005) prepScales[index] = targetScale;
    else settling = true;
    const direction = index % 2 === 0 ? -1 : 1;
    step.classList.toggle('is-current', active);
    step.style.setProperty('--prep-x', `${direction * (mobile ? 16 : 36) * (1 - reveal)}px`);
    step.style.setProperty('--prep-scale', prepScales[index].toFixed(4));
    step.style.setProperty('--prep-opacity', reveal.toFixed(4));
  });
  if (settling) updatePrepProgress();
  else prepLastTime = 0;
}
// Always follow the viewport centre, including while an accordion centres itself.
window.addEventListener('scroll', updatePrepProgress, { passive: true });
window.addEventListener('resize', updatePrepProgress);
reducedMotion.addEventListener('change', updatePrepProgress);
if ('ResizeObserver' in window) new ResizeObserver(updatePrepProgress).observe(prepTimeline);
prepTimeline.classList.add('scroll-animated');
updatePrepProgress();

// Remove the finished fullscreen intro from painting and hit testing entirely.
const signatureIntro = document.querySelector('.signature-intro');
if(document.documentElement.classList.contains('skip-intro')){signatureIntro?.remove();document.body.classList.add('intro-complete');}
signatureIntro?.addEventListener('animationend', event => {
  if (event.target === signatureIntro && ['signature-exit', 'logo-intro-finish'].includes(event.animationName)) {
    signatureIntro.remove();
    document.documentElement.classList.remove('intro-locked');
  }
});

// Light, time-based falling glitter. A single canvas avoids animating many DOM nodes.
(() => {
  const hero = document.querySelector('.velvet-hero');
  const canvas = hero?.querySelector('.hero-glitter');
  const context = canvas?.getContext('2d', { alpha: true });
  if (!context) return;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let width = 0, height = 0, particles = [], frame = 0, last = 0;
  let visible = false;
  const random = (a, b) => a + Math.random() * (b - a);
  function resizeGlitter() {
    width = hero.clientWidth; height = hero.clientHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    particles = Array.from({length: width < 701 ? 70 : 150}, () => ({
      x: random(0, width), y: random(0, height), size: random(.65, 1.65),
      speed: random(32, 64), drift: random(-7, 9), phase: random(0, Math.PI * 2)
    }));
  }
  function tick(time) {
    frame = 0;
    if (!visible || document.hidden || motion.matches) { last = 0; return; }
    const dt = last ? Math.min((time - last) / 1000, .05) : 0;
    last = time; context.clearRect(0, 0, width, height);
    for (const p of particles) {
      p.y += p.speed * dt; p.x += p.drift * dt;
      if (p.y > height + 5) { p.y = -5; p.x = random(0, width); }
      if (p.x < -5) p.x = width + 5;
      if (p.x > width + 5) p.x = -5;
      // Centre stays quiet so the logo and button are always clear.
      const edge = Math.abs(p.x / width - .5) > .25 ? 1 : .55;
      context.globalAlpha = edge * (.48 + .32 * (1 + Math.sin(time / 1700 + p.phase)) / 2);
      context.fillStyle = '#efd1aa'; context.beginPath();
      context.arc(p.x, p.y, p.size, 0, Math.PI * 2); context.fill();
    }
    context.globalAlpha = 1;
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0; last = 0;
    if (visible && !document.hidden && !motion.matches) frame = requestAnimationFrame(tick);
    else context.clearRect(0, 0, width, height);
  }
  resizeGlitter();
  if ('ResizeObserver' in window) new ResizeObserver(resizeGlitter).observe(hero);
  else window.addEventListener('resize', resizeGlitter);
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting; sync();
  }).observe(hero);
  else { visible = true; sync(); }
  document.addEventListener('visibilitychange', sync);
  motion.addEventListener('change', sync);
})();

// Center the booking heading and calendar together when there is room.
function centerBooking(includeHeading = true) {
  const panel = document.querySelector('.calendar-frame');
  const heading = document.querySelector('#appointments .center-heading');
  const panelRect = panel.getBoundingClientRect();
  const top = includeHeading ? heading.getBoundingClientRect().top : panelRect.top;
  const height = panelRect.bottom - top;
  const viewport = window.innerHeight;
  const headerHeight = document.querySelector('.hero-nav').getBoundingClientRect().height;
  const available = viewport - headerHeight;
  const inset = height <= available - 32 ? headerHeight + (available - height) / 2 : headerHeight + 16;
  window.scrollTo({top: Math.max(0, window.scrollY + top - inset), behavior: reducedMotion.matches ? 'instant' : 'smooth'});
}
document.querySelectorAll('a[href="#appointments"]').forEach(link => {
  link.addEventListener('click', event => {
    event.preventDefault();
    history.replaceState(null, '', '#appointments');
    centerBooking(true);
  });
});

// Speed up the same animation timeline: no jump or alternate exit transition.
document.querySelector('.intro-skip')?.addEventListener('click', event => {
  event.currentTarget.disabled = true;
  document.getAnimations().forEach(animation => {
    const target = animation.effect?.target;
    const timing = animation.effect?.getTiming();
    if (timing?.iterations !== Infinity && target &&
        (target.closest('.logo-intro, #home, .hero-nav') || target.matches('.fixed-brand, .mobile-menu-root'))) {
      animation.updatePlaybackRate(6);
    }
  });
});

// Use the measured header height so the opening panel meets its exact edge.
const introHeader = document.querySelector('.hero-nav');
function measureIntroHeader() {
  document.documentElement.style.setProperty('--intro-header-height', `${introHeader.offsetHeight}px`);
}
measureIntroHeader();
if ('ResizeObserver' in window) new ResizeObserver(measureIntroHeader).observe(introHeader);
const lowerIntroPanel = document.querySelector('.intro-shutter-bottom');
lowerIntroPanel?.addEventListener('animationend', event => {
  if (event.animationName === 'logo-open-bottom') lowerIntroPanel.remove();
});

// Reveal the experience accents once; keep content visible without observer support.
const experienceSection = document.querySelector('#welcome');
if (experienceSection && 'IntersectionObserver' in window && !reducedMotion.matches) {
  experienceSection.classList.add('experience-ready');
  const experienceObserver = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) {
      experienceSection.classList.add('experience-visible');
      experienceObserver.disconnect();
    }
  }, {threshold: 0, rootMargin: '0px 0px -12% 0px'});
  experienceObserver.observe(experienceSection);
}

// Smooth scroll-following car; interpolate transforms until the car settles.
(() => {
  const tile = document.querySelector('.travel-note');
  const road = tile?.querySelector('.travel-road');
  const car = road?.querySelector('.travel-car');
  if (!car) return;
  let frame = 0, last = 0, current = null, target = 0, dirty = true;
  function renderCar(time) {
    frame = 0;
    if (dirty) {
      const rect = tile.getBoundingClientRect();
      const viewport = window.innerHeight;
      const progress = Math.max(0, Math.min(1,
        (viewport * .9 - rect.top) / (viewport * .65 + rect.height)));
      target = reducedMotion.matches ? 0 : Math.max(0, road.clientWidth - 56) * progress;
      dirty = false;
    }
    const dt = last ? Math.min(64, time - last) : 16.67;
    last = time;
    if (current === null || reducedMotion.matches) current = target;
    else current += (target - current) * (1 - Math.exp(-dt / 105));
    const moving = Math.abs(target - current) > .08;
    if (!moving) current = target;
    car.style.transform = `translate3d(${current.toFixed(3)}px,0,0)`;
    if (moving) frame = requestAnimationFrame(renderCar);
    else last = 0;
  }
  function scheduleCar() {
    dirty = true;
    if (!frame) frame = requestAnimationFrame(renderCar);
  }
  window.addEventListener('scroll', scheduleCar, {passive:true});
  window.addEventListener('resize', scheduleCar);
  reducedMotion.addEventListener('change', scheduleCar);
  if ('ResizeObserver' in window) new ResizeObserver(scheduleCar).observe(tile);
  scheduleCar();
})();

// Hide the floating menu only when the footer occupies the lower viewport.
(() => {
  const footer = document.querySelector('#contact') || document.querySelector('footer');
  if (!footer) return;
  let frame = 0;
  function updateFooterMenu() {
    frame = 0;
    const mobile = window.matchMedia('(max-width:700px)').matches;
    const rect = footer.getBoundingClientRect();
    const hide = mobile && rect.top < window.innerHeight - 100 && rect.bottom > 0;
    document.body.classList.toggle('at-footer', hide);
    if (hide && navigation.classList.contains('open')) setMenuOpen(false);
  }
  function scheduleFooterMenu() {
    if (!frame) frame = requestAnimationFrame(updateFooterMenu);
  }
  window.addEventListener('scroll', scheduleFooterMenu, {passive:true});
  window.addEventListener('resize', scheduleFooterMenu);
  window.addEventListener('pageshow', scheduleFooterMenu);
  scheduleFooterMenu();
})();

// Move the mobile controls out of the header to avoid Safari fixed-position
// interactions with header animations. Reuse the same accessible controls.
const mobileMenuRoot = document.createElement('div');
mobileMenuRoot.className = 'mobile-menu-root';
document.body.appendChild(mobileMenuRoot);
const mobileMenuQuery = window.matchMedia('(max-width:700px)');
function placeNavigation() {
  setMenuOpen(false);
  const parent = mobileMenuQuery.matches ? mobileMenuRoot : introHeader;
  parent.append(toggle, navigation);
}
mobileMenuQuery.addEventListener('change', placeNavigation);
placeNavigation();
// Attention cue once, after both page loading and the intro have completed.
let pageReady = document.readyState === 'complete';
let introReady = document.documentElement.classList.contains('skip-intro') || !document.querySelector('.logo-intro') || reducedMotion.matches;
function revealBookingCue() {
  if (pageReady && introReady) document.body.classList.add('intro-complete');
}
window.addEventListener('load', () => { pageReady = true; revealBookingCue(); });
signatureIntro?.addEventListener('animationend', event => {
  if (event.target === signatureIntro && event.animationName === 'logo-intro-finish') {
    introReady = true; revealBookingCue();
  }
});
revealBookingCue();

// Fade mobile navigation after two seconds of inactivity; keep an open or
// keyboard-focused menu available until the visitor finishes using it.
(() => {
  let idleTimer;
  function armIdleTimer() {
    clearTimeout(idleTimer);
    if (!mobileMenuQuery.matches) {
      document.body.classList.remove('menu-idle');
      return;
    }
    idleTimer = setTimeout(() => {
      const focused = mobileMenuRoot.contains(document.activeElement) && document.activeElement.matches(':focus-visible');
      if (!navigation.classList.contains('open') && !focused) {
        document.body.classList.add('menu-idle');
      }
    }, 2000);
  }
  function revealMenu() {
    document.body.classList.remove('menu-idle');
    armIdleTimer();
  }
  window.addEventListener('scroll', revealMenu, {passive:true});
  window.addEventListener('touchmove', revealMenu, {passive:true});
  window.addEventListener('pointerdown', revealMenu, {passive:true});
  window.addEventListener('pageshow', revealMenu);
  mobileMenuRoot.addEventListener('click', armIdleTimer);
  mobileMenuRoot.addEventListener('focusin', revealMenu);
  mobileMenuRoot.addEventListener('focusout', armIdleTimer);
  // Keyboard users must be able to reach navigation even after it faded out.
  document.addEventListener('keydown', event => {
    if (event.key === 'Tab') revealMenu();
    else if (event.key === 'Escape') armIdleTimer();
  });
  mobileMenuQuery.addEventListener('change', revealMenu);
  signatureIntro?.addEventListener('animationend', event => {
    if (event.target === signatureIntro) revealMenu();
  });
  revealMenu();
})();

// Slide the decorative powder image in once; keep the cards in front.
(() => {
 const section = document.querySelector('#appointments');
 if (!section || reducedMotion.matches || !('IntersectionObserver' in window)) return;
 section.classList.add('powder-image-ready');
 const observer = new IntersectionObserver(entries => {
   if (entries.some(entry => entry.isIntersecting)) {
     section.classList.add('powder-image-visible');
     observer.disconnect();
   }
 }, {rootMargin:'0px 0px -15% 0px', threshold:0});
 observer.observe(section);
})();

// The calendar and subtitle reveal once; only the lock follows scrolling.
(() => {
 const card=document.querySelector('.secure-date');
 const icon=card?.querySelector('.secure-calendar');
 const lock=card?.querySelector('.reservation-lock');
 const shackle=card?.querySelector('.lock-shackle');
 if(!lock)return;
 if('IntersectionObserver' in window&&!reducedMotion.matches){
   card.classList.add('reveal-ready');
   const observer=new IntersectionObserver(entries=>{
     if(entries.some(e=>e.isIntersecting)){card.classList.add('reveal-visible');observer.disconnect();}
   },{rootMargin:'0px 0px -12% 0px'});observer.observe(icon);
 }
 let frame=0,last=0,current=null,target=0,dirty=true;
 function render(time){
   frame=0;
   if(dirty){const r=icon.getBoundingClientRect();target=reducedMotion.matches?1:Math.max(0,Math.min(1,(innerHeight*.9-r.top)/(innerHeight*.5)));dirty=false;}
   const dt=last?Math.min(64,time-last):16.67;last=time;
   if(current===null||reducedMotion.matches)current=target;
   else current+=(target-current)*(1-Math.exp(-dt/170));
   const moving=Math.abs(target-current)>.0005;if(!moving)current=target;
   lock.setAttribute('transform',`translate(182 ${20+current*135})`);
   const closing=Math.max(0,Math.min(1,(current-.65)/.35));
   shackle.setAttribute('transform',`translate(0 ${-9*(1-closing)}) rotate(${-24*(1-closing)} 10 34)`);
   if(moving)frame=requestAnimationFrame(render);else last=0;
 }
 function schedule(){dirty=true;if(!frame)frame=requestAnimationFrame(render);}
 window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);
 reducedMotion.addEventListener('change',schedule);schedule();
})();

// Highlight the nearest visible service on mobile only.
(() => {
 const cards=[...document.querySelectorAll('.service-card')];let frame=0;
 function render(){
   frame=0;let nearest=-1,distance=Infinity;
   if(window.matchMedia('(max-width:700px)').matches){
     const viewport=window.innerHeight;
     cards.forEach((card,index)=>{const rect=card.getBoundingClientRect();
       if(rect.bottom>0&&rect.top<viewport){const d=Math.abs(rect.top+rect.height/2-viewport/2);if(d<distance){distance=d;nearest=index;}}
     });
   }
   cards.forEach((card,index)=>card.classList.toggle('service-current',index===nearest));
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(render);}
 window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);schedule();
})();
// Queue visible social tiles left to right; never replay a tile on return.
(() => {
 const cards=[...document.querySelectorAll('.contact-card')];
 if(reducedMotion.matches||!('IntersectionObserver' in window))return;
 let nextStart=0;
 const observer=new IntersectionObserver(entries=>{
   const incoming=entries.filter(e=>e.isIntersecting && e.target.dataset.zoomPlayed !== 'true').sort((a,b)=>cards.indexOf(a.target)-cards.indexOf(b.target));
   incoming.forEach(entry=>{
     entry.target.dataset.zoomPlayed = 'true';
     const now=performance.now();const start=Math.max(now,nextStart);nextStart=start+850;
     entry.target.style.animationDelay=`${start-now}ms`;
     entry.target.classList.add('contact-zoom');observer.unobserve(entry.target);
     entry.target.addEventListener('animationend',()=>{entry.target.classList.remove('contact-zoom');entry.target.style.removeProperty('animation-delay');},{once:true});
   });
 },{threshold:.5});cards.forEach(card=>observer.observe(card));
})();

// Subtle reversible makeup parallax, with no continuous idle animation.
(() => {
 const hero=document.querySelector('.editorial-hero');
 const texture=hero?.querySelector('.hero-makeup-texture');
 if(!texture)return;
 let frame=0,last=0,current=0,target=0,dirty=true;
 function render(now){
  frame=0;
  if(dirty){
   const rect=hero.getBoundingClientRect();
   const progress=Math.max(0,Math.min(1,-rect.top/Math.max(1,rect.height)));
   target=reducedMotion.matches?0:progress*Math.min(65,rect.height*.07);
   dirty=false;
  }
  const dt=last?Math.min(64,now-last):16;last=now;
  current=reducedMotion.matches?target:current+(target-current)*(1-Math.exp(-dt/110));
  const moving=Math.abs(target-current)>.05;
  if(!moving)current=target;
  texture.style.setProperty('--makeup-scroll-y',`${current.toFixed(2)}px`);
  if(moving)frame=requestAnimationFrame(render);else last=0;
 }
 function schedule(){dirty=true;if(!frame)frame=requestAnimationFrame(render);}
 window.addEventListener('scroll',schedule,{passive:true});
 window.addEventListener('resize',schedule);
 reducedMotion.addEventListener('change',schedule);schedule();
})();

// Let the mobile hero artwork continue behind the header; restore its backdrop on scroll.
(() => {
 const hero=document.querySelector('.editorial-hero');
 if(!hero)return;
 let pending=false;
 function update(){
  pending=false;
  document.body.classList.toggle('header-scrolled',window.scrollY>=40);
 }
 function schedule(){if(!pending){pending=true;requestAnimationFrame(update);}}
 window.addEventListener('scroll',schedule,{passive:true});
 window.addEventListener('resize',schedule);update();
})();

// Start the arch as soon as the intro logo lands in the header.
(() => {
 const swipe=document.querySelector('.hero-bottom-swipe');
 const first=document.querySelector('.intro-logo-position');
 if(!swipe||reducedMotion.matches)return;
 swipe.classList.add('swipe-ready');
 let firstDone=false,imageReady=false,played=false;
 const start=()=>{if(!played&&firstDone&&imageReady){played=true;swipe.classList.add('swipe-visible');}};
 const finish=()=>{firstDone=true;start();};
 const animation=first?.getAnimations().find(a=>a.animationName==='logo-rise');
 if(animation)animation.finished.then(finish).catch(finish);else finish();
 const img=swipe.querySelector('img');
 const ready=()=>{imageReady=true;start();};
 if(img.decode)img.decode().then(ready).catch(ready);
 else if(img.complete)ready();else img.addEventListener('load',ready,{once:true});
})();
