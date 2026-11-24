function setupStudio() {
  const studio = document.querySelector('[data-studio]');
  if (!studio) return;
  const canvas = studio.querySelector('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    studio.replaceChildren('Для просмотра 3D-схемы откройте сайт в браузере с поддержкой Canvas.');
    return;
  }

  const summary = studio.querySelector('[data-summary]');
  const initialYaw = -.52;
  const state = { yaw: initialYaw, seating: 'round', guests: 36, light: 'day' };
  const palettes = {
    day: {
      floor: '#c5aa82', floorEdge: '#987f5a', tile: '#b29671',
      wall: '#e1d3b7', wallEdge: '#b9a98b', glass: '#829c8b',
      table: '#f8f0dd', tableSide: '#dac8a9', seat: '#7f8e72',
      object: '#9e7548', foliage: '#5f7256', plate: '#fffbec',
    },
    night: {
      floor: '#947953', floorEdge: '#604d3b', tile: '#7c644c',
      wall: '#bca585', wallEdge: '#827055', glass: '#465a61',
      table: '#e9ce9e', tableSide: '#baa079', seat: '#596856',
      object: '#deaa63', foliage: '#46583f', plate: '#fff0c8',
    },
  };

  let faces = [];
  let base = [];
  let frame = 0;
  let pixelRatio = 1;
  let width = 760;
  let height = 530;
  let pointer = null;

  function face(points, fill, stroke = null, layer = faces) {
    layer.push({ points, fill, stroke });
  }

  function box(x, y, z, w, h, d, top, side, angle = 0, layer = faces) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const corners = [[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]];
    const bottom = corners.map(([a, b]) => [x+a*cos-b*sin, y, z+a*sin+b*cos]);
    const upper = bottom.map(([a,b,c]) => [a,b+h,c]);
    for (let i = 0; i < 4; i++) {
      const next = (i + 1) % 4;
      face([bottom[i],bottom[next],upper[next],upper[i]], side, null, layer);
    }
    face(upper, top, null, layer);
  }

  function disk(x, y, z, radius, h, top, side, steps = 18) {
    const ring = Array.from({ length: steps }, (_, i) => {
      const angle = i / steps * Math.PI * 2;
      return [x+Math.cos(angle)*radius, y, z+Math.sin(angle)*radius];
    });
    const upper = ring.map(([a,b,c]) => [a,b+h,c]);
    if (h) {
      for (let i = 0; i < steps; i++) {
        const next = (i + 1) % steps;
        face([ring[i],ring[next],upper[next],upper[i]], side);
      }
    }
    face(upper, top);
  }

  function placeSetting(x, z, outwardX, outwardZ, p) {
    const angle = Math.atan2(-outwardX, outwardZ);
    box(x, .12, z, .68, .45, .65, p.seat, p.foliage, angle);
    box(x + outwardX * .23, .5, z + outwardZ * .23, .68, .59, .14, p.seat, p.foliage, angle);
  }

  function roundTable(x, z, p) {
    disk(x, .02, z, 1.19, 1.03, p.table, p.tableSide);
    disk(x, 1.05, z, .26, .24, p.foliage, p.object, 8);
    const seats = state.guests === 48 ? 8 : 6;
    for (let i = 0; i < seats; i++) {
      const angle = (i + .5) * Math.PI * 2 / seats;
      const a = Math.cos(angle);
      const b = Math.sin(angle);
      placeSetting(x+a*1.47, z+b*1.47, a, b, p);
      disk(x+a*.84, 1.055, z+b*.84, .155, 0, p.plate, p.plate, 8);
    }
  }

  function longTable(x, p) {
    const count = state.guests / 4;
    const spacing = .82;
    const length = count * spacing + .46;
    box(x, .02, 0, 1.9, 1.03, length, p.table, p.tableSide);
    box(x, 1.051, 0, .31, .016, length - .3, p.tableSide, p.tableSide);
    for (let i = 0; i < count; i++) {
      const z = (i - (count - 1) / 2) * spacing;
      for (const side of [-1, 1]) {
        placeSetting(x+side*1.25, z, side, 0, p);
        disk(x+side*.64, 1.056, z, .16, 0, p.plate, p.plate, 8);
      }
      if (i % 3 === 1) disk(x, 1.07, z, .21, .25, p.foliage, p.object, 8);
    }
  }

  function buildRoom() {
    faces = [];
    base = [];
    const p = palettes[state.light];
    box(0, -.46, 0, 15.1, .46, 13, p.floor, p.floorEdge, 0, base);
    for (let x = -7; x <= 7; x++) {
      face([[x,.005,-6.5],[x,.005,6.5]], null, p.tile, base);
    }
    for (let z = -6; z <= 6; z++) {
      face([[-7.54,.005,z],[7.54,.005,z]], null, p.tile, base);
    }

    box(0, .01, -6.22, 15.1, 3.7, .34, p.wall, p.wallEdge, 0, base);
    face([[-7.55,.05,-6.045],[7.55,.05,-6.045],[7.55,3.71,-6.045],[-7.55,3.71,-6.045]],p.wall,null,base);
    for (const x of [-5.65,-2.83,0,2.83,5.65]) {
      const arch = [[x-.78,.46,-6.035],[x+.78,.46,-6.035],[x+.78,2.4,-6.035]];
      for (let i = 1; i <= 12; i++) {
        const a = i * Math.PI / 12;
        arch.push([x+Math.cos(a)*.78, 2.4+Math.sin(a)*.8, -6.035]);
      }
      face(arch, p.glass, p.object, base);
      face([[x,.46,-6.03],[x,3.2,-6.03]],null,p.wall,base);
      face([[x-.77,1.83,-6.03],[x+.77,1.83,-6.03]],null,p.wall,base);
    }
    box(0, .22, -5.25, 5.4, .25, 1.1, p.tableSide, p.floorEdge);
    box(0, .49, -5.3, 2.95, .87, .63, p.table, p.tableSide);
    for (const x of [-1, 0, 1]) disk(x, 1.37, -5.3, .21, .29, p.foliage, p.object, 8);

    if (state.seating === 'long') {
      longTable(-2.36, p);
      longTable(2.36, p);
    } else {
      const rows = state.guests === 24 ? 2 : 3;
      for (let row = 0; row < rows; row++) {
        const z = (row - (rows - 1) / 2) * 3.92 + .46;
        roundTable(-2.73, z, p);
        roundTable(2.73, z, p);
      }
    }
  }

  function paint() {
    frame = 0;
    if (!width || !height) return;
    const cos = Math.cos(state.yaw);
    const sin = Math.sin(state.yaw);
    const scale = Math.min(width / 22.3, height / 16.8);
    const originX = width * .5;
    const originY = height * .54;
    const depth = ([x,y,z]) => x*sin + z*cos + y*.61;
    const project = ([x,y,z]) => [
      originX + (x*cos-z*sin)*scale,
      originY + ((x*sin+z*cos)*.53-y*.85)*scale,
    ];
    const paintFace = ({ points, fill, stroke }) => {
      context.beginPath();
      for (const [index, point] of points.entries()) {
        const [x,y] = project(point);
        if (index === 0) context.moveTo(x,y);
        else context.lineTo(x,y);
      }
      if (fill) {
        context.closePath();
        context.fillStyle = fill;
        context.fill();
      }
      if (stroke) {
        context.strokeStyle = stroke;
        context.stroke();
      }
    };
    context.setTransform(pixelRatio,0,0,pixelRatio,0,0);
    context.clearRect(0,0,width,height);
    context.lineWidth = .85;
    const shadow = context.createRadialGradient(originX, originY + 33, 0, originX, originY + 33, width * .44);
    shadow.addColorStop(0,'#72543d65');
    shadow.addColorStop(1,'#72543d00');
    context.fillStyle = shadow;
    context.fillRect(0,0,width,height);
    base.forEach(paintFace);
    faces.map(face => ({
      face,
      depth: face.points.reduce((sum, point) => sum + depth(point), 0) / face.points.length,
    })).sort((a,b) => a.depth-b.depth).forEach(item => paintFace(item.face));
  }

  function schedulePaint() {
    if (!frame) frame = requestAnimationFrame(paint);
  }

  function update() {
    const tableCount = state.seating === 'long' ? 2 : state.guests === 24 ? 4 : 6;
    const tables = tableCount === 2 || tableCount === 4 ? 'стола' : 'столов';
    summary.textContent = state.guests + ' гостей · ' + tableCount + ' ' + tables;
    studio.dataset.ambience = state.light;
    studio.querySelector('[data-plan]').dataset.plan = state.seating === 'round' ? 'Круглые столы' : 'Длинные столы';
    studio.querySelector('[data-plan]').dataset.count = state.guests;
    buildRoom();
    schedulePaint();
  }

  for (const key of ['seating','guests','light']) {
    const choices = [...studio.querySelectorAll('[data-' + key + ']')];
    for (const button of choices) {
      button.addEventListener('click', () => {
        state[key] = key === 'guests' ? Number(button.dataset[key]) : button.dataset[key];
        choices.forEach(choice => choice.setAttribute('aria-pressed', String(choice === button)));
        update();
      });
    }
  }

  function rotate(delta) {
    state.yaw = Math.max(-.96, Math.min(.96, state.yaw + delta));
    schedulePaint();
  }
  studio.querySelectorAll('[data-turn]').forEach(button => {
    button.addEventListener('click', () => rotate(Number(button.dataset.turn) * .32));
  });
  studio.querySelector('[data-view-reset]').addEventListener('click', () => {
    state.yaw = initialYaw;
    schedulePaint();
  });
  canvas.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    pointer = event;
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add('grabbing');
  });
  canvas.addEventListener('pointermove', event => {
    if (pointer?.pointerId !== event.pointerId) return;
    rotate((event.clientX - pointer.clientX) * .009);
    pointer = event;
  });
  canvas.addEventListener('lostpointercapture', () => {
    pointer = null;
    canvas.classList.remove('grabbing');
  });
  new ResizeObserver(([entry]) => {
    ({ width, height } = entry.contentRect);
    if (!width || !height) return;
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    schedulePaint();
  }).observe(canvas);
  update();
}

setupStudio();
