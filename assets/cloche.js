const introDuration = 3250;

function renderCloche(canvas, stage, reducedMotion) {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: false });
  const fallback = { setTime() {}, stop() {} };
  if (!gl) return fallback;

  const vertex = 'attribute vec2 position; void main(){gl_Position=vec4(position,0.,1.);}';
  const fragment = `
    precision highp float;
    uniform vec2 resolution;
    uniform vec2 angle;
    uniform vec2 shine;
    uniform float lifted;

    float cylinder(vec3 p, float radius, float halfHeight) {
      vec2 d=vec2(length(p.xz)-radius,abs(p.y)-halfHeight);
      return length(max(d,0.))+min(max(d.x,d.y),0.);
    }
    float ring(vec3 p,float major,float minor) {
      return length(vec2(length(p.xz)-major,p.y))-minor;
    }
    vec2 shape(vec3 p) {
      vec3 cap=p-vec3(0.,-.47+lifted,0.);
      float dome=abs((length(cap/vec3(1.38,.94,1.38))-1.)*.93)-.026;
      dome=max(dome,-cap.y);
      float rim=ring(cap,1.354,.044);
      float collar=cylinder(cap-vec3(0.,.98,0.),.135,.07);
      vec3 handle=cap-vec3(0.,1.13,0.);
      float knob=(length(handle/vec3(.174,.114,.174))-1.)*.114;
      float cover=min(min(dome,rim),min(collar,knob));
      float plate=min(cylinder(p-vec3(0.,-.55,0.),1.47,.046),
        ring(p-vec3(0.,-.5,0.),1.42,.056));
      float stand=cylinder(p-vec3(0.,-.62,0.),1.09,.044);
      plate=min(plate,stand);
      vec2 metal=cover<plate?vec2(cover,1.):vec2(plate,2.);
      float estimate=cylinder(p-vec3(0.,-.22,0.),.79,.31);
      if(estimate>metal.x) return metal;
      float base=cylinder(p-vec3(0.,-.397,0.),.67,.095)-.014;
      float tier=cylinder(p-vec3(0.,-.211,0.),.48,.10)-.012;
      float icing=min(base,tier);
      float trim=min(ring(p-vec3(0.,-.459,0.),.67,.016),
        ring(p-vec3(0.,-.29,0.),.485,.015));
      vec3 berry=p-vec3(0.,-.051,0.);
      float petalAngle=atan(berry.x,berry.z);
      float petals=length(vec2(length(berry.xz)-(.23+.021*cos(petalAngle*5.)),berry.y))-.041;
      float garnish=min(petals,trim);
      vec2 dessert=icing<garnish?vec2(icing,3.):vec2(garnish,4.);
      return dessert.x<metal.x?dessert:metal;
    }
    vec3 normalAt(vec3 p) {
      vec2 e=vec2(.0015,0.);
      return normalize(vec3(shape(p+e.xyy).x-shape(p-e.xyy).x,
        shape(p+e.yxy).x-shape(p-e.yxy).x,shape(p+e.yyx).x-shape(p-e.yyx).x));
    }
    float lightBox(vec3 r, vec3 direction, float spread) {
      return pow(max(0.,dot(r,normalize(direction))),spread);
    }
    void main() {
      vec2 uv=(gl_FragCoord.xy-resolution*.5)/min(resolution.y,resolution.x*.92);
      vec3 eye=vec3(angle.x*1.4,1.28+angle.y*.78,5.05);
      vec3 forward=normalize(vec3(0.,.48,0.)-eye);
      vec3 right=normalize(cross(forward,vec3(0.,1.,0.)));
      vec3 up=cross(right,forward);
      vec3 ray=normalize(forward*1.36+uv.x*right+uv.y*up);
      float t=1.9;
      vec2 hit=vec2(0.);
      for(int i=0;i<73;i++){
        hit=shape(eye+t*ray);
        if(hit.x<.0025 || t>7.1) break;
        t+=hit.x*.82;
      }
      if(t>7.1 || hit.x>=.0025){
        gl_FragColor=vec4(0.);
        return;
      }
      vec3 p=eye+t*ray;
      vec3 n=normalAt(p);
      vec3 r=reflect(ray,n);
      float mainLight=lightBox(r,vec3(-.95,.73,1.),9.);
      float vertical=pow(max(0.,dot(normalize(vec2(r.x,r.z)),normalize(vec2(.49,.87)))),39.)
        *smoothstep(-.55,-.09,r.y)*(1.-smoothstep(.65,.97,r.y));
      float bounce=lightBox(r,vec3(.8,-.65,1.),5.);
      float rim=pow(1.-max(0.,dot(n,-ray)),3.);
      float brush=(sin(p.y*125.0+sin(atan(p.x,p.z)*7.0))*0.5+.5)*.014;
      vec3 color=vec3(.17,.078,.034)+vec3(.87,.54,.22)*(.30+mainLight*.67+bounce*.31+rim*.29);
      color+=vec3(1.,.85,.57)*vertical*.83+vec3(1.,.86,.69)*pow(mainLight,1.8)*.52+brush;
      float band=(r.x-shine.x)*4.2;
      float sweep=exp(-band*band)*shine.y*smoothstep(-.55,.5,r.z);
      color+=vec3(.63,.48,.29)*sweep;
      if(hit.y>1.5) color=mix(color,vec3(.52,.28,.14)+vec3(.48,.42,.31)*(mainLight+vertical),.29);
      if(hit.y>2.5){
        float diffuse=max(0.,dot(n,normalize(vec3(-.6,1.,1.))));
        vec3 frosting=vec3(.96,.83,.65);
        vec3 decoration=p.y<-.15?vec3(.75,.47,.22):vec3(.51,.19,.22);
        color=(hit.y<3.5?frosting:decoration)*(.62+.38*diffuse)+vec3(1.,.85,.7)*mainLight*.09;
      }
      gl_FragColor=vec4(color,1.);
    }`;

  function compile(kind, source) {
    const shader = gl.createShader(kind);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
  }
  const vs = compile(gl.VERTEX_SHADER, vertex);
  const fs = compile(gl.FRAGMENT_SHADER, fragment);
  if (!vs || !fs) return fallback;
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return fallback;
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const resolution = gl.getUniformLocation(program, 'resolution');
  const angle = gl.getUniformLocation(program, 'angle');
  const lifted = gl.getUniformLocation(program, 'lifted');
  const shine = gl.getUniformLocation(program, 'shine');
  let elapsed = reducedMotion ? introDuration : 0;
  const pointer = [0, 0];
  let raf = 0;

  function paint() {
    raf = 0;
    if (!canvas.width || !canvas.height || gl.isContextLost()) return;
    const liftProgress = Math.max(0, Math.min(1, (elapsed - 650) / 1960));
    const lift = liftProgress * liftProgress * (3 - 2 * liftProgress);
    const sweep = Math.max(0, Math.min(1, (elapsed - 370) / 1650));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(resolution, canvas.width, canvas.height);
    gl.uniform2f(angle, pointer[0] + (lift - 1) * .42, pointer[1] + (1 - lift) * .25);
    gl.uniform1f(lifted, 1.17 * lift);
    gl.uniform2f(shine, 1.45 - sweep * 2.9, Math.sin(sweep * Math.PI));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    stage.dataset.rendered = '';
  }
  function schedule() {
    if (!raf) raf = requestAnimationFrame(paint);
  }
  const resize = new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect;
    if (!width || !height) return;
    const quality = Math.min(window.devicePixelRatio || 1, 900 / width, 550 / height);
    canvas.width = Math.max(1, Math.round(width * quality));
    canvas.height = Math.max(1, Math.round(height * quality));
    schedule();
  });
  resize.observe(stage);
  function move(event) {
    const bounds = stage.getBoundingClientRect();
    pointer[0] = (event.clientX - bounds.left) / bounds.width - .5;
    pointer[1] = .5 - (event.clientY - bounds.top) / bounds.height;
    schedule();
  }
  if (!reducedMotion) stage.addEventListener('pointermove', move);
  return {
    setTime(time) { elapsed = time; schedule(); },
    stop() {
      cancelAnimationFrame(raf);
      resize.disconnect();
      stage.removeEventListener('pointermove', move);
      gl.deleteProgram(program);
      gl.deleteBuffer(buffer);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    },
  };
}

function showOpening() {
  const splash = document.querySelector('#splash');
  if (!splash) return;
  const replay = new URLSearchParams(location.search).has('intro');
  const key = 'arabeski-intro-v4';
  const stage = splash.querySelector('.splash-visual');
  const canvas = stage.querySelector('canvas');
  const layout = splash.querySelector('.splash-layout');
  const progress = splash.querySelector('[data-intro-progress]');
  const count = splash.querySelector('[data-intro-count]');
  const state = splash.querySelector('[data-intro-state]');
  const enter = splash.querySelector('[data-intro-enter]');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let closing = false;

  async function closeIntro(event) {
    event.preventDefault();
    if (closing) return;
    closing = true;
    if (typeof layout.animate === 'function') {
      const entering = event.submitter === enter;
      const frames = motion.matches
        ? [{ opacity: 1 }, { opacity: 0 }]
        : [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: entering ? 'scale(1.13)' : 'scale(1.016)' }];
      const transition = layout.animate(frames, {
        duration: motion.matches ? 120 : entering ? 540 : 280,
        easing: 'ease-in',
        fill: 'forwards',
      });
      await transition.finished.catch(() => {});
      splash.close();
      transition.cancel();
    } else {
      splash.close();
    }
  }
  splash.addEventListener('submit', closeIntro);
  splash.addEventListener('cancel', closeIntro);

  function openIntro() {
    if (splash.open) return;
    const previous = document.activeElement;
    const reduce = motion.matches;
    const duration = reduce ? 850 : introDuration;
    let lastValue = -1;
    let startedAt;
    let frame;
    delete splash.dataset.ready;
    enter.disabled = true;
    showProgress(0);
    splash.showModal();
    const scene = renderCloche(canvas, stage, reduce);

    function showProgress(value) {
      if (lastValue === value) return;
      const updateStatus = lastValue < 0 || (lastValue < 32 && value >= 32) || value === 100;
      lastValue = value;
      count.textContent = value;
      progress.setAttribute('aria-valuenow', String(value));
      progress.style.setProperty('--intro-progress', value + '%');
      if (updateStatus) state.textContent = value === 100 ? 'Добро пожаловать' : value >= 32 ? 'Открываем клош' : 'Готовим подачу';
    }

    function advance(now) {
      startedAt ??= now;
      const elapsed = Math.min(duration, now - startedAt);
      const ratio = elapsed / duration;
      const value = reduce && ratio < 1 ? Math.floor(ratio * 4) * 25 : Math.floor(ratio * 100);
      showProgress(value);
      if (!reduce) scene.setTime(elapsed);
      if (!stage.hasAttribute('data-rendered')) {
        const lift = reduce ? 1 : Math.max(0, Math.min(1, (elapsed - 650) / 1960));
        stage.style.setProperty('--lid-travel', (-64 * lift * lift * (3 - 2 * lift)) + '%');
      }
      if (ratio < 1) {
        frame = requestAnimationFrame(advance);
      } else if (!closing) {
        enter.disabled = false;
        splash.dataset.ready = '';
      }
    }
    frame = requestAnimationFrame(advance);
    splash.addEventListener('close', () => {
      closing = false;
      cancelAnimationFrame(frame);
      scene.stop();
      delete stage.dataset.rendered;
      stage.style.removeProperty('--lid-travel');
      try { sessionStorage.setItem(key, '1'); } catch {}
      document.body.classList.add('splash-dismissed');
      const focusTarget = previous === document.body ? document.querySelector('[data-show-menu]') : previous;
      focusTarget?.focus({ preventScroll: true });
    }, { once: true });
  }

  for (const trigger of document.querySelectorAll('[data-replay-intro]')) {
    trigger.addEventListener('click', openIntro);
  }
  try {
    if (!replay && sessionStorage.getItem(key)) return;
  } catch {}
  openIntro();
}

showOpening();
