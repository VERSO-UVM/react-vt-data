// Source: https://info.healthconnect.vermont.gov/compare-plans/medicaid-and-dr-dynasaur

export type MedicaidLimitType =
  'MedicaidForAdults' | 'PregnantWomen' | 'ChildrenUnder19';

const MEDICAID_VALUES: Record<MedicaidLimitType, Record<number, number>> = {
  MedicaidForAdults: {
    1: 1800,
    2: 2433,
    3: 3065,
    4: 3698,
    5: 4329,
    6: 4962,
    7: 5595,
    8: 6227,
  },
  PregnantWomen: {
    1: 0,
    2: 3754,
    3: 4731,
    4: 5707,
    5: 6682,
    6: 7659,
    7: 8635,
    8: 9611,
  },
  ChildrenUnder19: {
    1: 4134,
    2: 5587,
    3: 7040,
    4: 8493,
    5: 9945,
    6: 11398,
    7: 12851,
    8: 14304,
  },
};

export function getMedicaidLimit(
  householdSize: number,
  type: MedicaidLimitType,
): number {
  const limits = MEDICAID_VALUES[type];
  const clampedSize = Math.min(householdSize, 8);
  return limits[clampedSize];
}
