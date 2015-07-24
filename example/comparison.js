jQuery(document).ready(function($) {
    function init() {
        // jQuery DataTables initialisation options
        var tableOptions = {
            "columnDefs": [
                {
                    // in the 1st column we want to use this plugin's sort method.
                    // set both type and order data type to plugin name "string-locale-mapped-int", DT needs both for the plugins combined approach to work
                    "orderable": true,
                    "searchable": true,
                    "type": "string-locale-mapped-int", // must be set for DT to use fast integer compare when sorting
                    "orderDataType": "string-locale-mapped-int", // must be set to use custom sort of the plugin to pre compute cell positions
                    "targets": [0]
                },
                    // for 2nd column defaults will be used, ...
                    // for 3rd column we provide an "old" style locale compare for comparison. see below
                {
                    "orderable": true,
                    "searchable": true,
                    "type": "string-locale",
                    "targets": [2]
                }
            ],

            "stringLocaleMapped": {
                "caseInsensitive": true,  // optional, when not true, the locale's default behaviour is used
                "locale": "de"            // optional, default will be browser locale
            },

            // other DT options, set because we have lots of data to make things more convenient (see DataTables documentation)
            "paging": "full",
            "processing": true,
            "deferRender": true
        };


        tableOptions.data = combineColsToRows(shuffle(germanWords.slice(0,10)), shuffle(germanWords.slice(0,10)), shuffle(germanWords.slice(0,10)));

        var $table = $('#table').dataTable( tableOptions );

        // defer the loading of the rest of the data after page is fully rendered (with static 1st page data) and user clicks on load
        $('#load').bind('click', function(){
            var tApi = $table.api();
            tApi.clear();
            tApi.invalidateStringLocaleMappedCache(); // clear sort caches, will recalc on next redraw
            // now load all of data:
            tApi.rows.add(
                combineColsToRows(shuffle(germanWords.slice()), shuffle(germanWords.slice()), shuffle(germanWords.slice()))
            );

            tApi.draw(); // redraw

            $(this).text('Reload data');
            $(this).parent().prev().fadeOut();
        });
    }

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

    // return combined column data array(s) as a 2D array
    function combineColsToRows() {

        var cols = arguments.length;
        if (cols == 0) {
            return [];
        }

        var rows = new Array(arguments[0].length);
        for (var i = 0; i < arguments[0].length; i++) {
            rows[i] = new Array(cols); {
                for (var j = 0; j < cols; j++) {
                    rows[i][j] = arguments[j][i];
                }
            }
        }
        return rows;
    }

    // for comparison: the naive approach, see e.g. chinese-string order plugin
    $.extend($.fn.dataTableExt.type.order, {
      "string-locale-asc": function (x, y) { return x.localeCompare(y); },
      "string-locale-desc": function (x, y) { return y.localeCompare(x); }
    });

    init();
} );
