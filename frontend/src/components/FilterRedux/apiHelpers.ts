/**
 * @author Fitz Koch
 * @since 2026-07-02
 *
 * @description
 *   Small helper functions for calling APIs
 */

import { FilterSpec } from './filterTypes';

export function assemble(specs: FilterSpec[]) {
  return specs.filter((s) => s.filters && Object.keys(s.filters).length > 0);
}
