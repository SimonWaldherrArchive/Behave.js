/*
 * Behave.js
 *
 * Copyright 2013, Jacob Kelley - http://jakiestfu.com/
 * Released under the MIT Licence
 * http://opensource.org/licenses/MIT
 *
 * Github:  http://github.com/jakiestfu/Behave.js/
 * Version: 1.5.1
 */

/*jslint browser: true, plusplus: true, bitwise: true, nomen: true, white: true, indent: 2 */
/*global module,define,ender*/

(function () {
  'use strict';
  var BehaveHooks = BehaveHooks || (function () {
    var hooks = {};

    return {
      add: function (hookName, fn) {
        if (typeof hookName === "object") {
          var i, theHook;
          for (i = 0; i < hookName.length; i++) {
            theHook = hookName[i];
            if (!hooks[theHook]) {
              hooks[theHook] = [];
            }
            hooks[theHook].push(fn);
          }
        } else {
          if (!hooks[hookName]) {
            hooks[hookName] = [];
          }
          hooks[hookName].push(fn);
        }
      },
      get: function (hookName) {
        if (hooks[hookName]) {
          return hooks[hookName];
        }
      }
    };
  }()),
    Behave = Behave || function (userOpts) {
      if (typeof String.prototype.repeat !== 'function') {
        String.prototype.repeat = function (times) {
          if (times < 1) {
            return '';
          }
          if (times % 2) {
            return this.repeat(times - 1) + this;
          }
          var half = this.repeat(times / 2);
          return half + half;
        };
      }

      if (typeof Array.prototype.filter !== 'function') {
        Array.prototype.filter = function (func /*, thisp */ ) {
          if (this === null) {
            throw new TypeError();
          }

          var t = {},
            len = t.length >>> 0,
            res = [],
            thisp = arguments[1],
            i,
            val;
          if (typeof func !== "function") {
            throw new TypeError();
          }
          for (i = 0; i < len; i++) {
            if (t.indexOf(i) !== -1) {
              val = t[i];
              if (func.call(thisp, val, i, t)) {
                res.push(val);
              }
            }
          }
          return res;
        };
      }

      var defaults = {
        textarea: null,
        replaceTab: true,
        softTabs: true,
        tabSize: 4,
        autoOpen: true,
        overwrite: true,
        autoStrip: true,
        autoIndent: true,
        fence: false
      },
        tab,
        newLine,
        charSettings = {
          keyMap: [
            {
              open: '"',
              close: '"',
              canBreak: false
            },
            {
              open: "'",
              close: "'",
              canBreak: false
            },
            {
              open: "(",
              close: ")",
              canBreak: false
            },
            {
              open: "[",
              close: "]",
              canBreak: true
            },
            {
              open: "{",
              close: "}",
              canBreak: true
            }
          ]
        },
        utils = {

          _callHook: function (hookName, passData) {
            var hooks = BehaveHooks.get(hookName),
              i,
              theEditor,
              textVal,
              caretPos;
            passData = typeof passData === "boolean" && passData === false ? false : true;

            if (hooks) {
              if (passData) {
                theEditor = defaults.textarea;
                textVal = theEditor.value;
                caretPos = utils.cursor.get();

                for (i = 0; i < hooks.length; i++) {
                  hooks[i].call(undefined, {
                    editor: {
                      element: theEditor,
                      text: textVal,
                      levelsDeep: utils.levelsDeep()
                    },
                    caret: {
                      pos: caretPos
                    },
                    lines: {
                      current: utils.cursor.getLine(textVal, caretPos),
                      total: utils.editor.getLines(textVal)
                    }
                  });
                }
              } else {
                for (i = 0; i < hooks.length; i++) {
                  hooks[i].call(undefined);
                }
              }
            }
          },

          defineNewLine: function () {
            var ta = document.createElement('textarea');
            ta.value = "\n";

            if (ta.value.length === 2) {
              newLine = "\r\n";
            } else {
              newLine = "\n";
            }
          },
          defineTabSize: function (tabSize) {
            if (defaults.textarea.style.OTabSize !== undefined) {
              defaults.textarea.style.OTabSize = tabSize;
              return;
            }
            if (defaults.textarea.style.MozTabSize !== undefined) {
              defaults.textarea.style.MozTabSize = tabSize;
              return;
            }
            if (defaults.textarea.style.tabSize !== undefined) {
              defaults.textarea.style.tabSize = tabSize;
              return;
            }
          },
          cursor: {
            getLine: function (textVal, pos) {
              return ((textVal.substring(0, pos)).split("\n")).length;
            },
            get: function () {
              if (typeof document.createElement('textarea').selectionStart === "number") {
                return defaults.textarea.selectionStart;
              }
              if (document.selection) {
                var caretPos = 0,
                  range = defaults.textarea.createTextRange(),
                  rangeDupe = document.selection.createRange().duplicate(),
                  rangeDupeBookmark = rangeDupe.getBookmark();
                range.moveToBookmark(rangeDupeBookmark);

                while (range.moveStart('character', -1) !== 0) {
                  caretPos++;
                }
                return caretPos;
              }
            },
            set: function (start, end) {
              if (!end) {
                end = start;
              }
              if (defaults.textarea.setSelectionRange) {
                defaults.textarea.focus();
                defaults.textarea.setSelectionRange(start, end);
              } else if (defaults.textarea.createTextRange) {
                var range = defaults.textarea.createTextRange();
                range.collapse(true);
                range.moveEnd('character', end);
                range.moveStart('character', start);
                range.select();
              }
            },
            selection: function () {
              var textAreaElement = defaults.textarea,
                start = 0,
                end = 0,
                normalizedValue,
                range,
                textInputRange,
                len,
                endRange;

              if (typeof textAreaElement.selectionStart === "number" && typeof textAreaElement.selectionEnd === "number") {
                start = textAreaElement.selectionStart;
                end = textAreaElement.selectionEnd;
              } else {
                range = document.selection.createRange();

                if (range && range.parentElement() === textAreaElement) {

                  normalizedValue = utils.editor.get();
                  len = normalizedValue.length;

                  textInputRange = textAreaElement.createTextRange();
                  textInputRange.moveToBookmark(range.getBookmark());

                  endRange = textAreaElement.createTextRange();
                  endRange.collapse(false);

                  if (textInputRange.compareEndPoints("StartToEnd", endRange) > -1) {
                    start = end = len;
                  } else {
                    start = -textInputRange.moveStart("character", -len);
                    start += normalizedValue.slice(0, start).split(newLine).length - 1;

                    if (textInputRange.compareEndPoints("EndToEnd", endRange) > -1) {
                      end = len;
                    } else {
                      end = -textInputRange.moveEnd("character", -len);
                      end += normalizedValue.slice(0, end).split(newLine).length - 1;
                    }
                  }
                }
              }

              return start === end ? false : {
                start: start,
                end: end
              };
            }
          },
          editor: {
            getLines: function (textVal) {
              return textVal.split("\n").length;
            },
            get: function () {
              return defaults.textarea.value.replace(/\r/g, '');
            },
            set: function (data) {
              defaults.textarea.value = data;
            }
          },
          fenceRange: function () {
            if (typeof defaults.fence === "string") {
              var data = utils.editor.get(),
                pos = utils.cursor.get(),
                hacked = 0,
                matchedFence = data.indexOf(defaults.fence),
                matchCase = 0;

              while (matchedFence >= 0) {
                matchCase++;
                if (pos < (matchedFence + hacked)) {
                  break;
                }

                hacked += matchedFence + defaults.fence.length;
                data = data.substring(matchedFence + defaults.fence.length);
                matchedFence = data.indexOf(defaults.fence);

              }

              if (hacked < pos && ((matchedFence + hacked) > pos) && matchCase % 2 === 0) {
                return true;
              }
              return false;
            }
            return true;
          },
          isEven: function (_this, i) {
            return i % 2;
          },
          levelsDeep: function () {
            var pos = utils.cursor.get(),
              val = utils.editor.get(),
              left = val.substring(0, pos),
              levels = 0,
              toDecrement = 0,
              quoteMap = ["'", "\""],
              finalLevels,
              i, j;

            for (i = 0; i < left.length; i++) {
              for (j = 0; j < charSettings.keyMap.length; j++) {
                if (charSettings.keyMap[j].canBreak) {
                  if (charSettings.keyMap[j].open === left.charAt(i)) {
                    levels++;
                  }

                  if (charSettings.keyMap[j].close === left.charAt(i)) {
                    levels--;
                  }
                }
              }
            }

            for (i = 0; i < charSettings.keyMap.length; i++) {
              if (charSettings.keyMap[i].canBreak) {
                for (j = 0; j < quoteMap.length; j++) {
                  toDecrement += left.split(quoteMap[j]).filter(utils.isEven).join('').split(charSettings.keyMap[i].open).length - 1;
                }
              }
            }
            finalLevels = levels - toDecrement;
            return finalLevels >= 0 ? finalLevels : 0;
          },
          deepExtend: function (destination, source) {
            var property;
            for (property in source) {
              if (source[property] && source[property].constructor && source[property].constructor === Object) {
                destination[property] = destination[property] || {};
                utils.deepExtend(destination[property], source[property]);
              } else {
                destination[property] = source[property];
              }
            }
            return destination;
          },
          addEvent: function addEvent(element, eventName, func) {
            if (element.addEventListener) {
              element.addEventListener(eventName, func, false);
            } else if (element.attachEvent) {
              element.attachEvent("on" + eventName, func);
            }
          },
          removeEvent: function addEvent(element, eventName, func) {
            if (element.addEventListener) {
              element.removeEventListener(eventName, func, false);
            } else if (element.attachEvent) {
              element.detachEvent("on" + eventName, func);
            }
          },

          preventDefaultEvent: function (e) {
            if (e.preventDefault) {
              e.preventDefault();
            } else {
              e.returnValue = false;
            }
          }
        },
        intercept = {
          tabKey: function (e) {
            var toReturn,
              selection,
              tempStart,
              toIndent,
              edited,
              lines,
              right,
              left,
              pos,
              val,
              i;
            if (!utils.fenceRange()) {
              return;
            }

            if (e.keyCode === 9) {
              utils.preventDefaultEvent(e);

              toReturn = true;
              utils._callHook('tab:before');

              selection = utils.cursor.selection();
              pos = utils.cursor.get();
              val = utils.editor.get();

              if (selection) {

                tempStart = selection.start;
                while (tempStart--) {
                  if (val.charAt(tempStart) === "\n") {
                    selection.start = tempStart + 1;
                    break;
                  }
                }

                toIndent = val.substring(selection.start, selection.end);
                lines = toIndent.split("\n");

                if (e.shiftKey) {
                  for (i = 0; i < lines.length; i++) {
                    if (lines[i].substring(0, tab.length) === tab) {
                      lines[i] = lines[i].substring(tab.length);
                    }
                  }
                  toIndent = lines.join("\n");

                  utils.editor.set(val.substring(0, selection.start) + toIndent + val.substring(selection.end));
                  utils.cursor.set(selection.start, selection.start + toIndent.length);

                } else {
                  for (i = 0; i < lines.length; i++) {
                    lines[i] = tab + lines[i];
                  }
                  toIndent = lines.join("\n");

                  utils.editor.set(val.substring(0, selection.start) + toIndent + val.substring(selection.end));
                  utils.cursor.set(selection.start, selection.start + toIndent.length);
                }
              } else {
                left = val.substring(0, pos);
                right = val.substring(pos);
                edited = left + tab + right;

                if (e.shiftKey) {
                  if (val.substring(pos - tab.length, pos) === tab) {
                    edited = val.substring(0, pos - tab.length) + right;
                    utils.editor.set(edited);
                    utils.cursor.set(pos - tab.length);
                  }
                } else {
                  utils.editor.set(edited);
                  utils.cursor.set(pos + tab.length);
                  toReturn = false;
                }
              }
              utils._callHook('tab:after');
            }
            return toReturn;
          },
          enterKey: function (e) {
            var finalCursorPos,
              closingBreak,
              ourIndent,
              rightChar,
              leftChar,
              numTabs,
              edited,
              right,
              left,
              val,
              pos,
              i;
            if (!utils.fenceRange()) {
              return;
            }

            if (e.keyCode === 13) {

              utils.preventDefaultEvent(e);
              utils._callHook('enter:before');

              pos = utils.cursor.get();
              val = utils.editor.get();
              left = val.substring(0, pos);
              right = val.substring(pos);
              leftChar = left.charAt(left.length - 1);
              rightChar = right.charAt(0);
              numTabs = utils.levelsDeep();
              ourIndent = "";
              closingBreak = "";
              if (!numTabs) {
                finalCursorPos = 1;
              } else {
                while (numTabs--) {
                  ourIndent += tab;
                }
                finalCursorPos = ourIndent.length + 1;

                for (i = 0; i < charSettings.keyMap.length; i++) {
                  if (charSettings.keyMap[i].open === leftChar && charSettings.keyMap[i].close === rightChar) {
                    closingBreak = newLine;
                  }
                }

              }

              edited = left + newLine + ourIndent + closingBreak + (ourIndent.substring(0, ourIndent.length - tab.length)) + right;
              utils.editor.set(edited);
              utils.cursor.set(pos + finalCursorPos);
              utils._callHook('enter:after');
            }
          },
          deleteKey: function (e) {
            var edited,
              sel,
              pos,
              val,
              left,
              right,
              leftChar,
              rightChar,
              i;
            if (!utils.fenceRange()) {
              return;
            }

            if (e.keyCode === 8) {
              utils.preventDefaultEvent(e);

              utils._callHook('delete:before');

              pos = utils.cursor.get();
              val = utils.editor.get();
              left = val.substring(0, pos);
              right = val.substring(pos);
              leftChar = left.charAt(left.length - 1);
              rightChar = right.charAt(0);

              if (utils.cursor.selection() === false) {
                for (i = 0; i < charSettings.keyMap.length; i++) {
                  if (charSettings.keyMap[i].open === leftChar && charSettings.keyMap[i].close === rightChar) {
                    edited = val.substring(0, pos - 1) + val.substring(pos + 1);
                    utils.editor.set(edited);
                    utils.cursor.set(pos - 1);
                    return;
                  }
                }
                edited = val.substring(0, pos - 1) + val.substring(pos);
                utils.editor.set(edited);
                utils.cursor.set(pos - 1);
              } else {
                sel = utils.cursor.selection();
                edited = val.substring(0, sel.start) + val.substring(sel.end);
                utils.editor.set(edited);
                utils.cursor.set(pos);
              }
              utils._callHook('delete:after');
            }
          }
        },
        charFuncs = {
          openedChar: function (_char, e) {
            utils.preventDefaultEvent(e);
            utils._callHook('openChar:before');
            var pos = utils.cursor.get(),
              val = utils.editor.get(),
              left = val.substring(0, pos),
              right = val.substring(pos),
              edited = left + _char.open + _char.close + right;

            defaults.textarea.value = edited;
            utils.cursor.set(pos + 1);
            utils._callHook('openChar:after');
          },
          closedChar: function (_char, e) {
            var pos = utils.cursor.get(),
              val = utils.editor.get(),
              toOverwrite = val.substring(pos, pos + 1);
            if (toOverwrite === _char.close) {
              utils.preventDefaultEvent(e);
              utils._callHook('closeChar:before');
              utils.cursor.set(utils.cursor.get() + 1);
              utils._callHook('closeChar:after');
              return true;
            }
            return false;
          }
        },
        action = {
          filter: function (e) {
            var theCode,
              _char,
              didClose,
              i;
            if (!utils.fenceRange()) {
              return;
            }

            theCode = e.which || e.keyCode;

            if ((theCode === 39) || ((theCode === 40) && (e.which === 0))) {
              return;
            }

            _char = String.fromCharCode(theCode);

            for (i = 0; i < charSettings.keyMap.length; i++) {

              if (charSettings.keyMap[i].close === _char) {
                didClose = defaults.overwrite && charFuncs.closedChar(charSettings.keyMap[i], e);

                if (!didClose && charSettings.keyMap[i].open === _char && defaults.autoOpen) {
                  charFuncs.openedChar(charSettings.keyMap[i], e);
                }
              } else if (charSettings.keyMap[i].open === _char && defaults.autoOpen) {
                charFuncs.openedChar(charSettings.keyMap[i], e);
              }
            }
          },
          listen: function () {

            if (defaults.replaceTab) {
              utils.addEvent(defaults.textarea, 'keydown', intercept.tabKey);
            }
            if (defaults.autoIndent) {
              utils.addEvent(defaults.textarea, 'keydown', intercept.enterKey);
            }
            if (defaults.autoStrip) {
              utils.addEvent(defaults.textarea, 'keydown', intercept.deleteKey);
            }

            utils.addEvent(defaults.textarea, 'keypress', action.filter);

            utils.addEvent(defaults.textarea, 'keydown', function () {
              utils._callHook('keydown');
            });
            utils.addEvent(defaults.textarea, 'keyup', function () {
              utils._callHook('keyup');
            });
          }
        },
        init = function (opts) {

          if (opts.textarea) {
            utils._callHook('init:before', false);
            utils.deepExtend(defaults, opts);
            utils.defineNewLine();

            if (defaults.softTabs) {
              tab = " ".repeat(defaults.tabSize);
            } else {
              tab = "\t";

              utils.defineTabSize(defaults.tabSize);
            }

            action.listen();
            utils._callHook('init:after', false);
          }

        };

      this.destroy = function () {
        utils.removeEvent(defaults.textarea, 'keydown', intercept.tabKey);
        utils.removeEvent(defaults.textarea, 'keydown', intercept.enterKey);
        utils.removeEvent(defaults.textarea, 'keydown', intercept.deleteKey);
        utils.removeEvent(defaults.textarea, 'keypress', action.filter);
      };

      init(userOpts);

    };

  if ((typeof module !== "undefined") && module.exports) {
    module.exports = Behave;
  }

  if (typeof ender === "undefined") {
    this.Behave = Behave;
    this.BehaveHooks = BehaveHooks;
  }

  if ((typeof define === "function") && define.amd) {
    define("behave", [], function () {
      return Behave;
    });
  }

}).call(this);
