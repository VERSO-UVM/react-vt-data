import type {
  ChildAgeRange,
  ChildcareDuration,
  ChildcareType,
} from './data/ccfap';

export interface RawHouseholdData {
  earnedMonthlyIncome: number;
  unearnedMonthlyIncome: number;
  adults: number;
  children: number;
  monthlyShelterCost: number;
  monthlyChildcareCost: number;
}

export interface SupplementalInfo {
  hasPregnantMember?: boolean;
  childAgeRange?: ChildAgeRange;
  childcareDuration?: ChildcareDuration;
  childcareType?: ChildcareType;
}

export interface ProcessedHouseholdData {
  grossMonthlyIncome: number;
  netMonthlyIncome: number;
  monthlyChildcareCost: number;
  adults: number;
  children: number;
  householdSize: number;
}

export interface BenefitResult {
  name: string;
  eligible: boolean;
  amount?: number;
}

export interface CalculationResult {
  income: number;
  benefits: BenefitResult[];
}
