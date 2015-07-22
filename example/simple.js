jQuery(document).ready(function($) {
    var init = function () {
        // make two proper data sets for DataTables from supplied german word list
        var dataSet = shuffle(germanWords.slice(0,500).map(function(el) { return [el]; }));
        var altDataSet = shuffle(germanWords.slice(500).map(function(el) { return [el]; }));
        germanWords = null; // not used after here, signal browser can reclaim memory (by garbage collection)

        var $table = $('#table').dataTable( {
            "columnDefs": [{
                // set both type and order data type to plugin name "string-locale-mapped-int", DT needs both for the plugins combined approach to work
                "type": "string-locale-mapped-int", // must be set for DT to use fast integer compare when sorting
                "orderDataType": "string-locale-mapped-int", // must be set to use custom sort of the plugin to pre compute cell positions
                "targets": [0]
            }],
            // there are additional plugin options, see comparison.js (and.html) for more complex example
            data: dataSet
        } );

        var usedDataSet = dataSet;
        $('#load').bind('click', function(){
            usedDataSet = usedDataSet == dataSet ? altDataSet : dataSet;

            $table.api().clear() // clear stale data
                .rows.add( usedDataSet)// load new data (will not reorder, filter, redraw the table)
                .invalidateStringLocaleSortCache() // clear sort caches, will recalc on next redraw
                .draw(); // redraw

            // alternatively, after rows have changed, use
            // .recalcStringLocaleMappedCache()
            // which will recalc the sort order immediately. Preferably you would run this async, e.g. after ajax load success, then redraw
        });

    }();

    // Randomize array. Using Durstenfeld/ Knuth shuffle algorithm.
    function shuffle(array) {
        for (var i = array.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = array[i];
            array[i] = array[j];
            array[j] = temp;
        }
        return array;
    }
} );
