export function calcMovingAverageCost({
  existingQty,
  existingAvgCost,
  incomingQty,
  incomingUnitCost,
}) {
  const eq = Number(existingQty) || 0;
  const iq = Number(incomingQty) || 0;
  const totalQty = eq + iq;
  if (totalQty === 0) return 0;
  if (eq === 0) return Number(incomingUnitCost) || 0;
  const value = eq * (Number(existingAvgCost) || 0) + iq * (Number(incomingUnitCost) || 0);
  return Math.round((value / totalQty) * 10000) / 10000;
}

export function calcInventoryValue(qty, avgCost) {
  return Math.round((Number(qty) || 0) * (Number(avgCost) || 0));
}
