/**
 * jQuery Schedule v2.1.0
 * https://github.com/Yehzuna/jquery-schedule
 * Thomas BORUSZEWSKI <yehzuna@outlook.com>
 */
;(function ($, window, document, undefined) {
  'use strict';

  // Defaults options
  var defaults = {
      mode: 'edit', // read
      hour: 12, // 24
      periodDuration: 30, // 15/30/60
      data: [],
      periodOptions: true,
      periodColors: [
        ["backgroundColor", "borderColor", "textColor"],
        ["rgb(82, 155, 255)", "#2a3cff", "#000000"],
        ["#dc1948", "#fff", "#fff"]
      ],
      periodTitle: '',
      periodBackgroundColor: 'rgba(82, 155, 255, 1)',
      periodBorderColor: '#2a3cff',
      periodTextColor: '#000',
      periodRemoveButton: 'Remove',
      periodDuplicateButton: 'Duplicate',
      periodTitlePlaceholder: 'Title',
      days: [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday'
      ],
      onInit: function () {},
      onAddPeriod: function () {},
      onRemovePeriod: function () {},
      onDuplicatePeriod: function () {},
      onClickPeriod: function () {}
    },
    pluginName = 'jqs';

  // Plugin constructor
  function Plugin(element, options) {
    this.element = element;
    this.settings = $.extend({}, defaults, options);
    this.periodOptions = {
      title: this.settings.periodTitle,
      backgroundColor: this.settings.periodBackgroundColor,
      borderColor: this.settings.periodBorderColor,
      textColor: this.settings.periodTextColor
    };
    this.init();
  }

  var periodBtnToggle = false;
  var addBtnToggle = false;

  $.extend(Plugin.prototype, {
    /**
     * Plugin instance seed
     */
    seed: Math.random().toString(36).substr(2),

    /**
     * Period addition counter
     */
    counter: 0,

    /**
     * Period interval multiplier
     */
    periodInterval: 0,

    /**
     * Period max height
     */
    periodHeight: 0,

    /**
     * Period position max step
     */
    periodPosition: 0,

    /**
     * Generate id for a period
     * @returns {string}
     */
    uniqId: function () {
      this.counter++;

      return pluginName + '_' + this.seed + '_' + this.counter;
    },

    /**
     * Plugin init
     */

    init: function () {
      var $this = this;

      // colors validation
      if (this.settings.periodColors.length > 0) {
        $.each(this.settings.periodColors, function (index, color) {
          if (!$.inArray(color) || color.length !== 3) {
            throw new Error('Invalid periodColors');
          }
        });
      }

      // duration validation
      if ($.inArray(this.settings.periodDuration, [15, 30, 60]) === -1) {
        throw new Error('Invalid periodDuration');
      }

      this.periodInterval = 60 / this.settings.periodDuration;
      this.periodHeight = 24 * this.periodInterval;
      this.periodPosition = 30 / this.periodInterval;

      $(this.element).addClass('jqs').addClass('jqs-mode-' + this.settings.mode);
      
      // Init events
      if (this.settings.mode === 'edit') {
        var position = 0;
        var helper = false;

        $(this.element).on('mousedown', '.jqs-day', function (event) {
          var offset = event.pageY - $(this).offset().top;
          position = Math.floor(offset / $this.periodPosition);

          if (!$(event.target).hasClass('jqs-period') && $(event.target).parents('.jqs-period').length === 0) {
            var time = '';
            if ($this.settings.periodDuration !== 15) {
              time = $this.periodInit(position, position + 1);
            }

            helper = $('<div>').addClass('jqs-period-helper').css({
              'height': $this.periodPosition,
              'top': position * $this.periodPosition
            }).append('<div class="jqs-period-helper-time">' + time + '</div>');

            $(this).append(helper);
          }
        });

        $(this.element).on('mousemove', '.jqs-day', function (event) {
          if (helper) {
            var offset = event.pageY - $(this).offset().top;
            var height = Math.round(offset / $this.periodPosition) - position;
            if (height <= 0) {
              height = 1;
            }

            helper.css({
              'height': height * $this.periodPosition
            });

            if (height >= 1) {
              $('.jqs-period-helper-time', helper).text($this.periodInit(position, position + height));
            } else {
              $('.jqs-period-helper-time', helper).text('');
            }
          }
        });

        var e_time;

        $(this.element).on('mouseup', '.jqs-day', function (event) {
          if (!$(event.target).hasClass('jqs-period') && $(event.target).parents('.jqs-period').length === 0) {
            var offset = event.pageY - $(this).offset().top;
            var height = Math.round(offset / $this.periodPosition) - position;
            if (height <= 0) {
              height = 1;
            }
            $this.add($(this), position, height);
          }

          position = 0;
          if (helper) {
            helper.remove();
            helper = false;
          }
        });


        $(this.element).on('mouseenter', '.jqs-day', function () {
          var index = $(this).parents('td').index();
          $('.jqs-grid-day', $this.element).eq(index).addClass('jqs-grid-day-buttons');
        });

        $(this.element).on('mouseleave', '.jqs-day', function () {
          var index = $(this).parents('td').index();
          $('.jqs-grid-day', $this.element).eq(index).removeClass('jqs-grid-day-buttons');
        });
        
        $(this.element).on('click', '.jqs-period-remove', function () {
          var period = $(this).parents('.jqs-period');
          // $this.remove(period);
        });

        $(this.element).on('click', '.jqs-period-duplicate', function () {
          var period = $(this).parents('.jqs-period');
          $this.duplicate(period);
        });

        $(this.element).on('click', '.jqs-day-remove', function () {
          var index = $(this).parents('.jqs-grid-day').index();
          var parent = $('.jqs-day', $this.element).eq(index);
          $this.removeAll(parent);
        });

        $(this.element).on('click', '.jqs-day-duplicate', function () {
          var index = $(this).parents('.jqs-grid-day').index();
          var parent = $('.jqs-day', $this.element).eq(index);
          $this.duplicateAll(parent);
        });
      }

      this.create();
      this.generate();     

      this.addAll();
      this.settings.onInit.call(this, this.element);
    },
    /**
     * Generate schedule structure
     */
    create: function () {

      $('<div class="schedule-title d-flex justify-content-between d-flex align-items-center"><p class="mb-0">Normal Schedule</p><button class="add-shift-btn btn btn-primary pr-5 pl-5">Add</button></div>').appendTo($(this.element));
      $('<div class="schedule-container"></div>').appendTo($(this.element));

      $('<table class="jqs-table"><tr></tr></table>').appendTo($('.schedule-container', this.element));

      for (var i = 0; i < 7; i++) {
        $('<td><div class="jqs-day"></div></td>').
          appendTo($('.jqs-table tr', this.element));
      }

      $('<div class="jqs-grid"><div class="jqs-grid-head"></div></div>').appendTo($('.schedule-container', this.element));

      for (var j = 5; j < 24; j++) {
        $('<div class="jqs-grid-line"><div class="jqs-grid-hour">' + this.formatHour(j) + '</div></div>').
          appendTo($('.jqs-grid', this.element));
      }

      // var dayRemove = '';
      // var dayDuplicate = '';
      // if (this.settings.mode === 'edit') {
      //   dayRemove = '<div class="jqs-day-remove" title="' + this.settings.periodRemoveButton + '"></div>';
      //   dayDuplicate = '<div class="jqs-day-duplicate" title="' + this.settings.periodDuplicateButton +
      //     '"></div>';
      // }

      for (var k = 0; k < 7; k++) {
        $('<div class="jqs-grid-day">' + this.settings.days[k] + '</div>').
          appendTo($('.jqs-grid-head', this.element));
      }
    },

    /**
     * Generate periods from data option
     */
    generate: function () {
      if (this.settings.data.length > 0) {
        var $this = this;

        $.each(this.settings.data, function (index, data) {
          $.each(data.periods, function (index, period) {

            var parent = $('.jqs-day', $this.element).eq(data.day);
            var options = {};
            var height, position;
            if ($.isArray(period)) {
              position = $this.positionFormat(period[0]);
              height = $this.positionFormat(period[1]);
            } else {
              position = $this.positionFormat(period.start);
              height = $this.positionFormat(period.end);
              options = period;
            }

            if (height === 0) {
              height = $this.periodHeight;
            }

            $this.add(parent, position, height - position, options);
          });
        });
      }
    },

    // plus_minus_btn_toggle: function () {
    //   $(this.element).on('click', 'fa-minus-square', function () {
    //     this.settings.periodBtnToggle = true;
    //   })
    // },

    /**
     * Add a period to a day
     * @param parent
     * @param {int} position
     * @param {int} height
     * @param options
     */
    add: function (parent, position, height, options) {

      if (height <= 0 || position >= this.periodHeight) {
        console.error('Invalid period');

        return false;
      }

      options = $.extend({}, this.periodOptions, options);

      // new period
      var periodRemove = '';
      var time_stamp = $.now()
      console.log(time_stamp)
      if (this.settings.mode === 'edit') {
          periodRemove = '<div class="jqs-period-remove d-flex align-items-center remove'+ time_stamp +'" title="' + this.settings.periodRemoveButton + '"><i class="fa fa-minus-square minus'+time_stamp+'" style="font-size:36px;"></i></div>';        
      }

      $(this.element).on('click', '.minus'+time_stamp, function () {
        if(periodBtnToggle==false) {
          $('.minus'+ time_stamp).replaceWith('<i class="fa fa-plus-square plus'+ time_stamp +'" style="font-size:36px;"></i>' );
          periodBtnToggle=true;
        } 
      });

      $(this.element).on('click', '.plus'+time_stamp, function () {
        if(periodBtnToggle==true){
          $( ".plus"+time_stamp ).replaceWith('<i class="fa fa-minus-square minus'+ time_stamp +'" style="font-size:36px;"></i>' );
          periodBtnToggle=false;
        }
      })

      var periodTitle = '<div class="jqs-period-title title' + time_stamp + ' d-flex align-items-center justify-content-center">' + options.title + '</div>';
      var periodTime = '<div class="jqs-period-time">' + this.periodInit(position, position + height) + '</div>';
      var period = $('<div class="jqs-period">' +
        '<div class="jqs-period-container container' + time_stamp + '">' + periodTime + periodTitle + periodRemove + '</div>' +
        '</div>').css({
        'top': position * this.periodPosition,
        'height': height * this.periodPosition
      }).attr('id', this.uniqId()).attr('title', options.title).appendTo(parent);

      $(this.element).on('click', '.minus'+time_stamp, function() {
        console.log('hello')
        $('.title'+time_stamp, this.element).text('');
        $('.title'+time_stamp, this.element).css('font-size', '0');
        $('.container'+time_stamp, this.element).css('background-color', 'grey')
      })

      $(this.element).on('click', '.plus'+time_stamp, function() {
        console.log('hello')
        $('.title'+time_stamp, this.element).css('font-size', '15px');
        $('.container'+time_stamp, this.element).css('background-color', 'rgb(82, 155, 255) !important');
      })

      $('.jqs-period-container', period).css({
        'background-color': options.backgroundColor,
        'border-color': options.borderColor,
        'color': options.textColor
      });

      // period validation
      if (!this.isValid(period)) {
        console.error('Invalid period', this.periodInit(position, position + height));

        $(period).remove();

        return false;
      }

      // text format
      this.periodText(period);

      // period events
      if (this.settings.mode === 'edit') {
        var $this = this;

        period.draggable({
          grid: [0, this.periodPosition],
          containment: 'parent',
          drag: function (event, ui) {
            $('.jqs-period-time', ui.helper).text($this.periodDrag(ui));
            $this.closeOptions();
          },
          stop: function (event, ui) {
            if (!$this.isValid($(ui.helper))) {
              console.error('Invalid position');

              $(ui.helper).css('top', Math.round(ui.originalPosition.top));
            }
          }
        }).resizable({
          grid: [0, this.periodPosition],
          containment: 'parent',
          handles: 'n, s',
          resize: function (event, ui) {
            $('.jqs-period-time', ui.helper).text($this.periodResize(ui));

            $this.periodText(period);
            $this.closeOptions();
          },
          stop: function (event, ui) {
            if (!$this.isValid($(ui.helper))) {
              console.error('Invalid position');

              $(ui.helper).css({
                'height': Math.round(ui.originalSize.height),
                'top': Math.round(ui.originalPosition.top)
              });
            }
          }
        });

        if (this.settings.periodOptions) {
          period.click(function (event) {
            if (
              !$(event.target).hasClass('jqs-period-remove') ||
              !$(event.target).hasClass('jqs-period-duplicate')
            ) {
              $this.settings.onClickPeriod.call(this, event, period, $this.element);
              $this.openOptions(event, period);
            }
          });
        }
      }

      this.settings.onAddPeriod.call(this, period, this.element);

      return true;
    },

    addAll: function () {
      $('.add-shift-btn', this.element).click(function () {
          addBtnToggle = true;
          
          console.log('hello')
      })
    },

    /**
     * Remove a period
     * @param period
     */
    remove: function (period) {
      if (!this.settings.onRemovePeriod.call(this, period, this.element)) {
        period.remove();
        this.closeOptions();
      }
    },

    /**
     * Remove all periods in the parent container
     * @param parent
     */
    removeAll: function (parent) {
      var $this = this;
      $('.jqs-period', parent).each(function (index, period) {
        $this.remove(period);
      });
    },

    /**
     * Duplicate a period
     * @param period
     */
    duplicate: function (period) {
      if (!this.settings.onDuplicatePeriod.call(this, period, this.element)) {
        var options = this.periodData(period);
        var position = Math.round(period.position().top / this.periodPosition);
        var height = Math.round(period.height() / this.periodPosition);

        var $this = this;
        $('.jqs-day', this.element).each(function (index, parent) {
          $this.add(parent, position, height, options);
          
        });      

        this.closeOptions();
      }
    },

    /**
     * Duplicate all periods in the parent container
     * @param parent
     */
    duplicateAll: function (parent) {
      var $this = this;
      $('.jqs-period', parent).each(function (index, period) {
        $this.duplicate($(period));
      });
    },

    /**
     * Open the options popup
     * @param event
     * @param period
     */
    openOptions: function (event, period) {
      var $this = this;
      $this.closeOptions();
      var position = Math.round(period.position().top / this.periodPosition);
      var height = Math.round(period.height() / this.periodPosition);
      var time = '<div class="jqs-options-time pt-3 pb-3">Time:&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp' + this.periodInit(position, position + height) + '</div>';

      // title
      var title = $('jqs-period-title', period).text();
      var dinningName ='<div class="jqs-options-name">Shift Details</div>'
      var titleInput = '<div class="jqs-options-title-container pt-3 pb-3"><p>Name:</p>' +
        '<div class="form-group">'+ '<select class="form-control" id="dinning_name_sel">' + 
        + ' <option value="'+ title + '">DinningName</option><option>DinningName</option><option value="Breakfast">Breakfast</option><option value="Lunch">Lunch</option><option value="Dinner">Dinner</option></select></div></div>';

      // color
      var colorInput = '';
      if (this.settings.periodColors && this.settings.periodColors.length > 0) {
        var colorText = (this.settings.hour === 12) ? 'favorite' : '00:00';

        colorInput = '<div class="jqs-options-color-container d-flex justify-content-between">';
        $.each(this.settings.periodColors, function (index, color) {
          colorInput += '<button class="jqs-options-color" ' +
            'style="background-color: ' + color[0] + '; border-color: ' + color[1] + '; color:' + color[2] + '">' +
            colorText + '</button>';
        });
        colorInput += '</div>';
      }

      // button
      // var remove = '<div class="jqs-options-remove">' + this.settings.periodRemoveButton + '</div>';
      // var duplicate = '<div class="jqs-options-duplicate">' + this.settings.periodDuplicateButton + '</div>';
      var close = '<div class="jqs-options-close"></div>';
      $('<div class="jqs-options">'+ dinningName + titleInput + colorInput + time  + close + '</div>').appendTo(this.element);

      $('.jqs-options-color', this.element).click(function () {
        $('.jqs-period-container', period).css({
          'background-color': $(this).css('background-color'),
          'border-color': $(this).css('border-top-color'),
          'color': $(this).css('color')
        });
      });

      $("#dinning_name_sel").on("change",function(){
        //Getting Value
        var selValue = $("#dinning_name_sel").val();
        //Setting Value
        $('.jqs-period-title', period).text(selValue);
        period.attr('title', selValue);
      });
 

      // $('#dinning_name_sel', this.element).keyup(function () {
      //   $('.jqs-period-title', period).text($(this).val());
      //   period.attr('title', $(this).val());
      // });

      $('.jqs-options-remove', this.element).click(function () {
        $this.remove(period);
      });

      $('.jqs-options-duplicate', this.element).click(function () {
        $this.duplicate(period);
      });

      $('.jqs-options-close', this.element).click(function () {
        $this.closeOptions();
      });
    },

    //Add shift menu option by clicking Add button

    /**
     * Close the options popup
     */
    closeOptions: function () {
      $('.jqs-options', this.element).remove();
    },

    /**
     * Return a readable period string from a period position
     * @param start
     * @param end
     * @returns {string}
     */
    periodInit: function (start, end) {
      start += 10;
      end += 10;
      return this.periodFormat(start) + ' - ' + this.periodFormat(end);
    },

    /**
     * Return a readable period string from a drag event
     * @param ui
     * @returns {string}
     */
    periodDrag: function (ui) {
      var start = Math.round(ui.position.top / this.periodPosition);
      var end = Math.round(($(ui.helper).height() + ui.position.top) / this.periodPosition);

      start+= 10
      end+=10

      return this.periodFormat(start) + ' - ' + this.periodFormat(end);
    },

    /**
     * Return a readable period string from a resize event
     * @param ui
     * @returns {string}
     */
    periodResize: function (ui) {
      var start = Math.round(ui.position.top / this.periodPosition);
      var end = Math.round((ui.size.height + ui.position.top) / this.periodPosition);

      start += 10
      end += 10

      return this.periodFormat(start) + ' - ' + this.periodFormat(end);
    },

    /**
     *
     * @param period
     */
    periodText: function (period) {
      var height = period.height();
      period.removeClass('jqs-period-15').removeClass('jqs-period-30');

      if (height === 10) {
        period.addClass('jqs-period-15');
        return false;
      }

      if (height === 20) {
        period.addClass('jqs-period-30');
        return false;
      }

      var newHeight = Math.floor((height - 16 - 4) / 12) * 12;
      $('.jqs-period-title', period).height(newHeight);
    },

    /**
     * Return an object with all period data
     * @param period
     * @returns {[*,*]}
     */
    periodData: function (period) {
      var start = Math.round(period.position().top / this.periodPosition);
      var end = Math.round((period.height() + period.position().top) / this.periodPosition);

      // start+=12
      // end+=12

      return {
        start: this.periodFormat(start),
        end: this.periodFormat(end),
        title: $('.jqs-period-title', period).text(),
        backgroundColor: $('.jqs-period-container', period).css('background-color'),
        borderColor: $('.jqs-period-container', period).css('border-top-color'),
        textColor: $('.jqs-period-container', period).css('color')
      };
    },

    /**
     * Return a readable hour from a position
     * @param position
     * @returns {number}
     */
    periodFormat: function (position) {
      
      if (position >= this.periodHeight) {
        position = 0;
      }

      if (position < 0) {
        position = 0;
      }

      var hour = Math.floor(position / this.periodInterval);
      var mn = (position / this.periodInterval - hour) * 60;

      if (this.settings.hour === 12) {
        var time = hour;
        var ind = '';

        if (hour >= 12) {
          ind = 'p';
        }
        if (hour > 12) {
          time = hour - 12;
        }
        if (hour === 0 || hour === 24) {
          ind = '';
          time = 12;
        }
        if (mn !== 0) {
          time += ':' + mn;
        }

        return time + ind;
      }

      if (hour < 10) {
        hour = '0' + hour;
      }
      if (mn < 10) {
        mn = '0' + mn;
      }

      return hour + ':' + mn;
    },

    /**
     * Return a position from a readable hour
     * @param time
     * @returns {number}
     */
    positionFormat: function (time) {
      var split = time.split(':');
      var hour = parseInt(split[0]);
      var mn = parseInt(split[1]);

      if (this.settings.hour === 12) {
        var matches = time.match(/([0-1]?[0-9]):?([0-5][0-9])?\s?(am|pm|p)?/);
        var ind = matches[3];
        if (!ind) {
          ind = 'am';
        }

        hour = parseInt(matches[1]);
        mn = parseInt(matches[2]);

        if (!mn) {
          mn = 0;
        }

        if (hour === 12 && ind === 'am') {
          hour = 0;
        }
        if (hour === 12 && (ind === 'pm' || ind === 'p')) {
          ind = 'am';
        }
        if (ind === 'pm' || ind === 'p') {
          hour += 12;
        }
      }

      var position = 0;
      position += hour * this.periodInterval;
      position += mn / 60 * this.periodInterval;

      if (Math.floor(position) !== position) {
        return -1;
      }

      return position;
    },

    /**
     * Return a hour to readable format (Grid structure)
     * @param hour
     * @returns {string}
     */
    formatHour: function (hour) {
      if (this.settings.hour === 12) {
        switch (hour) {
          case 0:
          case 24:
            hour = '12am';
            break;
          case 12:
            hour = '12pm';
            break;
          default:
            if (hour > 12) {
              hour = (hour - 12) + 'pm';
            } else {
              hour += 'am';
            }
        }
      } else {
        if (hour >= 24) {
          hour = 0;
        }

        if (hour < 10) {
          hour = '0' + hour;
        }
        hour += ':00';
      }

      return hour;
    },

    /**
     * Check if a period is valid
     * @param current
     * @returns {boolean}
     */
    isValid: function (current) {
      var currentStart = Math.round(current.position().top);
      var currentEnd = Math.round(current.position().top + current.height());

      var start = 0;
      var end = 0;
      var check = true;
      $('.jqs-period', $(current).parent()).each(function (index, period) {
        if (current.attr('id') !== $(period).attr('id')) {
          start = Math.round($(period).position().top);
          end = Math.round($(period).position().top + $(period).height());

          start += 10
          end += 10

          if (start > currentStart && start < currentEnd) {
            check = false;
          }

          if (end > currentStart && end < currentEnd) {
            check = false;
          }

          if (start < currentStart && end > currentEnd) {
            check = false;
          }

          if (start === currentStart || end === currentEnd) {
            check = false;
          }
        }
      });

      return check;
    },

    /**
     * Export data to JSON string
     * @returns {string}
     */
    export: function () {
      var $this = this;
      var data = [];

      $('.jqs-day', $this.element).each(function (index, day) {
        var periods = [];
        $('.jqs-period', day).each(function (index, period) {
          periods.push($this.periodData($(period)));
        });

        data.push({
          day: index,
          periods: periods
        });
      });

      return JSON.stringify(data);
    },

    /**
     * Import data on plugin init
     * @param args
     * @returns {Array}
     */
    import: function (args) {
      var $this = this;
      var dataImport = args[1];
      var ret = [];
      $.each(dataImport, function (index, data) {
        $.each(data.periods, function (index, period) {
          var parent = $('.jqs-day', $this.element).eq(data.day);
          var options = {};
          var height, position;
          if ($.isArray(period)) {
            position = $this.positionFormat(period[0]);
            height = $this.positionFormat(period[1]);
          } else {
            position = $this.positionFormat(period.start);
            height = $this.positionFormat(period.end);
            options = period;
          }

          if (height === 0) {
            height = $this.periodHeight;
          }

          var status = true;
          if (!$this.add(parent, position, height - position, options)) {
            status = false;
          }

          ret.push({
            day: data.day,
            period: [
              $this.periodFormat(position),
              $this.periodFormat(height)
            ],
            status: status
          });
        });
      });

      return JSON.stringify(ret);
    },

    /**
     * Remove all periods
     */
    reset: function () {
      this.removeAll(this.element);
    }
  });

  $.fn[pluginName] = function (options) {
    var ret = false;
    var args = Array.prototype.slice.call(arguments);
    var loop = this.each(function () {
      if (!$.data(this, 'plugin_' + pluginName)) {
        $.data(this, 'plugin_' + pluginName, new Plugin(this, options));
      } else if ($.isFunction(Plugin.prototype[options])) {
        ret = $.data(this, 'plugin_' + pluginName)[options](args);
      }
    });

    if (ret) {
      return ret;
    }

    return loop;
  };
})(jQuery, window, document);
