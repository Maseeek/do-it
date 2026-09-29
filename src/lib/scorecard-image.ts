export interface ScorecardImageData {
  weekKey: string;
  maciekName?: string;
  myrnaName?: string;
  maciekScore: number;
  myrnaScore: number;
  maciekStreak: number;
  myrnaStreak: number;
  stakeTitle?: string;
  leaderName: string;
  pointDiff: number;
}

export async function generateScorecardBlob(data: ScorecardImageData): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const width = 1200;
  const height = 660;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not initialize canvas context');

  // 1. Background Gradient (Dark Linear / Apple Fitness aesthetic)
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#0a0a0c');
  bgGrad.addColorStop(0.5, '#121217');
  bgGrad.addColorStop(1, '#09090b');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle background glow for leader
  const glowX = data.maciekScore >= data.myrnaScore ? 320 : 880;
  const radialGlow = ctx.createRadialGradient(glowX, 330, 20, glowX, 330, 360);
  radialGlow.addColorStop(0, data.maciekScore >= data.myrnaScore ? 'rgba(96, 165, 250, 0.16)' : 'rgba(244, 114, 182, 0.16)');
  radialGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = radialGlow;
  ctx.fillRect(0, 0, width, height);

  // Outer border with subtle neon sheen
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 2;
  roundRect(ctx, 24, 24, width - 48, height - 48, 28);
  ctx.stroke();

  // 2. Header
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif';
  ctx.fillText('DO IT', 60, 85);

  ctx.fillStyle = '#a1a1aa';
  ctx.font = '500 18px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif';
  ctx.fillText(`WEEKLY DUEL · ${data.weekKey.toUpperCase()}`, 60, 116);

  // Leader Badge in Header Right
  const badgeText = data.pointDiff === 0 ? 'TIED' : `${data.leaderName.toUpperCase()} LEADING (+${data.pointDiff} PTS)`;
  ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif';
  const badgeWidth = ctx.measureText(badgeText).width + 36;
  const badgeX = width - 60 - badgeWidth;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  roundRect(ctx, badgeX, 64, badgeWidth, 38, 19);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.stroke();

  ctx.fillStyle = '#34d399'; // Emerald
  ctx.fillText(badgeText, badgeX + 18, 88);

  // 3. Player 1: Maciek (Blue card)
  const cardY = 160;
  const cardW = 500;
  const cardH = 340;

  // Maciek card background
  ctx.fillStyle = 'rgba(28, 28, 30, 0.75)';
  roundRect(ctx, 60, cardY, cardW, cardH, 24);
  ctx.fill();
  ctx.strokeStyle = data.maciekScore > data.myrnaScore ? 'rgba(96, 165, 250, 0.45)' : 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = data.maciekScore > data.myrnaScore ? 2.5 : 1.5;
  ctx.stroke();

  // Maciek Title & Emoji
  ctx.fillStyle = '#60a5fa';
  ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif';
  ctx.fillText(`${data.maciekName || 'Maciek'} ⚡`, 95, cardY + 55);

  // Maciek Points
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 84px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif';
  ctx.fillText(`${data.maciekScore}`, 95, cardY + 160);

  ctx.fillStyle = '#71717a';
  ctx.font = '500 24px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif';
  ctx.fillText('pts this week', 95, cardY + 205);

  // Maciek Streak pill
  ctx.fillStyle = 'rgba(96, 165, 250, 0.12)';
  roundRect(ctx, 95, cardY + 245, 180, 44, 22);
  ctx.fill();
  ctx.strokeStyle = 'rgba(96, 165, 250, 0.3)';
  ctx.stroke();

  ctx.fillStyle = '#93c5fd';
  ctx.font = '600 18px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif';
  ctx.fillText(`🔥 ${data.maciekStreak}d Streak`, 115, cardY + 273);

  // 4. VS Divider
  ctx.fillStyle = '#52525b';
  ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('VS', width / 2, cardY + cardH / 2 + 10);
  ctx.textAlign = 'left';

  // 5. Player 2: Myrna (Pink card)
  const myrnaX = width - 60 - cardW;
  ctx.fillStyle = 'rgba(28, 28, 30, 0.75)';
  roundRect(ctx, myrnaX, cardY, cardW, cardH, 24);
  ctx.fill();
  ctx.strokeStyle = data.myrnaScore > data.maciekScore ? 'rgba(244, 114, 182, 0.45)' : 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = data.myrnaScore > data.maciekScore ? 2.5 : 1.5;
  ctx.stroke();

  // Myrna Title & Emoji
  ctx.fillStyle = '#f472b6';
  ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif';
  ctx.fillText(`${data.myrnaName || 'Myrna'} ✨`, myrnaX + 35, cardY + 55);

  // Myrna Points
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 84px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif';
  ctx.fillText(`${data.myrnaScore}`, myrnaX + 35, cardY + 160);

  ctx.fillStyle = '#71717a';
  ctx.font = '500 24px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif';
  ctx.fillText('pts this week', myrnaX + 35, cardY + 205);

  // Myrna Streak pill
  ctx.fillStyle = 'rgba(244, 114, 182, 0.12)';
  roundRect(ctx, myrnaX + 35, cardY + 245, 180, 44, 22);
  ctx.fill();
  ctx.strokeStyle = 'rgba(244, 114, 182, 0.3)';
  ctx.stroke();

  ctx.fillStyle = '#fbcfe8';
  ctx.font = '600 18px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif';
  ctx.fillText(`🔥 ${data.myrnaStreak}d Streak`, myrnaX + 55, cardY + 273);

  // 6. Active Stake Banner (Bottom)
  const footerY = 535;
  if (data.stakeTitle) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    roundRect(ctx, 60, footerY, width - 120, 60, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#fbbf24'; // Amber
    ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif';
    ctx.fillText('🏆 STAKE AT RISK:', 85, footerY + 37);

    ctx.fillStyle = '#ffffff';
    ctx.font = '500 18px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif';
    const stakeText = data.stakeTitle.length > 50 ? `${data.stakeTitle.slice(0, 47)}...` : data.stakeTitle;
    ctx.fillText(stakeText, 265, footerY + 37);
  }

  // Convert canvas to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas conversion to blob failed'));
    }, 'image/png');
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export async function shareScorecardImage(data: ScorecardImageData): Promise<{ action: 'copied' | 'downloaded' }> {
  const blob = await generateScorecardBlob(data);

  // Attempt clipboard write first
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof ClipboardItem !== 'undefined') {
    try {
      const item = new ClipboardItem({ 'image/png': blob });
      await navigator.clipboard.write([item]);
      return { action: 'copied' };
    } catch (e) {
      console.warn('Clipboard writeImage failed, falling back to download', e);
    }
  }

  // Fallback to browser file download
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `scorecard-${data.weekKey}.png`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
  return { action: 'downloaded' };
}
