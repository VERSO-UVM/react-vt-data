# Frontend

There are two main filtering use cases.

1. The user is interested in comparing between two variables, and needs to be able to find those variables.
   - Imagine two side-by-side cascading filters, where you select [Dataset, Category, SubCategory, Variable] for each one and then we show how those two variables compare.
2. The user wants to compile a list of filters to subselect a variable they are interested in.
   - Imagine a long sidebar of filtering options separated by dataset category. Some of these may be more relevant to show as checkboxes or something like that.

## Design

In both situation above, we want _multiple filters_. This means that the filters need to work independently of each other, and constantly report their selections up to a parent. In the current version, there is only one filter, and the selections are stored in a `filterContext`, but this no longer really makes sense.

Instead, we will opt for a series of nested components. * indicates level, number indicates properties.

1. FilterWrap -- Overall component for rendering and getting data from lots of filters.
   - Props:
     - data -- null from parent
     - selectData -- from parent, sets the data value
     - filterlist -- set of definitions of which filters to include
   - Internal state:
     - list of filterspecs, all initially null, built from filterlist with a factory component.
       - FilterSpec = (source, FilterValue[])
         - FilterValue is either string or range
     - components, built also from filterlist, that update filterspecs
   - Included components 2. Filter UI. * We'll start with just cascading filters, then add checkboxes * Props: * api to get filter options from backend (set from filterlist) * current value (initially None from parent filterspec). * for a cascade filter, this is the _path walked through the tree_ ; this should now be recorded explicitly as {column: value} rather than the old way where we used the levels of the tree. * setValue -- a function to set the _correct_ in the filterspec. This must be indexed to update the right one. inherited from parent. * internal state: * filter options from API * for a cascade filter, this is _the tree_ * subselections within filter * returns: * appropriate mantine components to let user select options, according to UI type 2. Apply Button * Props: * filterspecs from parent * selectData * DataURL * internal logic * filter selections and posts to fastAPI * ignores null filters * takes fastAPI response and updates the selectData value, which then the parent of all this actually does stuff with. * returns: * mantine component with apply button that, when clicked, handles this.

## Notes

- The look will be different for each use case, but the logic generally the same
- EXPECT for the apply button logic, which is a bridge to be burnt when we come to it.
