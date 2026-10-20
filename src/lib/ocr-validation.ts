export interface ValidatedCropBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function validateCropBox(raw: unknown): ValidatedCropBox | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Record<string, unknown>;
  const x = Number(candidate.x);
  const y = Number(candidate.y);
  const width = Number(candidate.width);
  const height = Number(candidate.height);

  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height)
  ) {
    return null;
  }

  // Reject negative or out-of-range coordinates (normalized 0..100 percentage space)
  if (x < 0 || y < 0 || x >= 100 || y >= 100) {
    return null;
  }
  if (width < 2 || height < 2 || width > 100 || height > 100) {
    return null;
  }
  if (x + width > 100.5 || y + height > 100.5) {
    return null;
  }

  return {
    x: Number(x.toFixed(2)),
    y: Number(y.toFixed(2)),
    width: Number(Math.min(100 - x, width).toFixed(2)),
    height: Number(Math.min(100 - y, height).toFixed(2)),
  };
}
