/* Lexical read-only wrapper. Upstream source is embedded unchanged below.
No browser globals, DOM attributes/styles, values, focus, or listeners are written. */
(() => {
  const sourceSha256 = "a495b3bf3008d23531df76c86dc99beeea5f982fa49370c09d2e1967fc5635da";
  const logs = [];
  const capture = level => function () { logs.push({level:level,args:Array.prototype.slice.call(arguments)}); };
  const console = {log:capture('log'),warn:capture('warn'),error:capture('error')};
  try {
    const parseFloat = Number.parseFloat;
    const parseInt = Number.parseInt;
    if (typeof parseFloat !== 'function') return {executionStatus:'UNKNOWN',sourceSha256:sourceSha256,reason:'Number.parseFloat unavailable; no parser substitution made',logs:logs};
    if (!document.documentElement || document.documentElement.clientWidth <= 0 || !document.body) return {executionStatus:'UNKNOWN',sourceSha256:sourceSha256,reason:'No nonzero document viewport/body',logs:logs};

    const result =
/* table-check.js - paste into the browser console on any page (rules S1, T1, T2, T3).

   Reads every data table on the page and reports what the standing table rule requires
   and agents most often leave out. It measures structure, so it works on any stack.

     BOX       a column filter that is a bare text box or a select sitting in the table
               head. T1: a filter is a control that opens a panel (sort, value list with
               counts, range for numbers) - a box can say one value and nothing else.
     NOFILTER  a column with a header and no filter control at all (T2).
     FILTERGAP the title row and the filter row are not one header block: a line sits
               between the titles and their filters, or a filter control is under 4px
               from a line above or below it. Measured from computed style and layout,
               never judged by eye - a 0px gap is invisible in a scaled-down screenshot.
     NOSORT    a table of several rows with no sortable header (S1).
     NOSEARCH  no search field for the table (S1). Advisory: it may live in a toolbar
               this check cannot tie to the table, so it is reported, not counted as a
               failure.
     NOCOUNT   no live result count - "5 items" / "2 of 5" in an aria-live region (S1).
               Advisory, for the same reason.
     NOHELP    a header with no explainer - a title, a data-tip, or a [?] button (T3).
               Advisory.

   BOX, NOFILTER, FILTERGAP and NOSORT are failures. The rest are listed below them.

   A table that is deliberately wrong (a "wrong" sample in a rules page) opts out with
   data-table-check="skip" on the table or any ancestor.

   Only data tables are read: a table needs a thead with headers, at least two columns
   and at least one body row, and must not be role="presentation". Returns the list. */
(function tableCheck() {
  var fail = [], note = [];
  function name(t, i) {
    var cap = t.querySelector('caption');
    var lab = t.getAttribute('aria-label') || (cap && cap.textContent.trim()) || t.id || '';
    return 'table ' + (i + 1) + (lab ? ' "' + lab.slice(0, 32) + '"' : '');
  }
  function cellText(c) { return (c.textContent || '').replace(/\s+/g, ' ').trim(); }

  var tables = Array.prototype.filter.call(document.querySelectorAll('table'), function (t) {
    if (t.getAttribute('role') === 'presentation' || t.getAttribute('role') === 'none') { return false; }
    if (t.closest('[data-table-check="skip"]')) { return false; }
    if (!t.offsetParent && getComputedStyle(t).position !== 'fixed') { return false; }  /* not shown */
    var head = t.tHead;
    if (!head || !head.querySelector('th')) { return false; }
    if (!t.tBodies.length || !t.tBodies[0].rows.length) { return false; }
    return head.rows[0].cells.length >= 2;
  });

  tables.forEach(function (t, i) {
    var who = name(t, i), rows = t.tHead.rows, hdr = rows[0], cols = hdr.cells.length;

    /* the filter row: any head row after the first that holds controls or triggers */
    var filterRows = Array.prototype.slice.call(rows, 1);
    var boxes = [], covered = {}, panel = 0;
    filterRows.forEach(function (r) {
      Array.prototype.forEach.call(r.cells, function (c, ci) {
        var trig = c.querySelector('button[aria-haspopup], [aria-haspopup="dialog"], [aria-haspopup="listbox"], [aria-haspopup="true"]');
        var box = c.querySelector('input:not([type=hidden]):not([type=checkbox]):not([type=radio]), select, textarea');
        if (trig) { covered[ci] = true; panel++; }
        else if (box) { covered[ci] = true; boxes.push(hdr.cells[ci] ? cellText(hdr.cells[ci]) : '#' + (ci + 1)); }
      });
    });
    /* a filter field inside the header cell itself is the same defect, one row up */
    Array.prototype.forEach.call(hdr.cells, function (c, ci) {
      if (c.querySelector('input:not([type=hidden]):not([type=checkbox]):not([type=radio]), select')) {
        covered[ci] = true; boxes.push(cellText(c) || '#' + (ci + 1));
      }
    });

    if (boxes.length) {
      fail.push('BOX | ' + who + ' | ' + boxes.length + ' of ' + cols + ' column filters are a bare ' +
                'text box or select (' + boxes.slice(0, 4).join(', ') + (boxes.length > 4 ? ', ...' : '') +
                ') - T1: the filter is a button that opens a panel with sort, a value list and counts');
    }

    /* columns with a label and no filter */
    var bare = [];
    Array.prototype.forEach.call(hdr.cells, function (c, ci) {
      if (!cellText(c) || covered[ci]) { return; }
      bare.push(cellText(c));
    });
    if (bare.length && (panel || boxes.length || filterRows.length)) {
      fail.push('NOFILTER | ' + who + ' | no filter on: ' + bare.slice(0, 5).join(', ') +
                (bare.length > 5 ? ', ...' : '') + ' - T2: every column gets one');
    } else if (bare.length === cols || (!panel && !boxes.length)) {
      fail.push('NOFILTER | ' + who + ' | the table has no column filters at all - S1: a filter per column');
    }

    /* FILTERGAP. The title row and the filter row are ONE header block: no line between them,
       and the only header line sits under the filters. Agents style every cell with a bottom
       border and then zero the filter row's top padding, which glues the boxes to a line that
       cuts each title off from its own filter. Measured, in px. */
    var MINGAP = 4;
    if (filterRows.length && (panel || boxes.length)) {
      var collapsed = getComputedStyle(t).borderCollapse === 'collapse';
      function bw(el, side) {
        var cs = getComputedStyle(el);
        return cs['border' + side + 'Style'] === 'none' ? 0 : (parseFloat(cs['border' + side + 'Width']) || 0);
      }
      var titleLine = bw(hdr, 'Bottom');
      Array.prototype.forEach.call(hdr.cells, function (c) { titleLine = Math.max(titleLine, bw(c, 'Bottom')); });
      if (titleLine > 0) {
        fail.push('FILTERGAP | ' + who + ' | the title row has a ' + titleLine + 'px line under it, between ' +
                  'the titles and their filters - one header block: no line there, one line under the filters');
      }
      var gaps = [];
      filterRows.forEach(function (r) {
        Array.prototype.forEach.call(r.cells, function (c, ci) {
          var ctl = c.querySelector('button[aria-haspopup], [aria-haspopup], input:not([type=hidden]):not([type=checkbox]):not([type=radio]), select');
          if (!ctl) { return; }
          var cr = c.getBoundingClientRect(), kr = ctl.getBoundingClientRect();
          if (!kr.height) { return; }
          var col = hdr.cells[ci] ? cellText(hdr.cells[ci]).slice(0, 20) : '#' + (ci + 1);
          /* the line above: the title row's bottom border, or this row's / cell's own top border */
          var above = Math.max(titleLine, bw(r, 'Top'), bw(c, 'Top'));
          if (above > 0) {
            var top = cr.top + (collapsed ? above / 2 : Math.max(bw(c, 'Top'), 0));
            var g = Math.round((kr.top - top) * 10) / 10;
            if (g < MINGAP - 0.01) { gaps.push('"' + col + '" ' + g + 'px below the line above'); }
          }
          /* the line below: the header/data separator under the filter row */
          var below = Math.max(bw(r, 'Bottom'), bw(c, 'Bottom'));
          if (below > 0) {
            var bot = cr.bottom - (collapsed ? below / 2 : below);
            var g2 = Math.round((bot - kr.bottom) * 10) / 10;
            if (g2 < MINGAP - 0.01) { gaps.push('"' + col + '" ' + g2 + 'px above the line below'); }
          }
        });
      });
      if (gaps.length) {
        fail.push('FILTERGAP | ' + who + ' | filter control too close to a line (needs ' + MINGAP + 'px): ' +
                  gaps.slice(0, 4).join('; ') + (gaps.length > 4 ? '; +' + (gaps.length - 4) + ' more' : ''));
      }
    }

    /* sort */
    var sortable = hdr.querySelectorAll('[aria-sort], th button, th [role=button], th.sortable, th[data-k]').length;
    if (!sortable && t.tBodies[0].rows.length > 1) {
      fail.push('NOSORT | ' + who + ' | no sortable header - S1: sort on every column');
    }

    /* the advisory three: look at the table and the region that holds it */
    var scope = t.closest('section, article, [role=region], .panel, .card, form, main') || t.parentElement;
    if (!scope.querySelector('input[type=search], input[role=searchbox], [role=search] input, input[placeholder*="earch" i], input[aria-label*="earch" i]')) {
      note.push('NOSEARCH | ' + who + ' | no search field found for this table (S1) - it may live in a toolbar outside ' + (scope.tagName || 'its container').toLowerCase());
    }
    var live = scope.querySelector('[aria-live]');
    var counted = /\b\d+\s+(of\s+\d+\s+)?(items?|results?|rows?|matches|records?|products?)\b|\b\d+\s+of\s+\d+\b/i.test(scope.textContent);
    if (!live && !counted) {
      note.push('NOCOUNT | ' + who + ' | no live result count (S1): "5 items" unfiltered, "2 of 5" narrowed, in an aria-live region');
    } else if (!live) {
      note.push('NOCOUNT | ' + who + ' | a count is shown but is not in an aria-live region, so a screen reader is not told it changed');
    }
    var mute = Array.prototype.filter.call(hdr.cells, function (c) {
      return cellText(c) && !c.getAttribute('title') && !c.getAttribute('data-tip') &&
             !c.querySelector('[data-help], [data-tip], [title], button[aria-label*="hat is" i], button[aria-label*="elp" i]');
    });
    if (mute.length) {
      note.push('NOHELP | ' + who + ' | ' + mute.length + ' header(s) with no explainer (T3): ' +
                mute.slice(0, 4).map(cellText).join(', ') + (mute.length > 4 ? ', ...' : ''));
    }
  });

  var head = 'table check: ' + tables.length + ' table(s) read';
  if (fail.length) {
    console.warn(head + ', ' + fail.length + ' failure(s)');
    fail.forEach(function (p) { console.log('  ' + p); });
  } else {
    console.log('%c' + head + ' - no failures', 'color:#1f7a4d;font-weight:700');
  }
  if (note.length) {
    console.log('  advisory (' + note.length + '):');
    note.forEach(function (p) { console.log('    ' + p); });
  }
  return { tables: tables.length, failures: fail, advisory: note };
})();

    return {executionStatus:'EXECUTED',sourceSha256:sourceSha256,upstreamResult:result,logs:logs,method:'Unchanged upstream IIFE with lexical console capture and native Number parser aliases; limited heuristic coverage'};
  } catch (error) {
    return {executionStatus:'UNKNOWN',sourceSha256:sourceSha256,reason:String(error && error.message || error),logs:logs};
  }
})();
