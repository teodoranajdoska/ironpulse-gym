export function getMonthlyPrice(priceMkd: number, durationMonths: number): number {
  if (!Number.isFinite(priceMkd) || priceMkd < 0) {
    throw new RangeError('Membership price must be a non-negative finite number.');
  }
  if (!Number.isInteger(durationMonths) || durationMonths <= 0) {
    throw new RangeError('Membership duration must be a positive integer.');
  }
  return priceMkd / durationMonths;
}

export function getSavingsPercentage(
  priceMkd: number,
  durationMonths: number,
  oneMonthPriceMkd: number,
): number {
  if (!Number.isFinite(oneMonthPriceMkd) || oneMonthPriceMkd <= 0) {
    throw new RangeError('The one-month price must be a positive finite number.');
  }
  const fullPrice = oneMonthPriceMkd * durationMonths;
  return Math.max(0, Math.round(((fullPrice - priceMkd) / fullPrice) * 100));
}
