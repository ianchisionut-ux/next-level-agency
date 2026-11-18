export const HERO_FIELD_OF_VIEW = 38;

export type HeroLabelAnchor = { x: number; y: number; width: number; height: number };
export type HeroLabelRect = { left: number; top: number; width: number; height: number };

/** Leave room for the copy on desktop and the controls at the stage bottom. */
export function heroLabelBounds(width: number, height: number, wide = width >= 1024) {
  if (![width, height].every(value => Number.isFinite(value) && value > 0)) throw new Error("Invalid hero dimensions");
  const edge = Math.min(16, width * 0.04);
  return { left: wide ? width * 0.51 + 12 : edge, right: width - edge, top: Math.min(16, height * 0.04), bottom: height - Math.min(100, height * 0.24) };
}

const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));

function permutations(indices: number[]): number[][] {
  return indices.length <= 1 ? [indices] : indices.flatMap((value, index) => permutations(indices.filter((_, other) => other !== index)).map(rest => [value, ...rest]));
}

/** Three measured HTML labels; no DOM access and no movement of their 3D anchors. */
export function layoutHeroLabels(
  width: number,
  height: number,
  anchors: readonly HeroLabelAnchor[],
  wide = width >= 1024,
  previous: readonly HeroLabelRect[] = [],
): HeroLabelRect[] {
  if (anchors.length > 3) throw new Error("The hero supports three service labels");
  const bounds = heroLabelBounds(width, height, wide);
  const gap = 8;
  const desired = anchors.map(anchor => {
    if (![anchor.x, anchor.y, anchor.width, anchor.height].every(Number.isFinite) || anchor.width <= 0 || anchor.height <= 0 || anchor.width > bounds.right - bounds.left || anchor.height > bounds.bottom - bounds.top) throw new Error("Invalid hero label dimensions");
    return { left: clamp(anchor.x - anchor.width / 2, bounds.left, bounds.right - anchor.width), top: clamp(anchor.y - 25 - anchor.height, bounds.top, bounds.bottom - anchor.height), width: anchor.width, height: anchor.height };
  });
  const horizontal = (a: HeroLabelRect, b: HeroLabelRect) => a.left < b.left + b.width + gap && b.left < a.left + a.width + gap;
  const overlap = (a: HeroLabelRect, b: HeroLabelRect) => horizontal(a, b) && a.top < b.top + b.height + gap && b.top < a.top + a.height + gap;
  const placed = desired.map(rect => ({ ...rect }));
  const visited = new Set<number>();
  for (let seed = 0; seed < desired.length; seed++) {
    if (visited.has(seed)) continue;
    const group = [seed]; visited.add(seed);
    for (let cursor = 0; cursor < group.length; cursor++) {
      for (let index = 0; index < desired.length; index++) {
        if (!visited.has(index) && horizontal(desired[group[cursor]], desired[index])) { group.push(index); visited.add(index); }
      }
    }
    if (!group.some((index, position) => group.slice(position + 1).some(other => overlap(desired[index], desired[other])))) continue;
    const totalHeight = group.reduce((sum, index) => sum + desired[index].height, 0) + gap * (group.length - 1);
    if (totalHeight > bounds.bottom - bounds.top) throw new Error("Hero labels exceed the available stage height");
    let bestCost = Infinity;
    let best: { index: number; top: number }[] = [];
    for (const order of permutations(group)) {
      let offset = 0;
      const offsets = order.map(index => { const value = offset; offset += desired[index].height + gap; return value; });
      // Pool adjacent violators: the closest vertical stack to the anchors.
      const blocks: { start: number; end: number; sum: number; count: number }[] = [];
      order.forEach((index, position) => {
        blocks.push({ start: position, end: position, sum: desired[index].top - offsets[position], count: 1 });
        while (blocks.length > 1) {
          const right = blocks[blocks.length - 1], left = blocks[blocks.length - 2];
          if (left.sum / left.count <= right.sum / right.count) break;
          blocks.splice(-2, 2, { start: left.start, end: right.end, sum: left.sum + right.sum, count: left.count + right.count });
        }
      });
      const tops: number[] = [];
      blocks.forEach(block => {
        const base = clamp(block.sum / block.count, bounds.top, bounds.bottom - totalHeight);
        for (let position = block.start; position <= block.end; position++) tops[position] = base + offsets[position];
      });
      const cost = order.reduce((sum, index, position) => sum + (tops[position] - desired[index].top) ** 2 + (previous[index] ? 0.15 * (tops[position] - previous[index].top) ** 2 : 0), 0);
      if (cost < bestCost) { bestCost = cost; best = order.map((index, position) => ({ index, top: tops[position] })); }
    }
    best.forEach(({ index, top }) => { placed[index].top = top; });
  }
  return placed;
}

/** Fit a bounding sphere inside a safe area, including every orbital angle. */
export function heroFraming(width: number, height: number, radius: number, wide = width >= 1024) {
  if (![width, height, radius].every(value => Number.isFinite(value) && value > 0)) throw new Error("Invalid hero dimensions");
  const left = wide ? width * 0.49 : Math.min(24, width * 0.06);
  const right = width - Math.min(32, width * 0.06);
  const top = wide ? Math.min(32, height * 0.07) : Math.min(48, height * 0.10);
  const bottom = height - (wide ? Math.min(60, height * 0.12) : Math.min(90, height * 0.18));
  const safeWidth = right - left;
  const safeHeight = bottom - top;
  const tangent = Math.tan(HERO_FIELD_OF_VIEW * Math.PI / 360);
  const halfAngle = Math.min(Math.atan(tangent * safeHeight / height), Math.atan(tangent * safeWidth / height));
  const minDistance = radius / Math.sin(halfAngle) * 1.025;
  const centerX = (left + right) / 2;
  const centerY = (top + bottom) / 2;
  return { minDistance, maxDistance: minDistance * 1.85, initialDistance: minDistance * 1.05,
    offsetX: width / 2 - centerX, offsetY: height / 2 - centerY,
    left, right, top, bottom, centerX, centerY };
}
