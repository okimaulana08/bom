import React, { useEffect, useRef } from 'react';
import type { Faction } from '../engine/types';
import type { CanvasFxCommand, VfxAnchor } from '../store/duelStore';

interface BattlefieldFXCanvasProps {
  commands: CanvasFxCommand[];
  activeDomainFaction: Faction | null;
}

interface Palette {
  core: string;
  mid: string;
  outer: string;
  glow: string;
}

const FACTION_PALETTES: Record<Faction, Palette> = {
  pyroclast: {
    core: '#fef08a',
    mid: '#fb923c',
    outer: '#ef4444',
    glow: 'rgba(249, 115, 22, 0.85)',
  },
  cryo_mecha: {
    core: '#f0f9ff',
    mid: '#38bdf8',
    outer: '#0284c7',
    glow: 'rgba(56, 189, 248, 0.85)',
  },
  umbra: {
    core: '#f5d0fe',
    mid: '#d946ef',
    outer: '#7e22ce',
    glow: 'rgba(192, 38, 211, 0.85)',
  },
  chrono: {
    core: '#fef9c3',
    mid: '#38bdf8',
    outer: '#818cf8',
    glow: 'rgba(129, 140, 248, 0.85)',
  },
  sylvan: {
    core: '#ecfccb',
    mid: '#34d399',
    outer: '#059669',
    glow: 'rgba(52, 211, 153, 0.85)',
  },
};

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
  gravity: number;
  drag: number;
  shape: 'circle' | 'shard' | 'spark';
  rot: number;
  vrot: number;
}

interface ShockwaveRing {
  x: number;
  y: number;
  r: number;
  maxR: number;
  life: number;
  maxLife: number;
  color: string;
  lineWidth: number;
}

interface Projectile {
  fromX: number;
  fromY: number;
  ctrlX: number;
  ctrlY: number;
  toX: number;
  toY: number;
  elapsed: number;
  duration: number;
  faction: Faction;
  intensity: number;
  isSoulBeam: boolean;
  trail: Array<{ x: number; y: number }>;
}

interface SummonRune {
  x: number;
  y: number;
  radius: number;
  life: number;
  maxLife: number;
  faction: Faction;
  rot: number;
}

interface LightningBolt {
  points: Array<{ x: number; y: number }>;
  life: number;
  maxLife: number;
  color: string;
  width: number;
}

interface WeatherMote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  phase: number;
  alpha: number;
}

function resolveAnchorCoords(anchor: VfxAnchor | undefined, w: number, h: number): { x: number; y: number } {
  if (!anchor || anchor.kind === 'center') {
    return { x: w * 0.5, y: h * 0.48 };
  }
  const attr =
    anchor.kind === 'slot'
      ? `slot-${anchor.owner}-${anchor.slot}`
      : `lp-${anchor.owner}`;
  const el = document.querySelector(`[data-vfx-anchor="${attr}"]`);
  if (el) {
    const rect = el.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }
  if (anchor.kind === 'lp') {
    return { x: w * 0.5, y: anchor.owner === 'opponent' ? h * 0.08 : h * 0.78 };
  }
  const slotX = w * (0.34 + anchor.slot * 0.16);
  return { x: slotX, y: anchor.owner === 'opponent' ? h * 0.34 : h * 0.58 };
}

function buildJaggedBolt(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  segments = 7,
  jitter = 26
): Array<{ x: number; y: number }> {
  const pts: Array<{ x: number; y: number }> = [{ x: x1, y: y1 }];
  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    const bx = x1 + (x2 - x1) * t + (Math.random() - 0.5) * jitter;
    const by = y1 + (y2 - y1) * t + (Math.random() - 0.5) * jitter;
    pts.push({ x: bx, y: by });
  }
  pts.push({ x: x2, y: y2 });
  return pts;
}

export const BattlefieldFXCanvas: React.FC<BattlefieldFXCanvasProps> = ({
  commands,
  activeDomainFaction,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const consumedIdsRef = useRef<Set<string>>(new Set());
  const domainRef = useRef<Faction | null>(activeDomainFaction);
  domainRef.current = activeDomainFaction;

  const simRef = useRef<{
    particles: Particle[];
    rings: ShockwaveRing[];
    projectiles: Projectile[];
    runes: SummonRune[];
    bolts: LightningBolt[];
    weather: WeatherMote[];
    weatherFaction: Faction | null;
    screenFlashAlpha: number;
    screenFlashColor: string;
  }>({
    particles: [],
    rings: [],
    projectiles: [],
    runes: [],
    bolts: [],
    weather: [],
    weatherFaction: null,
    screenFlashAlpha: 0,
    screenFlashColor: '#ffffff',
  });

  const spawnExplosion = (x: number, y: number, faction: Faction, intensity = 1) => {
    const sim = simRef.current;
    const pal = FACTION_PALETTES[faction];
    const count = Math.round(24 * intensity + 14);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (120 + Math.random() * 290) * (0.75 + intensity * 0.35);
      const isShard = faction === 'cryo_mecha' || Math.random() < 0.35;
      sim.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: (2.5 + Math.random() * 4.5) * (0.8 + intensity * 0.25),
        life: 0,
        maxLife: 0.36 + Math.random() * 0.38,
        color: i % 3 === 0 ? pal.core : i % 2 === 0 ? pal.mid : pal.outer,
        gravity: faction === 'pyroclast' ? -60 : 120,
        drag: 0.93,
        shape: isShard ? 'shard' : 'spark',
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 14,
      });
    }

    sim.rings.push({
      x,
      y,
      r: 8,
      maxR: 72 * (0.8 + intensity * 0.45),
      life: 0,
      maxLife: 0.38,
      color: pal.mid,
      lineWidth: 5 + intensity * 1.5,
    });

    if (intensity >= 2) {
      sim.rings.push({
        x,
        y,
        r: 4,
        maxR: 112 * (0.75 + intensity * 0.35),
        life: 0,
        maxLife: 0.52,
        color: pal.core,
        lineWidth: 2.5,
      });
    }

    if (faction === 'umbra' || faction === 'chrono' || intensity >= 2) {
      const boltCount = intensity >= 2 ? 4 : 2;
      for (let b = 0; b < boltCount; b++) {
        const ang = Math.random() * Math.PI * 2;
        const dist = 55 + Math.random() * 65 * intensity;
        sim.bolts.push({
          points: buildJaggedBolt(x, y, x + Math.cos(ang) * dist, y + Math.sin(ang) * dist, 6, 22),
          life: 0,
          maxLife: 0.22 + Math.random() * 0.12,
          color: pal.core,
          width: 2.2,
        });
      }
    }
  };

  // Ingest incoming commands from duelStore
  useEffect(() => {
    const canvas = canvasRef.current;
    const w = canvas ? canvas.clientWidth : window.innerWidth;
    const h = canvas ? canvas.clientHeight : window.innerHeight;
    const sim = simRef.current;

    for (const cmd of commands) {
      if (consumedIdsRef.current.has(cmd.id)) continue;
      consumedIdsRef.current.add(cmd.id);
      if (consumedIdsRef.current.size > 160) {
        const first = consumedIdsRef.current.values().next().value;
        if (first) consumedIdsRef.current.delete(first);
      }

      const to = resolveAnchorCoords(cmd.to, w, h);
      const from = resolveAnchorCoords(cmd.from, w, h);
      const pal = FACTION_PALETTES[cmd.faction];
      const intensity = cmd.intensity ?? 1;

      if (cmd.kind === 'projectile' || cmd.kind === 'tribute_beam') {
        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2;
        const perpOffset = (Math.random() > 0.5 ? 1 : -1) * (45 + Math.random() * 45);
        sim.projectiles.push({
          fromX: from.x,
          fromY: from.y,
          ctrlX: midX + perpOffset,
          ctrlY: midY - 20,
          toX: to.x,
          toY: to.y,
          elapsed: 0,
          duration: cmd.kind === 'tribute_beam' ? 0.36 : 0.24,
          faction: cmd.faction,
          intensity,
          isSoulBeam: cmd.kind === 'tribute_beam',
          trail: [],
        });
      } else if (cmd.kind === 'explosion') {
        spawnExplosion(to.x, to.y, cmd.faction, intensity);
      } else if (cmd.kind === 'summon_rune') {
        sim.runes.push({
          x: to.x,
          y: to.y,
          radius: intensity >= 2 ? 95 : 70,
          life: 0,
          maxLife: intensity >= 2 ? 0.85 : 0.65,
          faction: cmd.faction,
          rot: 0,
        });
        // Rising vertical summon light sparks
        const sparkCount = intensity >= 2 ? 28 : 16;
        for (let i = 0; i < sparkCount; i++) {
          const offsetX = (Math.random() - 0.5) * 90;
          sim.particles.push({
            x: to.x + offsetX,
            y: to.y + 40 + Math.random() * 20,
            vx: (Math.random() - 0.5) * 28,
            vy: -(180 + Math.random() * 240),
            size: 2.2 + Math.random() * 3,
            life: 0,
            maxLife: 0.45 + Math.random() * 0.35,
            color: i % 2 === 0 ? pal.core : pal.mid,
            gravity: -40,
            drag: 0.97,
            shape: 'spark',
            rot: 0,
            vrot: 0,
          });
        }
      } else if (cmd.kind === 'spell_burst') {
        sim.rings.push({
          x: to.x,
          y: to.y,
          r: 12,
          maxR: 125 * intensity,
          life: 0,
          maxLife: 0.55,
          color: pal.mid,
          lineWidth: 4,
        });
        sim.runes.push({
          x: to.x,
          y: to.y,
          radius: 82 * intensity,
          life: 0,
          maxLife: 0.62,
          faction: cmd.faction,
          rot: Math.PI / 4,
        });
        spawnExplosion(to.x, to.y, cmd.faction, Math.max(1, intensity * 0.85));
      } else if (cmd.kind === 'heal_burst') {
        for (let i = 0; i < 24; i++) {
          sim.particles.push({
            x: to.x + (Math.random() - 0.5) * 76,
            y: to.y + (Math.random() - 0.5) * 26,
            vx: (Math.random() - 0.5) * 35,
            vy: -(70 + Math.random() * 130),
            size: 3 + Math.random() * 3.5,
            life: 0,
            maxLife: 0.65 + Math.random() * 0.4,
            color: i % 2 === 0 ? '#a7f3d0' : '#34d399',
            gravity: -25,
            drag: 0.98,
            shape: 'circle',
            rot: 0,
            vrot: 0,
          });
        }
        sim.rings.push({
          x: to.x,
          y: to.y,
          r: 10,
          maxR: 85,
          life: 0,
          maxLife: 0.52,
          color: '#34d399',
          lineWidth: 3.5,
        });
      } else if (cmd.kind === 'final_blow') {
        // MASSIVE ANIME SUPERNOVA!
        sim.screenFlashAlpha = 0.72;
        sim.screenFlashColor = pal.core;
        spawnExplosion(to.x, to.y, cmd.faction, 3.2);
        for (let r = 0; r < 3; r++) {
          sim.rings.push({
            x: to.x,
            y: to.y,
            r: 12 + r * 14,
            maxR: 260 + r * 110,
            life: 0,
            maxLife: 0.68 + r * 0.14,
            color: r === 0 ? '#ffffff' : r === 1 ? pal.mid : pal.outer,
            lineWidth: 7 - r * 1.5,
          });
        }
        for (let b = 0; b < 8; b++) {
          const ang = (b / 8) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
          const dist = 220 + Math.random() * 190;
          sim.bolts.push({
            points: buildJaggedBolt(to.x, to.y, to.x + Math.cos(ang) * dist, to.y + Math.sin(ang) * dist, 9, 36),
            life: 0,
            maxLife: 0.45 + Math.random() * 0.2,
            color: b % 2 === 0 ? '#ffffff' : pal.mid,
            width: 3.2,
          });
        }
      }
    }
  }, [commands]);

  // 60fps Master RAF Renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let lastTime = performance.now();
    let width = 0;
    let height = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const initWeather = (faction: Faction | null) => {
      const sim = simRef.current;
      sim.weatherFaction = faction;
      const count = faction ? 34 : 14;
      sim.weather = Array.from({ length: count }, () => ({
        x: Math.random() * (width || 1280),
        y: Math.random() * (height || 720),
        vx:
          faction === 'cryo_mecha'
            ? -22 - Math.random() * 24
            : faction === 'sylvan'
            ? (Math.random() - 0.5) * 26
            : (Math.random() - 0.5) * 18,
        vy:
          faction === 'cryo_mecha'
            ? 32 + Math.random() * 44
            : faction === 'pyroclast'
            ? -(34 + Math.random() * 52)
            : faction === 'umbra'
            ? -(18 + Math.random() * 28)
            : -(10 + Math.random() * 20),
        size: faction === 'cryo_mecha' ? 2 + Math.random() * 2.8 : 1.8 + Math.random() * 2.6,
        phase: Math.random() * Math.PI * 2,
        alpha: 0.28 + Math.random() * 0.45,
      }));
    };

    resize();
    initWeather(domainRef.current);
    window.addEventListener('resize', resize);

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const sim = simRef.current;
      if (sim.weatherFaction !== domainRef.current) {
        initWeather(domainRef.current);
      }

      ctx.clearRect(0, 0, width, height);

      // 1. Ambient Domain Weather Layer
      const df = domainRef.current;
      const wPal = FACTION_PALETTES[df ?? 'chrono'];
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      if (df === 'pyroclast') {
        const g = ctx.createLinearGradient(0, height * 0.78, 0, height);
        g.addColorStop(0, 'rgba(239,68,68,0)');
        g.addColorStop(1, 'rgba(234,88,12,0.13)');
        ctx.fillStyle = g;
        ctx.fillRect(0, height * 0.78, width, height * 0.22);
      } else if (df === 'cryo_mecha') {
        const g = ctx.createLinearGradient(0, 0, 0, height * 0.25);
        g.addColorStop(0, 'rgba(56,189,248,0.12)');
        g.addColorStop(1, 'rgba(56,189,248,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height * 0.25);
      } else if (df === 'umbra') {
        const g = ctx.createRadialGradient(width * 0.5, height * 0.5, width * 0.1, width * 0.5, height * 0.5, width * 0.7);
        g.addColorStop(0, 'rgba(168,85,247,0.03)');
        g.addColorStop(1, 'rgba(88,28,135,0.16)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);
      } else if (df === 'sylvan') {
        const g = ctx.createLinearGradient(0, height * 0.75, 0, height);
        g.addColorStop(0, 'rgba(16,185,129,0)');
        g.addColorStop(1, 'rgba(16,185,129,0.12)');
        ctx.fillStyle = g;
        ctx.fillRect(0, height * 0.75, width, height * 0.25);
      }

      for (const m of sim.weather) {
        m.phase += dt * 2.2;
        m.x += (m.vx + Math.sin(m.phase) * 12) * dt;
        m.y += m.vy * dt;

        if (m.y < -15) {
          m.y = height + 15;
          m.x = Math.random() * width;
        } else if (m.y > height + 15) {
          m.y = -15;
          m.x = Math.random() * width;
        }
        if (m.x < -15) m.x = width + 15;
        if (m.x > width + 15) m.x = -15;

        const twinkle = 0.55 + 0.45 * Math.sin(m.phase * 1.7);
        ctx.globalAlpha = (df ? m.alpha : m.alpha * 0.4) * twinkle;
        ctx.fillStyle = m.size > 3.2 ? wPal.core : wPal.mid;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Projectiles & Tribute Soul Beams
      for (let i = sim.projectiles.length - 1; i >= 0; i--) {
        const p = sim.projectiles[i];
        p.elapsed += dt;
        const t = Math.min(1, p.elapsed / p.duration);
        const inv = 1 - t;
        const px = inv * inv * p.fromX + 2 * inv * t * p.ctrlX + t * t * p.toX;
        const py = inv * inv * p.fromY + 2 * inv * t * p.ctrlY + t * t * p.toY;
        const pal = FACTION_PALETTES[p.faction];

        p.trail.push({ x: px, y: py });
        if (p.trail.length > 14) p.trail.shift();

        // Draw luminous ribbon trail
        if (p.trail.length > 1) {
          for (let j = 1; j < p.trail.length; j++) {
            const ratio = j / p.trail.length;
            ctx.beginPath();
            ctx.moveTo(p.trail[j - 1].x, p.trail[j - 1].y);
            ctx.lineTo(p.trail[j].x, p.trail[j].y);
            ctx.strokeStyle = p.isSoulBeam ? '#fde047' : pal.mid;
            ctx.globalAlpha = ratio * 0.85;
            ctx.lineWidth = ratio * (p.isSoulBeam ? 7 : 10);
            ctx.lineCap = 'round';
            ctx.stroke();
          }
        }

        // Core glowing orb
        ctx.globalAlpha = 1;
        const orbR = p.isSoulBeam ? 9 : 13;
        const grad = ctx.createRadialGradient(px, py, 1, px, py, orbR * 2.2);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.35, p.isSoulBeam ? '#fde047' : pal.core);
        grad.addColorStop(0.7, pal.mid);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, orbR * 2.2, 0, Math.PI * 2);
        ctx.fill();

        // Shed trail sparks
        if (Math.random() < 0.75) {
          sim.particles.push({
            x: px + (Math.random() - 0.5) * 10,
            y: py + (Math.random() - 0.5) * 10,
            vx: (Math.random() - 0.5) * 70,
            vy: (Math.random() - 0.5) * 70,
            size: 2 + Math.random() * 2.8,
            life: 0,
            maxLife: 0.24 + Math.random() * 0.16,
            color: p.isSoulBeam ? '#fde047' : pal.core,
            gravity: 0,
            drag: 0.92,
            shape: 'circle',
            rot: 0,
            vrot: 0,
          });
        }

        if (t >= 1) {
          spawnExplosion(p.toX, p.toY, p.faction, p.isSoulBeam ? 1.2 : p.intensity);
          sim.projectiles.splice(i, 1);
        }
      }

      // 3. Summon & Spell Magic Rune Circles
      for (let i = sim.runes.length - 1; i >= 0; i--) {
        const rn = sim.runes[i];
        rn.life += dt;
        rn.rot += dt * 3.2;
        const t = rn.life / rn.maxLife;
        if (t >= 1) {
          sim.runes.splice(i, 1);
          continue;
        }
        const pal = FACTION_PALETTES[rn.faction];
        const easeOut = 1 - Math.pow(1 - Math.min(1, t * 2.2), 3);
        const curR = rn.radius * (0.35 + easeOut * 0.75);
        const alpha = t < 0.2 ? t / 0.2 : 1 - (t - 0.2) / 0.8;

        ctx.save();
        ctx.translate(rn.x, rn.y);
        ctx.rotate(rn.rot);
        ctx.globalAlpha = Math.max(0, alpha * 0.9);
        ctx.strokeStyle = pal.mid;
        ctx.lineWidth = 2.5;

        // Outer circle
        ctx.beginPath();
        ctx.arc(0, 0, curR, 0, Math.PI * 2);
        ctx.stroke();

        // Dashed inner rune ring
        ctx.save();
        ctx.setLineDash([8, 6]);
        ctx.strokeStyle = pal.core;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(0, 0, curR * 0.8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Inscribed rotating diamond / hexagram
        for (let k = 0; k < 2; k++) {
          ctx.beginPath();
          for (let v = 0; v < 4; v++) {
            const ang = (v * Math.PI) / 2 + (k * Math.PI) / 4;
            const vx = Math.cos(ang) * curR * 0.92;
            const vy = Math.sin(ang) * curR * 0.92;
            if (v === 0) ctx.moveTo(vx, vy);
            else ctx.lineTo(vx, vy);
          }
          ctx.closePath();
          ctx.strokeStyle = k === 0 ? pal.core : pal.outer;
          ctx.lineWidth = 1.8;
          ctx.stroke();
        }
        ctx.restore();
      }

      // 4. Shockwave Rings
      for (let i = sim.rings.length - 1; i >= 0; i--) {
        const rg = sim.rings[i];
        rg.life += dt;
        const t = rg.life / rg.maxLife;
        if (t >= 1) {
          sim.rings.splice(i, 1);
          continue;
        }
        const eased = 1 - Math.pow(1 - t, 3);
        const r = rg.r + (rg.maxR - rg.r) * eased;
        ctx.globalAlpha = (1 - t) * 0.92;
        ctx.strokeStyle = rg.color;
        ctx.lineWidth = Math.max(1, rg.lineWidth * (1 - t * 0.7));
        ctx.beginPath();
        ctx.arc(rg.x, rg.y, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 5. Lightning Bolts
      for (let i = sim.bolts.length - 1; i >= 0; i--) {
        const b = sim.bolts[i];
        b.life += dt;
        const t = b.life / b.maxLife;
        if (t >= 1) {
          sim.bolts.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = 1 - t;
        ctx.strokeStyle = b.color;
        ctx.lineWidth = b.width * (1 - t * 0.4);
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.beginPath();
        b.points.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
      }

      // 6. Physics Particles
      for (let i = sim.particles.length - 1; i >= 0; i--) {
        const pt = sim.particles[i];
        pt.life += dt;
        const t = pt.life / pt.maxLife;
        if (t >= 1) {
          sim.particles.splice(i, 1);
          continue;
        }
        pt.vx *= Math.pow(pt.drag, dt * 60);
        pt.vy = pt.vy * Math.pow(pt.drag, dt * 60) + pt.gravity * dt;
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.rot += pt.vrot * dt;

        ctx.globalAlpha = (1 - t) * 0.95;
        ctx.fillStyle = pt.color;
        const sz = pt.size * (1 - t * 0.45);

        if (pt.shape === 'shard') {
          ctx.save();
          ctx.translate(pt.x, pt.y);
          ctx.rotate(pt.rot);
          ctx.beginPath();
          ctx.moveTo(0, -sz * 1.4);
          ctx.lineTo(sz * 0.85, 0);
          ctx.lineTo(0, sz * 1.4);
          ctx.lineTo(-sz * 0.85, 0);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        } else if (pt.shape === 'spark') {
          ctx.strokeStyle = pt.color;
          ctx.lineWidth = Math.max(1.2, sz * 0.65);
          ctx.beginPath();
          ctx.moveTo(pt.x, pt.y);
          ctx.lineTo(pt.x - pt.vx * 0.032, pt.y - pt.vy * 0.032);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, sz, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 7. Full-Screen Supernova Flash (Final Blow)
      if (sim.screenFlashAlpha > 0.005) {
        ctx.globalAlpha = sim.screenFlashAlpha;
        ctx.fillStyle = sim.screenFlashColor;
        ctx.fillRect(0, 0, width, height);
        sim.screenFlashAlpha *= Math.pow(0.86, dt * 60);
      }

      ctx.restore();
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[38]"
      aria-hidden="true"
    />
  );
};
