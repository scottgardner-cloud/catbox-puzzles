import type { PixelGrid, ColorGrid, RGBColor, BackgroundMode } from './types';

// ── Background detection ────────────────────────────────────────────

/** Check if a pixel (r, g, b, a) should be treated as background/empty. */
function isBackground(r: number, g: number, b: number, a: number, mode: BackgroundMode): boolean {
  switch (mode.kind) {
    case 'alpha':
      return a < (mode.threshold ?? 128);
    case 'color': {
      const tol = mode.tolerance ?? 30;
      return (
        Math.abs(r - mode.color.r) <= tol &&
        Math.abs(g - mode.color.g) <= tol &&
        Math.abs(b - mode.color.b) <= tol
      );
    }
    case 'none':
      return false;
    case 'auto':
      // Handled separately — auto resolves to alpha or color before calling this
      return false;
  }
}

/** Resolve 'auto' background mode by inspecting image content. */
function resolveAutoBackground(grid: PixelGrid): BackgroundMode {
  // Check if image has meaningful transparency (>10% of pixels)
  let transparentCount = 0;
  const totalPixels = grid.width * grid.height;
  for (let i = 3; i < grid.data.length; i += 4) {
    if (grid.data[i] < 128) {
      transparentCount++;
    }
  }

  if (transparentCount > totalPixels * 0.1) {
    return { kind: 'alpha', threshold: 128 };
  }

  // Sample edge pixels to find the most common edge color
  const edgeColors = new Map<string, { color: RGBColor; count: number }>();

  const sampleEdge = (row: number, col: number): void => {
    const pi = (row * grid.width + col) * 4;
    const r = grid.data[pi];
    const g = grid.data[pi + 1];
    const b = grid.data[pi + 2];
    // Bucket to reduce noise (round to nearest 16)
    const key = `${(r >> 4) << 4},${(g >> 4) << 4},${(b >> 4) << 4}`;
    const existing = edgeColors.get(key);
    if (existing) {
      existing.count++;
    } else {
      edgeColors.set(key, { color: { r, g, b }, count: 1 });
    }
  };

  for (let col = 0; col < grid.width; col++) {
    sampleEdge(0, col);
    sampleEdge(grid.height - 1, col);
  }
  for (let row = 1; row < grid.height - 1; row++) {
    sampleEdge(row, 0);
    sampleEdge(row, grid.width - 1);
  }

  // Find most common edge color
  let bestColor: RGBColor = { r: 255, g: 255, b: 255 };
  let bestCount = 0;
  for (const { color, count } of edgeColors.values()) {
    if (count > bestCount) {
      bestCount = count;
      bestColor = color;
    }
  }

  // Only use edge-based background if it covers a meaningful portion of edges
  const totalEdgePixels = 2 * grid.width + 2 * (grid.height - 2);
  if (bestCount > totalEdgePixels * 0.3) {
    // Verify removing this color leaves enough foreground content
    const candidateMode: BackgroundMode = { kind: 'color', color: bestColor, tolerance: 30 };
    const totalPixels = grid.width * grid.height;
    let fgCount = 0;
    for (let i = 0; i < totalPixels; i++) {
      const pi = i * 4;
      if (
        !isBackground(
          grid.data[pi],
          grid.data[pi + 1],
          grid.data[pi + 2],
          grid.data[pi + 3],
          candidateMode,
        )
      ) {
        fgCount++;
      }
    }
    // If removing the edge color leaves <10% foreground, it's not really a background
    if (fgCount >= totalPixels * 0.1) {
      return candidateMode;
    }
  }

  // No clear background detected
  return { kind: 'none' };
}

// ── Median-cut quantization ─────────────────────────────────────────

interface ColorBucket {
  readonly pixels: { r: number; g: number; b: number }[];
}

/** Find the channel (r, g, b) with the widest range in a bucket. */
function widestChannel(bucket: ColorBucket): 'r' | 'g' | 'b' {
  let rMin = 255,
    rMax = 0,
    gMin = 255,
    gMax = 0,
    bMin = 255,
    bMax = 0;
  for (const p of bucket.pixels) {
    if (p.r < rMin) rMin = p.r;
    if (p.r > rMax) rMax = p.r;
    if (p.g < gMin) gMin = p.g;
    if (p.g > gMax) gMax = p.g;
    if (p.b < bMin) bMin = p.b;
    if (p.b > bMax) bMax = p.b;
  }
  const rRange = rMax - rMin;
  const gRange = gMax - gMin;
  const bRange = bMax - bMin;
  if (rRange >= gRange && rRange >= bRange) return 'r';
  if (gRange >= bRange) return 'g';
  return 'b';
}

/** Average color of all pixels in a bucket. */
function bucketAverage(bucket: ColorBucket): RGBColor {
  let rSum = 0,
    gSum = 0,
    bSum = 0;
  for (const p of bucket.pixels) {
    rSum += p.r;
    gSum += p.g;
    bSum += p.b;
  }
  const n = bucket.pixels.length;
  return {
    r: Math.round(rSum / n),
    g: Math.round(gSum / n),
    b: Math.round(bSum / n),
  };
}

/** Median-cut: split buckets until we have maxColors buckets. */
function medianCut(pixels: { r: number; g: number; b: number }[], maxColors: number): RGBColor[] {
  if (pixels.length === 0) return [];
  if (maxColors <= 1) return [bucketAverage({ pixels })];

  let buckets: ColorBucket[] = [{ pixels: [...pixels] }];

  while (buckets.length < maxColors) {
    // Find the bucket with the most pixels to split
    let splitIdx = 0;
    let maxSize = 0;
    for (let i = 0; i < buckets.length; i++) {
      if (buckets[i].pixels.length > maxSize) {
        maxSize = buckets[i].pixels.length;
        splitIdx = i;
      }
    }

    // Can't split a single-pixel bucket
    if (maxSize <= 1) break;

    const bucket = buckets[splitIdx];
    const channel = widestChannel(bucket);
    const sorted = [...bucket.pixels].sort((a, b) => a[channel] - b[channel]);
    const mid = Math.floor(sorted.length / 2);

    buckets = [
      ...buckets.slice(0, splitIdx),
      { pixels: sorted.slice(0, mid) },
      { pixels: sorted.slice(mid) },
      ...buckets.slice(splitIdx + 1),
    ];
  }

  // Sort palette deterministically by luminance for stable ColorId assignment
  const rawPalette = buckets.map(bucketAverage);
  rawPalette.sort((a, b) => {
    const lumA = 0.299 * a.r + 0.587 * a.g + 0.114 * a.b;
    const lumB = 0.299 * b.r + 0.587 * b.g + 0.114 * b.b;
    return lumA - lumB;
  });

  // Deduplicate colors that averaged to the same RGB value
  const seen = new Set<string>();
  const palette: RGBColor[] = [];
  for (const c of rawPalette) {
    const key = `${c.r},${c.g},${c.b}`;
    if (!seen.has(key)) {
      seen.add(key);
      palette.push(c);
    }
  }
  return palette;
}

/** Squared Euclidean distance between two RGB colors. */
function colorDistSq(a: RGBColor, b: { r: number; g: number; b: number }): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return dr * dr + dg * dg + db * db;
}

/** Find the closest palette color index. */
function closestColor(pixel: { r: number; g: number; b: number }, palette: RGBColor[]): number {
  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < palette.length; i++) {
    const dist = colorDistSq(palette[i], pixel);
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }
  return bestIdx;
}

// ── Public API ──────────────────────────────────────────────────────

/**
 * Quantize a PixelGrid to N colors using median-cut algorithm.
 *
 * Background pixels (detected per mode) become null in the output cells.
 * The palette contains only filled colors — `maxColors` counts filled colors only.
 *
 * @param grid - Source pixel grid
 * @param maxColors - Maximum number of filled colors (2–8, default: 4)
 * @param backgroundMode - How to detect background/empty cells (default: 'auto')
 */
export function quantizeColor(
  grid: PixelGrid,
  maxColors: number = 4,
  backgroundMode: BackgroundMode = { kind: 'auto' },
): ColorGrid {
  const resolvedMode =
    backgroundMode.kind === 'auto' ? resolveAutoBackground(grid) : backgroundMode;

  // Separate foreground pixels from background
  const totalPixels = grid.width * grid.height;
  const isBg = new Uint8Array(totalPixels); // 0 = foreground, 1 = background
  const fgPixels: { r: number; g: number; b: number }[] = [];

  for (let i = 0; i < totalPixels; i++) {
    const pi = i * 4;
    const r = grid.data[pi];
    const g = grid.data[pi + 1];
    const b = grid.data[pi + 2];
    const a = grid.data[pi + 3];

    if (isBackground(r, g, b, a, resolvedMode)) {
      isBg[i] = 1;
    } else {
      fgPixels.push({ r, g, b });
    }
  }

  // Quantize foreground pixels
  const palette = medianCut(fgPixels, maxColors);

  // Map each pixel to nearest palette color (or null for background)
  const cells: (number | null)[] = new Array(totalPixels);
  for (let i = 0; i < totalPixels; i++) {
    if (isBg[i]) {
      cells[i] = null;
    } else {
      const pi = i * 4;
      cells[i] = closestColor(
        { r: grid.data[pi], g: grid.data[pi + 1], b: grid.data[pi + 2] },
        palette,
      );
    }
  }

  return { width: grid.width, height: grid.height, cells, palette };
}
