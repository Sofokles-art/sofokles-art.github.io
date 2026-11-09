/* Софья Харитонова · живые вещи на странице:
   1) плёнки идут по кругу и едут, пока страницу листают: под первым экраном справа налево,
      две в «Кадрах» навстречу друг другу; их можно листать вбок пальцем, мышью и стрелками,
      кадр по нажатию открывается крупно на большой плёнке, она тоже листается по кругу;
   2) вкладки сверху показывают, в каком разделе читатель;
   3) превью роликов играют без звука, пока карточка на экране;
   4) магниты в «Кейсах» можно двигать мышью и пальцем;
   5) первое фото переворачивается по нажатию, на обороте рычит лев студии;
   6) в конце финал замирает, всё гаснет, чёрный круг (ирис) сжимается к «Продолжение следует…»,
      потом на том же месте гаснет и она;
   7) роли в титрах финала сами едут вверх по кругу. */

(function () {
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Плёнки по кругу ---------- */
  // Кадры в ряду повторены несколько раз. Позиция x любая, на экран попадает x по модулю длины одного круга,
  // поэтому лента листается без конца в обе стороны.
  // box: вся плёнка (в ней стрелки), view: окно, row: ряд кадров. Настройки o:
  // dir: куда лента едет при прокрутке страницы (-1 справа налево, 1 слева направо, 0 стоит);
  // step(): шаг, на который лента встаёт (крупный просмотр); lead(): сдвиг, чтобы текущий кадр был по центру;
  // nudge(): на сколько листают стрелки; tap(i, el): нажали на кадр; wheel(d): своё колесо; moved(x): после отрисовки.
  var mod = function (a, b) { return ((a % b) + b) % b; };

  var tape = function (box, view, row, o) {
    var originals = Array.prototype.slice.call(row.children);
    var n = originals.length;
    var W = 0, sets = 1;
    originals.forEach(function (f, i) { f.setAttribute('data-i', i); });

    var addSet = function () {
      originals.forEach(function (f) {
        var c = f.cloneNode(true);
        c.setAttribute('aria-hidden', 'true');
        row.appendChild(c);
      });
      sets++;
    };
    // Повторов столько, чтобы окно всегда было заполнено и слева, и справа
    var fill = function () {
      if (sets < 2) addSet();
      W = row.children[n].offsetLeft - row.children[0].offsetLeft;
      if (W <= 0) return;
      var need = 2 + Math.ceil(view.clientWidth / W);
      while (sets < need) addSet();
    };

    var x = 0, offset = 0, v = 0, held = false, running = false, last = 0;
    var base = function () { return 0; };
    if (o.dir && !calm) {
      // Доля пути плёнки через экран: 0, когда она появилась снизу, 1, когда ушла вверх
      base = function () {
        var r = box.getBoundingClientRect(), vh = window.innerHeight;
        var p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
        return -o.dir * p * W * .5;
      };
    }
    var target = function () { return base() + offset; };

    var render = function () {
      if (W <= 0) return;
      var lead = o.lead ? o.lead() : 0;
      row.style.transform = 'translate3d(' + (lead - W - mod(x, W)).toFixed(1) + 'px,0,0)';
      if (o.moved) o.moved(x);
    };

    // Одна анимация на всё: лента догоняет цель (прокрутка страницы, стрелки) или катится по инерции после броска
    var tick = function (t) {
      var dt = last ? Math.min(48, t - last) : 16;
      last = t;
      if (held) { running = false; last = 0; return; }
      if (v) {
        offset += v * dt;
        v *= Math.pow(.94, dt / 16);
        if (Math.abs(v) < .02) v = 0;
        x = target();
      } else {
        var goal = target();
        x += (goal - x) * (calm ? 1 : .16);
        if (Math.abs(goal - x) < .3) x = goal;
      }
      render();
      if (v || x !== target()) requestAnimationFrame(tick);
      else { running = false; last = 0; }
    };
    var kick = function () {
      if (!running) { running = true; requestAnimationFrame(tick); }
    };

    /* Пальцем и мышью: тянем ленту, отпустили с разгона, она катится дальше */
    var pid = null, sx = 0, sy = 0, sOff = 0, dragging = false, dragged = false, trail = [];
    view.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 || pid !== null) return;
      pid = e.pointerId;
      sx = e.clientX;
      sy = e.clientY;
      held = true;
      dragging = dragged = false;
      v = 0;
      offset = x - base(); // ловим ленту там, где она сейчас
      sOff = offset;
      trail = [[e.timeStamp, e.clientX]];
    });
    view.addEventListener('pointermove', function (e) {
      if (e.pointerId !== pid) return;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (!dragging) {
        if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(dy)) return;
        dragging = true;
        view.setPointerCapture(pid);
        view.classList.add('is-dragging');
      }
      offset = sOff - dx;
      x = target();
      render();
      trail.push([e.timeStamp, e.clientX]);
      if (trail.length > 6) trail.shift();
    });
    var release = function (e) {
      if (e.pointerId !== pid) return;
      pid = null;
      held = false;
      view.classList.remove('is-dragging');
      if (dragging) {
        dragged = true;
        var a = trail[0], b = trail[trail.length - 1];
        var vel = b[0] > a[0] && e.timeStamp - b[0] < 80 ? -(b[1] - a[1]) / (b[0] - a[0]) : 0;
        if (o.step) offset = snapAfter(vel);
        else if (!calm) v = Math.max(-4, Math.min(4, vel));
      }
      dragging = false;
      kick();
    };
    view.addEventListener('pointerup', release);
    view.addEventListener('pointercancel', release);
    view.addEventListener('dragstart', function (e) { e.preventDefault(); });

    // Куда встать после броска: на соседний кадр, если тянули заметно или быстро
    var snapAfter = function (vel) {
      var s = o.step(), from = Math.round(sOff / s), moved = (offset - sOff) / s;
      var k = Math.abs(moved) > .15 || Math.abs(vel) > .3
        ? Math.sign(moved || vel) * Math.max(1, Math.round(Math.abs(moved))) : 0;
      return (from + k) * s;
    };

    // Нажатие без протяжки: кадр
    view.addEventListener('click', function (e) {
      if (dragged) { dragged = false; return; }
      var f = e.target.closest('[data-i]');
      if (f && row.contains(f) && o.tap) o.tap(+f.getAttribute('data-i'), f);
    });

    // Тачпад вбок (или Shift + колесо) листает ленту, обычное колесо листает страницу
    view.addEventListener('wheel', function (e) {
      var d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : (e.shiftKey ? e.deltaY : 0);
      if (!d) return;
      e.preventDefault();
      if (e.deltaMode === 1) d *= 16;
      if (o.wheel) { o.wheel(d); return; }
      v = 0;
      offset += d;
      x = target();
      render();
    }, { passive: false });

    /* Стрелки */
    var go = function (d) {
      v = 0;
      if (o.step) { var s = o.step(); offset = (Math.round(offset / s) + d) * s; }
      else offset += d * (o.nudge ? o.nudge() : view.clientWidth * .6);
      kick();
    };
    var arrow = function (cls, label, points, d) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'pan ' + cls;
      b.setAttribute('aria-label', label);
      b.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><polyline points="' + points + '" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
      b.addEventListener('click', function () { go(d); });
      box.appendChild(b);
    };
    arrow('pan--prev', 'Листать назад', '12.5,4 6.5,10 12.5,16', -1);
    arrow('pan--next', 'Листать вперёд', '7.5,4 13.5,10 7.5,16', 1);

    var redo = function () { fill(); x = target(); render(); };
    if (o.dir) window.addEventListener('scroll', kick, { passive: true });
    window.addEventListener('resize', redo);
    redo();

    return {
      go: go,
      redo: redo,
      // встать сразу на место (крупный просмотр открывается на нужном кадре)
      jump: function (to) { v = 0; offset = to; redo(); }
    };
  };

  /* ---------- Кадры крупно: та же плёнка, только большая, тоже по кругу ---------- */
  var album = function (frames) {
    var lb = document.createElement('div');
    lb.className = 'lb';
    lb.hidden = true;
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Кадры крупно');
    lb.innerHTML = '<div class="lb__film"><div class="lb__view"><div class="lb__row"></div></div></div>' +
      '<p class="lb__cap" aria-live="polite"></p>' +
      '<button class="lb__close" type="button" aria-label="Закрыть"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 4l12 12M16 4L4 16" stroke="currentColor" stroke-width="2"/></svg></button>';
    var film = lb.querySelector('.lb__film'), view = lb.querySelector('.lb__view'), row = lb.querySelector('.lb__row');
    var cap = lb.querySelector('.lb__cap');

    // Кадр плёнки на странице → кадр большой плёнки: фото или титр с фактом, номер кадра, подпись
    var items = frames.map(function (f) {
      var img = f.querySelector('img'), card = f.querySelector('.title-card');
      var no = f.querySelector('.frame__no, .filmstrip__frame > span');
      var fc = f.querySelector('figcaption');
      var it = {
        no: no ? no.textContent.trim() : '',
        cap: fc ? fc.textContent.replace(no ? no.textContent : '', '').trim() : ''
      };
      var el = document.createElement('div');
      el.className = 'lb__frame' + (card ? ' lb__frame--title' : '');
      if (img) {
        var big = document.createElement('img');
        big.setAttribute('data-src', img.getAttribute('src'));
        big.alt = img.alt;
        big.width = img.width;
        big.height = img.height;
        el.appendChild(big);
      } else if (card) {
        el.appendChild(card.cloneNode(true));
      }
      var num = document.createElement('span');
      num.className = 'lb__no';
      num.textContent = it.no;
      el.appendChild(num);
      row.appendChild(el);
      return it;
    });
    var n = items.length;
    document.body.appendChild(lb);

    var step = function () { return row.children[1].offsetLeft - row.children[0].offsetLeft; };
    var fw = function () { return row.children[0].offsetWidth; };
    var on = -1, lock = 0, acc = 0, back = null;

    var api = tape(film, view, row, {
      step: step,
      lead: function () { return (view.clientWidth - fw()) / 2; },
      moved: function (x) {
        view.style.setProperty('--px', (-x).toFixed(1) + 'px');
        var i = mod(Math.round(x / step()), n);
        if (i === on) return;
        on = i;
        cap.textContent = items[i].cap ? items[i].no + ' · ' + items[i].cap : ''; // номер и так виден на плёнке
        Array.prototype.forEach.call(row.children, function (el) {
          var k = +el.getAttribute('data-i');
          el.classList.toggle('is-on', k === i);
          // грузим текущий кадр и по два с каждой стороны
          if (Math.min(mod(k - i, n), mod(i - k, n)) <= 2) {
            var im = el.querySelector('img[data-src]');
            if (im) { im.src = im.getAttribute('data-src'); im.removeAttribute('data-src'); }
          }
        });
      },
      // нажали на соседний кадр: едем к нему
      tap: function (i, el) {
        var r = el.getBoundingClientRect(), mid = window.innerWidth / 2;
        if (r.right < mid) api.go(-1);
        else if (r.left > mid) api.go(1);
      },
      // колесо и тачпад: один кадр за жест
      wheel: function (d) {
        var now = Date.now();
        if (now < lock) return;
        acc += d;
        if (Math.abs(acc) > 30) { api.go(acc > 0 ? 1 : -1); acc = 0; lock = now + 450; }
      }
    });

    var close = function () {
      lb.hidden = true;
      document.documentElement.classList.remove('lb-open');
      document.removeEventListener('keydown', keys);
      if (back) back.focus({ preventScroll: true });
    };
    var keys = function (e) {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') api.go(-1);
      else if (e.key === 'ArrowRight') api.go(1);
    };
    lb.querySelector('.lb__close').addEventListener('click', close);
    // нажатие мимо плёнки закрывает
    lb.addEventListener('click', function (e) { if (e.target === lb || e.target === cap) close(); });

    return function (i) {
      back = document.activeElement;
      lb.hidden = false;
      document.documentElement.classList.add('lb-open');
      document.addEventListener('keydown', keys);
      on = -1;
      api.jump(i * step());
      lb.querySelector('.lb__close').focus({ preventScroll: true });
    };
  };

  var filmstrip = document.querySelector('.filmstrip');
  if (filmstrip) {
    var fsView = filmstrip.querySelector('.filmstrip__view');
    var fsRow = filmstrip.querySelector('.filmstrip__row');
    var openAbout = album(Array.prototype.slice.call(fsRow.children));
    tape(filmstrip, fsView, fsRow, {
      dir: -1,
      tap: function (i) { openAbout(i); },
      moved: function (x) { fsView.style.setProperty('--px', (-x).toFixed(1) + 'px'); } // перфорация едет с кадрами
    });
  }

  // Две цветные плёнки «Кадров»: крупно они одна плёнка из 16 кадров
  var strips = document.querySelectorAll('.strip');
  if (strips.length) {
    var all = [];
    Array.prototype.forEach.call(strips, function (s) {
      all = all.concat(Array.prototype.slice.call(s.querySelectorAll('.strip__row > .frame')));
    });
    var openShots = album(all);
    var shift = 0;
    Array.prototype.forEach.call(strips, function (s) {
      var row = s.querySelector('.strip__row'), from = shift;
      shift += row.children.length;
      tape(s, s.querySelector('.strip__view'), row, {
        dir: s.classList.contains('strip--b') ? 1 : -1,
        nudge: function () { return window.innerWidth * .6; },
        tap: function (i) { openShots(from + i); }
      });
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
