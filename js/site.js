/* Софья Харитонова · живые вещи на странице:
   1) плёнки едут, пока страницу листают: под первым экраном справа налево,
      две в «Кадрах» навстречу друг другу;
   2) вкладки сверху показывают, в каком разделе читатель;
   3) превью роликов играют без звука, пока карточка на экране;
   4) магниты в «Кейсах» можно двигать мышью и пальцем;
   5) первое фото переворачивается по нажатию, на обороте рычит лев студии;
   6) в конце финал замирает, всё гаснет, чёрный круг (ирис) сжимается к «Продолжение следует…»,
      потом на том же месте гаснет и она;
   7) роли в титрах финала сами едут вверх по кругу. */

(function () {
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Плёнки ---------- */
  // dir -1: лента едет справа налево, 1: слева направо
  var drift = function (box, row, dir) {
    var target = 0, current = 0, running = false;

    // Доля пути плёнки через экран: 0, когда она появилась снизу, 1, когда ушла вверх
    var measure = function () {
      var r = box.getBoundingClientRect();
      var vh = window.innerHeight;
      var p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
      var max = Math.max(0, row.scrollWidth - box.clientWidth);
      target = -(dir < 0 ? p : 1 - p) * max;
    };

    // Плавно догоняем цель, чтобы рывки колеса мыши не дёргали ленту
    var step = function () {
      current += (target - current) * 0.14;
      if (Math.abs(target - current) < 0.4) current = target;
      row.style.transform = 'translate3d(' + current.toFixed(1) + 'px,0,0)';
      if (current !== target) requestAnimationFrame(step);
      else running = false;
    };

    var update = function () {
      measure();
      if (!running) { running = true; requestAnimationFrame(step); }
    };

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    measure();
    current = target;
    row.style.transform = 'translate3d(' + current.toFixed(1) + 'px,0,0)';
  };

  if (!calm) {
    var strip = document.querySelector('.filmstrip');
    if (strip) drift(strip, strip.querySelector('.filmstrip__row'), -1);
    Array.prototype.forEach.call(document.querySelectorAll('.strip'), function (s) {
      drift(s, s.querySelector('.strip__row'), s.classList.contains('strip--b') ? 1 : -1);
    });
  }

  /* ---------- Вкладки: выдвигаем вкладку раздела, который сейчас на экране ---------- */
  var bar = document.querySelector('.tabs');
  var tabs = document.querySelectorAll('.tab');

  if (bar && tabs.length) {
    var parts = Array.prototype.map.call(tabs, function (t) {
      return document.querySelector(t.getAttribute('href'));
    });
    var on = 0, queued = false;

    var spy = function () {
      queued = false;
      var edge = bar.offsetHeight + 80, k = 0;
      parts.forEach(function (p, i) { if (p && p.getBoundingClientRect().top <= edge) k = i; });
      // у самого низа страницы последняя вкладка, даже если финал короткий
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) k = parts.length - 1;
      if (k === on) return;
      tabs[on].classList.remove('is-on');
      tabs[on].removeAttribute('aria-current');
      on = k;
      tabs[k].classList.add('is-on');
      tabs[k].setAttribute('aria-current', 'true');
      // на телефоне вкладки шире экрана: прокручиваем полоску к текущей
      var row = tabs[k].parentNode, l = tabs[k].offsetLeft, w = tabs[k].offsetWidth;
      if (l < row.scrollLeft || l + w > row.scrollLeft + row.clientWidth) {
        row.scrollTo({ left: l - 16, behavior: calm ? 'auto' : 'smooth' });
      }
    };

    window.addEventListener('scroll', function () {
      if (!queued) { queued = true; requestAnimationFrame(spy); }
    }, { passive: true });
    spy();
  }

  /* ---------- Превью роликов: без звука, играют, пока карточка на экране ---------- */
  var vids = document.querySelectorAll('.reel video');

  if (vids.length && !calm && 'IntersectionObserver' in window) {
    var seen = new IntersectionObserver(function (list) {
      list.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting) {
          if (!v.getAttribute('src')) v.src = v.getAttribute('data-src'); // файл грузится только при первом показе
          var p = v.play();
          if (p && p.catch) p.catch(function () {});
        } else {
          v.pause();
        }
      });
    }, { threshold: 0.6 });
    Array.prototype.forEach.call(vids, function (v) { seen.observe(v); });
  }

  /* ---------- Магниты ---------- */
  var top = 10;

  Array.prototype.forEach.call(document.querySelectorAll('.magnet'), function (m) {
    var id = null, sx = 0, sy = 0, dx = 0, dy = 0, moved = false;

    m.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      id = e.pointerId;
      m.setPointerCapture(id);
      sx = e.clientX - dx;
      sy = e.clientY - dy;
      moved = false;
      m.style.zIndex = ++top;
      m.classList.add('is-held');
    });

    m.addEventListener('pointermove', function (e) {
      if (e.pointerId !== id) return;
      var x = e.clientX - sx, y = e.clientY - sy;
      // Короткое нажатие без сдвига остаётся переходом по ссылке
      if (!moved && Math.abs(x - dx) + Math.abs(y - dy) < 6) return;
      moved = true;
      dx = x;
      dy = y;
      m.style.setProperty('--dx', dx + 'px');
      m.style.setProperty('--dy', dy + 'px');
    });

    var drop = function (e) {
      if (e.pointerId !== id) return;
      id = null;
      m.classList.remove('is-held');
    };
    m.addEventListener('pointerup', drop);
    m.addEventListener('pointercancel', drop);

    m.addEventListener('click', function (e) {
      if (moved) { e.preventDefault(); moved = false; }
    });
    m.addEventListener('dragstart', function (e) { e.preventDefault(); });
  });

  /* ---------- Фото на первом экране: переворот, на обороте лев рычит без звука ---------- */
  var flip = document.querySelector('.flip');

  if (flip) {
    var lion = flip.querySelector('video');
    var hide = null;

    flip.addEventListener('click', function () {
      var shown = flip.classList.toggle('is-flipped');
      flip.setAttribute('aria-pressed', shown ? 'true' : 'false');
      clearTimeout(hide);
      if (shown) {
        if (!lion.getAttribute('src')) lion.src = lion.getAttribute('data-src'); // ролик грузится только при первом перевороте
        lion.defaultPlaybackRate = lion.playbackRate = .85; // чуть медленнее, рык тяжелее
        var p = lion.play();
        if (p && p.catch) p.catch(function () {});
      } else {
        hide = setTimeout(function () { lion.pause(); }, 900); // оборот уже не виден
      }
    });
  }

  /* ---------- Титры: роли едут вверх по кругу (до ириса: от этого меняется высота финала) ---------- */
  var roll = document.querySelector('.credits__roll');

  if (roll && !calm) {
    var list = roll.querySelector('.credits__list');
    // вторая копия ролей для бесшовного круга, читалке экрана она не нужна
    Array.prototype.slice.call(list.children).forEach(function (row) {
      var copy = row.cloneNode(true);
      copy.setAttribute('aria-hidden', 'true');
      list.appendChild(copy);
    });
    roll.classList.add('is-rolling');
  }

  /* ---------- Ирис в конце ---------- */
  var finale = document.querySelector('.outro .finale');
  var room = document.querySelector('.outro__room');
  var iris = document.querySelector('.iris');

  if (finale && room && iris) {
    var end = finale.querySelector('.the-end');
    var rest = finale.querySelectorAll('.wrap > :not(.the-end)');
    var clamp = function (x) { return Math.min(1, Math.max(0, x)); };
    var want = 0, now = 0, running = false;

    // финал прилипает, когда его низ дошёл до низа окна: дальше листается только пустое место под ним
    var pin = function () { finale.style.top = Math.min(0, window.innerHeight - finale.offsetHeight) + 'px'; };

    // p: 0, когда подвал дошёл до низа окна, 1 в самом конце страницы
    var measure = function () {
      var r = room.getBoundingClientRect();
      want = clamp((window.innerHeight - r.top) / r.height);
    };

    // Всё линейно от p. Круг сжимается с постоянной скоростью от углов окна к центру надписи;
    // пока он доходит до кольца вокруг неё, гаснет остальное, дальше гаснет и она.
    var draw = function (p) {
      var vw = window.innerWidth, vh = window.innerHeight;
      var range = document.createRange();
      range.selectNodeContents(end);
      var t = range.getBoundingClientRect();
      var cx = t.left + t.width / 2, cy = t.top + t.height / 2;
      var R0 = Math.max(Math.hypot(cx, cy), Math.hypot(vw - cx, cy), Math.hypot(cx, vh - cy), Math.hypot(vw - cx, vh - cy));
      var R1 = Math.min(R0 * .7, Math.hypot(t.width / 2, t.height / 2) + 24);
      var ring = 1 - R1 / R0; // доля пути, на которой круг дошёл до кольца вокруг надписи

      var others = (1 - clamp(p / ring)).toFixed(3);
      Array.prototype.forEach.call(rest, function (el) { el.style.opacity = others; });
      if (bar) bar.style.opacity = others;
      end.style.opacity = (1 - clamp((p - ring) / (1 - ring))).toFixed(3);

      if (p <= 0) { iris.style.visibility = 'hidden'; return; }
      iris.style.visibility = 'visible';
      if (calm) { iris.style.background = '#000'; iris.style.opacity = clamp((p - ring) / (1 - ring)).toFixed(3); return; }
      var R = R0 * (1 - p);
      var y = cy - iris.getBoundingClientRect().top; // .iris выше окна на 20vh
      iris.style.background = R < 1 ? '#000'
        : 'radial-gradient(circle ' + R.toFixed(1) + 'px at ' + cx.toFixed(1) + 'px ' + y.toFixed(1) + 'px, ' +
          'rgba(241,236,226,.06) 0, rgba(241,236,226,0) ' + (R * .85).toFixed(1) + 'px, ' + // свет проектора
          'rgba(0,0,0,0) ' + Math.max(0, R - 1.5).toFixed(1) + 'px, #000 ' + R.toFixed(1) + 'px)';
    };

    // Плавно догоняем прокрутку, чтобы шаги колеса мыши не дёргали круг
    var step = function () {
      now += (want - now) * .16;
      if (Math.abs(want - now) < .0005) now = want;
      draw(now);
      if (now !== want) requestAnimationFrame(step);
      else running = false;
    };
    var update = function () {
      measure();
      if (!running) { running = true; requestAnimationFrame(step); }
    };

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', function () { pin(); update(); });
    window.addEventListener('load', function () { pin(); update(); }); // высота финала меняется, когда грузятся картинки
    pin();
    measure();
    now = want;
    draw(now);
  }
})();
