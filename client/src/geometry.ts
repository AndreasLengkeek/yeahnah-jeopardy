export interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

// FLIP-style transform: given an element already laid out to fill `destination`,
// returns the CSS transform that makes it appear positioned/sized as `source`
// instead. Animating this transform to "none" zooms it from source to destination.
export function zoomTransform(source: Rect, destination: Rect): string {
  if (destination.width === 0 || destination.height === 0) return "none";

  const scaleX = source.width / destination.width;
  const scaleY = source.height / destination.height;
  const translateX = source.left + source.width / 2 - (destination.left + destination.width / 2);
  const translateY = source.top + source.height / 2 - (destination.top + destination.height / 2);

  return `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`;
}
