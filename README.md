# datatablesLocaleSort
jQuery DataTables sort plugin for locale aware String sorts. Performance optimized for large static data sets. 
Requires DataTables 1.10 or newer.

In non english languages Javascript Array.sort using String.compare() gives false order,
e.g in German correct sort order is: Arzt, Ärzte, Ast, Baum, Zeder
in contrast to Arzt, Ast, Baum, Zeder, Ärzte as in English/ASCII string sort

Since String.localeCompare is extremely expansive performance wise this uses the following approach:
Pre sort all column fields using String.localeCompare (onyl when necessary) and then map each cell to the position in the ordered list and cache that.
Later DataTables.api().sort() just uses the position index (an integer).
The sorting can then take advantage of much faster integer comparison (even faster than ASCII string comparison).

Attention: The pre computed cache must be invalidated and rebuild whenever the underlying
data changes (e.g. Rows added/removed). The plugin does not check this, user has to invalidate here.
Thus this will only be fast for relatively static data.

For large data sets this can be more than 100 times faster than the naive localeCompare approach.

usage:
drop in DT_localsort.js, include script in your html.
In initialisation options set `"type": "string-locale-mapped-int"` and `"orderDataType":"string-locale-mapped-int"`
for each column that shall benefit from  sorted with this plugin.

Example:
```
$('#example').dataTable( {
        "columnDefs": [ {
                'searchable':true,
                "type": "string-locale-mapped-int",
                "orderDataType":"string-locale-mapped-int",
                "targets": [ 0, 1 ]
        } ]
});
```