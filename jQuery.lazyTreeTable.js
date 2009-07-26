/*!
 * jQuery lazyTreeTable plugin v0.1
 * http://www.github.com/jdl/jquery-lazy-tree-table
 *
 * Copyright (c) 2009 James Ludlow
 * Licensed under the MIT license.
 * http://www.github.com/jdl/jquery-lazy-tree-table/tree/master/LICENSE
 *
 * @projectDescription  Adds asynchronous expand/collapse functions to a table.
 *
 * @author  James Ludlow
 * @version 0.1
*/
;(function($) {
  $.fn.lazyTableTree = function(options) {
    debug(this);
    var defaults = {
      childFetchPath: "#"
    };
    var opts = $.extend(defaults, options);

    return this.each(function() {
      initExpansionStates(this);
    });
    
    // Initial setup of the rows and their +/- links.
    // * Rows with children inside the tbody tag will have their expand buttons
    //   enabled and collapse buttons hidden.
    // * Add the proper function to the expand/collapse buttons.
    // * Row that are children are collapsed by default.
    function initExpansionStates(table) {
      $('#' + table.id + '>tbody>tr').each(function(i, row) {
        var collapseLink = getCollapseLink(row);
        var expandLink = getExpandLink(row);
        
        // Hide all of the collapse buttons.
        // 'children' here means the td's. It's not the same thing as the
        // children that we're referring to with the rows-as-tree.
        if (collapseLink != null) {
          $(collapseLink).hide();
          $(collapseLink).bind("click", {element: row}, handleCollapseEvent);
        }
        
        if(hasChildren(row)) {
          // Show the expand links and bind the expansion function.
          if (expandLink != null) {
            $(expandLink).show();
            $(expandLink).bind("click", {element: row}, handleExpandEvent);
          }
        } else {
          // Hide the expand links for rows with no children
          if (expandLink != null) {
            $(expandLink).hide();
          }
        }
        
        // Hide all children.
        if(isChild(row)) {
          $(row).hide();
        }
      });
    };
    
    
    // Given a node (row), this returns true if there is another row
    // which lists this node as a parent.
    function hasChildren(row) {
      if (row != null && getChildren(row).length > 0) {
        return true;
      } else {
        return false;
      }
    };
    
    // Returns an array of rows which are direct descendents of the passed-in row.
    function getChildren(row) {
      // Don't let 'siblings' confuse you here.  That's in terms of the table, where all of the
      // rows are siblings. The 'children' we're looking for are other rows which reference the
      // current row as a parent.
      return $(row).siblings('[parentid=' + row.id + ']');
    };
    
    // There should only be one placeholder child per parent, but this returns all of them if it
    // finds more than one.
    function getPlaceholderChildren(row) {
      return $(row).siblings('.att_placeholder[parentid=' + row.id + ']');
    }
    
    // Given a node (row), this returns true if this row is a child of
    // another row.
    function isChild(row) {
      if (row != null && $(row).attr('parentid') != null && $(row).attr('parentid') != '') {
        return true;
      } else {
        return false;
      }
    };
    
    // Given a parent row, this will expand (show) all of its child rows.
    // This only drills down one level in the tree.  It won't open all of the 
    // descendents.
    function expandChildren(parentRow) {
      if (getPlaceholderChildren(row).length > 0) {
        lazyLoadChildren(parentRow);
      }
      getChildren(parentRow).each(function(i, child) {
        $(child).show();
      });
    };
    
    
    // Given a parent row, this finds any children which are currently placeholders and replaces them
    // with data from the server.
    function lazyLoadChildren(parentRow) {
      $.get(opts.childFetchPath, function(data){
        getPlaceholderChildren(parentRow).remove();
        $(parentRow).after(data);
      });
    }
    
    // Someone clicked an "expand" link.
    // Note that the element being passed into here is the row which contains the link.
    function handleExpandEvent(event) {
      row = event.data.element;
      expandChildren(row);
      toggleExpandCollapseLinks(row);
      event.preventDefault();
    };
    
    // Given a parent row, this will collapse (hide) all of its child rows.
    function collapseChildren(parentRow) {
      getChildren(parentRow).each(function(i, child) {
        $(child).hide();
      });
    };
    
    // Someone clicked a "collapse" link.
    // Note that the element being passed into here is the row which contains the link.
    function handleCollapseEvent(event) {
      row = event.data.element;
      collapseChildren(row);
      toggleExpandCollapseLinks(row);
      event.preventDefault();
    };
    
    // Finds the "expand" link in a given row.
    function getExpandLink(row) {
      return $('td:first > a.att_expand_button', $(row))[0]
    };

    // Finds the "collapse" link in a given row.
    function getCollapseLink(row) {
      return $('td:first > a.att_collapse_button', $(row))[0]
    };
    
    // Switches the show/hide states for both the expand and collapse links in a given row.
    function toggleExpandCollapseLinks(row) {
      $(getExpandLink(row)).toggle();
      $(getCollapseLink(row)).toggle();
    };

    function debug($obj) {
    };
  };
})(jQuery);