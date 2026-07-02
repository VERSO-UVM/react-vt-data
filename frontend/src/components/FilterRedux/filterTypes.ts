/**
 * @author Fitz Koch
 * @since 2026-06-25
 *
 * @description
 *   Filter types that are used across files.
 */

///// Core Filter Objects ///

// filters can be either
//     lists of strings AND booleans-as-strings (values to IN on in sql)
//    (min max) tuples for ranges.
export type FilterValue = string[] | { min: number; max: number };

// the specification for ONE filter.
// this is equivalent to a FilterSource.
export interface FilterSpec {
  filter_table: string; // table to filter on
  filters: Record<string, FilterValue>; // filter values {label: value}
}

// cascading filter tree to walk down.
export type FilterTree = { [key: string]: FilterTree | null };

///////// Shared prop objects for filter functions.

// type that goes into cascade filter and others.
export type apiFilterParams = {
  spec: FilterSpec;
  setValue: (v: Record<string, FilterValue>) => void;
};

////////// Types for pre-defining filters to hydrate
type filterStyle = 'Cascade' | 'Checkbox';
export type filterDef = {
  filter_table: string;
  filter_style: filterStyle;
};
