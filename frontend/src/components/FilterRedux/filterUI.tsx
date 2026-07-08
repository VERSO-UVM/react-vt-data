/**
 * @author Fitz Koch
 * @since 2026-07-02
 *
 * @description
 *   Short description
 */
import { CascadeFilter } from "./CascadeUI";
import { CheckboxFilter } from "./CheckboxUI";
import { FilterUIProps} from "./filterTypes";



export function FilterUI({ style, params} : FilterUIProps) {

  switch (style) {
    case 'Cascade':  return <CascadeFilter {...params}/>;
    case 'Checkbox': return <CheckboxFilter {...params} />;
  }
}