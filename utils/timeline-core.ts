export const TIMELINE_HOUR_MS = 60 * 60 * 1000;
export const TIMELINE_DAY_HOURS = 24;
export const TIMELINE_EDGE_HOURS = 2;
export const TIMELINE_VISIBLE_HOURS = TIMELINE_DAY_HOURS + TIMELINE_EDGE_HOURS * 2;
export const TIMELINE_CELL_WIDTH = 74;
export const TIMELINE_NAV_LEADING_CELLS = 1;

export function getHourIndexForDate(date: Date) {
  return Math.floor(date.getTime() / TIMELINE_HOUR_MS);
}

export function getFocusedDateTimeFromHourIndex(hourIndex: number) {
  return new Date(hourIndex * TIMELINE_HOUR_MS);
}

export function getLocalDayStart(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function shiftLocalDay(date: Date, offsetDays: number) {
  const next = getLocalDayStart(date);
  next.setDate(next.getDate() + offsetDays);
  return next;
}

export function getTimelineHourIndicesForDay(day: Date) {
  const dayStartHourIndex = getHourIndexForDate(getLocalDayStart(day));
  const startHourIndex = dayStartHourIndex - TIMELINE_EDGE_HOURS;

  return Array.from(
    { length: TIMELINE_VISIBLE_HOURS },
    (_, index) => startHourIndex + index
  );
}

export function getFocusedHourIndexFromScrollOffset(
  scrollOffset: number,
  startHourIndex: number,
  viewportWidth: number,
  sidePad: number,
  cellWidth = TIMELINE_CELL_WIDTH
) {
  const localHourIndex = Math.round(
    (scrollOffset + viewportWidth / 2 - sidePad - cellWidth / 2) / cellWidth
  ) - TIMELINE_NAV_LEADING_CELLS;

  return startHourIndex + localHourIndex;
}

export function getScrollOffsetForHourIndex(
  hourIndex: number,
  startHourIndex: number,
  viewportWidth: number,
  sidePad: number,
  cellWidth = TIMELINE_CELL_WIDTH
) {
  const localSlotIndex = hourIndex - startHourIndex + TIMELINE_NAV_LEADING_CELLS;
  return sidePad + (localSlotIndex + 0.5) * cellWidth - viewportWidth / 2;
}

