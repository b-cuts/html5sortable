/*
 * HTML5 Sortable jQuery Plugin
 * https://github.com/voidberg/html5sortable
 *
 * Original code copyright 2012 Ali Farhadi.
 * This version is mantained by Alexandru Badiu <andu@ctrlz.ro> & Lukas Oppermann <lukas@vea.re>
 *
 *
 * Released under the MIT license.
 */
'use strict';
/*
 * variables global to the plugin
 */
var dragging;
var draggingHeight;
var placeholders = [];
var sortables = [];
/**
 * Get or set data on element
 * @param {Element} element
 * @param {string} key
 * @param {*} value
 * @return {*}
 */
var _data = function(element, key, value) {
  if (value === undefined) {
    return element && element.h5s && element.h5s[key];
  } else {
    element.h5s = element.h5s || {};
    element.h5s[key] = value;
  }
};
/**
 * Remove data from element
 * @param {Element} element
 */
var _removeData = function(element) {
  delete element.h5s;
};
/**
 * Filter only wanted nodes
 * @param {Array|NodeList} nodes
 * @param {Array/string} wanted
 * @returns {Array}
 * @private
 */
var _filter = function(nodes, wanted) {
  if (!wanted) {
    return [].slice.call(nodes);
  }
  var result = [];
  for (var i = 0; i < nodes.length; ++i) {
    if (typeof wanted === 'string' && nodes[i].matches(wanted)) {
      result.push(nodes[i]);
    }
    if (wanted.indexOf(nodes[i]) !== -1) {
      result.push(nodes[i]);
    }
  }
  return result;
};
/*
 * remove event handlers from items
 * @param [jquery Collection] items
 * @info event.h5s (jquery way of namespacing events, to bind multiple handlers to the event)
 */
var _removeItemEvents = function(items) {
  items = $(items);
  items.off('dragstart.h5s');
  items.off('dragend.h5s');
  items.off('selectstart.h5s');
  items.off('dragover.h5s');
  items.off('dragenter.h5s');
  items.off('drop.h5s');
};
/*
 * remove event handlers from sortable
 * @param {Element} sortable a single sortable
 * @info event.h5s (jquery way of namespacing events, to bind multiple handlers to the event)
 */
var _removeSortableEvents = function(sortable) {
  $(sortable)
    .off('dragover.h5s')
    .off('dragenter.h5s')
    .off('drop.h5s');
};
/*
 * attache ghost to dataTransfer object
 * @param [event] original event
 * @param [object] ghost-object with item, x and y coordinates
 */
var _attachGhost = function(event, ghost) {
  // this needs to be set for HTML5 drag & drop to work
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text', '');

  // check if setDragImage method is available
  if (event.dataTransfer.setDragImage) {
    event.dataTransfer.setDragImage(ghost.item, ghost.x, ghost.y);
  }
};
/**
 * _addGhostPos clones the dragged item and adds it as a Ghost item
 * @param [object] event - the event fired when dragstart is triggered
 * @param [object] ghost - .item = node, draggedItem = jQuery collection
 */
var _addGhostPos = function(e, ghost) {
  if (!ghost.x) {
    ghost.x = parseInt(e.pageX - ghost.draggedItem.offset().left);
  }
  if (!ghost.y) {
    ghost.y = parseInt(e.pageY - ghost.draggedItem.offset().top);
  }
  return ghost;
};
/**
 * _makeGhost decides which way to make a ghost and passes it to attachGhost
 * @param [jQuery selection] $draggedItem - the item that the user drags
 */
var _makeGhost = function($draggedItem) {
  return {
    item: $draggedItem[0],
    draggedItem: $draggedItem
  };
};
/**
 * _getGhost constructs ghost and attaches it to dataTransfer
 * @param [event] event - the original drag event object
 * @param [jQuery selection] $draggedItem - the item that the user drags
 * @param [object] ghostOpt - the ghost options
 */
// TODO: could $draggedItem be replaced by event.target in all instances
var _getGhost = function(event, $draggedItem) {
  // add ghost item & draggedItem to ghost object
  var ghost = _makeGhost($draggedItem);
  // attach ghost position
  ghost = _addGhostPos(event, ghost);
  // attach ghost to dataTransfer
  _attachGhost(event, ghost);
};
/*
 * remove data from sortable
 * @param {Element} sortable a single sortable
 */
var _removeSortableData = function(sortable) {
  _removeData(sortable);
  sortable.removeAttribute('aria-dropeffect');
};
/*
 * remove data from items
 * @param {Array|Element} items
 */
var _removeItemData = function(items) {
  items = $(items);
  items.removeAttr('aria-grabbed');
  items.removeAttr('draggable');
  items.removeAttr('role');
};
/*
 * check if two lists are connected
 * @param {Element} curList
 * @param {Element} destList
 */
var _listsConnected = function(curList, destList) {
  if (curList === destList) {
    return true;
  }
  if (_data(curList, 'connectWith') !== undefined) {
    return _data(curList, 'connectWith') === _data(destList, 'connectWith');
  }
  return false;
};
/*
 * destroy the sortable
 * @param {Element} sortableElement a single sortable
 */
var _destroySortable = function(sortableElement) {
  var opts = _data(sortableElement, 'opts') || {};
  var items = _filter(sortableElement.children, opts.items);
  var handles = opts.handle ? $(items).find(opts.handle) : $(items);
  // remove event handlers & data from sortable
  _removeSortableEvents(sortableElement);
  _removeSortableData(sortableElement);
  // remove event handlers & data from items
  handles.off('mousedown.h5s');
  _removeItemEvents(items);
  _removeItemData(items);
};
/*
 * enable the sortable
 * @param {Element} sortableElement a single sortable
 */
var _enableSortable = function(sortableElement) {
  var opts = _data(sortableElement, 'opts');
  var items = _filter(sortableElement.children, opts.items);
  var handles = opts.handle ? $(items).find(opts.handle) : $(items);
  sortableElement.setAttribute('aria-dropeffect', 'move');
  handles.attr('draggable', 'true');
  // IE FIX for ghost
  // can be disabled as it has the side effect that other events
  // (e.g. click) will be ignored
  var spanEl = (document || window.document).createElement('span');
  if (typeof spanEl.dragDrop === 'function' && !opts.disableIEFix) {
    handles.on('mousedown.h5s', function() {
      if (items.indexOf(this) !== -1) {
        this.dragDrop();
      } else {
        $(this).parents(opts.items)[0].dragDrop();
      }
    });
  }
};
/*
 * disable the sortable
 * @param {Element} sortableElement a single sortable
 */
var _disableSortable = function(sortableElement) {
  var opts = _data(sortableElement, 'opts');
  var items = _filter(sortableElement.children, opts.items);
  var handles = opts.handle ? $(items).find(opts.handle) : $(items);
  sortableElement.setAttribute('aria-dropeffect', 'none');
  handles.attr('draggable', false);
  handles.off('mousedown.h5s');
};
/*
 * reload the sortable
 * @param {Element} sortableElement a single sortable
 * @description events need to be removed to not be double bound
 */
var _reloadSortable = function(sortableElement) {
  var opts = _data(sortableElement, 'opts');
  var items = _filter(sortableElement.children, opts.items);
  var handles = opts.handle ? $(items).find(opts.handle) : $(items);
  // remove event handlers from items
  _removeItemEvents(items);
  handles.off('mousedown.h5s');
  // remove event handlers from sortable
  _removeSortableEvents(sortableElement);
};
/**
 * Get position of the element relatively to its sibling elements
 * @param {Element} element
 * @returns {number}
 */
var _index = function(element) {
  if (!element.parentElement) {
    return 0;
  }
  return [].indexOf.call(element.parentElement.children, element);
};
/**
 * Whether element is in DOM
 * @param {Element} element
 * @returns {boolean}
 */
var _attached = function(element) {
  return !!element.parentNode;
};
/**
 *
 * @param {Element|string} html
 * @returns {Element}
 * @private
 */
var _html2element = function(html) {
  if (typeof html !== 'string') {
    return html;
  }
  var div = document.createElement('div');
  div.innerHTML	= html;
  return div.firstChild;
};
/**
 * Insert before target
 * @param {Element} target
 * @param {Element} element
 */
var _before = function(target, element) {
  target.parentElement.insertBefore(
    element,
    target
  );
};
/**
 * Insert after target
 * @param {Element} target
 * @param {Element} element
 */
var _after = function(target, element) {
  target.parentElement.insertBefore(
    element,
    target.nextElementSibling
  );
};
/**
 * Detach element from DOM
 * @param {Element} element
 * @private
 */
var _detach = function(element) {
  if (element.parentNode) {
    element.parentNode.removeChild(element);
  }
};
/**
 * Make native event that can be dispatched afterwards
 * @param {string} name
 * @param {object} detail
 * @returns {CustomEvent}
 * @private
 */
var _makeEvent = function(name, detail) {
  var e = document.createEvent('Event');
  if (detail) {
    e.detail = detail;
  }
  e.initEvent(name, false, true);
  return e;
};
/*
 * public sortable object
 * @param [object|string] options|method
 */
var sortable = function(selector, options) {

  var method = String(options);

  options = $.extend({
    connectWith: false,
    placeholder: null,
    // dragImage can be null or a jQuery element
    dragImage: null,
    disableIEFix: false,
    placeholderClass: 'sortable-placeholder',
    draggingClass: 'sortable-dragging',
    hoverClass: false
  }, options);

  /* TODO: maxstatements should be 25, fix and remove line below */
  /*jshint maxstatements:false */
  return $(selector).each(function() {

    var sortableElement = this;

    if (/enable|disable|destroy/.test(method)) {
      sortable[method](sortableElement);
      return;
    }

    // get options & set options on sortable
    options = _data(sortableElement, 'opts') || options;
    _data(sortableElement, 'opts', options);
    // reset sortable
    _reloadSortable(sortableElement);
    // initialize
    var items = _filter(sortableElement.children, options.items);
    var index;
    var startParent;
    var placeholder = options.placeholder;
    if (!placeholder) {
      placeholder = document.createElement(
        /^ul|ol$/i.test(sortableElement.tagName) ? 'li' : 'div'
      );
    }
    placeholder = _html2element(placeholder);
    placeholder.classList.add(options.placeholderClass);

    // setup sortable ids
    if (!sortableElement.getAttribute('data-sortable-id')) {
      var id = sortables.length;
      sortables[id] = sortableElement;
      sortableElement.setAttribute('data-sortable-id', id);
      items.forEach(function(i) {
        i.setAttribute('data-item-sortable-id', id);
      });
    }

    _data(sortableElement, 'items', options.items);
    placeholders.push(placeholder);
    if (options.connectWith) {
      _data(sortableElement, 'connectWith', options.connectWith);
    }

    _enableSortable(sortableElement);
    items.forEach(function(i) {
      i.setAttribute('role', 'option');
      i.setAttribute('aria-grabbed', 'false');
    });

    // Mouse over class
    if (options.hoverClass) {
      var hoverClass = 'sortable-over';
      if (typeof options.hoverClass === 'string') {
        hoverClass = options.hoverClass;
      }

      $(items).hover(function() {
        this.classList.add(hoverClass);
      }, function() {
        this.classList.remove(hoverClass);
      });
    }

    // Handle drag events on draggable items
    $(items).on('dragstart.h5s', function(e) {
      e.stopImmediatePropagation();

      if (options.dragImage) {
        _attachGhost(e.originalEvent, {
          item: options.dragImage,
          x: 0,
          y: 0
        });
        console.log('WARNING: dragImage option is deprecated' +
        ' and will be removed in the future!');
      } else {
        // add transparent clone or other ghost to cursor
        _getGhost(e.originalEvent, $(this), options.dragImage);
      }
      // cache selsection & add attr for dragging
      this.classList.add(options.draggingClass);
      dragging = this;
      dragging.setAttribute('aria-grabbed', 'true');
      // grab values
      index = _index(dragging);
      draggingHeight = parseInt(window.getComputedStyle(dragging).height);
      startParent = this.parentElement;
      // trigger sortstar update
      dragging.parentElement.dispatchEvent(
        _makeEvent('sortstart', {
          item: dragging,
          placeholder: placeholder,
          startparent: startParent
        })
      );
    });
    // Handle drag events on draggable items
    $(items).on('dragend.h5s', function() {
      var newParent;
      if (!dragging) {
        return;
      }
      // remove dragging attributes and show item
      dragging.classList.remove(options.draggingClass);
      dragging.setAttribute('aria-grabbed', 'false');
      dragging.style.display = '';

      placeholders.forEach(_detach);
      newParent = this.parentElement;
      dragging.parentElement.dispatchEvent(
        _makeEvent('sortstop', {
          item: dragging,
          startparent: startParent
        })
      );
      if (index !== _index(dragging) || startParent !== newParent) {
        dragging.parentElement.dispatchEvent(
          _makeEvent('sortupdate', {
            item: dragging,
            index: _filter(newParent.children, _data(newParent, 'items'))
              .indexOf(dragging),
            oldindex: items.indexOf(dragging),
            elementIndex: _index(dragging),
            oldElementIndex: index,
            startparent: startParent,
            endparent: newParent
          })
        );
      }
      dragging = null;
      draggingHeight = null;
    });
    // Handle drop event on sortable & placeholder
    // TODO: REMOVE placeholder?????
    $(sortableElement).add([placeholder]).on('drop.h5s', function(e) {
      var visiblePlaceholder;
      if (!_listsConnected(sortableElement, dragging.parentElement)) {
        return;
      }

      e.stopPropagation();
      visiblePlaceholder = placeholders.filter(_attached)[0];
      _after(visiblePlaceholder, dragging);
      dragging.dispatchEvent(_makeEvent('dragend'));
      return false;
    });

    // Handle dragover and dragenter events on draggable items
    $(items)
      .add([sortableElement])
      .on('dragover.h5s dragenter.h5s', function(e) {
        if (!_listsConnected(sortableElement, dragging.parentElement)) {
          return;
        }

        e.preventDefault();
        e.originalEvent.dataTransfer.dropEffect = 'move';
        if (items.indexOf(this) !== -1) {
          var thisHeight = parseInt(window.getComputedStyle(this).height);
          var placeholderIndex = _index(placeholder);
          var thisIndex = _index(this);
          if (options.forcePlaceholderSize) {
            placeholder.style.height = draggingHeight + 'px';
          }

          // Check if `this` is bigger than the draggable. If it is, we have to define a dead zone to prevent flickering
          if (thisHeight > draggingHeight) {
            // Dead zone?
            var deadZone = thisHeight - draggingHeight;
            var offsetTop = $(this).offset().top;
            if (placeholderIndex < thisIndex &&
                e.originalEvent.pageY < offsetTop + deadZone) {
              return false;
            }
            if (placeholderIndex > thisIndex &&
                e.originalEvent.pageY > offsetTop + thisHeight - deadZone) {
              return false;
            }
          }

          dragging.style.display = 'none';
          if (placeholderIndex < thisIndex) {
            _after(this, placeholder);
          } else {
            _before(this, placeholder);
          }
          placeholders
            .filter(function(element) {return element !== placeholder;})
            .forEach(_detach);
        } else {
          if (placeholders.indexOf(this) === -1 &&
            !_filter(this.children, options.items).length) {
            placeholders.forEach(_detach);
            this.appendChild(placeholder);
          }
        }
        return false;
      });
  });
};

sortable.destroy = function(sortableElement) {
  _destroySortable(sortableElement);
};

sortable.enable = function(sortableElement) {
  _enableSortable(sortableElement);
};

sortable.disable = function(sortableElement) {
  _disableSortable(sortableElement);
};

$.fn.sortable = function(options) {
  return sortable(this, options);
};
/* start-testing */
sortable.__testing = {
  // add internal methods here for testing purposes
  _data: _data,
  _removeSortableEvents: _removeSortableEvents,
  _removeItemEvents: _removeItemEvents,
  _removeItemData: _removeItemData,
  _removeSortableData: _removeSortableData,
  _listsConnected: _listsConnected,
  _attachGhost: _attachGhost,
  _addGhostPos: _addGhostPos,
  _getGhost: _getGhost,
  _makeGhost: _makeGhost,
  _index: _index
};
module.exports = sortable;
/* end-testing */
