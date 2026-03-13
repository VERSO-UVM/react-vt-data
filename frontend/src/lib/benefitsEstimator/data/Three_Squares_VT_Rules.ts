// Three Squares VT (Vermont SNAP) eligibility rules, FY2025
// Source: https://www.ahsnet.ahs.state.vt.us/Public/3sVT/assets/BRM/2400_Benefits.htm

type SNAPLimitType = 'grossMonthlyLimit' | 'netMonthlyLimit' | 'maximumBenefit';

interface SNAPTable {
  [size: number]: number;
  additionalMember: number;
}

const THREE_SQUARES_VALUES: Record<SNAPLimitType, SNAPTable> = {
  grossMonthlyLimit: {
    1: 2413,
    2: 3261,
    3: 4109,
    4: 4957,
    5: 5805,
    6: 6653,
    7: 7501,
    8: 8349,
    9: 9197,
    10: 10044,
    additionalMember: 848,
  },
  netMonthlyLimit: {
    1: 1305,
    2: 1763,
    3: 2221,
    4: 2680,
    5: 3138,
    6: 3596,
    7: 4055,
    8: 4513,
    9: 4972,
    10: 5431,
    additionalMember: 459,
  },
  maximumBenefit: {
    1: 298,
    2: 546,
    3: 785,
    4: 994,
    5: 1183,
    6: 1421,
    7: 1571,
    8: 1789,
    9: 2007,
    10: 2225,
    additionalMember: 218,
  },
};

export function getThreeSquaresValues(
  householdSize: number,
  type: SNAPLimitType,
): number {
  const limits = THREE_SQUARES_VALUES[type];
  if (householdSize <= 10) return limits[householdSize];
  return limits[10] + (householdSize - 10) * limits.additionalMember;
}
