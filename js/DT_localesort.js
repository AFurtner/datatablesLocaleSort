/**
 * DataTables sort plugin for locale aware String sorts.
 * In non english languages String compare gives false results,
 * e.g in German correct sort order is: Arzt, Ärzte, Ast, Baum, Zeder
 * in contrast to Arzt, Ast, Baum, Zeder, Ärzte as in English/ASCII string sort
 * DataTables 1.10 or newer.
 *
 * since String.localeCompare is extremely expansive performance wise this uses the following approach:
 * pre sort all column fields using String.localeCompare (when necessary) and then map each cells term to the position in the ordered list.
 * For sorting afterwards just return the position index (an integer).
 * The sorting can then take advantage of really fast integer comparison (even faster than ASCII string comparison).
 * the pre computed cache must be invalidated and rebuild whenever the underlying data changes (e.g. Rows added/removed). We don't check this, user has to invalidate here.
 * Thus this works good only for relativly static data.
 *
 * For large data sets this can be more than 100 times faster than the naive localeCompare approach.
 *
 * usage: in initialisation options set "sType": "string-locale-mapped-int", "sSortDataType":"string-locale-mapped-int"
 * for each column that shall benefit from  sorted with this plugin
 *
 * @author Andreas Furtner
 */
(function(){
	var factory = function( $, DataTable ) {
		"use strict";


		var columnsSortOrderMap = [];
		DataTable.ext.oApi.fnInvalidateStringLocaleSortCache = function () {
				columnsSortOrderMap = [];
		};

		/*
		 * fast sorting relies on this sorter which maps
		 * locale aware sort to sort positions once!
		 * So the expensive locale compare is done at most once!
		 * afterwards DT just uses much faster integer comparison
		 */
		function buildStringLocaleMappedIntColumn(col, colData){
				function onlyAscii(elem) {
						for (var j = 0; j < elem.length; ++j) {
								if ((0xFF80 & elem.charCodeAt(j)) != 0) {
										return false;
								}
						}
						return true;
				}

				var tmpMap = colData.map(function (elem, i) {
						var asciiOnly = onlyAscii(elem);
						return {"index":i, "data": asciiOnly ?  elem.toLowerCase() : elem.toLocaleLowerCase(), "isAscii" : asciiOnly}
				});


				tmpMap.sort(function (x, y) {
						return (x.isAscii && y.isAscii)
								? (x.data > y.data ? 1 : -1)
								: x.data.localeCompare(y.data); // EXPENSIVE compare, we want to do this only once per column, and not in the Array.sort() loops (O(n*log(n)) average case for merge/quick)
				});
				columnsSortOrderMap[col]= new Array(tmpMap.length);

				columnsSortOrderMap[col][ tmpMap[0].index ] = 0; // factored out 1st entry to take array index i-1 check out of the loop
				var idxForSameContent = 0;

				for (var i = 1; i< tmpMap.length; i++) {
						if (tmpMap[i].data == tmpMap[i-1].data) {
								// if elems equal, keep sort index equal to make multi column sort possible later
								columnsSortOrderMap[col][ tmpMap[i].index ] = idxForSameContent;
						} else {
								// default
								columnsSortOrderMap[col][ tmpMap[i].index ] = i;
								idxForSameContent = i;
						}
				}

				return columnsSortOrderMap[col];
		}

		$.extend( DataTable.ext.order, {
				"string-locale-mapped-int": function (settings, col) {
						if (! columnsSortOrderMap[col] ) {

								return buildStringLocaleMappedIntColumn(col, this.api().column(col, {order: 'index'}).data());
						}
						return columnsSortOrderMap[col];
				}
		});
		$.extend( DataTable.ext.type.order, {

				/*
				 * we need this, so that DataTable does not try to use one of the following locale compares
				 * for each sorting but instead uses integer comparison on the pre-computed numbers from above
				 */
				"string-locale-mapped-int-pre": function (a) { return a; }  //,

				/*
				 * this is what we used before to get the desired behaviour: the two functions were called for every compare in the inner sort loop!
				 * --> really slow!
				 * following two are not needed/ called by DT any more,
				 * since the sorting relies on the above sort cache which maps
				 * locale aware sort to sort positions once!
				 * So the expensive locale compare (and not so much but still expensive String.compare) is done only once!
				 * afterwards DT just uses much faster integer comparison
				 */
				//"string-locale-asc": function (x, y) { return x.localeCompare(y); },
				//"string-locale-desc": function (x, y) { return y.localeCompare(x); }
		});

	}; // /factory

// Define as an AMD module if possible
	if ( typeof define === 'function' && define.amd ) {
		define( ['jquery', 'datatables'], factory );
	}
	else if ( typeof exports === 'object' ) {
		// Node/CommonJS
		factory( require('jquery'), require('datatables') );
	}
	else if ( jQuery ) {
		// Otherwise simply initialise as normal, stopping multiple evaluation
		factory( jQuery, jQuery.fn.dataTable );
	}

})();
