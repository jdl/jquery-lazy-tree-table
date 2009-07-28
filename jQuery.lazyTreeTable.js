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
  $.fn.lazyTreeTable = function(options) {
    debug(this);
    var defaults = {
      childFetchPath: "#",
      childRowClassPrefix: "child-of-",
      childPlaceholderRowClass: "child-placeholder",
      expandClass: "expand",
      collapseClass: "collapse",
      spinnerClass: "spinner",
      childTypePrefix: "child-type-"  // Only needed if you want to have a parent with multiple sets of children.
    };
    var opts = $.extend(defaults, options);
    
    var childOfRegex = new RegExp(opts.childRowClassPrefix);
    var hasChildTypeRegex = new RegExp(opts.childTypePrefix);
    
    return this.each(function() {
      $('#' + this.id + '>tbody>tr').each(function(i, row) {
        initRowLinks(row);
        if(!isChild(row)) {
          hideDescendents(row);
        }
      });
    });
    
    // For a row's expand/collapse links, perform the following:
    // * Hide the collapse link(s)
    // * Show any expand links for which there are children of that type.
    function initRowLinks(row) {
      var collapseLinks = getCollapseLinks(row);
      var expandLinks = getExpandLinks(row);
      
      // Hide all of the collapse buttons.
      if (collapseLinks.length > 0) {
        $(collapseLinks).hide();
        $(collapseLinks).bind("click", {element: row}, handleCollapseEvent);
      }
      
      if (expandLinks.length > 0) {
        $(expandLinks).each(function(i, link) {
          if (hasChildren(row, matchingClassFromElement(hasChildTypeRegex, link))) {
            $(link).show();
            $(link).bind("click", {element: row}, handleExpandEvent);
          } else {
            $(link).hide();
          }
        });
      }
    };
    
    // Applies the supplied function to all descendents of the parentRow, but not to 
    // the parentRow itself.
    function applyToBranch(parentRow, fn) {
      getChildren(parentRow).each(function(i, child) {
        fn(child);
        applyToBranch(child, fn);
      });
    };
    
    // Given a parent row, hide all descendents.
    function hideDescendents(parentRow) {
      applyToBranch(parentRow, function(row) {
        $(row).hide();
      });
    };
    
    // Returns the parent row to the supplied row, or null.
    function getParent(row) {
      var childOfClassName = matchingClassFromElement(childOfRegex, row);
      if (childOfClassName) {
        var parentId = childOfClassName.slice(opts.childRowClassPrefix.length);
        // The call to .parent() here is the jQuery call that will give us the 
        // tbody (or table) that contains this row. This is being used to scope the
        // find to only this table in case there is a duplicate ID in another table
        // somewhere else on the page.
        var parent = $(row).parent().find('#' + parentId);
        return parent;
      } else {
        return null;
      }
    };
    
    // Checks to see if a given row ID is an ancestor of a given row.
    function hasAncestor(row, ancestorId) {
      var parentRow = getParent(row);
      if (parentRow) {
        return parentRow.attr('id') == ancestorId || hasAncestor(parentRow, ancestorId);
      } else {
        return false;
      }
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
    // If a childType is specifed, only child rows with that class will be considered.
    function getChildren(row, childType) {
      // Don't let 'siblings' confuse you here.  That's in terms of the table, where all of the
      // rows are siblings. The 'children' we're looking for are other rows which reference the
      // current row as a parent.
      var selectorString = '.' + opts.childRowClassPrefix + row.id;
      if (childType) {
        selectorString = selectorString + "." + childType;
      }
      return $(row).siblings(selectorString);
    };
    
    // There should only be one placeholder child per parent, but this returns all of them if it
    // finds more than one.
    function getPlaceholderChildren(row, childType) {
      return getChildren(row, childType).filter('.' + opts.childPlaceholderRowClass)
    }
    
    // Given a node (row), this returns true if this row is a child of
    // another row.
    function isChild(row) {
      if (row != null && $(row).attr('class').match(childOfRegex)) {
        return true;
      } else {
        return false;
      }
    };
    
    // Given a parent row, this will expand (show) all of its child rows.
    // This only drills down one level in the tree.  It won't open all of the 
    // descendents.
    function expandChildren(parentRow, childType) {
      if (getPlaceholderChildren(parentRow, childType).length > 0) {
        lazyLoadChildren(parentRow, childType);
      }
      getChildren(parentRow, childType).each(function(i, child) {
        $(child).show();
      });
    };
    
    // Given a parent row, this finds any children which are currently placeholders and replaces them
    // with data from the server.
    function lazyLoadChildren(parentRow, childType) {
      $('td:first', parentRow).addClass(opts.spinnerClass);
      $.get(opts.childFetchPath, {child_type: childType}, function(data) {
        getPlaceholderChildren(parentRow, childType).remove();
        $(parentRow).after(data);
        
        // Hide any grandchildren (or lower) nodes from the parent that
        // was just expanded.
        var children = getChildren(parentRow);
        children.each(function(i, newRow){
          applyToBranch(newRow, function(row) {
            $(row).hide();
          });
        });
      
        // Initialize the newly injected rows.
        // First, set up the expand/collapse links for this branch.
        applyToBranch(parentRow, function(row) {
          initRowLinks(row);
        });
        
        $('td:first', parentRow).removeClass(opts.spinnerClass);
      });
    };
    
    /* Someone clicked an "expand" link.
     * Several things are about to happen:
     *   1. Hide the clicked expand link.
     *   2. If there is a child placeholder, fetch the child rows remotely.
     *   3. Show the child rows.
     *   4. Show the collapse link. If the expand link is tied to a child type, then only show the 
     *      corresponding collapse link.
     *   5. If non-placeholder children exist for a different child type, remove those rows and replace 
     *      them with a placeholder child row.
     */
    function handleExpandEvent(event) {
      var row = event.data.element;
      var childType = matchingClassFromElement(hasChildTypeRegex, event.target);
      
      // Hide the link that was clicked.
      $(event.target).hide();
      expandChildren(row, childType);
      $(getCollapseLinks(row, childType)).show();
      replaceChildrenWithPlaceholder(row, childType);
      
      // If we're dealing with a child type, make sure that for the other types
      // only the expand links are showing.
      if (childType) {
        $(getExpandLinks(row)).each(function(i, link){
          if(matchingClassFromElement(hasChildTypeRegex, link) != childType) {
            $(link).show();
          }
        });
        $(getCollapseLinks(row)).each(function(i, link){
          if(matchingClassFromElement(hasChildTypeRegex, link) != childType) {
            $(link).hide();
          }
        });
      }
      
      event.preventDefault();
    };
    
    
    /*
     * Checks for any non-placeholder children which are not of the ignoredChildType
     * and replaces them with a single child placeholder per child type.
     */
    function replaceChildrenWithPlaceholder(row, ignoredChildType) {
      var childTypesToBeReplaced = [];
      getChildren(row).each(function(i, child) {
        if (!$(child).hasClass(opts.childPlaceholderRowClass)) {
          // This child row is not already a placeholder.
          thisChildType = matchingClassFromElement(hasChildTypeRegex, child);
          if (thisChildType != '' && thisChildType != ignoredChildType) {
            // And it's not of the ignored child type.
            // (Only add it once.)
            if (!arrayContains(childTypesToBeReplaced, thisChildType)) {
              childTypesToBeReplaced.push(thisChildType);
            }
          }
        }
      });
      
      for(var i = 0; i < childTypesToBeReplaced.length; i++) {
        // Remove the children of this type.
        getChildren(row, childTypesToBeReplaced[i]).remove();
        // Inject a new child placeholder of the appropriate type.
        var placeholderClass = opts.childRowClassPrefix + row.id + ' ' + opts.childPlaceholderRowClass + ' ' + childTypesToBeReplaced[i];
        $(row).after('<tr class="' + placeholderClass + '"></tr>');
      }
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
      var row = event.data.element;
      var childType = matchingClassFromElement(hasChildTypeRegex, event.target);
      
      $(getCollapseLinks(row, childType)).hide();
      collapseChildren(row);
      $(getExpandLinks(row, childType)).show();
      event.preventDefault();
    };
    
    // Finds the "expand" links in a given row.
    function getExpandLinks(row, childType) {
      var classString = '.' + opts.expandClass;
      if (childType) {
        classString = classString + '.' + childType;
      }
      return $(classString, $(row), $('td:first > a'))
    };

    // Finds the "collapse" links in a given row.
    function getCollapseLinks(row, childType) {
      var classString = '.' + opts.collapseClass;
      if (childType) {
        classString = classString + '.' + childType;
      }
      return $(classString, $(row), $('td:first > a'))
    };

    // Given an array of strings, return a single string with each array element
    // treated as a class name (prefixed with a '.').
    function arrayToClassString(a) {
      if (a != null && a.length > 0) {
        return s = "." + a.join(",.");
      } else {
        return '';
      }
    };
    
    // Returns the first class associated with the element which matches the regex.
    // We use this, because some of the classes used are just prefixes, filled in by 
    // more info at runtime. (i.e. "child-of-foo").
    function matchingClassFromElement(regex, element) {
      var result = "";
      if (element != null && element.className != null && element.className != '') {
        var classArray = element.className.split(' ');
        for(var i = 0; i < classArray.length; i++) {
          if (classArray[i].match(regex)) {
            result = classArray[i];
            break;
          }
        }
      }
      return result;
    };
    
    
    /* Does this array contain the string?
       In JavaScript 1.6, it would be faster to use Array#indexOf(), but I'm trying to keep this JS 1.5.
    
       Note: I got the idea for switching this to a while loop from here.
             http://stackoverflow.com/questions/237104/javascript-array-containsobj/237176#237176
    */
    function arrayContains(a, obj) {
      var i = a.length;
      while (i--) {
        if (a[i] === obj) {
          return true;
        }
      }
      return false;
    };

    
    function debug(obj) {
      //console.debug("obj: " + obj.toString());
    };
  };
})(jQuery);