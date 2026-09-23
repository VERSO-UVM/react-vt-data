/**
 * @description
 *   Plain-language definitions for zoning terms that show up as filter
 *   group labels or checkbox option values but aren't self-explanatory to
 *   non-technical users. Keyed by filter_table, then by exact label/option
 *   text, so a generic term like "Permitted" only picks up the zoning
 *   definition on zoning filters. Looked up in CheckboxUI.tsx to render an
 *   (i) info tooltip next to the term.
 */
const ZONING_TERMS: Record<string, string> = {
  Overlay:
    'A special type of district that lays on top of another base district. The rules for the overlay district pre-empt any rules that conflict in the base district.',
  'Overlay not Affecting Use':
    'A special type of district that lays on top of another base district but does not change what land uses are allowed there.',
  'Public Hearing':
    'This use is allowed, but only after a public hearing where community members can weigh in before a permit is issued.',
  Permitted:
    'This typically means that a particular type of development or land use can be allowed with a permit. Permits may or may not require public review, depending on the jurisdiction.',
  'Allowed/Conditional':
    'The jurisdiction allows this without a public hearing. This could include an absolute allowance (no process required) or simple administrative requirements overseen without a public hearing (e.g., a permit issuance or a site plan review).',
  'Planned Residential Development':
    'A developer proposes a Planned Residential Development (PRD) when they want to build a structure or structures that will be used ONLY for residential purposes and it will require more than one parcel of land.',
  'Planned Unit Development':
    'A developer proposes a Planned Unit Development (PUD) when they want to use more than one parcel of land for more than one purpose. That purpose may or may not include a residential use.',
  'Affordable Housing':
    'Housing that costs significantly less than market-rate housing. Sometimes the landlord receives incentives to charge rent that is just lower than average; other times the tenant pays a portion of their income (like 30%), regardless of how little they make, and the rest of the rent is paid another way.',
};

export const FILTER_GLOSSARY: Record<string, Record<string, string>> = {
  VersoZoning_wide: ZONING_TERMS,
};
