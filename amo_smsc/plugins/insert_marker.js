define(function (require) {
  var $ = require('jquery'),
    setCursorPosition = function (elem, pos) {
      if (elem instanceof jQuery) {
        elem.focus().each(function (index, elem) {
          if (elem.setSelectionRange) {
            elem.setSelectionRange(pos, pos);
          } else if (elem.createTextRange) {
            var range = elem.createTextRange();
            range.collapse(true);
            range.moveEnd('character', pos);
            range.moveStart('character', pos);
            range.select();
          }
        });
      }
    };

  return {
    // вставляет маркер по позиции курсора
    insertMarker: function (e, text_element) {
      var $this = $(e.target),
        tag = $this.text();

      var el = text_element || $(this._selector('template_content'));

      if (el) {
        var cursor_pos = el.prop('selectionStart'),
          v = el.val(),
          text_before = v.substring(0, cursor_pos),
          text_after = v.substring(cursor_pos, v.length);

        el.val(text_before + tag + text_after).trigger('change');
        setCursorPosition(el, text_before.length + tag.length);
      }
    }
  };
});
