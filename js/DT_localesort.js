/**
 * jQuery DataTables sort plugin
 * Sorting Strings respecting locale.
 * Performance optimized for large static data sets.
 * Requires DataTables 1.10 or newer.
 *
 * In non english languages Javascript Array.sort using String.compare() gives false order,
 * e.g in German correct sort order is: Arzt, Ärzte, Ast, Baum, Zeder
 * in contrast to Arzt, Ast, Baum, Zeder, Ärzte as in English/ASCII string sort
 *
 * Since String.localeCompare has extremely bad performance this uses the following approach:
 * Sort ONCE the assigend columns using String.localeCompare (or String compare when sufficient), then cache a map of each cell to the position in the ordered list.
 * Later DataTables.api().sort() just uses the position index and can then take advantage of much faster integer comparison.
 * For large data sets this can be more than 100 times faster than the naive localeCompare approach.
 * This should even speed up sorting when there is only ASCII data.
 *
 * Please note that the cache must be invalidated and rebuild whenever the underlying
 * data changes (e.g. Rows added/removed). The plugin does not check this, user has to invalidate here.
 * Thus this will only be fast for relatively static data.
 *
 *
 * usage:
 * drop in DT_localesort.js, include script in your html.
 * In initialisation options set `"type": "string-locale-mapped-int"` and `"orderDataType":"string-locale-mapped-int"`
 * for each column that shall benefit from  sorted with this plugin.
 *
 * @summary Sort respecting Locale, caches order, uses integer compare for sorting
 *
 * @author [Andreas Furtner](https://github.com/AFurtner/)
 *
 * @example
 * ´´´
 * $('#example').dataTable( {
 *				 "columnDefs": [ {
 *								 'searchable':true,
 *								 "type": "string-locale-mapped-int",
 *								 "orderDataType":"string-locale-mapped-int",
 *								 "targets": [ 0, 1 ]
 *				 } ],
 *				 "stringLocaleMapped": { "caseInsensitive": false }, // optional, default is to order case insensitive, set to false if sort shall respect case
 * });
 *
 * // after adding/ modifing rows which must be reflected in a different sort order:
 * $('#example').api().invalidateStringLocaleSortCache() // will recalc caches on next sort
 * // or
 * $('#example').api().recalcStringLocaleSortCache() // will recalc caches immediately
 *
 * ´´´
 */
(function(){
  var factory = function( $, DataTable ) {
    "use strict";

    // invalidate lookup maps for all registered columns, will recalculate caches on next sort (normally executed on next draw())
    $.fn.dataTable.Api.register( 'invalidateStringLocaleSortCache()', function () {
      this.iterator( 'table', function ( context ) {
        context.stringLocaleMapped.cache = [];
      } );

      return this;
    } );

    // invalidate lookup maps for all registered columns
    $.fn.dataTable.Api.register( 'recalcStringLocaleSortCache()', function () {
      this.iterator( 'table', function ( context ) {
        context.stringLocaleMapped.cache = [];
        context.aoColumns.forEach( function(col, colIdx) {
          if (col.bSortable && col.sSortDataType == "string-locale-mapped-int") {
            buildStringLocaleMappedIntColumn(context, colIdx, context.oInstance.api().column(colIdx, {order: 'index'}).data())
          }
        });
      } );

      return this;
    } );


    function init(settings) {
      // this serves as a container for our internal stuff
      settings.stringLocaleMapped = {};

      var myOptions = settings.oInit.stringLocaleMapped;
      // always set this option
      settings.stringLocaleMapped.caseInsensitive = myOptions && myOptions.caseInsensitive === false ? false : true;
      settings.stringLocaleMapped.cache = [];
    }

    function getSortColumnData(tableInstance, settings, colIdx) {
      if (! settings.stringLocaleMapped) {
        init(settings);
      }
      if (! settings.stringLocaleMapped.cache[colIdx] ) {

        return buildStringLocaleMappedIntColumn(settings, colIdx, tableInstance.api().column(colIdx, {order: 'index'}).data());
      }
      return settings.stringLocaleMapped.cache[colIdx];
    }

    /*
     * fast sorting relies on this sorter which maps
     * column cell indexes to (locale respecting) sort positions once!
     * So the expensive localeCompare is not done on each dataTable._fnSort()!
     * That just uses much faster integer comparison afterwards, as long as caches are not invalidated
     */
    function buildStringLocaleMappedIntColumn(context, col, colData){
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
        return {
          "index":i,
          "data": context.stringLocaleMapped.caseInsensitive ? (asciiOnly ?  elem.toLowerCase() : elem.toLocaleLowerCase()) : elem,
          "isAscii" : asciiOnly
        }
      });


      // EXPENSIVE sort, we want to do this only once per column, and not
      // in per DataTable.sort() (which internally uses Array.sort(): O(n*log(n)) for merge/quick sort)
      tmpMap.sort(function (x, y) {
        return (x.isAscii && y.isAscii)
            ? (x.data > y.data ? 1 : -1)
            : x.data.localeCompare(y.data);
      });
      context.stringLocaleMapped.cache[col]= new Array(tmpMap.length);
      var colToOrderPos = context.stringLocaleMapped.cache[col];

      colToOrderPos[ tmpMap[0].index ] = 0; // factored out 1st entry to take array index i-1 check out of the loop
      var idxForSameContent = 0;

      for (var i = 1; i< tmpMap.length; i++) {
        if (tmpMap[i].data == tmpMap[i-1].data) {
          // if elems equal, keep sort index equal to make multi column sort possible later
          colToOrderPos[ tmpMap[i].index ] = idxForSameContent;
        } else {
          // default
          colToOrderPos[ tmpMap[i].index ] = i;
          idxForSameContent = i;
        }
      }

      return colToOrderPos;
    }

    $.extend( DataTable.ext.order, {
      "string-locale-mapped-int": function (settings, colIdx) {
        return getSortColumnData(this, settings, colIdx);
      }
    });

    $.extend( DataTable.ext.type.order, {

      /*
       * we need this 'formatter', so that DataTable does not try to use the fallback string-asc|desc compare functions one of the following locale compares
       * for each sorting but instead uses integer comparison on the pre-computed numbers from above
       */
      "string-locale-mapped-int-pre": function (a) { return a; }
      //,
      /*
       * this is would be the naive approach for locale sorting: the two functions would be called for every compare in the inner sort loop in dataTable._fnSort()!
       * --> really slow!
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
