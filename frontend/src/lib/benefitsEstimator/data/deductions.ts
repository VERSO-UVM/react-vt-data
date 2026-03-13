// Source: https://www.ahsnet.ahs.state.vt.us/Public/3sVT/assets/BRM/2400_Benefits.htm#Net_Income

const STANDARD_DEDUCTIONS: Record<number | '6+', number> = {
  1: 209,
  2: 209,
  3: 209,
  4: 223,
  5: 261,
  '6+': 299,
};

export function getStandardDeduction(householdSize: number): number {
  if (householdSize <= 5)
    return STANDARD_DEDUCTIONS[
      householdSize as keyof typeof STANDARD_DEDUCTIONS
    ] as number;
  return STANDARD_DEDUCTIONS['6+'];
}
