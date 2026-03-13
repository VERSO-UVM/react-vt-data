// Converts raw form inputs into processed values used by benefit calculators.
// Income calculation follows the Three Squares VT net income methodology:
// https://www.ahsnet.ahs.state.vt.us/Public/3sVT/assets/BRM/2400_Benefits.htm#Net_Income

import type {
  RawHouseholdData,
  ProcessedHouseholdData,
  SupplementalInfo,
} from '../types';
import { getStandardDeduction } from '../data/deductions';
import { getWeeklyChildcarePaymentMax } from '../data/ccfap';
import type { ChildcareInformation } from '../data/ccfap';

function processIncome(data: RawHouseholdData): {
  grossMonthlyIncome: number;
  netMonthlyIncome: number;
} {
  const grossMonthlyIncome =
    data.earnedMonthlyIncome + data.unearnedMonthlyIncome;
  const householdSize = data.adults + data.children;

  // Deductions applied in order per BRM §2400
  const earnedDeduction = data.earnedMonthlyIncome * 0.2;
  const standardDeduction = getStandardDeduction(householdSize);
  // TODO: medical, dependent care, child support deductions
  const tempIncome = grossMonthlyIncome - standardDeduction - earnedDeduction;

  // Excess shelter deduction (capped at $600)
  const halfIncome = 0.5 * tempIncome;
  const shelterExcess = Math.max(0, data.monthlyShelterCost - halfIncome);
  const shelterDeduction = Math.min(shelterExcess, 600);

  const netMonthlyIncome = Math.max(tempIncome - shelterDeduction, 0);
  return { grossMonthlyIncome, netMonthlyIncome };
}

function processChildcareCost(
  data: RawHouseholdData,
  supplemental: SupplementalInfo,
): number {
  if (data.children === 0 || data.monthlyChildcareCost === 0) return 0;

  const childcareInfo: ChildcareInformation = {
    childAgeRange: supplemental.childAgeRange ?? 'preschool',
    childcareDuration: supplemental.childcareDuration ?? 'fullTime',
    childcareType: supplemental.childcareType ?? 'licensedCenter',
  };

  // Cap at CCFAP weekly maximum converted to monthly
  return Math.min(
    data.monthlyChildcareCost,
    getWeeklyChildcarePaymentMax(childcareInfo) * 4.33,
  );
}

export default function processHouseholdData(
  data: RawHouseholdData,
  supplemental: SupplementalInfo,
): ProcessedHouseholdData {
  const { grossMonthlyIncome, netMonthlyIncome } = processIncome(data);
  const monthlyChildcareCost = processChildcareCost(data, supplemental);

  return {
    grossMonthlyIncome,
    netMonthlyIncome,
    monthlyChildcareCost,
    adults: data.adults,
    children: data.children,
    householdSize: data.adults + data.children,
  };
}
