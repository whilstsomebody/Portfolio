"use client";

import { useEffect, useRef, type RefObject } from "react";

type Point = { x: number; y: number };
type PortalProps = {
  origin: Point;
  progress: RefObject<{ value: number }>;
  panel: RefObject<HTMLDivElement | null>;
  pose: RefObject<{ turn: number; expand: number }>;
};

const vertexSource = `
attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

// The same moving noise field fills the neck, body and mouth. A single
// longitudinal mask reveals/retracts it without restarting the simulation.
const fragmentSource = `
precision highp float;
uniform vec2 resolution;
uniform vec2 viewport;
uniform vec2 origin;
uniform vec2 mouth;
uniform float radius;
uniform float time;
uniform float progress;
uniform float facing;
uniform vec4 pointer;
uniform vec2 pointerVelocity;
uniform vec4 wakes[8];

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float noise(vec2 p) {
  vec2 cell = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(cell), hash(cell + vec2(1, 0)), u.x),
             mix(hash(cell + vec2(0, 1)), hash(cell + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float result = 0.0, weight = 0.55;
  for (int i = 0; i < 4; i++) {
    result += weight * noise(p);
    p = mat2(1.6, 1.2, -1.2, 1.6) * p + 7.3;
    weight *= 0.48;
  }
  return result;
}
vec3 funnelSlice(vec2 p, float depth) {
  vec2 center = vec2(mix(origin.x, mouth.x, depth), mix(origin.y, mouth.y, depth * depth * (3.0 - 2.0 * depth)));
  float width = 4.0 + radius * pow(depth, 1.85);
  vec2 local = (p - center) / vec2(max(0.5, width * facing), width);
  return vec3(length(local), local.y, depth);
}
void main() {
  vec2 p = vec2(gl_FragCoord.x, resolution.y - gl_FragCoord.y) / resolution * viewport;
  vec2 delta = p - pointer.xy;
  float influence = exp(-dot(delta, delta) / (pointer.w * pointer.w)) * pointer.z;
  // Advect the entire gas volume around the cursor, including its silhouette.
  vec2 displacement = (vec2(-delta.y, delta.x) * 0.8 + normalize(delta + vec2(0.01)) * 20.0 - pointerVelocity * 22.0) * influence;
  float wakeLight = 0.0;
  for (int i = 0; i < 8; i++) {
    vec2 offset = p - wakes[i].xy;
    float distance = length(offset);
    float age = max(0.0, time - wakes[i].z);
    float envelope = exp(-age * 3.2 - distance * distance / 11000.0) * wakes[i].w;
    float wave = sin(distance * 0.075 - age * 10.0) * envelope;
    displacement += normalize(offset + vec2(0.01)) * wave * 11.0;
    wakeLight += abs(wave) * 0.07;
  }
  vec2 samplePoint = p + displacement;
  // One connected volume made from overlapping cross-sections of the
  // original flask. Turning widens their projection, never blends two bodies.
  vec2 apertureSize = max(vec2(radius * mix(0.24, 1.0, facing), radius), vec2(0.01));
  float sideTravel = clamp((samplePoint.x - origin.x) / max(1.0, mouth.x - origin.x), 0.0, 1.0);
  vec3 slice = funnelSlice(samplePoint, sideTravel);
  float silhouette = slice.x;
  float weight = exp(-min(slice.x * slice.x, 40.0) * 3.0);
  float totalWeight = weight;
  vec2 coordinates = slice.yz * weight;
  for (int i = 0; i <= 40; i++) {
    vec3 crossSection = funnelSlice(samplePoint, float(i) / 40.0);
    silhouette = min(silhouette, crossSection.x);
    float contribution = exp(-min(crossSection.x * crossSection.x, 40.0) * 3.0);
    coordinates += crossSection.yz * contribution;
    totalWeight += contribution;
  }
  coordinates /= max(totalWeight, 0.000001);
  float travel = coordinates.y;
  float t = clamp(travel, 0.0, 1.0);
  float width = 4.0 + radius * pow(t, 1.85);
  float v = coordinates.x;
  float alive = smoothstep(0.0, 0.045, progress);

  vec2 field = vec2(t * 5.0 - time * 0.21, v * 1.7);
  float curl = fbm(field + vec2(0, time * 0.07));
  float cloud = fbm(field * 2.2 + vec2(curl * 2.4, curl - time * 0.09));
  float detail = fbm(field * 5.0 + vec2(curl * 3.0, -time * 0.12));
  float boundary = silhouette + (curl - 0.5) * 0.19;
  float volume = 1.0 - smoothstep(0.73, 1.13, boundary);
  float front = travel + (cloud - 0.5) * 0.075 * t;
  float reveal = 1.0 - smoothstep(progress - 0.07, progress + 0.025, front);
  volume *= reveal * alive;

  // Curled, uninterrupted threads embedded in broad layers of luminous gas.
  float filament = pow(0.5 + 0.5 * sin(v * 22.0 + t * 13.0 - time * 1.35 + curl * 9.0), 12.0);
  float light = clamp(cloud * 0.65 + detail * 0.28 + filament * 0.30, 0.0, 1.0);
  vec3 gasColor = mix(vec3(0.02, 0.20, 0.13), vec3(0.34, 0.90, 0.66), light);
  float gasAlpha = volume * (0.50 + cloud * 0.47);

  // Four narrow, irregular conducting paths embedded in the existing mist.
  // Their brightness travels smoothly; the portal never flashes on and off.
  float electricity = 0.0;
  for (int i = 0; i < 4; i++) {
    float lane = -0.64 + float(i) * 0.42;
    float jitter = noise(vec2(t * 32.0 + float(i) * 9.0, time * 0.55)) - 0.5;
    float arc = lane + sin(t * 13.0 - time * 0.6 + float(i) * 2.0) * 0.09 + jitter * 0.18;
    float distance = abs(v - arc) * width;
    float pulse = 0.45 + pow(0.5 + 0.5 * sin(t * 18.0 - time * 2.1 + float(i)), 6.0) * 0.55;
    electricity += (exp(-distance * distance / 1.8) * 0.62 + exp(-distance * distance / 45.0) * 0.12) * pulse;
  }
  float mouthCharge = smoothstep(0.72, 1.0, t) * (0.10 + cloud * 0.13);
  float charge = (electricity + influence * 0.16 + wakeLight + mouthCharge) * volume;

  float atmosphere = exp(-v * v * 1.6) * 0.17 * reveal * alive;
  atmosphere *= (1.0 - smoothstep(1.0, 1.2, silhouette));

  vec2 ellipse = (p - mouth) / apertureSize;
  float ringDistance = length(ellipse);
  float angle = atan(ellipse.y, ellipse.x);
  // Rotate the aperture details together: one revolution in roughly 52 seconds.
  // The projected ellipse stays anchored to the end of the gas stream.
  float rotorAngle = angle - time * 0.12;
  // Approximate distance in pixels keeps the energy tube thick around the
  // entire foreshortened aperture, rather than thinning at its left/right sides.
  float rimDistance = (ringDistance - 1.0) * max(ringDistance, 0.1) / max(length(ellipse / apertureSize), 0.1 / apertureSize.x);
  float surfaceTexture = 0.88 + noise(vec2(cos(rotorAngle), sin(rotorAngle)) * 18.0 + rimDistance * 0.18) * 0.12;
  float rim = exp(-pow(rimDistance / 6.5, 2.0)) * surfaceTexture;
  float hotCore = exp(-pow((rimDistance + 1.2) / 2.0, 2.0));
  float bevel = exp(-pow((rimDistance - 5.5) / 2.5, 2.0)) * (0.3 + 0.2 * cos(angle + 2.2));
  float innerRail = exp(-pow((ringDistance - 0.88) * 75.0, 2.0)) * 0.55;
  float sectors = smoothstep(0.15, 0.23, fract((rotorAngle + 3.141593) / 6.283185 * 28.0));
  float outerRail = exp(-pow((ringDistance - 1.15) * 75.0, 2.0)) * sectors * 0.72;
  float ticks = pow(0.5 + 0.5 * cos(rotorAngle * 48.0), 26.0) * smoothstep(1.18, 1.195, ringDistance) * (1.0 - smoothstep(1.25, 1.27, ringDistance));
  float scanner = pow(0.5 + 0.5 * cos(rotorAngle), 14.0);
  float rimGlow = exp(-abs(rimDistance) / 18.0) * 0.30 + exp(-abs(rimDistance) / 42.0) * 0.065;
  float mouthReveal = mix(smoothstep(0.90, 1.0, progress), alive, facing);
  float rimAlpha = (rim * 0.88 + hotCore * 0.72 + bevel + innerRail + outerRail + ticks * 0.4 + rimGlow) * mouthReveal;
  vec3 rimColor = mix(vec3(0.14, 0.82, 0.47), vec3(0.83, 1.0, 0.93), clamp(hotCore * 0.85 + scanner * rim * 0.15, 0.0, 1.0));

  float spark = exp(-length(p - origin) / 10.0) * alive * 0.85;
  float alpha = clamp(gasAlpha + atmosphere + rimAlpha + spark + charge, 0.0, 0.98);
  vec3 color = (gasColor * gasAlpha + vec3(0.08, 0.59, 0.29) * atmosphere + rimColor * rimAlpha + vec3(0.64, 1.0, 0.8) * spark + vec3(0.65, 1.0, 0.86) * charge) / max(alpha, 0.001);
  gl_FragColor = vec4(color, alpha);
}
`;

export function ResumePortal({ origin, progress, panel, pose }: PortalProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const fallback = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const surface = canvas.current;
    const backup = fallback.current;
    if (!surface || !backup) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const gl = surface.getContext("webgl", { alpha: true, premultipliedAlpha: false, antialias: false, depth: false, powerPreference: "low-power" });
    let program: WebGLProgram | null = null;
    let buffer: WebGLBuffer | null = null;
    const shaders: WebGLShader[] = [];
    if (gl) {
      const compile = (type: number, source: string) => {
        const shader = gl.createShader(type);
        if (!shader) return null;
        shaders.push(shader);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
      };
      const vertex = compile(gl.VERTEX_SHADER, vertexSource);
      const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
      if (vertex && fragment) {
        program = gl.createProgram();
        if (program) {
          gl.attachShader(program, vertex);
          gl.attachShader(program, fragment);
          gl.linkProgram(program);
          if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            gl.deleteProgram(program);
            program = null;
          }
        }
      }
      if (program) {
        gl.useProgram(program);
        buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
        const position = gl.getAttribLocation(program, "position");
        gl.enableVertexAttribArray(position);
        gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      }
    }
    const uniforms = gl && program ? Object.fromEntries(["resolution", "viewport", "origin", "mouth", "radius", "time", "progress", "facing", "pointer", "pointerVelocity", "wakes[0]"].map(name => [name, gl.getUniformLocation(program!, name)])) : null;
    const context = uniforms ? null : backup.getContext("2d");
    surface.hidden = !uniforms;
    backup.hidden = !!uniforms;
    surface.dataset.renderer = uniforms ? "webgl" : "canvas";

    let width = 0, height = 0, mouthX = 0, mouthY = 0, radius = 0;
    let source = origin;
    let dirty = true, frame = 0, elapsed = 0, previous = 0, lastProgress = -1;
    const cursor = { x: -1000, y: -1000, targetX: -1000, targetY: -1000, vx: 0, vy: 0, strength: 0, targetStrength: 0, inside: false, lastMove: 0 };
    const wakes = new Float32Array(8 * 4);
    let nextWake = 0, lastWake = -1;
    const clearPointer = () => {
      cursor.inside = false;
      cursor.targetStrength = 0;
      if (preference.matches) cursor.strength = 0;
      dirty = true;
    };
    const disturb = (event: PointerEvent) => {
      // Observe passively so resume scrolling, links and closing keep their normal behavior.
      if (event.target instanceof Node && panel.current?.contains(event.target)) {
        clearPointer();
        return;
      }
      const t = (event.clientX - source.x) / (mouthX - source.x);
      const center = source.y + (mouthY - source.y) * t * t * (3 - 2 * t);
      const r = 4 + radius * Math.max(0, t) ** 1.85;
      if (t < 0 || t > Math.min(1.05, progress.current.value) || Math.abs(event.clientY - center) > r * 1.18 + 12) {
        clearPointer();
        return;
      }
      const now = performance.now();
      const dt = Math.max(12, now - cursor.lastMove);
      const dx = cursor.inside ? event.clientX - cursor.targetX : 0;
      const dy = cursor.inside ? event.clientY - cursor.targetY : 0;
      const speed = Math.min(1, Math.hypot(dx, dy) / dt);
      if (!cursor.inside || preference.matches) {
        cursor.x = event.clientX;
        cursor.y = event.clientY;
      }
      cursor.targetX = event.clientX;
      cursor.targetY = event.clientY;
      cursor.vx = Math.max(-1.5, Math.min(1.5, dx / dt));
      cursor.vy = Math.max(-1.5, Math.min(1.5, dy / dt));
      cursor.targetStrength = .5 + speed * .6;
      cursor.inside = true;
      cursor.lastMove = now;
      if (preference.matches) {
        cursor.strength = .5;
        cursor.vx = cursor.vy = 0;
      } else if (elapsed - lastWake > .035) {
        wakes.set([event.clientX, event.clientY, elapsed, .35 + speed * .65], nextWake * 4);
        nextWake = (nextWake + 1) % 8;
        lastWake = elapsed;
      }
      dirty = true;
    };
    const pointerOut = (event: PointerEvent) => { if (!event.relatedTarget) clearPointer(); };
    const pointerUp = (event: PointerEvent) => { if (event.pointerType !== "mouse") clearPointer(); };
    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const scale = Math.min(1, 1400 / width, 900 / height);
      surface.width = Math.round(width * scale);
      surface.height = Math.round(height * scale);
      backup.width = surface.width;
      backup.height = surface.height;
      source = origin;
      const bounds = panel.current?.getBoundingClientRect();
      mouthX = bounds ? bounds.left + 10 : width * 0.68;
      mouthY = bounds ? bounds.top + bounds.height / 2 : height / 2;
      // On narrow screens the stream still grows to the right before the card covers it.
      if (mouthX < source.x + 100) mouthX = Math.min(width - 28, Math.max(source.x + 110, width * 0.88));
      radius = Math.min(bounds ? bounds.height * 0.43 : height * 0.3, 280);
      clearPointer();
      wakes.fill(0);
      dirty = true;
    };
    // Match the shader's displacement when WebGL is unavailable.
    const displace = (x: number, y: number) => {
      const dx = x - cursor.x, dy = y - cursor.y;
      const distance = Math.max(.01, Math.hypot(dx, dy));
      const influence = Math.exp(-(dx * dx + dy * dy) / 10000) * cursor.strength;
      let shiftX = (-dy * .8 + dx / distance * 20 - cursor.vx * 22) * influence;
      let shiftY = (dx * .8 + dy / distance * 20 - cursor.vy * 22) * influence;
      for (let i = 0; i < 8; i++) {
        const wx = x - wakes[i * 4], wy = y - wakes[i * 4 + 1];
        const length = Math.max(.01, Math.hypot(wx, wy));
        const age = Math.max(0, elapsed - wakes[i * 4 + 2]);
        const wave = Math.sin(length * .075 - age * 10) * Math.exp(-age * 3.2 - length * length / 11000) * wakes[i * 4 + 3];
        shiftX += wx / length * wave * 11;
        shiftY += wy / length * wave * 11;
      }
      return { x: x - shiftX, y: y - shiftY };
    };
    const renderFallback = (amount: number) => {
      if (!context) return;
      context.setTransform(backup.width / width, 0, 0, backup.height / height, 0, 0);
      context.clearRect(0, 0, width, height);
      context.globalCompositeOperation = "lighter";
      for (let i = 0; i < 90; i++) {
        const t = i / 89;
        const fade = Math.min(1, Math.max(0, (amount - t) * 20));
        if (!fade) continue;
        const x = source.x + (mouthX - source.x) * t;
        const y = source.y + (mouthY - source.y) * t * t * (3 - 2 * t);
        const r = 4 + radius * t ** 1.85;
        context.save();
        const point = displace(x, y);
        context.translate(point.x, point.y);
        context.scale(.36, 1);
        const fog = context.createRadialGradient(0, 0, 0, 0, 0, r);
        fog.addColorStop(0, `rgba(88,229,156,${.07 * fade})`);
        fog.addColorStop(.55, `rgba(34,170,105,${.085 * fade})`);
        fog.addColorStop(1, "rgba(14,90,49,0)");
        context.fillStyle = fog;
        context.fillRect(-r, -r, r * 2, r * 2);
        context.restore();
      }
      for (let strand = 0; strand < 32; strand++) {
        const electric = strand % 8 === 2;
        context.beginPath();
        for (let step = 0; step <= 100; step++) {
          const t = amount * step / 100;
          const r = 4 + radius * t ** 1.85;
          const center = source.y + (mouthY - source.y) * t * t * (3 - 2 * t);
          const wave = Math.sin(t * 8 - elapsed * .5 + strand * .37) * .12 + (electric ? Math.sin(t * 77 + strand + elapsed * .7) * .025 : 0);
          const x = source.x + (mouthX - source.x) * t;
          const y = center + r * ((strand / 31 - .5) * 1.65 + wave);
          const point = displace(x, y);
          if (step) context.lineTo(point.x, point.y); else context.moveTo(point.x, point.y);
        }
        context.strokeStyle = electric ? `rgba(165,255,219,${.62 * Math.min(1, amount * 12)})` : `rgba(88,229,156,${.12 * Math.min(1, amount * 12)})`;
        context.lineWidth = electric ? 1.1 : 1.5;
        context.stroke();
      }
      const reveal = Math.max(0, (amount - .9) * 10);
      if (reveal) {
        context.beginPath();
        context.ellipse(mouthX, mouthY, radius * .24, radius, 0, 0, Math.PI * 2);
        context.strokeStyle = `rgba(48,229,132,${reveal * .28})`;
        context.shadowColor = "#58e59c";
        context.shadowBlur = 34;
        context.lineWidth = 18;
        context.stroke();
        context.strokeStyle = `rgba(88,245,162,${reveal * .8})`;
        context.shadowBlur = 15;
        context.lineWidth = 7;
        context.stroke();
        context.strokeStyle = `rgba(211,255,237,${reveal * .95})`;
        context.shadowBlur = 6;
        context.lineWidth = 2.6;
        context.stroke();
        context.beginPath();
        const rotation = elapsed * .12;
        for (let segment = 0; segment < 28; segment++) {
          const start = rotation + segment / 28 * Math.PI * 2;
          context.moveTo(mouthX + Math.cos(start) * radius * .24 * 1.15, mouthY + Math.sin(start) * radius * 1.15);
          context.ellipse(mouthX, mouthY, radius * .24 * 1.15, radius * 1.15, 0, start, start + Math.PI * 2 / 28 * .78);
        }
        context.lineWidth = 1.4;
        context.strokeStyle = `rgba(88,229,156,${reveal * .75})`;
        context.stroke();
        context.shadowBlur = 0;
      }
    };
    const draw = (now: number) => {
      const amount = progress.current.value;
      const turn = pose.current.turn;
      const expansion = pose.current.expand;
      // The resting mouth must not chase the animated PDF bounds. Doing so
      // feeds the resize back into the turn and makes the aperture wobble.
      const restingWidth = Math.min(Math.max(360, width * .3), 520, width - 32);
      const restingRight = Math.min(48, Math.max(16, width * .03));
      const sideX = Math.max(source.x + 100, width - restingRight - restingWidth + 10);
      const sideY = height / 2;
      const centerX = width / 2, centerY = height / 2;
      mouthX = sideX * (1 - turn) + (source.x + (centerX - source.x) * amount) * turn;
      mouthY = sideY * (1 - turn) + (source.y + (centerY - source.y) * amount) * turn;
      radius = (Math.min(height * .34, 280) * (1 - expansion) + Math.hypot(width, height) * .6 * expansion) * (1 - turn + turn * Math.max(.002, amount));
      const dt = previous ? Math.min(now - previous, 50) / 1000 : 0;
      if (!preference.matches) {
        elapsed += dt;
        const ease = 1 - Math.exp(-dt * 16);
        cursor.x += (cursor.targetX - cursor.x) * ease;
        cursor.y += (cursor.targetY - cursor.y) * ease;
        const strength = cursor.inside && now - cursor.lastMove > 80 ? .28 : cursor.targetStrength;
        cursor.strength += (strength - cursor.strength) * ease;
        cursor.vx *= Math.exp(-dt * 5);
        cursor.vy *= Math.exp(-dt * 5);
      }
      previous = now;
      if (dirty || amount !== lastProgress || !preference.matches || turn > 0) {
        if (gl && uniforms) {
          gl.viewport(0, 0, surface.width, surface.height);
          gl.uniform2f(uniforms.resolution, surface.width, surface.height);
          gl.uniform2f(uniforms.viewport, width, height);
          gl.uniform2f(uniforms.origin, source.x, source.y);
          gl.uniform2f(uniforms.mouth, mouthX, mouthY);
          gl.uniform1f(uniforms.radius, radius);
          gl.uniform1f(uniforms.time, elapsed);
          gl.uniform1f(uniforms.progress, amount);
          gl.uniform1f(uniforms.facing, turn);
          gl.uniform4f(uniforms.pointer, cursor.x, cursor.y, cursor.strength, 100);
          gl.uniform2f(uniforms.pointerVelocity, cursor.vx, cursor.vy);
          gl.uniform4fv(uniforms["wakes[0]"], wakes);
          gl.drawArrays(gl.TRIANGLES, 0, 6);
        } else if (turn > .5 && context) {
          context.clearRect(0, 0, backup.width, backup.height);
          context.save();
          context.scale(backup.width / width, backup.height / height);
          for (let i = 0; i < 28; i++) {
            const r = radius * (i + 1) / 28;
            context.beginPath();
            const depth = (i + 1) / 28;
            context.ellipse(source.x + (mouthX - source.x) * depth, source.y + (mouthY - source.y) * depth, r, r, 0, 0, Math.PI * 2);
            context.strokeStyle = `rgba(88,229,156,${amount * (.12 + i / 60)})`;
            context.lineWidth = i === 27 ? 6 : 2;
            context.shadowColor = '#58e59c'; context.shadowBlur = 14;
            context.stroke();
          }
          context.restore();
        } else renderFallback(amount);
        dirty = false;
        lastProgress = amount;
      }
      frame = requestAnimationFrame(draw);
    };
    const visibility = () => {
      cancelAnimationFrame(frame);
      previous = 0;
      if (!document.hidden) frame = requestAnimationFrame(draw);
    };
    const preferenceChanged = () => { clearPointer(); wakes.fill(0); dirty = true; };
    resize();
    frame = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", disturb, { passive: true });
    window.addEventListener("pointerdown", disturb, { passive: true });
    window.addEventListener("pointerout", pointerOut);
    window.addEventListener("pointerup", pointerUp);
    window.addEventListener("pointercancel", clearPointer);
    window.addEventListener("blur", clearPointer);
    document.addEventListener("visibilitychange", visibility);
    preference.addEventListener("change", preferenceChanged);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", disturb);
      window.removeEventListener("pointerdown", disturb);
      window.removeEventListener("pointerout", pointerOut);
      window.removeEventListener("pointerup", pointerUp);
      window.removeEventListener("pointercancel", clearPointer);
      window.removeEventListener("blur", clearPointer);
      document.removeEventListener("visibilitychange", visibility);
      preference.removeEventListener("change", preferenceChanged);
      if (gl) {
        if (buffer) gl.deleteBuffer(buffer);
        if (program) gl.deleteProgram(program);
        shaders.forEach(shader => gl.deleteShader(shader));
      }
    };
  }, [origin, panel, progress, pose]);

  return <><canvas ref={canvas} className="wormhole-art" aria-hidden="true" /><canvas ref={fallback} className="wormhole-art" aria-hidden="true" hidden /></>;
}
