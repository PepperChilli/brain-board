import * as THREE from "three";
import { TAG_MAP } from "./store";

const W = 640;
const H = 400;

function roundRect(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function wrap(ctx, text, maxW) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const test = line ? line + " " + word : word;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Builds an HTMLCanvasTexture representing a single idea card.
export function makeCardTexture({ title = "", tag = "note", desc = "" }, selected = false) {
  const tagDef = TAG_MAP[tag] || TAG_MAP.note;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, W, H);

  // Panel background
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "rgba(15,23,42,0.97)");
  g.addColorStop(1, "rgba(8,12,24,0.97)");
  roundRect(ctx, 10, 10, W - 20, H - 20, 30);
  ctx.fillStyle = g;
  ctx.fill();

  // Tag-colored border (thicker when selected)
  ctx.lineWidth = selected ? 12 : 5;
  ctx.strokeStyle = tagDef.color;
  ctx.globalAlpha = selected ? 0.95 : 0.85;
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Accent bar
  roundRect(ctx, 26, 26, 8, 84, 5);
  ctx.fillStyle = tagDef.color;
  ctx.fill();

  // Tag chip
  ctx.font = "700 26px ui-sans-serif, system-ui, sans-serif";
  const chipText = tagDef.label.toUpperCase();
  const chipW = ctx.measureText(chipText).width + 34;
  roundRect(ctx, 44, 30, chipW, 40, 20);
  ctx.fillStyle = tagDef.color;
  ctx.fill();
  ctx.fillStyle = "#05070f";
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText(chipText, 60, 52);

  // Title
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#f8fafc";
  ctx.font = "700 44px ui-sans-serif, system-ui, sans-serif";
  const titleLines = wrap(ctx, title || "Untitled", W - 108);
  let ty = 92;
  for (let i = 0; i < Math.min(titleLines.length, 2); i++) {
    ctx.fillText(titleLines[i], 44, ty);
    ty += 50;
  }
  if (titleLines.length > 2) {
    ctx.fillStyle = "rgba(148,163,184,0.7)";
    ctx.fillText("…", 44, ty);
  }

  // Description (subtle)
  ctx.font = "400 26px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = "rgba(148,163,184,0.92)";
  let dy = ty + 8;
  const descLines = wrap(ctx, desc, W - 96);
  for (let i = 0; i < Math.min(descLines.length, 3); i++) {
    ctx.fillText(descLines[i], 44, dy);
    dy += 32;
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export const CARD_W = 2.4;
export const CARD_H = 1.5;
