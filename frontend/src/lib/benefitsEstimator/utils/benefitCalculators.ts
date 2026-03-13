import type {
  ProcessedHouseholdData,
  CalculationResult,
  BenefitResult,
  SupplementalInfo,
} from '../types';
import { getThreeSquaresValues } from '../data/Three_Squares_VT_Rules';
import { getMedicaidLimit } from '../data/Medicaid_Rules';
import type { MedicaidLimitType } from '../data/Medicaid_Rules';
import { getWeeklyCopay } from '../data/ccfap';

function calculateThreeSquares(data: ProcessedHouseholdData): BenefitResult {
  const { householdSize, grossMonthlyIncome, netMonthlyIncome } = data;

  const grossLimit = getThreeSquaresValues(householdSize, 'grossMonthlyLimit');
  const netLimit = getThreeSquaresValues(householdSize, 'netMonthlyLimit');
  const maxBenefit = getThreeSquaresValues(householdSize, 'maximumBenefit');

  const eligible =
    grossMonthlyIncome <= grossLimit || netMonthlyIncome <= netLimit;
  const amount = eligible
    ? Math.max(0, Math.round(maxBenefit - netMonthlyIncome * 0.3))
    : 0;

  return {
    name: 'Three Squares VT (SNAP)',
    eligible: amount > 0,
    amount,
  };
}

function calculateMedicaid(
  data: ProcessedHouseholdData,
  supplemental: SupplementalInfo,
): BenefitResult[] {
  const checks: {
    condition: boolean | undefined;
    type: MedicaidLimitType;
    name: string;
  }[] = [
    {
      condition: data.children > 0,
      type: 'ChildrenUnder19',
      name: 'Dr. Dynasaur (Medicaid for Children)',
    },
    {
      condition: supplemental.hasPregnantMember,
      type: 'PregnantWomen',
      name: 'Medicaid for Pregnant Women',
    },
    {
      condition: true,
      type: 'MedicaidForAdults',
      name: 'Medicaid for Adults',
    },
  ];

  return checks
    .filter(({ condition }) => condition)
    .map(({ type, name }) => ({
      name,
      eligible:
        data.grossMonthlyIncome <= getMedicaidLimit(data.householdSize, type),
    }));
}

function calculateCCFAP(data: ProcessedHouseholdData): BenefitResult {
  const base = {
    name: 'Child Care Financial Assistance (CCFAP)',
    eligible: false,
    amount: 0,
  };

  if (data.children === 0 || data.monthlyChildcareCost === 0) return base;

  const weeklyCopay = getWeeklyCopay(
    data.householdSize,
    data.grossMonthlyIncome,
  );
  // null means income is above the schedule ceiling
  if (weeklyCopay === null) return base;

  // NOTE: this is simplified — copay is actually per-child, not per-household
  const weeklyChildcareCost = data.monthlyChildcareCost / 4.33;
  const weeklyBenefit = Math.max(0, weeklyChildcareCost - weeklyCopay);
  const amount = Math.round(weeklyBenefit * 4.33);

  return { name: base.name, eligible: true, amount };
}

export default function calculateBenefits(
  data: ProcessedHouseholdData,
  supplemental: SupplementalInfo,
): CalculationResult {
  return {
    income: data.grossMonthlyIncome,
    benefits: [
      calculateThreeSquares(data),
      calculateCCFAP(data),
      ...calculateMedicaid(data, supplemental),
    ],
  };
}
