// Source: Vermont Child Care Financial Assistance Program (CCFAP) copay schedule
// https://dcf.vermont.gov/cdd/ccfap

export type ChildAgeRange = 'infant' | 'toddler' | 'preschool' | 'schoolAge';
export type ChildcareDuration = 'fullTime' | 'partTime' | 'extendedCare';
export type ChildcareType = 'registeredHome' | 'licensedCenter';
export type ChildcareInformation = {
  childAgeRange: ChildAgeRange;
  childcareDuration: ChildcareDuration;
  childcareType: ChildcareType;
};

const CCFAP_COPAY_SCHEDULE: Record<
  number,
  { maxIncome: number; weeklyCopay: number }[]
> = {
  3: [
    { maxIncome: 3331, weeklyCopay: 0 },
    { maxIncome: 3886, weeklyCopay: 0 },
    { maxIncome: 4442, weeklyCopay: 50 },
    { maxIncome: 4997, weeklyCopay: 75 },
    { maxIncome: 5552, weeklyCopay: 100 },
    { maxIncome: 6107, weeklyCopay: 125 },
    { maxIncome: 6663, weeklyCopay: 150 },
    { maxIncome: 7218, weeklyCopay: 175 },
    { maxIncome: 7773, weeklyCopay: 200 },
    { maxIncome: 8328, weeklyCopay: 225 },
    { maxIncome: 8883, weeklyCopay: 250 },
    { maxIncome: 9439, weeklyCopay: 275 },
    { maxIncome: 9994, weeklyCopay: 300 },
    { maxIncome: 10549, weeklyCopay: 325 },
    { maxIncome: 11104, weeklyCopay: 350 },
    { maxIncome: 11659, weeklyCopay: 375 },
    { maxIncome: 12215, weeklyCopay: 400 },
    { maxIncome: 12770, weeklyCopay: 425 },
  ],
  4: [
    { maxIncome: 4019, weeklyCopay: 0 },
    { maxIncome: 4689, weeklyCopay: 0 },
    { maxIncome: 5358, weeklyCopay: 50 },
    { maxIncome: 6028, weeklyCopay: 75 },
    { maxIncome: 6698, weeklyCopay: 100 },
    { maxIncome: 7368, weeklyCopay: 125 },
    { maxIncome: 8038, weeklyCopay: 150 },
    { maxIncome: 8707, weeklyCopay: 175 },
    { maxIncome: 9377, weeklyCopay: 200 },
    { maxIncome: 10047, weeklyCopay: 225 },
    { maxIncome: 10717, weeklyCopay: 250 },
    { maxIncome: 11386, weeklyCopay: 275 },
    { maxIncome: 12056, weeklyCopay: 300 },
    { maxIncome: 12726, weeklyCopay: 325 },
    { maxIncome: 13396, weeklyCopay: 350 },
    { maxIncome: 14066, weeklyCopay: 375 },
    { maxIncome: 14735, weeklyCopay: 400 },
    { maxIncome: 15405, weeklyCopay: 425 },
  ],
  5: [
    { maxIncome: 4706, weeklyCopay: 0 },
    { maxIncome: 5491, weeklyCopay: 0 },
    { maxIncome: 6275, weeklyCopay: 50 },
    { maxIncome: 7059, weeklyCopay: 75 },
    { maxIncome: 7844, weeklyCopay: 100 },
    { maxIncome: 8628, weeklyCopay: 125 },
    { maxIncome: 9413, weeklyCopay: 150 },
    { maxIncome: 10197, weeklyCopay: 175 },
    { maxIncome: 10981, weeklyCopay: 200 },
    { maxIncome: 11766, weeklyCopay: 225 },
    { maxIncome: 12550, weeklyCopay: 250 },
    { maxIncome: 13334, weeklyCopay: 275 },
    { maxIncome: 14119, weeklyCopay: 300 },
    { maxIncome: 14903, weeklyCopay: 325 },
    { maxIncome: 15688, weeklyCopay: 350 },
    { maxIncome: 16472, weeklyCopay: 375 },
    { maxIncome: 17256, weeklyCopay: 400 },
    { maxIncome: 18041, weeklyCopay: 425 },
  ],
  6: [
    { maxIncome: 5394, weeklyCopay: 0 },
    { maxIncome: 6293, weeklyCopay: 0 },
    { maxIncome: 7192, weeklyCopay: 50 },
    { maxIncome: 8091, weeklyCopay: 75 },
    { maxIncome: 8990, weeklyCopay: 100 },
    { maxIncome: 9889, weeklyCopay: 125 },
    { maxIncome: 10788, weeklyCopay: 150 },
    { maxIncome: 11686, weeklyCopay: 175 },
    { maxIncome: 12585, weeklyCopay: 200 },
    { maxIncome: 13484, weeklyCopay: 225 },
    { maxIncome: 14383, weeklyCopay: 250 },
    { maxIncome: 15282, weeklyCopay: 275 },
    { maxIncome: 16181, weeklyCopay: 300 },
    { maxIncome: 17080, weeklyCopay: 325 },
    { maxIncome: 17979, weeklyCopay: 350 },
    { maxIncome: 18878, weeklyCopay: 375 },
    { maxIncome: 19777, weeklyCopay: 400 },
    { maxIncome: 20676, weeklyCopay: 425 },
  ],
};

export function getWeeklyCopay(
  householdSize: number,
  income: number,
): number | null {
  const clampedSize = Math.max(3, Math.min(householdSize, 6));
  const schedule = CCFAP_COPAY_SCHEDULE[clampedSize];
  const bracket = schedule.find((item) => income <= item.maxIncome);
  return bracket ? bracket.weeklyCopay : null;
}

// Weekly childcare payment maximums by setting, age, and hours
const CCFAP_PAYMENT_MAXES: Record<
  ChildcareType,
  Record<ChildAgeRange, Record<ChildcareDuration, number>>
> = {
  licensedCenter: {
    infant: { fullTime: 495, partTime: 271, extendedCare: 672 },
    toddler: { fullTime: 465, partTime: 255, extendedCare: 632 },
    preschool: { fullTime: 439, partTime: 240, extendedCare: 597 },
    schoolAge: { fullTime: 371, partTime: 204, extendedCare: 505 },
  },
  registeredHome: {
    infant: { fullTime: 407, partTime: 223, extendedCare: 553 },
    toddler: { fullTime: 382, partTime: 210, extendedCare: 519 },
    preschool: { fullTime: 361, partTime: 198, extendedCare: 491 },
    schoolAge: { fullTime: 321, partTime: 176, extendedCare: 436 },
  },
};

export function getWeeklyChildcarePaymentMax(
  childcareInfo: ChildcareInformation,
): number {
  const rate =
    CCFAP_PAYMENT_MAXES[childcareInfo.childcareType]?.[
      childcareInfo.childAgeRange
    ]?.[childcareInfo.childcareDuration];
  if (rate === undefined) throw new Error('Invalid childcare configuration');
  return rate;
}
