define([
  'jquery',
  'underscore',
  'lib/components/base/modal',
  './plugins/fn.js',
  './plugins/select2/select2.min.js',
], function ($, _, Modal, Fn) {
  var CustomWidget = function () {
    var self = this,
        version = 'v2.2.1',
        cnt_pp = 50,
        is_admin = false,
        ccdata = false,
        area = self.system().area,
        first = true,
        lddata;

    this.callbacks = {
      render: function () {
        var lang = self.i18n('userLang'), sel_resp = [[], []], req = ['senders', 'templates'],
          rp = '', rp_strs = '', phs = '', cd = '', i, j, types = ['SMS', 'Viber'], types_opt = [],
          settings = self.get_settings(), filled_in_raw_data = [false, false];

        self.init_global_variables();

        $('head link[href*="' + settings.widget_code + '/widget/' + 'style.css"]').remove();
        $('head').append('<link type="text/css" rel="stylesheet" href="' + self.params.path + '/style.css?' + Date.now() + '">');

        if ($.inArray(area, ['leads-dp', 'customers-dp']) != -1) {
          return true;
        }

        for (j = 0; j < types.length; j++) {
          types_opt.push({option: types[j], id: 'opt' + j});
        }
        for (j = 0; j < req.length; j++) {
          if (!j && (rp = self.check_cookies('smscru-' + req[j]))) {
            rp_strs = rp.split("\n");

            for (i = 0; i < rp_strs.length; i++) {
              sel_resp[j].push({option: rp_strs[i], id: 'opt' + i});
            }

          } else {
            if (j && settings.templates_dp && settings.templates_dp.length) {
              var st_dp = self.object2array(JSON.parse(settings.templates_dp)), i, tpls = [];

              tpls.push({option: lang.templates, id: -2});

              for (i = 0; i < st_dp.length; i++) {
                tpls.push({option: st_dp[i].name, id: i});
              }
              tpls.push({option: is_admin ? lang.editClick : lang.refreshClick, class_name: 'smscru_edit_tpl', id: -1});

              sel_resp[j] = tpls;
            } else {
              self.get_raw_data(settings, lang, req[j], '');
              filled_in_raw_data[j] = true;
            }
          }
        }

        if (!settings.contacts_macros)
          self.set_macros_names();

        cd = new Date();

        $('div#ss_cr, div#smscru_wrap_tpl').remove();

        var widgetStyles = '<style>' +
          '.card-widgets__widget-' + settings.widget_code + ' { background-color: rgb(240, 250, 255); }' +
          '.card-widgets__widget-' + settings.widget_code + ':before' + '{ width: 0; }'
        '</style>';

        data =

          '<div class="smscru_form">' +
          /* Баланс пользователя (не нужен) */

          // lang.clBalance + ': <span id="bal"></span><br>' +

          /* Конец баланса пользователя */
          /* Ланг  */
          // lang.messageType + ':'
          /* Конец ланг */

          '<div id="types" class="between_padding">' +
          self.render(
            {ref: '/tmpl/controls/select.twig'},
            {
              items: types_opt
            }
          ) +
          '</div>' +

          /* Ланг "Список Телефонов" */
          // '<div class="between_padding">' + lang.phonesList + ':</div>' +
          /* Конец ланг "Список Телефонов" */
          /* Textarea со списком телефонов (Не нужна) */
          // '<div id="types" class="between_padding">' +
          // 	self.render(
          // 		{ref: '/tmpl/controls/textarea.twig'},
          // 		{
          // 			id: 'phlist'
          // 		}
          // 	) +
          // '</div>' +
          /* Конец Textarea со списком телефонов (Не нужна) */

          /* Ланг "Сообщение" и кнопка "Обновить" */
          // '<table width="100%"><tr><td class="between_padding">' +
          // lang.textSMS + ':<td align="right"><a id="req_tpl" title="' + lang.loadTemplates + '">' + lang.refreshClick + '</a></table>' +
          /* Конец Ланг "Сообщение" и кнопка "Обновить" */

          '<div class="between_padding">' +
          '<div id="smscru_wrap_tpl">' +
          (filled_in_raw_data[1] ? '' :
            self.render(
              {ref: '/tmpl/controls/select.twig'},
              {
                items: sel_resp[1],
                id: 'smscru_templates'
              }
            )) +
          '</div>' +
          '</div>' +


          '<div class="between_padding">' +
          self.render(
            {ref: '/tmpl/controls/textarea.twig'},
            {
              id: 'smsmes',
              placeholder: lang.textSMS + '...',
            }
          ) +
          '</div>' +
          /* Вывод количества символов */
          // '<div class="between_padding">' +
          // 	'<div class="smsc_remark">'
          // 		+ lang.smsLength +
          // 		' − <b id="lenmes">0</b>, sms − <b id="smscnt">0</b>' +
          // 	'</div>' +
          // '</div>'+

          /* Конец Вывод количества символов */

          /* Ланг "Имя пользователя" */
          // '<table width="100%"><tr><td class="between_padding">' +
          // lang.senderName + ':<td align="right"><a id="req_ss" title="' + lang.loadSenders + '">' + lang.refreshClick + '</a></table>' +
          /* Конец ланг "Имя пользователя" */
          '<div class="between_padding">' +
          '<div id="ss_cr">' +
          (filled_in_raw_data[0] ? '' :
            self.render(
              {ref: '/tmpl/controls/select.twig'},
              {
                items: sel_resp[0],
                id: 'senders'
              }
            )) +
          '</div>' +
          '</div>' +
          '<div class="between_padding">' +
          '<select class="multiple-select smscru_elem" id="sms_cru__multiple-select" multiple></select>' +
          '</div>' +
          /* Ланг "Дата отправки" */
          //'<div class="between_padding">' + lang.sendDate + ':</div>' +
          /* Ланг "Дата отправки" */
          '<div class="between_padding smscru_sending" id ="smscru_sending_wrapper">' +
          '<div class="smscru_sending_field">' +
          self.render(
            {ref: '/tmpl/controls/input.twig'},
            {
              id: 'smscru_sending_input',
              value: 'Отправка',
              value: 'Отправка' + ': ' + self.addZero(cd.getDate()) + '.' + self.addZero(cd.getMonth() + 1) + '.' + self.addZero(cd.getFullYear())
              + ' ' + self.addZero(cd.getHours()) + ':' + self.addZero(cd.getMinutes()),
              readonly: true
            }
          ) +
          '</div>' +
          '<div class="smscru_sending_popup">' +
          '<div class="smscru_sending_popup_row">' +
          '<label class="smscru_sending_popup_label" for="smscru_date">' + 'Дата' + '</label>' +
          '<div class="smscru_sending_popup_input">' +
          self.render(
            {ref: '/tmpl/controls/date_field.twig'},
            {
              id: 'smscru_date',
              class_name: 'smscru_sending_date'
            }
          ) +
          '</div>' +
          '</div>' +
          '<div class="smscru_sending_popup_row">' +
          '<label class="smscru_sending_popup_label" for="smscru_time">' + 'Время' + '</label>' +
          '<div class="smscru_sending_popup_input">' +
          self.render(
            {ref: '/tmpl/controls/suggest.twig'},
            {
              items: [
                {value: '00:00'}, {value: '00:30'}, {value: '01:00'}, {value: '01:30'},
                {value: '02:00'}, {value: '02:30'}, {value: '03:00'}, {value: '03:30'},
                {value: '04:00'}, {value: '04:30'}, {value: '05:00'}, {value: '05:30'},
                {value: '06:00'}, {value: '06:30'}, {value: '07:00'}, {value: '07:30'},
                {value: '08:00'}, {value: '08:30'}, {value: '09:00'}, {value: '09:30'},
                {value: '10:00'}, {value: '10:30'}, {value: '11:00'}, {value: '11:30'},
                {value: '12:00'}, {value: '12:30'}, {value: '13:00'}, {value: '13:30'},
                {value: '14:00'}, {value: '14:30'}, {value: '15:00'}, {value: '15:30'},
                {value: '16:00'}, {value: '16:30'}, {value: '17:00'}, {value: '17:30'},
                {value: '18:00'}, {value: '18:30'}, {value: '19:00'}, {value: '19:30'},
                {value: '20:00'}, {value: '20:30'}, {value: '21:00'}, {value: '21:30'},
                {value: '22:00'}, {value: '22:30'}, {value: '23:00'}, {value: '23:30'}
              ],
              id: 'smscru_time',
              class_name: 'smscru_sending_time'
            }
          ) +
          '</div>' +
          '</div>' +
          '</div>' +
          '</div>' +
          // '<div class="between_padding">' +
          // self.render(
          // 	{ref: '/tmpl/controls/checkbox.twig'},
          // 	{
          // 		id: 'trans'
          // 	}
          // ) +
          // '<span id="smsc_trans">' + lang.ttTranslit + '</span>' +
          // '</div>' +

          '<div>' +
          self.render(
            {ref: '/tmpl/controls/button.twig'},
            {
              id: 'sendbtn',
              text: lang.textButton
            }
          )  +

          '&nbsp;' +
          self.render(
              {ref: '/tmpl/controls/button.twig'},
              {
                  id: 'costbtn',
                  text: lang.msgCost
              }
          ) +
          '</div>' +

          '<br><div id="err"></div>' +
          '</div>' + widgetStyles;
        /* Версия  */
        // '<table width="100%"><tr><td style="font-size:xx-small" align="right" id="smsc_version"></table>';
        /* Конец Версия  */
        self.render_template({
          caption: {
            class_name: 'smsc_tpl'
          },
          body: data,
          render: ''
        });

        if ((bal = self.check_cookies('smscru-balance')) === '')
          self.get_balance(settings, lang, '');
        else {
          $('#bal').attr('style', 'color: ' + (bal > 0 ? 'green' : 'red'));
          $('#bal').text(bal);
        }

        if (sel_resp[0].length == 2)
          $('#senders option:nth-child(2)').attr('selected', 'selected');

        $('#smsc_version').text(version);

        if ($.inArray(area, ['ccard', 'comcard', 'lcard', 'cucard']) != -1) {
          $('textarea#phlist').empty();
          $('textarea#phlist').val(self.get_lead_phones($(document)));

          $(document).ajaxStop(function () {
            var status_notes, from;

            if ((status_notes = $('div.notes-wrapper div.feed-note__body')) && first) {
              from = status_notes.length > 50 ? status_notes.length - 50 : 0;

              for (i = from; i < status_notes.length; i++)
                if (status_notes[i].innerHTML.indexOf('smsc_get_status') != -1)
                  status_notes[i].innerHTML = self.replace_all(['&lt;', '&gt;', '&quot;', '&amp;', '&nbsp;'], ['<', '>', '"', '&', ' '], status_notes[i].innerHTML);

              first = false;
            }
          });
          // debugger;
          $('#sms_cru__multiple-select').select2({
            placeholder: 'Номера телефонов...',
            data: self.getContactList(),
            templateResult: self.formatContactTemplate,
            templateSelection: self.formatContactTemplate,
            tags: true
          });

          var allContacts = self.selectAllContacts();
          $("#sms_cru__multiple-select").val(allContacts).trigger("change");

          $('.smscru_sending_field').click(function (e) {
            var $popup = $('.smscru_sending_popup');

            if ($popup.css('display') != 'block') {
              $popup.show();

              var firstClick = true;

              $(document).bind('click.closeEvent', function (e) {
                if (!firstClick && $(e.target).closest($popup).length == 0) {
                  $popup.hide();
                  $(document).unbind('click.closeEvent');
                }

                firstClick = false;
              });
            }

            e.preventDefault();
          });


          var tid = setInterval(function () {
            if (!first) {
              clearInterval(tid);
              self.check_statuses();
            }
          }, 1000);
        }
        else
          first = true;

        // $('.card-widgets__widget-' + settings.widget_code).attr('style', 'padding-top: 24px; background-color: #f0faff');
        $('.custom-scroll.card-widgets__elements').attr('style', 'overflow: auto');

        // $('div.smsc_tpl').parent().css('padding-top', 0);
        $('div.smsc_tpl img:first').css('margin-left', 2 * parseInt($('div.smsc_tpl img:first').css('margin-left'), 10) + 'px');

        $('textarea#phlist').attr('title', lang.phoneRules);
        $('textarea#phlist').css('margin-top', '0px');

        $(document).off('click', '#sendbtn').on('click', '#sendbtn', function () {
          self.send_sms(settings, lang, false, '');
        });

        $(document).off('click', '#costbtn').on('click', '#costbtn', function () {
          self.send_sms(settings, lang, true, '');
        });

        $(document).off('click', '#req_tpl').on('click', '#req_tpl', function () {
          self.get_raw_data(settings, lang, 'templates', '');
        });

        $(document).off('keyup', '#smsmes').on('keyup', '#smsmes', function () {
          self.msg_len($('#smsmes').val());
        });

        $(document).off('click', '#trans').on('click', '#trans', function () {
          self.msg_len($('#smsmes').val());
        });

        $('#sdate').attr('title', lang.sendDateTime);

        var macroses = '';

        if (area == 'ccard')
          macroses = settings.contacts_macros;
        else if (area == 'comcard')
          macroses = settings.companies_macros;
        else if (area == 'clist')
          macroses = lang.forContacts + ' - ' + settings.contacts_macros + ";\n" + lang.forCompanies + ' - ' + settings.companies_macros;
        else if ($.inArray(area, ['lcard', 'llist']) != -1)
          macroses = settings.leads_macros;

        //$('#smsmes').attr('title', lang.availableMacroses + "\n" + macroses);

        $(document).off('focusout', 'div.feed-note-wrapper-note').on('focusout', 'div.feed-note-wrapper-note', function () {
          var tid, nb = this;

          tid = setInterval(function () {
            clearInterval(tid);
            var obj = $(nb).find('div.feed-note__body').contents();
            obj[0].innerHTML = self.replace_all(['&lt;', '&gt;', '&quot;', '&amp;', '&nbsp;'], ['<', '>', '"', '&', ' '], obj[0].innerHTML);
          }, 1000);
        });

        if ($('div#ss_cr li').length == 2) {
          act_li = $('div#ss_cr').find('li[data-value="opt1"]');
          $(act_li).attr({'class': 'control--select--list--item control--select--list--item-selected'});
          $('div#ss_cr button').attr({'data-value': 'opt1'});
          $('div#ss_cr button span').text($(act_li).text());
          $('input#senders').attr({'value': 'opt1', 'data-prev-value': 'opt0'});
        }

        return true;
      },

      init: function () {
        if (area == 'clist')
          $('.smsc_form').attr('style', 'margin-top: 0px');

        if (self.add_source && _.isFunction(self.add_source)) {
          self.add_source('sms', function (params) {
            return new Promise(function (resolve, reject) {
              var endpoint_url = '/widgets/' + self.system().subdomain + '/loader/' + self.get_settings().widget_code +
                '/smsc_send_sms_to_selected_contact?amouser=' + self.system().amouser + '&amohash=' + self.system().amohash;

              $.ajax({
                url: endpoint_url,
                method: 'POST',
                data: params,
                success: function (response) {
                  if (response.status === 'ok') {
                    resolve();
                  } else {
                    reject();
                  }
                },
                error: function () {
                  reject();
                }
              });
            });
          });
        }

        return true;
      },
      bind_actions: function () {
        var settings = self.get_settings(), lang = self.i18n('userLang');

        $(document).off('click', '#req_ss').on('click', '#req_ss', function () {
          self.get_raw_data(settings, lang, 'senders', '');
        });

        $(document).off('mouseup', '#smsc_get_status').on('mouseup', '#smsc_get_status', function () {
          self.get_status([this], '');
        });

        $(document).off('click', '#smscru_dp_only_main_flag').on('click', '#smscru_dp_only_main_flag', function () {
          var input = $(".digital-pipeline__short-task_widget-style_" + settings.widget_code).parent().parent().find("input[name=only_main]");
          if ($(this).is(':checked')) {
            input.val(1);
          } else {
            input.removeAttr('value');
          }
          input.change();
        });

        $(document).off('click', '.smscru_dp_marker_label').on('click', '.smscru_dp_marker_label', function () {
          var sender = $('div#ss_cr').find('li[class~="control--select--list--item-selected"]').text(),
            sms_mes = $('textarea#smscru_dp_message');

          sms_mes.val(($(this).data('replace') != 'Y' ? sms_mes.val() : '') + $(this).data('marker'));
          $('input#message').val(sms_mes.val() + '~~~~~' + sender).change();
        });

        $(document).off('change', '#smscru_templates').on('change', '#smscru_templates', function () {
          var selector = self.system().area == 'digital_pipeline' ? $('#smscru_dp_message') : $('#smsmes'),
            sender_num = $('div#smscru_wrap_tpl li.control--select--list--item-selected').data('value');

          if (sender_num == -1 && $('div.smscru-modal-window'))
            $('button.js-trigger-save').click();

          self.get_sms_text(sender_num, selector);
        });

        $(document).off('click', '.smscru_edit_tpl').on('click', '.smscru_edit_tpl', function () {
          var lang = self.i18n('userLang'), settings = self.get_settings();
          self.set_macros_names_dp();
          self.templates_editor(settings, lang);

          $('input#smscru_templates').attr('value', -2);
          $('input#smscru_templates').trigger('controls:change');
          $('input#smscru_templates').trigger('controls:change:visual');
        });

        // UPDATE Выбор даты
        $(document).on('change' + self.ns, '#smscru_date', function () {
          var date = $(this).val(),
            time = $('#smscru_time').val();
          result = 'Отправка' + ': ' + date + ' ' + time;
          if (date !== '') {
            $('#smscru_sending_input').val(result);
          }
        });
        // UPDATE Выбор времени
        $(document).on('blur' + self.ns, '#smscru_time', function () {
          var date = $('#smscru_date').val(),
            time = $(this).val();
          result = 'Отправка' + ': ' + date + ' ' + time;
          if (date !== '' && time !== '') {
            $('#smscru_sending_input').val(result);
          }
        });
        // UPDATE Чекбокс с транслитом
        $(document).on('keyup' + self.ns, '#smsmes', function () {
          var lang = self.i18n('userLang');
          var trans_template = '<div class="between_padding" id="smscru_trans_label">' +
            self.render(
              {ref: '/tmpl/controls/checkbox.twig'},
              {
                id: 'trans'
              }
            ) +
            '<span id="smsc_trans">' + lang.ttTranslit + '</span>' +
            '</div>' +

            '<div class="between_padding" id="remark">' +
            '<div class="smsc_remark">'
            + lang.smsLength +
            ' − <b id="lenmes">0</b>, sms − <b id="smscnt">0</b>' +
            '</div>' +
            '</div>';

          if ($(this).val().length > 0 && $('#trans').length == 0) {
            $(this).after(trans_template);
          } else if ($(this).val().length == 0 && $('#trans').length != 0) {
            $('#smscru_trans_label').remove();
            $('#remark').remove();
          }
        });

//				$(document).off('change', '#templates').on('change', '#templates', function() {
//					self.get_sms_text($('span#wrap_tpl li.control--select--list--item-selected').text());
//				});


        return true;
      },
      settings: function () {
        var zn = document.location.href.split(/amocrm\.(com\.ua|kz|ua|com)/i),
          langs = self.langs, dn,
          settings = self.get_settings();

        $('input[name="login"]').val(decodeURIComponent($('input[name="login"]').val()));
        $('input[name="password"]').val(decodeURIComponent($('input[name="password"]').val()));

        if (zn[1]) {
          dn = zn[1] == 'com' ? 'smscentre.com' : 'smsc.' + (zn[1] == 'com.ua' ? 'ua' : zn[1]);

          langs.widget.name.replace(/smsc\.ru/g, dn);
          langs.widget.description.replace(/smsc\.ru/g, dn);

          self.set_lang(langs);
        }

        $('.widget_settings_block__item_field').attr('style', '');
        $('#smscru_templates, #templates_dp').closest('.widget_settings_block__item_field').css({'display': 'none'});

        $('.widget_settings_block__input_field').find('input[name="oferta"]').attr('id', 'oferta');
        $('#oferta').attr({type: 'checkbox', class: ''});
        $('#oferta').after(' ' + langs.settings.oferta + '<br><span id="err_con"></span>');

        ln = $('input[name="login"]').val();
        psw = $('input[name="password"]').val();

        $('#oferta').prop('checked', ln && psw ? true : false);

        $('#save_' + settings.widget_code).attr('style', 'display: none');
        $('.widget_settings_block__controls').prepend('<input type="button" class="button-input" id="save_smsc" value="' + langs.settings.save + '">');

        $('#save_smsc').off('keyup mouseup').on('keyup mouseup', function () {
          self.check_oferta(settings, langs);
        });

        return true;
      },
      dpSettings: function () {
        var lang = self.i18n('settings'), user_lang = self.i18n('userLang'), settings = self.get_settings(),
          all_tpls = [], selected_sender, saved_tpls = [], i, all_senders = [], ss, options;

        checkbox_template = '<label class="control-checkbox">\
		            <div class="control-checkbox__body">\
		            <input type="checkbox" class="smscru_checkbox" id="smscru_dp_only_main_flag"/>\
		            <span class="control-checkbox__helper"></span>\
		            </div>\
		            <div class="control-checkbox__text element__text {{text_class_name}}">\
		              <span class="control-checkbox__note-text">' + lang.only_main + '</span>\
		            </div>\
		            </div>\
		            </label>',
          base_container = $(".digital-pipeline__short-task_widget-style_" + settings.widget_code)
            .closest('.digital-pipeline__business_processes-inner_widget'),
          input = base_container.find("input[name=only_main]"),
          value = input.val(),
          label = input.closest('.widget_settings_block__item_field'),
          message_input = base_container.find("input[name=message]"),
          message_sender = message_input[0].value.split('~~~~~'),
          message_input_label = $(message_input).closest('.widget_settings_block__item_field'),
          sender_input = base_container.find("input#senders"),
          sender_label = $(sender_input).closest('.widget_settings_block__item_field'),
          message_textarea = self.render(
            {ref: '/tmpl/controls/textarea.twig'},
            {
              id: 'smscru_dp_message',
              style: {'width': '468px', 'height': '200px', 'padding': '7px 8px'},
              value: message_sender[0].split("\\n").join("\n"),
              placeholder: lang.message
            }
          ),
          text_message = '<div>' + lang.sendMessage + ':</div>',
          dp_marker = '<div class="marker-list__block smscru_dp_marker_block">' +
            '<p class="marker-list__row"><span class="marker-list__tag-bot smscru_dp_marker_label" data-marker="{{contact_name}}"><span style="color: #a0adbd; border-bottom: 1px dotted #a0adbd;" class="marker-list__tag">{{contact_name}}</span></span><span class="marker-list__tag-descr"> - ' + lang.contact_name + '</span></p>' +
            '<p class="marker-list__row"><span class="marker-list__tag-bot smscru_dp_marker_label" data-marker="{{leads.id}}"><span style="color: #a0adbd; border-bottom: 1px dotted #a0adbd;" class="marker-list__tag">{{leads.id}}</span></span><span class="marker-list__tag-descr"> - ' + lang.lead_id + '</span></p>' +
            '<p class="marker-list__row"><span class="marker-list__tag-bot smscru_dp_marker_label" data-marker="{{contacts.cf.123456}}"><span style="color: #a0adbd; border-bottom: 1px dotted #a0adbd;" class="marker-list__tag">{{contacts.cf.123456}}</span></span><span class="marker-list__tag-descr"> - ' + lang.contacts_cf_value + '</span></p>' +
            '<p class="marker-list__row"><span class="marker-list__tag-bot smscru_dp_marker_label" data-marker="{{leads.cf.123456}}"><span style="color: #a0adbd; border-bottom: 1px dotted #a0adbd;" class="marker-list__tag">{{leads.cf.123456}}</span></span><span class="marker-list__tag-descr"> - ' + lang.leads_cf_value + '</span></p>' +
            '<p class="marker-list__row"><span class="marker-list__tag-bot smscru_dp_marker_label" data-marker="{{leads.responsible_user}}"><span style="color: #a0adbd; border-bottom: 1px dotted #a0adbd;" class="marker-list__tag">{{leads.responsible_user}}</span></span><span class="marker-list__tag-descr"> - ' + lang.leads_responsible_user + '</span></p>' +
            '<p class="marker-list__row"><span class="marker-list__tag-bot smscru_dp_marker_label" data-marker="{{leads.responsible_user_phone}}"><span style="color: #a0adbd; border-bottom: 1px dotted #a0adbd;" class="marker-list__tag">{{leads.responsible_user_phone}}</span></span><span class="marker-list__tag-descr"> - ' + lang.leads_responsible_user_phone + '</span></p>' +
            '<p class="marker-list__row"><span class="marker-list__tag-bot smscru_dp_marker_label" data-marker="{{leads.responsible_user_email}}"><span style="color: #a0adbd; border-bottom: 1px dotted #a0adbd;" class="marker-list__tag">{{leads.responsible_user_email}}</span></span><span class="marker-list__tag-descr"> - ' + lang.leads_responsible_user_email + '</span></p>' +
            '<p class="marker-list__row"><span class="marker-list__tag-bot smscru_dp_marker_label" data-marker="{{leads.price}}"><span style="color: #a0adbd; border-bottom: 1px dotted #a0adbd;" class="marker-list__tag">{{leads.price}}</span></span><span class="marker-list__tag-descr"> - ' + lang.leads_price + '</span></p>' +
            '<p class="marker-list__row"><span class="marker-list__tag-bot smscru_dp_marker_label" data-marker="{{customers.next_price}}"><span style="color: #a0adbd; border-bottom: 1px dotted #a0adbd;" class="marker-list__tag">{{customers.next_price}}</span></span><span class="marker-list__tag-descr"> - ' + lang.customers_next_price + '</span></p>' +
            '<p class="marker-list__row"><span class="marker-list__tag-bot smscru_dp_marker_label" data-marker="{{customers.next_date}}"><span style="color: #a0adbd; border-bottom: 1px dotted #a0adbd;" class="marker-list__tag">{{customers.next_date}}</span></span><span class="marker-list__tag-descr"> - ' + lang.customers_next_date + '</span></p>' +
            '<label class="digital-pipeline__example-label">' + lang.examples + '</label>' +
            '<p class="marker-list__row"><span class="marker-list__tag-bot smscru_dp_marker_label" data-replace="Y" data-marker="Код для подтверждения регистрации на конференцию amoCRM: {{contacts.cf.123456}}"><span class="marker-list__tag">' + lang.example10 + '</span></span><span class="marker-list__tag-descr"> - ' + lang.example11 + '</span></p>' +
            '<p class="marker-list__row"><span class="marker-list__tag-bot smscru_dp_marker_label" data-replace="Y" data-marker="Вы успешно зарегистрированы на конференцию amoCRM (7 апреля 10:00, СК Олимпийский, Москва). Возрастное ограничение: 18+"><span class="marker-list__tag">' + lang.example20 + '</span></span><span class="marker-list__tag-descr"> - ' + lang.example21 + '</span></p>' +
            '<p class="marker-list__row"><span class="marker-list__tag-bot smscru_dp_marker_label" data-replace="Y" data-marker="Конференция amoCRM уже скоро. Количество мест меньше, чем количество желающих, поэтому, пожалуйста, подтвердите свое участие по ссылке http://amoconf.ru/0704/?id={{leads.id}}\n\nСразу после подтверждения очного участия мы забронируем место и отправим вам билет."><span class="marker-list__tag">' + lang.example30 + '</span></span><span class="marker-list__tag-descr"> - ' + lang.example31 + '</span></p>' +
            '<p class="marker-list__row"><span class="marker-list__tag-bot smscru_dp_marker_label" data-replace="Y" data-marker="Электронный билет отправлен на почту, а также доступен по ссылке - https://amoconf.ru/0704/?{{leads.id}}\n\nПожалуйста, покажите в день мероприятия."><span class="marker-list__tag">' + lang.example40 + '</span></span><span class="marker-list__tag-descr"> - ' + lang.example41 + '</span></p>' +
            '</div>';

        $('div#ss_cr, div#smscru_wrap_tpl').remove();

        var sender_list = '<br><div>' + user_lang.senderName + ':</div><div id="ss_cr"></div><br>',
          tmp_selector = '<div id="smscru_wrap_tpl"></div><br>';

        $('.digital-pipeline__edit-bubble').css({'width': '500px'});
        input.attr({type: 'hidden', class: ''});
        sender_label.addClass('hidden');
        label.prepend(checkbox_template);
        label.find('[title^=' + lang.only_main.split(" ")[0] + ']').addClass('hidden');
        label.find('label').css({'margin-bottom': '-3px'});
        label.closest('.widget_settings_block__item_field').css({'margin-top': '-4px'});
        if (value) {
          $('#smscru_dp_only_main_flag').attr("checked", "checked");
        }


        message_input_label.find('[title^=' + lang.message.split(" ")[0] + ']').addClass('hidden');
        $(message_input).attr({type: 'hidden', class: ''});

        $(message_input).after(tmp_selector + text_message + message_textarea + sender_list + dp_marker);

        saved_tpls = settings.templates_dp.length ? self.object2array(JSON.parse(settings.templates_dp)) : [];

        if (saved_tpls.length) {
          all_tpls.push({option: user_lang.templates, id: -2});

          for (i = 0; i < saved_tpls.length; i++)
            all_tpls.push({option: saved_tpls[i].name, id: i});

          all_tpls.push({
            option: is_admin ? user_lang.editClick : user_lang.refreshClick,
            class_name: 'smscru_edit_tpl',
            id: -1
          });

          options = {items: all_tpls, id: 'smscru_templates'};

          options.selected = -2;

          $('div#smscru_wrap_tpl')
            .empty().append(
            self.render(
              {ref: '/tmpl/controls/select.twig'},
              options
            ));
        } else {
          self.get_raw_data(settings, user_lang, 'templates', '');
        }

        if (ss = self.check_cookies('smscru-senders')) {
          ss = ss.split("\n");
          all_senders.push({option: 'SMSC.RU', id: 'opt0'});

          for (i = 0; i < ss.length; i++) {
            all_senders.push({option: ss[i], id: 'opt' + (i + 1)});
          }

          $('div#ss_cr')
            .empty().append(
            self.render(
              {ref: '/tmpl/controls/select.twig'},
              {
                items: all_senders,
                id: 'senders'
              }
            ));

          for (i = 0; i < ss.length; i++)
            if ($('div#ss_cr li span')[i].innerText == message_sender[1]) {
              $('input#senders').attr('value', 'opt' + i);
              $('input#senders').trigger('controls:change');
              $('input#senders').trigger('controls:change:visual');
              break;
            }
        } else {
          self.get_raw_data(settings, user_lang, 'senders', '');
        }

        $(document).off('change', 'textarea#smscru_dp_message').on('change', 'textarea#smscru_dp_message', function () {
          sender = $('div#ss_cr').find('li[class~="control--select--list--item-selected"]').text();
          $('input#message').val($(this).val().split("\n").join("\\n") + '~~~~~' + sender).change();
        });

        $(document).off('change', 'div#ss_cr').on('change', 'div#ss_cr', function () {
          $('textarea#smscru_dp_message').change();
        });

        $('div#smscru_wrap_tpl').off('click').on('click', function () {
          $(this).removeClass('control--select--list-to-top');
        });

        $(document).off('click', 'div#smscru_wrap_tpl').on('click', 'div#smscru_wrap_tpl', function () {
          $(this).removeClass('control--select--list-to-top');
        });

        return true;
      },
      onSave: function () {
        return true;
      },
      destroy: function () {
        return true;
      },
      contacts: {
        selected: function () {
          ccdata = self.list_selected().selected;
          var phones = [], i, j, k, m, lang = self.i18n('userLang');

          self.set_settings({ccdata: ccdata});

          $('#sms_cru__multiple-select').empty();
          $('#smsru_err').empty();

          for (var i = 0; i < ccdata.length; i++)
            for (var j = 0; j < ccdata[i].phones.length; j++) {
              ph = ccdata[i].phones[j].trim().match(/^\+?(?:[- ()]*\d[- ()]*){10,15}$/);
              if (ph) {
                phones.push({
                  id: ph,
                  text: ''
                });
              }
            }

          $('#sms_cru__multiple-select').select2({
            placeholder: lang.phonesList,
            data: phones,
            templateResult: self.formatContactTemplate,
            templateSelection: self.formatContactTemplate,
            tags: true
          });

          $("#sms_cru__multiple-select").val(self.selectAllContacts()).trigger("change");

          $('.select2-selection__rendered').addClass('custom-scroll');
          //   $('textarea#phlist').val(phones.join(','));

          $('.smscru_sending_field').click(function (e) {
            var $popup = $('.smscru_sending_popup');

            if ($popup.css('display') != 'block') {
              $popup.show();

              var firstClick = true;

              $(document).bind('click.closeEvent', function (e) {
                if (!firstClick && $(e.target).closest($popup).length == 0) {
                  $popup.hide();
                  $(document).unbind('click.closeEvent');
                }

                firstClick = false;
              });
            }

            e.preventDefault();
          });

          $('#widgets_block').css({'top': $(window).scrollTop()});
          $('#widgets_block').css({'height': $(window).height()});
        }
      },
      leads: {
        selected: function () {
          ccdata = self.list_selected().selected;

          self.set_settings({ccdata: ccdata});

          self.get_leads_phones(ccdata);

          $('#smscru_templates').val(-2);
          $('#widgets_block').css({'top': $(window).scrollTop()});
          $('#widgets_block').css({'height': $(window).height()});
        }
      },

      customers: {
        selected: function () {
          $('#sms_cru__multiple-select').empty();
          ccdata = self.list_selected().selected;
          self.set_settings({ccdata: ccdata});
          self.get_customers_phones(ccdata);
        }
      },
      tasks: {
        selected: function () {
        }
      }
    };

    this.send_sms = function (settings, lang, cost, srv) {
      var errors = [
            lang.paramError,
            lang.invalidAuth,
            lang.noMoney,
            lang.blockedIP,
            lang.invalidDate,
            lang.messageDenied,
            lang.invalidFormat,
            lang.messageNotDelivered,
            lang.moreOneRequest
          ],

          list = '',

          system = self.system(),

          endpoint_url = '/widgets/' + system.subdomain + '/loader/' + self.params.widget_code +
            '/smsc_send_sms?amouser=' + system.amouser + '&amohash=' + system.amohash,

          // UPDATE Получаем телефоны
          sel_phones = $('.smscru_cont_phone'),

          phlist_arr = [],

          date = $('#smscru_sending_input').val().replace(/([a-zA-Zа-яА-ЯёЁ])+(:\s)+/ig, ""),

          date_format = AMOCRM.system.format.date.full,
          // Вид даты
          date_utc = moment(date, date_format).format('DD.MM.YY HH:mm'),
          // Транслит
          isTrans = $('#trans').is(':checked'),
          // Сообщение
          final_mes = [{
            id: AMOCRM.constant('card_id'),
            message: $('#smsmes').val().split("\n").join("\\n")
          }],

          data = {
            login: settings.login,
            psw: settings.password,
            from: 79777760864,
            time: date_utc,
            translit: $('#trans').is(':checked') ? 1 : 0,
            entity: [],
            text: final_mes[0].message
          },

          data_ids = [],
          data_type;

      // UPDATE
      sel_phones.each(function () {
        var value = $(this).html().trim().replace(/[^0-9]/ig, "");
        if (value) {
          phlist_arr.push(value);
        }
      });

      // Получаем список номеров на которые надо отправить 89777760864, 89299260003
      sel_phones = phlist_arr.length > 1 ? phlist_arr.join(',') : phlist_arr[0];

      if (_.contains(['ccard', 'lcard', 'comcard', 'cucard'], area)) {
        data_ids.push(AMOCRM.constant('card_id'));
      } else {
        _.each(settings.ccdata, function(element) {
          data_ids.push(element.id);
        });
      }  

      switch(area) {
        case 'clist':
        case 'ccard':
          data_type = AMOCRM.element_types.contacts;
          break;
        case 'llist':
        case 'lcard':
          data_type = AMOCRM.element_types.leads;
          break;
        case 'comlist':
        case 'comcard':
          data_type = AMOCRM.element_types.companies;
          break;
        case 'cucard':
        case 'culist':
          data_type = AMOCRM.element_types.customers;
          break;
      }

      

      data.entity.push({
        numeric_type: data_type,
        id: data_ids,
        to: phlist_arr
      });


      $('#err').empty();
      $('#err').attr('style', 'color: red');

      var senders = $('div#ss_cr').find('li[class~="control--select--list--item-selected"]').text(),
          tps = $('div#types').find('li[class~="control--select--list--item-selected"]').text();

      $.ajax({
        type: "POST",
        async: false,
        url: endpoint_url,
        data: data,
        dataType: "json",
        success: function (response) {

          final_mes = response.status ? response.message : response.error;

        }
      });

      var final_arr = [],
          final_str = '',
          res_arr = [];

    if(_.contains(['lcard', 'ccard', 'comcard', 'cucard'], area)) {
      _.each(phlist_arr, function (ph_data) {
        final_arr.push(ph_data + ':' + self.parse_message_text(final_mes[0].message, 'sms_text'));
      });

      final_str = final_arr.join('\n');

    } else if (_.contains(['llist', 'culist'], area)) {
      var is_lead_list = area === 'llist',
          phones = is_lead_list ? self.get_leads_phones(settings.ccdata) : self.get_customers_phones(settings.ccdata);

      _.each(phones, function(element) {
        _.each(final_mes, function(fm_el) {
          var linked_ids = is_lead_list ? element.linked_leads_id : element.linked_customers_id;

          if (_.some(linked_ids, function (linked_id) {
            return parseInt(linked_id) === parseInt(fm_el.id);
          })) {
            _.each(element.custom_fields, function(cf) {
              if(cf.code === 'PHONE') {
                _.each(cf.values, function(val) {
                  if(phlist_arr.indexOf(val.value) !== -1) {
                    res_arr.push({
                      message: fm_el.message,
                      phone: val.value,
                      id: fm_el.id
                    });
                  }
                });
              }
            });
          }
        });
      });

      if (res_arr.length > 0) {
        _.each(res_arr, function(element) {
          final_arr.push(element.phone + ':' + self.parse_message_text(element.message, 'sms_text'));
        });

        final_str = final_arr.join('\n');
      }
    } else if (_.contains(['clist', 'comlist'], area)) {
        var cont_phones = [];

        for (var i = 0; i < settings.ccdata.length; i++) {
          if (final_mes[i].id == settings.ccdata[i].id) {
            for (var j = 0; j < settings.ccdata[i].phones.length; j++) {
              if (phlist_arr.indexOf(settings.ccdata[i].phones[j].trim().replace(/[^0-9]/ig, "")) !== -1) {
                cont_phones.push(settings.ccdata[i].phones[j] + ':' + self.parse_message_text(final_mes[i].message, 'sms_text'));
              }
            }
          }
        }

        final_str =  cont_phones.join('\n');
      }

      self.crm_post(
        'https://www' + srv + '.smsc.ru/sys/send.php',
        {
          login: settings.login,
          psw: settings.password,
          phones: sel_phones, // Валидные номера из select2
          mes: final_str ? '' : self.parse_message_text(final_mes[0].message, 'sms_text'), // Валидное сообщение
          list: final_str,
          sender: senders !== 'SMSC.RU' ? senders : '',
          charset: 'utf-8',
          time: date_utc, // Валидная дата отправки
          translit: isTrans ? 1 : 0,
          cost: cost ? 1 : 3,
          fmt: 1,
          pp: 505792,
          viber: tps === 'Viber' ? 1 : 0
        },
        function (msg) {
          if (msg.indexOf('cURL error') !== -1 || msg === '') {
            if (+srv < 5)
              self.send_sms(settings, lang, cost, srv++ ? srv : ++srv);
            else
              return false;
          } else {
            var resp = msg.split(',');

            if (resp[1] < 0) {
              $('#err').text(errors[Math.abs(resp[1]) - 1]);
            } else {
              $('#err').attr('style', 'color: green');
              $('#err').text(cost ? lang.msgCost + ': ' + resp[0] + ', ' + lang.msgAll + ': ' + resp[1] : lang.msgOk);
            }

           if (!cost && sel_phones) {
              var carddata = [], texts = [], el_id, el_ids = [], types = [], mes = '',
                account = self.get_current_account_info(), phones = [];

              if ((type = $.inArray(area, ['ccard', 'lcard', 'comcard', 'cucard'])) != -1) {
                el_id = document.location.href.split('detail/');

                if (el_id[1]) {
                  el_id = el_id[1].split(/[\?#]/);

                  if (sel_phones) {
                    // texts.push(list.messages ? list.messages.split(/^([^:]+):(.+)$/)[2].replace(/\\n/g, "\n") : final_mes);
                    el_ids.push(el_id[0]);
                    if(type == 3)
                      types.push(type += 9);
                    else
                      types.push(++type);
                    phones.push(sel_phones);

                    carddata.push({
                      "element_id": el_id[0],
                      "element_type": type,
                      "note_type": 103,
                      "params": {"text": self.parse_message_text(final_mes[0].message, 'note_text'), 'PHONE': sel_phones},
                      'created_by': account.response.account.current_user
                    });
                  }
                }

                if (carddata.length && resp[1] > 0){

                  self.sms_save(carddata, final_mes, el_ids, types, resp[0], phones);
                
                }

              } else if (_.contains(['clist', 'llist', 'culist', 'comlist'], area)) {
                var listdata = [];

                  // Если это список сделок
                  if (area === 'llist') {

                      listdata = self.getLeadsData(settings.ccdata, final_mes, phlist_arr);
                  
                      // Если это список контактов
                  } else if (area === 'clist') {

                      for (var i = 0; i < settings.ccdata.length; i++) {
                        for (var j = 0; j < settings.ccdata[i].phones.length; j++) {
                          if (phlist_arr.indexOf(settings.ccdata[i].phones[j]) !== -1) {
                            _.each(final_mes, function(data) {
                              if (data.id == settings.ccdata[i].id) {
                                listdata.push({
                                  'element_id': String(settings.ccdata[i].id),
                                  'element_type': self.get_element_id(settings.ccdata[i].type),
                                  'note_type': 103,
                                  'params': {'text': self.parse_message_text(data.message, 'note_text'), 'PHONE': settings.ccdata[i].phones[j]},
                                  'created_by': account.response.account.current_user
                                });
                              }
                            });
                          }
                        }    
                      }
                    } else if(area === 'culist') {
                      listdata = self.getCustomersData(settings.ccdata, final_mes, phlist_arr);
                    }



                // Создаем примечания для списков (Списки контактов, компани, сделок и покупателей)
                if (listdata.length && resp[1] > 0) {
                  self.add_notes(listdata, final_mes);
                } else {
                  self.add_notes_error(listdata, final_mes, errors[Math.abs(resp[1]) - 1]);
                }

              }
            }
          }
              
        },
        'text',
        function (XMLHttpRequest) {
          $('#err').text(lang.msgError + ' ' + lang.responseError);
          return false;
        }
      );

      self.get_balance(settings, lang, '');
    };

    this.getCustomersData = function (sel_customers, message, phlist) {
      var query = '', kkdata = [], lang = self.i18n('userLang'), links, result, account = self.get_current_account_info();

      _.each(sel_customers, function (item, index) {
        query += 'links[' + index + '][from]=customers&links[' + index + '][to]=contacts&links[' + index + '][from_id]=' + item.id + '&';

      });

      $.ajax({
        type: 'GET',
        url: '/private/api/v2/json/links/list',
        data: query,
        dataType: 'json',
        async: false,
        success: function (data) {
          var query = '', phones, phone = '';
          if (Fn.hasKeys(data, ['response', 'links'])) {
            links = data.response.links;
            _.each(links, function (link) {
              query += 'id[]=' + link.to_id + '&';
            })
          }
          if (query !== '') {
            data = self.get_elements_info(query, 'contacts');
          }
          if (Fn.hasKeys(data, ['response', 'contacts'])) {
            result = data.response.contacts;
            $('#smsru_sendbtn').removeClass('hidden');
          } else {
            $('#smsru_err').text(lang.getContactInfoError);
            $('#smsru_sendbtn').addClass('hidden');
          }
          _.each(result, function (contact) {
            var linked = _.map(links, function (link) {
              if (contact.id === link.to_id) {
                return _.isUndefined(link.from_id) ? '' : link.from_id;
              }
            });
            if (Fn.hasKeys(contact, ['linked_customers_id']) && !_.isUndefined(linked)) {
              contact.linked_customers_id.push(linked);
            } else if(!_.isUndefined(linked)) {
              contact.linked_customers_id = linked;
            }
          });
        }
      });

        // Формирование массива с notes для примечания
        // Сравнивает по айди и телефонам в select2
        _.each(links, function(cus){
          _.each(result, function(acc){
            _.each(message, function(ms){
              if(acc.id == cus.to_id && cus.from_id == ms.id){
                for(var i = 0; i < acc.custom_fields.length; i++){
                  if (acc.custom_fields[i].code === 'PHONE') {
                    _.each(acc.custom_fields[i].values, function(value) {
                      if (phlist.indexOf(value.value) !== -1) {
                        kkdata.push({
                          'element_id': cus.from_id,
                          'element_type': self.get_element_id(cus.from),
                          'note_type': 103,
                          'params': {'text': self.parse_message_text(ms.message, 'note_text'), 'PHONE': value.value},
                          'created_by': account.response.account.current_user
                        });
                      }
                    });
                  }
                }
              }
            });
          });
        });

      return kkdata;
    };

    this.getLeadsData = function (ccdata, message, phlist){

      var kkdata = [], query = '', lang = self.i18n('userLang'), contacts_data = []. self = this,  account = self.get_current_account_info();
      for (i = 0; i < ccdata.length; i++){
        query += 'deals_link[]=' + ccdata[i].id + '&';
      }  

      $.ajax({
        type: 'GET',
        url: '/private/api/v2/json/contacts/links',
        data: query,
        dataType: 'json',
        async: false,
        success: function (data) {
          var links = [], query = '', phones, phone = '';

          if (Fn.hasKeys(data, ['response', 'links'])) {
            links = data.response.links;
          }
          _.each(links, function (link) {
            query += 'id[]=' + link.contact_id + '&';
          });

          if (query !== '') {
            contacts_data = self.get_elements_info(query, 'contacts');
          }
          if (!Fn.hasKeys(contacts_data, ['response', 'contacts'])) {
            $('#smsru_err').text(lang.getContactInfoError);
            $('#smsru_sendbtn').addClass('hidden');
          } else {
            contacts_data = contacts_data.response.contacts;
            $('#smsru_sendbtn').removeClass('hidden');
          }
        }
      });

      _.each(ccdata, function(lead){
        for(var i = 0; i< contacts_data.length; i++){
            if(contacts_data[i].linked_leads_id.indexOf(String(lead.id)) != -1){
              _.each(message, function(ms){
                if(lead.id == ms.id){
                  _.each(contacts_data[i].custom_fields, function(cf){
                    if(cf.code === 'PHONE'){
                      _.each(cf.values, function(value) {
                        if (phlist.indexOf(value.value) !== -1) {

                          kkdata.push({
                            'element_id': lead.id,
                            'element_type': self.get_element_id(lead.type),
                            'note_type': 103,
                            'params': {'text': self.parse_message_text(ms.message, 'note_text') || ms, 'PHONE': value.value},
                            'created_by': account.response.account.current_user
                          });
                        }
                      });
                    }
                  });
                }
              });

            }
          };
            
      // Данные для внесения примечания (Стандартные)
        });

        return kkdata;

    };

    this.get_element_id = function (element_type) {
      switch (element_type) {
        case 'contact':
          return 1;
          break;
        case 'lead':
          return 2;
          break;
        case 'customers':
          return 12;
          break;
        case 'company':
          return 3;
          break;
      }
    };

    this.get_raw_data = function (settings, lang, cmd, srv) {
      self.crm_post(
        'https://www' + srv + '.smsc.ru/sys/' + cmd + '.php',
        {
          login: settings.login,
          psw: settings.password,
          get: 1,
          charset: 'utf-8',
          fmt: 1
        },
        function (msg) {
          var smscru_entity = [];

          if (msg.indexOf('cURL error') != -1 || msg === '') {
            if (+srv < 5)
              self.get_raw_data(settings, lang, cmd, srv++ ? srv : ++srv);
            else
              return false;
          }
          else {
            var resp = msg.split(','), ss = cmd == 'senders', full_mes = '',
              smscru_tpls = [], all_tpls = [], idx = 0, i;

            if (resp[1] && resp[1] < 0) {
              //$('#err').text((resp[1] == -9 ? lang.moreOneRequest : (ss ? lang.getSrError : (resp[1] == -3 ? '' : lang.getTempError))) + '!');
              resp.length = 0;
              msg = '';
            }
            else {
              resp = msg.trim().split("\n");
              $('#err').text('');
            }

            smscru_entity.push({option: (ss ? 'SMSC.RU' : lang.templates), id: ss ? 'opt0' : -2});

            if (!ss)
              msg = '';

            for (i = 0; i < resp.length; i++)
              if (ss)
                smscru_entity.push({option: resp[i], id: 'opt' + (i + 1)});
              else
                smscru_tpls.push({name: resp[i].split(',')[1], text: resp[i].match(/^([^,]*,){5}(.+)$/)[2]});

            if (ss)
              document.cookie = 'smscru-senders=' + encodeURIComponent('---' + "\n" + msg) + '; path=/';
            else {
              all_tpls = settings.templates_dp ? self.object2array(JSON.parse(settings.templates_dp)) : [];
              all_tpls = smscru_tpls.concat(all_tpls);
              all_tpls = _.filter(all_tpls, function (num) {
                var i, cnt = 0;

                idx++;

                for (i = idx; i < all_tpls.length; i++)
                  if (num.name == all_tpls[i].name)
                    return false;

                return true;
              });

              self.save_all_settings(settings, {templates_dp: all_tpls});

              for (i = 0; i < all_tpls.length; i++)
                smscru_entity.push({option: all_tpls[i].name, id: i});

              smscru_entity.push({
                option: is_admin ? lang.editClick : lang.refreshClick,
                class_name: 'smscru_edit_tpl',
                id: -1
              });
            }

            $('div#' + (ss ? 'ss_cr' : 'smscru_wrap_tpl'))
              .empty().append(
              self.render(
                {ref: '/tmpl/controls/select.twig'},
                {
                  items: smscru_entity,
                  id: ss ? 'senders' : 'smscru_templates'
                }
              ));

            if ($.inArray(AMOCRM.data.current_entity, ['leads-dp', 'customers-dp']) != -1) {
              base_container = $(".digital-pipeline__short-task_widget-style_" + settings.widget_code)
                .closest('.digital-pipeline__business_processes-inner_widget');

              message_input = base_container.find("input[name=message]");

              if (message_input.length && message_input[0].value) {
                message_sender = message_input[0].value.split('~~~~~');

                if (message_sender.length == 1)
                  message_sender.push('SMSC.RU');
              }
              else
                message_sender = ['', ''];

              for (i = 0; i < $('div#ss_cr li').length; i++)
                if ($('div#ss_cr li span')[i].innerText == message_sender[1]) {
                  $('input#senders').attr('value', 'opt' + i);
                  $('input#senders').trigger('controls:change');
                  $('input#senders').trigger('controls:change:visual');
                  break;

                  /*									act_li = $('div#ss_cr').find('li[data-value="opt' + i + '"]');
                                                      $(act_li).addClass('control--select--list--item-selected');
                                                      $('div#ss_cr button').attr({'data-value': 'opt' + i});
                                                      $('div#ss_cr button span').text($(act_li).text());
                                                      $('input#senders').attr({'value': 'opt' + i, 'data-prev-value': 'opt' + (i - 1)});
                  */
                }
//								else {
//									act_li = $('div#ss_cr').find('li[data-value="opt' + i + '"]');
//									$(act_li).removeClass('control--select--list--item-selected');
//								}
            }
          }
        },
        'text',
        function (XMLHttpRequest) {
          $('#err').text(lang.msgError + ' ' + lang.responseError);
          return false;
        }
      );
    };

    /*		this.get_sms_text = function(name) {
                var rp = self.get_settings().templates_dp;

                if (rp) {
                    rp_strs = rp.trim().split("\n");

                    for (i = 0; i < rp_strs.length; i++)
                        if (rp_strs[i].split('~~~')[0] == name) {
                            $('#smsmes').val(rp_strs[i].split('~~~')[1].replace(/\\n/g, "\n"));
                            self.msg_len($('#smsmes').val());
                            break;
                        }
                }
            };*/

    this.get_sms_text = function (id, selector) {
      var settings = self.get_settings(), message_sender, i, act_li,
        rp = settings.templates_dp ? self.object2array(JSON.parse(settings.templates_dp)) : [];

      if (rp && id != -1 && id != -2) {
        message_sender = rp[id].text.split('~~~~~');

        sender = message_sender.length == 2 ? message_sender[1] : '---';

//			if (sender != '---')
        for (i = 0; i < $('div#ss_cr li').length; i++)
          if ($('div#ss_cr li span')[i].innerText == sender) {
            $('input#senders').attr('value', 'opt' + i);
            $('input#senders').trigger('controls:change');
            $('input#senders').trigger('controls:change:visual');
            break;

            /*						act_li = $('div#ss_cr').find('li[data-value="opt' + i + '"]');
                                    $(act_li).addClass('control--select--list--item-selected');
                                    $('div#ss_cr button').attr({'data-value': 'opt' + i});
                                    $('div#ss_cr button span').text($(act_li).text());*/
          }
//					else {
//						act_li = $('div#ss_cr').find('li[data-value="opt' + i + '"]');
//						$(act_li).removeClass('control--select--list--item-selected');
//					}

        selector.val(self.replace_all(['$lt;', '&gt;', '&quot;'], ['<', '>', '"'], message_sender[0]));
        selector.parent().find('input#message').val(rp[id].text).change();
      }
      else
        selector.val('');

      self.msg_len(selector.val());
      selector.keyup();
    };

    this.get_balance = function (settings, lang, srv) {
      self.crm_post(
        'https://www' + srv + '.smsc.ru/sys/balance.php',
        {
          login: settings.login,
          psw: settings.password,
          charset: 'utf-8',
          fmt: 1
        },
        function (msg) {
          if (msg.indexOf('cURL error') != -1 || msg === '') {
            if (+srv < 5)
              self.get_balance(settings, lang, srv++ ? srv : ++srv);
            else
              return false;
          }
          else {
            var resp = msg.split(',');

            if (resp[1] && resp[1] < 0) {
              $('#err').text(lang.getBalError + '!');
              return false;
            }
            else {
              $('#bal').attr('style', 'color: ' + (resp[0] > 0 ? 'green' : 'red'));
              $('#bal').text(resp[0]);

              document.cookie = 'smscru-balance=' + encodeURIComponent(resp[0]) + '; path=/';

              return resp[0];
            }
          }
        },
        'text',
        function (XMLHttpRequest) {
          $('#err').text(lang.msgError + ' ' + lang.responseError);
          return false;
        }
      );
    };

    this.check_cookies = function (cmd) {
      var regexp = new RegExp(cmd + "=(.+?)(?:(%0A)?;|$)");
      res = regexp.exec(document.cookie);

      return res == null ? '' : decodeURIComponent(res[1]).trim();
    };

    this.div_out = function () {
      self.set_settings({out_over: false});
    };

    this.div_over = function () {
      self.set_settings({out_over: true});
    };

    this.body_clk = function () {
      if (!self.get_settings().out_over) {
        $('body').off('click', self.body_clk);
        $('div#widgets_block').off('mouseout', self.div_out);
        $('div#widgets_block').off('mouseover', self.div_over);
        $('span#multi-widget_close').off('click', self.cr_close);

        $('body').css({'overflow': 'auto'});
        $('#page_holder').css({'overflow-y': 'auto'});
      }
    };

    this.cr_close = function () {
      self.set_settings({out_over: false});
    };

    this.msg_len = function (vl) {
      if (!vl)
        return;

      var m = vl.replace(/\r/g, '').replace(/[\x00-\x09\x0b-\x20]+/g, ' '),
        lr = m.length, l, en, p = $('textarea#phlist').val();

      // p = p.replace(/[^\d,;:\n ]+/g, '').match(/\d{8,}/g);
      // p = p ? p.length : 0;

      if (en = $('#trans').is(':checked'))
        m = m.replace(/[цчшюя]/g, '..').replace(/щ/g, '...');

      if (en = en || m.match(/^[\x00-\x7f–­¦‘’`“”\xa0]+$/))
        m = m.replace(/[{}\[\]^~\\|]/g, '..');

      l = m.length;

      $('#lenmes').text(lr);
      $('#smscnt').text(Math.ceil(l / (en ? (l > 160 ? 153 : 160) : (l > 70 ? 67 : 70))));
    };

    this.add_notes = function (kkdata, text) {
      var lang = self.i18n('userLang'), upddata = [];

      for (var i = 0; i < kkdata.length; i++) {
        _.each(text, function(txt) {
          if (kkdata[i].element_id == txt.id) {
            kkdata[i].params = {
              text: self.parse_message_text(txt.message, 'note_text').split("\\n").join("\n"),
              PHONE: kkdata[i].params.PHONE
            };
          }
        });
      }

      $.post(
        '/api/v2/notes',
        {'add': kkdata},
        function (res) {

          location.reload(true);
        
        },
        'json'
      );
    };

    this.add_notes_error = function (kkdata, text, error) {
      var lang = self.i18n('userLang'), upddata = [], template_err = [
        'Возника ошибка при отправке сообщения. ' + error + '\n'
      ];

      for (var i = 0; i < kkdata.length; i++) {
        _.each(text, function(txt) {
          if(kkdata[i].element_id == txt.id) {
            kkdata[i].params = {
              text: template_err[0] + self.parse_message_text(txt.message, 'note_text').split("\\n").join("\n"),
              PHONE: kkdata[i].params.PHONE
            };
          }
        });
      }

      $.post(
        '/api/v2/notes',
        {'add': kkdata},
        function (res) {
          location.reload(true);
        },
        'json'
      );
    };


    this.sms_save = function (alldata, texts, el_ids, types, sms_id, phones) {
      var lang = self.i18n('userLang'), upddata = [], sms_text;

      // for (var i = 0; i < alldata.length; i++) {
      //   _.each(texts, function(txt){
      //     sms_text = {
      //       'text': txt.message.split("\\n").join("\n"),
      //       'PHONE': phones[i]
      //     };
      //   });
      //   alldata[i].params = sms_text;
      // }

      $.post(
        '/api/v2/notes',
        {'add': alldata},
        function (data) {

          if ($.inArray(area, ['ccard', 'comcard', 'lcard', 'cucard']) != -1){
            location.reload(true);
          }
          // for (var i = 0; i < alldata.length; i++) {
          //   _.each(texts, function(txt){
          //     sms_text = {
          //       'text': txt.message.split("\\n").join("\n"),
          //       'PHONE': phones[i]
          //     };
  
          //     upddata.push({
          //       'id': data._embedded.items[i].id,
          //       'note_type': 103,
          //       'params': sms_text,
          //       'updated_at': parseInt(Date.now() / 1000, 10) + 2
          //     });
          //   });
          // }
          // $.post(
          //   '/api/v2/notes',
          //   {'update': upddata},
          //   function (data) {
              // if ($.inArray(area, ['ccard', 'comcard', 'lcard', 'cucard']) != -1)
              //   location.reload(true);
          //   },
          //   'json'
          // );
        },
        'json'
      );
    };

    this.selectAllContacts = function () {
      var selectedItems = [];

      var allOptions = $("#sms_cru__multiple-select option");

      allOptions.each(function () {
        selectedItems.push($(this).val());
      });

      return selectedItems;
    };

    this.getContactList = function () {
      var $selector, contacts_collection = [], selected_phones = [];
      if ($.inArray(area, ['ccard', 'comcard', 'lcard', 'cucard']) != -1) {
        $selector = area === 'comcard' ?
          $('#edit_card [data-pei-code=phone] input[type=text]') :
          $('[data-pei-code=phone] input[type=text]');
        $selector.each(function () {
          if ($(this).val().trim().match(/^\+?(?:[- ()]*\d[- ()]*){10,15}$/) &&
            $.inArray($(this).val().replace(/[^0-9]/ig, ""), selected_phones) === -1) {
            selected_phones.push($(this).val().replace(/[^0-9]/ig, ""));
            contacts_collection.push({
              id: $(this).val(),
              text: $(this).closest('form.linked-form').find('.linked-form__field__value-name input').val()
            });
          }
        });
      }

      return contacts_collection;
    };

    this.formatContactTemplate = function (state) {
      if (!state.id) {
        return state.text;
      }

      var contName = state.text,
        contPhone = '';

      //проверка для динамического добавления контакта
      if (state.element && state.element.value) {
        if (state.element.value === state.text) {
          contName = '';
          contPhone = state.text;
        } else {
          contPhone = state.element.value;
        }
      }

      var $state = $(
        '<div class="smscru_cont" title="' + contName + '">' +
        '<span class="smscru_cont_name">' + contName + '</span> ' +
        '<span class="smscru_cont_phone">' + contPhone + '</span>' +
        '</div>'
      );

      return $state;
    };

    this.get_lead_phones = function (html) {
      var phs = $(html).find((area == 'lcard' ? '' : 'div.linked-forms__group-wrapper ') + 'div.js-linked-has-value[data-pei-code|=phone]'),
        allphs = '';

      if (phs)
        for (var j = 0; j < phs.length; j++) {
          ph = $(phs[j]).find('input').val();

          if (ph && ph.length >= 8)
            allphs += (allphs ? ',' : '') + ph.trim();
        }

      return allphs;
    };

    this.get_customers_phones = function (sel_customers) {
      var query = '', lang = self.i18n('userLang'), links, result;

      _.each(sel_customers, function (item, index) {
        query += 'links[' + index + '][from]=customers&links[' + index + '][to]=contacts&links[' + index + '][from_id]=' + item.id + '&';

      });

      $.ajax({
        type: 'GET',
        url: '/private/api/v2/json/links/list',
        data: query,
        dataType: 'json',
        async: false,
        success: function (data) {
          var query = '', phones;
          if (Fn.hasKeys(data, ['response', 'links'])) {
            links = data.response.links;
            _.each(links, function (link) {
              query += 'id[]=' + link.to_id + '&';
            })
          }
          if (query !== '') {
            data = self.get_elements_info(query, 'contacts');
          }
          if (Fn.hasKeys(data, ['response', 'contacts'])) {
            result = data.response.contacts;
            $('#smsru_sendbtn').removeClass('hidden');
          } else {
            $('#smsru_err').text(lang.getContactInfoError);
            $('#smsru_sendbtn').addClass('hidden');
          }
          _.each(result, function (contact) {
            var linked = _.map(links, function (link) {
              if (contact.id === link.to_id) {
                return link.from_id;
              }
            });
            if (Fn.hasKeys(contact, ['linked_customers_id'])) {
              contact.linked_customers_id.push(linked);
            } else {
              contact.linked_customers_id = linked;
            }
          });

          phones = Fn.getPhones(result);
          // debugger;
          $('#sms_cru__multiple-select').select2({
            placeholder: lang.phonesList,
            data: phones,
            templateResult: self.formatContactTemplate,
            templateSelection: self.formatContactTemplate,
            tags: true
          });

          $("#sms_cru__multiple-select").val(self.selectAllContacts()).trigger("change");

          $('#sms_cru__multiple-select_wrapper .select2-selection__rendered').addClass('custom-scroll');
        }
      });

      return result;
    };

    this.get_leads_phones = function (sel_leads) {
      var query = '', lang = self.i18n('userLang'), contacts_data = [];

      for (i = 0; i < sel_leads.length; i++)
        query += 'deals_link[]=' + sel_leads[i].id + '&';

      $.ajax({
        type: 'GET',
        url: '/private/api/v2/json/contacts/links',
        data: query,
        dataType: 'json',
        async: false,
        success: function (data) {
          var links = [], query = '', phones;

          if (Fn.hasKeys(data, ['response', 'links'])) {
            links = data.response.links;
          }
          _.each(links, function (link) {
            query += 'id[]=' + link.contact_id + '&';
          });

          if (query !== '') {
            contacts_data = self.get_elements_info(query, 'contacts');
          }
          if (!Fn.hasKeys(contacts_data, ['response', 'contacts'])) {
            $('#smsru_err').text(lang.getContactInfoError);
            $('#smsru_sendbtn').addClass('hidden');
          } else {
            contacts_data = contacts_data.response.contacts;
            $('#smsru_sendbtn').removeClass('hidden');
          }

          phones = Fn.getPhones(contacts_data);
          // debugger;
          $('#sms_cru__multiple-select').select2({
            placeholder: lang.phonesList,
            data: phones,
            templateResult: self.formatContactTemplate,
            templateSelection: self.formatContactTemplate,
            tags: true
          });

          $("#sms_cru__multiple-select").val(self.selectAllContacts()).trigger("change");

          $('.select2-selection__rendered').addClass('custom-scroll');

          $('.smscru_sending_field').click(function (e) {
            var $popup = $('.smscru_sending_popup');

            if ($popup.css('display') != 'block') {
              $popup.show();

              var firstClick = true;

              $(document).bind('click.closeEvent', function (e) {
                if (!firstClick && $(e.target).closest($popup).length == 0) {
                  $popup.hide();
                  $(document).unbind('click.closeEvent');
                }

                firstClick = false;
              });
            }

            e.preventDefault();
          });
        }
      });

      return contacts_data;
    };

    this.check_connection = function (settings, langs, sw_st, srv) {
      var lgn = $('.widget_settings_block__input_field').find('input[name="login"]').val(),
        ps = $('.widget_settings_block__input_field').find('input[name="password"]').val();

      self.crm_post(
        'https://www' + srv + '.smsc.ru/sys/status.php',
        {
          login: lgn,
          psw: ps,
          charset: 'utf-8',
          fmt: 1
        },
        function (msg) {
          if (msg.indexOf('cURL error') != -1 || msg === '') {
            if (+srv < 5)
              self.check_connection(settings, langs, sw_st, srv++ ? srv : ++srv);
            else
              return false;
          }
          else {
            var resp = msg.split(',');

            if (resp[1]) {
              $('#err_con').text(resp[1] == -2 || !(lgn && ps) ? langs.settings.fail : (resp[1] == -4 ? langs.userLang.blockedIP : (resp[1] == -9 ? langs.settings.muchreq : langs.settings.success)));
              $('#err_con').attr('style', 'color: ' + (resp[1] == -2 || !(lgn && ps) || resp[1] == -4 || resp[1] == -9 ? 'red' : 'green'));
            }

            if (sw_st || $('#err_con').text() == langs.settings.success) {
              if ($('input[name="password"]').val().length != 32)
                $('input[name="password"]').val(encodeURIComponent($('input[name="password"]').val()));

              $('input[name="login"]').val(encodeURIComponent($('input[name="login"]').val()));

              $('#save_' + settings.widget_code).click();
            }
          }
        },
        'text'
      );
    };

    this.addZero = function (i) {
      if (i < 10)
        i = '0' + i;

      return i;
    };

    this.check_oferta = function (settings, langs) {
      var sw_st = false;

      $('#err_con').text('');

      if ($('.switcher_wrapper').find('label').attr('class'))
        sw_st = $('.switcher_wrapper').find('label').attr('class').indexOf('switcher__on') == -1;

      if (sw_st || ($('#oferta').is(':checked') && $(document).find('input[name="login"]').val() != '' && $(document).find('input[name="password"]').val() != ''))
        self.check_connection(settings, langs, sw_st, '');
      else {
        $('#err_con').append(langs.settings.fields_error);
        $('#err_con').attr('style', 'color: red');
      }
    };

    this.get_elements_info = function (ids, type) {
      var elem_data;

      $.ajax({
        type: 'GET',
        url: '/private/api/v2/json/' + type + '/list',
        data: ids,
        dataType: 'json',
        async: false,
        success: function (data) {
          elem_data = data;
        }
      });

      return elem_data;
    };

    this.get_current_account_info = function () {
      var result = false;

      $.ajax({
        type: 'GET',
        url: '/private/api/v2/json/accounts/current',
        dataType: 'json',
        async: false,
        success: function (data) {
          result = data;
        }
      });

      return result;
    };

    this.set_macros_names = function () {
      $.ajax({
        type: 'GET',
        url: '/private/api/v2/json/accounts/current',
        dataType: 'json',
        async: false,
        success: function (data) {
          var macroses = [], field, cf = data.response.account.custom_fields;

          for (field in cf) {
            switch (field) {
              case 'companies':
                macroses[0] = [{
                  macros: '{{company_name}}',
                  title: self.i18n('userLang').macrosTitle
                }];
                macroses[0] = macroses[0].concat(self.create_macros_names(field, cf[field]));
                break;
              case 'contacts':
                macroses[1] = [{
                  macros: '{{contact_name}}',
                  title: self.i18n('userLang').macrosTitle
                }];
                macroses[1] = macroses[1].concat(self.create_macros_names(field, cf[field]));
                break;
              case 'leads':
                macroses[2] = [
                  {
                    macros: '{{lead_name}}',
                    title: self.i18n('userLang').macrosTitle
                  },
                  {
                    macros: '{{leads.price}}',
                    title: self.i18n('userLang').macros_leads_price
                  }
                ];
                macroses[2] = macroses[2].concat(self.create_macros_names(field, cf[field]));
                break;
              case 'customers':
                macroses[3] = [
                  {
                    macros: '{{customer_name}}',
                    title: self.i18n('userLang').macrosTitle
                  },
                  {
                    macros: '{{customers.next_price}}',
                    title: self.i18n('userLang').macros_customers_next_price
                  },
                  {
                    macros: '{{customers.next_date}}',
                    title: self.i18n('userLang').macros_customers_next_date
                  }
                ];
                macroses[3] = macroses[3].concat(self.create_macros_names(field, cf[field]));
                break;
            }
          }

          self.set_settings({
            companies_macros: macroses[0],
            contacts_macros: macroses[1],
            leads_macros: macroses[2],
            customers_macros: macroses[3],
            account_users: data.response.account.users
          });
        }
      });
    };

    this.create_macros_names = function (entity_type, entity_fields) {
      var lang = self.i18n('userLang'),
        ms = [],
        default_ms = [
          {
            macros: '{{' + entity_type + '.responsible_user}}',
            title: lang.macrosResp
          },
          {
            macros: '{{' + entity_type + '.responsible_user_phone}}',
            title: lang.macrosRespPhone
          },
          {
            macros: '{{' + entity_type + '.responsible_user_email}}',
            title: lang.macrosRespMail
          },
          {
            macros: '{{' + entity_type + '.id}}',
            title: 'Id'
          }
        ];

      _.each(entity_fields, function (field) {
        ms.push({
          macros: '{{' + entity_type + '.cf.' + field.id + '}}',
          title: field.name
        });
      });
      default_ms = default_ms.concat(ms);

      return default_ms;
    };

    this.create_sms_list = function () {
      var list = '', i, ids = ['', ''], type = ['contacts', 'company'], el_id = '', data = [];

      if (area == 'clist') {
        for (i = 0; i < ccdata.length; i++)
          if (ccdata[i].type == 'contact')
            ids[0] += 'id[]=' + ccdata[i].id + '&';
          else
            ids[1] += 'id[]=' + ccdata[i].id + '&';

        for (i = 0; i < 2; i++)
          if (ids[i]) {
            raw_data = self.get_elements_info(ids[i], type[i]);
            raw_data = self.get_raw_list(raw_data, type[i]);
            data = data.concat(raw_data.data);
            list += (list ? "\n" : '') + raw_data.messages;
          }
      }
      else if (area == 'llist') {
        for (i = 0; i < ccdata.length; i++)
          el_id += 'id[]=' + ccdata[i].id + '&';

        raw_data = self.get_elements_info(el_id, 'leads');
        raw_data = self.get_raw_list(raw_data, 'leads');
        data = data.concat(raw_data.data);
        list = raw_data.messages;
      }
      else {
        el_id = document.location.href.split('detail/');
        el_id = el_id[1].split(/[\?#]/);

        cart = area == 'ccard' ? 'contacts' : (area == 'comcard' ? 'company' : 'leads');

        if (el_id[0]) {
          raw_data = self.get_elements_info('id[]=' + el_id[0], cart);
          raw_data = self.get_raw_list(raw_data, cart);
          data = data.concat(raw_data.data);
          list = raw_data.messages;
        }
      }

      return {'messages': list, 'data': data};
    };

    this.get_raw_list = function (data, type) {
      var i, j, k, settings = self.get_settings(), list = '', users = settings.account_users, list_obj = [];

      if (type == 'contacts') {
        macroses = settings.contacts_macros;
        raw_data = data.response.contacts;
      }
      else if (type == 'company') {
        macroses = settings.companies_macros;
        raw_data = data.response.contacts;
      }
      else if (type === 'customers') {
        raw_data = data.response.customers;
        customers_ct = self.get_customers_phones(raw_data);
      }
      else {
        macroses = settings.leads_macros;
        raw_data = data.response.leads;
        deals_ct = self.get_leads_phones(raw_data);
      }

      macroses_arr = macroses.replace(/\},/g, '}~').replace(/[\{\}]+/g, '').split('~');

      for (i = 0; i < raw_data.length; i++) {
        mes = $('#smsmes').val().replace(/\{{1,2}Название\}{1,2}/gi, raw_data[i].name);
        mes = $('#smsmes').val().replace(/\{{1,2}Бюджет\}{1,2}/gi, raw_data[i].price);


        for (j = 0; j < users.length; j++)
          if (raw_data[i].responsible_user_id == users[j].id) {
            mes = mes.replace(/\{{1,2}Отв-ный\}{1,2}/gi, users[j].name);
            mes = mes.replace(/\{{1,2}Тел\. отв-ного\}{1,2}/gi, users[j].phone_number ? users[j].phone_number : '');
            mes = mes.replace(/\{{1,2}E-mail отв-ного\}{1,2}/gi, users[j].login);
            break;
          }

        phones = '';

        for (j = 0; j < raw_data[i].custom_fields.length; j++)
          if ($.inArray(raw_data[i].custom_fields[j].name, macroses_arr)) {
            fld = '';

            for (k = 0; k < raw_data[i].custom_fields[j].values.length; k++) {
              if ((dt = /^(\d{4})-(\d\d)-(\d\d) 00:00:00$/.exec(raw_data[i].custom_fields[j].values[k].value)) != null)
                raw_data[i].custom_fields[j].values[k].value = dt[3] + '.' + dt[2] + '.' + dt[1];

              fld += (fld ? ',' : '') + raw_data[i].custom_fields[j].values[k].value;
            }

            if (raw_data[i].custom_fields[j].code == 'PHONE')
              phones = fld;

            mes = mes.replace(new RegExp('\\{{1,2}' + raw_data[i].custom_fields[j].name + '\\}{1,2}', 'gi'), fld);
          }

        if (type == 'leads')
          for (j = 0; j < deals_ct.length; j++)
            if ($.inArray(raw_data[i].id, deals_ct[j].linked_leads_id) != -1)
              for (k = 0; k < deals_ct[j].custom_fields.length; k++)
                if (deals_ct[j].custom_fields[k].code == 'PHONE') {
                  ph = '';

                  for (m = 0; m < deals_ct[j].custom_fields[k].values.length; m++) {
                    phones += (phones ? ',' : '') + deals_ct[j].custom_fields[k].values[m].value;
                    ph += (phones ? ',' : '') + deals_ct[j].custom_fields[k].values[m].value;
                  }
                }

        if (phones) {
          list += (list ? "\n" : '') + phones + ':' + mes.replace(/\n/g, '\\n');
          list_obj.push({'id': raw_data[i].id, 'type': type == 'leads' ? 'lead' : raw_data[i].type});
        }
      }

      return {'messages': list, 'data': list_obj};
    };

    this.get_status = function (status_arr, srv) {
      var query = '', i, attr_mes, phones = '', send_phones = [], ids = '',
        lang = self.i18n('userLang'), settings = self.get_settings(), phs;

      if (status_arr) {
        for (i = 0; i < status_arr.length; i++) {
          attr_mes = $(status_arr[i]).find('a#smsc_get_data').attr('smsc_status_data').split('~');

          phs = $(status_arr[i]).parent().html().match(/^(?:.+\t)*\(([\d\(\)\+ -]{8,25},)*([\d\(\)\+ -]{8,25})\)[^\)]+$/)[2];
          send_phones.push(phs);

          phones += (phones ? ',' : '') + phs;
          ids += (ids ? ',' : '') + attr_mes[3];
        }

        self.crm_post(
          'https://www' + srv + '.smsc.ru/sys/status.php',
          {
            login: settings.login,
            psw: settings.password,
            phone: phones,
            id: ids,
            charset: 'utf-8',
            fmt: 1
          },
          function (msg) {
            if (msg.indexOf('cURL error') != -1 || msg === '') {
              if (+srv < 5)
                self.get_status(status_arr, srv++ ? srv : ++srv);
              else
                return false;
            }
            else {
              var resp = msg.split(','), st_names = [], st_codes = [], st_colors = [], i, idx, status, mes_pt,
                upddata = [],
                err_names = [], err_codes = [];

              if (resp[1] && resp[1] < 0)
                if (resp[1] == 9)
                  $('#err').text(lang.moreOneRequest + '!');
                else
                  $('#err').text(lang.getStatusError + '!');
              else {
                st_names = lang.statusNames.split('|');
                st_codes = lang.statusCodes.split('|');
                st_colors = lang.statusColors.split('|');
                err_names = lang.errorNames.split('|');
                err_codes = lang.errorCodes.split('|');

                resp = msg.split("\n");

                for (i = 0; i < status_arr.length; i++) {
                  status = resp[i].split(',')[0];
                  error = resp[i].split(',')[2];

                  if ((idx = $.inArray(status, st_codes)) != -1) {
                    $(status_arr[i]).attr('style', 'font-size: smaller; color: ' + st_colors[idx]);
                    st_obj = $(status_arr[i]).find('a#smsc_get_data');
                    attr_mes = st_obj.attr('smsc_status_data').split('~');

                    mes_pt = $($(st_obj).parent()).parent();

                    $(mes_pt).html($.inArray(status, ['-1', '0']) != -1 ? $(mes_pt).html().replace(/(a>)([\s\S]*)(<)/m, '$1  [' + st_names[idx] + ']$3') :
                      $(mes_pt).html().replace(/(<s[^>]+>)([\s\S]*)(<\/s)/m, '$1[' + st_names[idx] +
                        ((idx = $.inArray(error, err_codes)) != -1 ? ', ' + err_names[idx] : '') + ']$3'));

                    upddata.push({
                      'id': attr_mes[0],
                      'params': {'text': $(mes_pt).html(), 'PHONE': send_phones[i]},
                      'updated_at': parseInt(Date.now() / 1000, 10),
                      'note_type': 103
                    });
                  }
                }


                $.post(
                  '/api/v2/notes',
                  {'update': upddata},
                  function (data) {
                  },
                  'json'
                );
              }
            }
          },
          'text',
          function (XMLHttpRequest) {
            $('#err').text(lang.msgError + ' ' + lang.responseError);
            return false;
          }
        );
      }
    };

    this.check_statuses = function () {
      var status_span = [], lang = self.i18n('userLang');

      if (status_notes = $('div.notes-wrapper div.feed-note__body span:contains(' + lang.getMessageStatus + ')'))
        for (i = 0; i < status_notes.length; i++)
          if ($(status_notes[i]).find('a#smsc_get_data').length)
            status_span.push(status_notes[i]);

      if (status_span.length)
        self.get_status(status_span, '');
    };

    this.replace_all = function (search, replace, string) {
      search.forEach(function (item, i, arr) {
        string = string.replace(new RegExp(item, 'g'), replace[i]);
      });

      return string;
    };

    this.templates_editor = function (settings, lang) {
      var temp_tpl = settings.templates_dp ? self.object2array(JSON.parse(settings.templates_dp)) : [],
        tpid = 0, macros_block = '', data, rp = self.check_cookies('smscru-senders').split("\n"), i, sndrs = [];

      for (i = 0; i < rp.length; i++) {
        sndrs.push({option: rp[i], id: 'opt' + i});
      }

      var macros_tpl = '<div class="smsc_ru_tpl_markers">' +
        '<div class="smsc_ru_tpl_markers__title">' +
        '{{ macros_title }}' +
        '</div>' +
        '{% for item in macroses %}' +
        '<p class="marker-list__row"><span class="marker-list__tag-bot" data-marker="{{ item.macros }}">' +
        '<span class="marker-list__tag">{{ item.macros }}</span></span>' +
        '<span class="marker-list__tag-descr"> - {{ item.title }} </span></p>' +
        '{% endfor %}' +
        '</div>',
        tp_tpl = '{% for tpl in templates_dp %}' +
          '<div class="template-item__wrapper clearfix" smscru_tpid="{{ loop.index0 }}">' +
          '<div class="template-item__inner">' +
          '<div class="template-item__body clearfix">' +
          '<div class="template-item__body-inner">' +
          '<div class="template-item__name">{{ tpl.name }}</div></div>' +
          '<div id="smscru_tpremove" class="template-item__body-edit">' +
          '<span class="icon icon-inline icon-delete-trash"></span>' +
          '</div></div></div></div>' +
          '{% endfor %}',
        before_macros = '<div id="smscru_tp_details">' +
          self.render(
            {ref: '/tmpl/controls/input.twig'},
            {
              id: 'smscru_tpname',
              name: 'smscru_tpname',
              placeholder: lang.templateTitle
            }
          ) +
          '<table width="100%"><tr><td>' +
          lang.senderName + ':<td align="right"><a id="req_ss" title="' + lang.loadSenders + '">' + lang.refreshClick +
          '</a></table><div id="ss_tp">' +
          self.render(
            {ref: '/tmpl/controls/select.twig'},
            {
              items: sndrs,
              id: 'senders'
            }
          ) + '</div><br>' +
          self.render(
            {ref: '/tmpl/controls/textarea.twig'},
            {
              id: 'smscru_tpcontent',
              name: 'smscru_tpcontent',
              class_name: 'custom-scroll'
            }
          ) +
          '<div id="smscru_tp_macroses" class="custom-scroll">',
        after_macros = '</p>' +
          '</div>' +
          '</div>' +
          '<div id="smscru_tp_list">' +
          '<div id="sms-templates_wrapper">' +
          '<div id="sms-templates_header">' + lang.smsTemplates + '</div>' +
          '<div class="sms-templates_holder">' +
          '<div class="template-item">' +
          self.render({data: tp_tpl}, {templates_dp: temp_tpl}) +
          '</div>' +
          '</div>' +
          self.render(
            {ref: '/tmpl/controls/button.twig'},
            {
              id: 'smscru_addtp',
              text: '<span class="icon icon-inline button-input-add-icon icon-tag-plus-dark"></span>' + lang.addTemplate
            }
          ) +
          '</div>' +
          self.render(
            {ref: '/tmpl/controls/button.twig'},
            {
              id: 'smscru_savetps',
              class_name: 'button-input_blue',
              text: lang.saveTemplates,
              disabled: true
            }
          ) + '</div>';
      if (_.contains(['leads', 'leads-dp'], AMOCRM.data.current_entity)) {
        macros_block += self.render({data: macros_tpl}, {
          macroses: settings.leads_macros,
          macros_title: lang.leadsMacroses
        })
      }
      if (_.contains(['customers', 'customers-dp'], AMOCRM.data.current_entity)) {
        macros_block += self.render({data: macros_tpl}, {
          macroses: settings.customers_macros,
          macros_title: lang.customersMacroses
        })
      }
      if (_.contains(['leads', 'leads-dp', 'customers', 'customers-dp', 'contacts'], AMOCRM.data.current_entity)) {
        macros_block += self.render({data: macros_tpl}, {
          macroses: settings.contacts_macros,
          macros_title: lang.contactsMacroses
        })
      }
      macros_block += self.render({data: macros_tpl}, {
        macroses: settings.companies_macros,
        macros_title: lang.companyMacroses
      })

      data = before_macros + macros_block + after_macros;

      modal = new Modal({
        class_name: 'smscru-modal-window',
        init: function ($modal_body) {
          var $this = $(this);


          $this.loadTemplateToEditor = function (cur_tpl) {
            $('#smscru_tpname').val(self.replace_all(['$lt;', '&gt;', '&quot;'], ['<', '>', '"'], cur_tpl.name));

            var message_sender = cur_tpl.text.split('~~~~~');

            sender = message_sender.length == 2 ? message_sender[1] : '---';

            //		if (sender != '---')
            for (i = 0; i < $('div#ss_tp li').length; i++)
              if ($('div#ss_tp li span')[i].innerText == sender) {
                $('input#senders').attr('value', 'opt' + i);
//						$('input#senders').trigger('controls:change');
                $('input#senders').trigger('controls:change:visual');
                break;

//						act_li = $('div#ss_tp').find('li[data-value="opt' + i + '"]');
//						$(act_li).addClass('control--select--list--item-selected');
//						$('div#ss_tp button').attr({'data-value': 'opt' + i});
//						$('div#ss_tp button span').text($(act_li).text());
//						$('input#senders').attr({'value': 'opt' + i, 'data-prev-value': 'opt' + (i - 1)});
              }
            //				else {
            //				    act_li = $('div#ss_tp').find('li[data-value="opt' + i + '"]');
            //					$(act_li).removeClass('control--select--list--item-selected');
            //				}

            $('#smscru_tpcontent').val(self.replace_all(['$lt;', '&gt;', '&quot;'], ['<', '>', '"'], message_sender[0]));
          };


          $this.addTpl = function (add = false) {
            if (temp_tpl.length && !add) {
              $this.loadTemplateToEditor(temp_tpl[tpid]);
              $('#smscru_tp_list .template-item__wrapper[smscru_tpid = ' + tpid + ']').addClass('tpl-active');
            }
            else {
              var len = temp_tpl.push({name: 'Новый шаблон', text: ''});
              tpid = len - 1;

              $('div.tpl-active').removeClass('tpl-active');
              $('.template-item').append('<div class="template-item__wrapper clearfix tpl-active" smscru_tpid="' + tpid + '">' +
                '<div class="template-item__inner">' +
                '<div class="template-item__body clearfix">' +
                '<div class="template-item__body-inner">' +
                '<div class="template-item__name">' + temp_tpl[tpid].name + '</div>' +
                '</div>' +
                '<div id="smscru_tpremove" class="template-item__body-edit">' +
                '<span class="icon icon-inline icon-delete-trash"></span>' +
                '</div>' +
                '</div>' +
                '</div>' +
                '</div>');

              $this.loadTemplateToEditor({name: 'Новый шаблон', text: ''});
            }
          };

          $modal_body
            .trigger('modal:loaded')
            .html(data)
            .trigger('modal:centrify')
            .append('<span class="modal-body__close"><span class="icon icon-modal-close"></span></span>');

          $('div#smscru_tp_list').css({'height': $('div#smscru_tp_details').height(), 'position': 'relative'});
          $('button#smscru_savetps').css({
            'position': 'absolute',
            'bottom': $('div#smscru_tp_list').css('padding-bottom'),
            'right': $('div#smscru_tp_list').css('padding-right')
          });

          $(document).off('click', '#smscru_tpremove').on('click', '#smscru_tpremove', function () {
            var del_tpid = $(this).closest("div.template-item__wrapper").attr('smscru_tpid');

            temp_tpl.splice(del_tpid, 1);

            $(this).closest("div.template-item__wrapper").nextAll().map(function (index, element) {
              $(element).attr('smscru_tpid', $(element).attr('smscru_tpid') - 1);
            });

            $(this).closest("div.template-item__wrapper").remove();

            if (del_tpid <= tpid) {
              if (del_tpid != tpid)
                $('#smscru_tp_list .tpl-active').removeClass('tpl-active');

              if (tpid) tpid--;

              $('#smscru_tp_list .template-item__wrapper[smscru_tpid=' + tpid + ']').addClass('tpl-active');

              $this.loadTemplateToEditor(temp_tpl.length ? temp_tpl[tpid] : {name: 'Новый шаблон', text: ''});
            }

            $('#smscru_savetps').trigger('button:save:enable');
          });

          $(document).off('click', '#smscru_addtp').on('click', '#smscru_addtp', function () {
            $this.addTpl(true);
            $('#smscru_savetps').trigger('button:save:enable')
          });

          $(document).off('click', '.template-item__body-inner').on('click', '.template-item__body-inner', function () {
            $('.tpl-active').removeClass('tpl-active');
            tpid = $(this).closest("div.template-item__wrapper").attr('smscru_tpid');
            $('#smscru_tp_list .template-item__wrapper[smscru_tpid=' + tpid + ']').addClass('tpl-active');
            $this.loadTemplateToEditor(temp_tpl[tpid]);
            $('#smscru_savetps').trigger('button:save:enable')
          });

          $(document).off('click', '#smscru_tp_macroses .marker-list__tag').on('click', '#smscru_tp_macroses .marker-list__tag', function () {
            if (!temp_tpl || !temp_tpl.length) {
              $this.addTpl();
            }
            self.insertTextAtCursor(document.getElementById('smscru_tpcontent'), $(this).text());
            temp_tpl[tpid].text = self.replace_all(['<', '>', '"'], ['$lt;', '&gt;', '&quot;'], $('#smscru_tpcontent').val());
            $('#smscru_tpcontent').focus();
            $('#smscru_savetps').trigger('button:save:enable')
          });

          $(document).off('click', '#smscru_savetps').on('click', '#smscru_savetps', function () {
            self.save_all_settings(settings, {templates_dp: temp_tpl});


            var tp_tpl =
              '{% for tpl in templates_dp %}' +
              '<div class="template-item__wrapper clearfix" smscru_tpid="{{ loop.index0 }}">' +
              '<div class="template-item__inner">' +
              '<div class="template-item__body clearfix">' +
              '<div class="template-item__body-inner">' +
              '<div class="template-item__name">{{ tpl.name }}</div></div>' +
              '<div id="smscru_tpremove" class="template-item__body-edit">' +
              '<span class="icon icon-inline icon-delete-trash"></span>' +
              '</div></div></div></div>' +
              '{% endfor %}';

            $('.template-item').html(self.render({data: tp_tpl}, {templates_dp: temp_tpl}));
            $('#smscru_tp_list .template-item__wrapper[smscru_tpid = ' + tpid + ']').addClass('tpl-active');

            if (self.system().area != 'digital_pipeline') {
              var smscru_entity = [];

              smscru_entity.push({option: lang.templates, id: -2});

              for (i = 0; i < temp_tpl.length; i++)
                smscru_entity.push({option: temp_tpl[i].name, id: i});

              smscru_entity.push({
                option: is_admin ? lang.editClick : lang.refreshClick,
                class_name: 'smscru_edit_tpl',
                id: -1
              });

              $('div#smscru_wrap_tpl')
                .empty().append(
                self.render(
                  {ref: '/tmpl/controls/select.twig'},
                  {
                    items: smscru_entity,
                    id: 'smscru_templates'
                  }
                ));
            }

            $(this).trigger('button:saved');
          });

          $(document).off('keyup', '#smscru_tpname').on('keyup', '#smscru_tpname', function () {
            if (!temp_tpl.length)
              $this.addTpl();

            if ($('#smscru_tpname').val())
              temp_tpl[tpid].name = self.replace_all(['<', '>', '"'], ['$lt;', '&gt;', '&quot;'], $('#smscru_tpname').val());

            $('#smscru_savetps').trigger('button:save:enable');
          });

          $(document).off('keyup', '#smscru_tpcontent').on('keyup', '#smscru_tpcontent', function () {
            if (!temp_tpl.length)
              $this.addTpl();

            temp_tpl[tpid].text = self.replace_all(['<', '>', '"'], ['$lt;', '&gt;', '&quot;'], $('#smscru_tpcontent').val() + '~~~~~' +
              $('div#ss_tp li.control--select--list--item-selected').text());
            $('#smscru_savetps').trigger('button:save:enable');
          });

          $(document).off('change', 'div#ss_tp').on('change', 'div#ss_tp', function () {
            $('#smscru_tpcontent').keyup();
          });

          $this.addTpl();
          $('#smscru_savetps').trigger('button:save:enable')
        },
        destroy: function () {
          return true;
        }
      });
    };


    this.insertTextAtCursor = function (el, text, offset) {
      var val = el.value, endIndex, range, doc = el.ownerDocument;
      if (typeof el.selectionStart == "number"
        && typeof el.selectionEnd == "number") {
        endIndex = el.selectionEnd;
        el.value = val.slice(0, endIndex) + text + val.slice(endIndex);
        el.selectionStart = el.selectionEnd = endIndex + text.length + (offset ? offset : 0);
      } else if (doc.selection != "undefined" && doc.selection.createRange) {
        el.focus();
        range = doc.selection.createRange();
        range.collapse(false);
        range.text = text;
        range.select();
      }
    };

    // Перенесено с смс ру
    this.set_macros_names_dp = function () {
      $.ajax({
        type: 'GET',
        url: '/private/api/v2/json/accounts/current',
        dataType: 'json',
        async: false,
        success: function (data) {
          var macroses = [], field, cf = data.response.account.custom_fields;

          for (field in cf) {
            switch (field) {
              case 'companies':
                macroses[0] = [{
                  macros: '{{company_name}}',
                  title: self.i18n('userLang').macrosTitle
                }];
                macroses[0] = macroses[0].concat(self.create_macros_names_dp(field, cf[field]));
                break;
              case 'contacts':
                macroses[1] = [{
                  macros: '{{contact_name}}',
                  title: self.i18n('userLang').macrosTitle
                }];
                macroses[1] = macroses[1].concat(self.create_macros_names_dp(field, cf[field]));
                break;
              case 'leads':
                macroses[2] = [
                  {
                    macros: '{{lead_name}}',
                    title: self.i18n('userLang').macrosTitle
                  },
                  {
                    macros: '{{leads.price}}',
                    title: self.i18n('userLang').macrosLeadsPrice
                  }
                ];
                macroses[2] = macroses[2].concat(self.create_macros_names_dp(field, cf[field]));
                break;
              case 'customers':
                macroses[3] = [
                  {
                    macros: '{{customer_name}}',
                    title: self.i18n('userLang').macrosTitle
                  },
                  {
                    macros: '{{customers.next_price}}',
                    title: self.i18n('settings').customers_next_price
                  },
                  {
                    macros: '{{customers.next_date}}',
                    title: self.i18n('settings').customers_next_date
                  }
                ];
                macroses[3] = macroses[3].concat(self.create_macros_names_dp(field, cf[field]));
                break;
            }
          }

          self.set_settings({
            companies_macros: macroses[0],
            contacts_macros: macroses[1],
            leads_macros: macroses[2],
            customers_macros: macroses[3],
            account_users: data.response.account.users
          });
        }
      });
    };
    // Перенесено с смс ру

    this.create_macros_names_dp = function (entity_type, entity_fields) {
      var lang = self.i18n('userLang'),
        ms = [],
        default_ms = [
          {
            macros: '{{' + entity_type + '.responsible_user}}',
            title: lang.macrosResp
          },
          {
            macros: '{{' + entity_type + '.responsible_user_phone}}',
            title: lang.macrosRespPhone
          },
          {
            macros: '{{' + entity_type + '.responsible_user_email}}',
            title: lang.macrosRespMail
          },
          {
            macros: '{{' + entity_type + '.id}}',
            title: 'Id'
          }
        ];

      _.each(entity_fields, function (field) {
        ms.push({
          macros: '{{' + entity_type + '.cf.' + field.id + '}}',
          title: field.name
        });
      });
      default_ms = default_ms.concat(ms);

      return default_ms;
    };


    this.create_macros_names = function (entity_type, entity_fields) {
      var lang = self.i18n('userLang'),
        ms = [],
        default_ms = [
          {
            macros: '{{' + entity_type + '.responsible_user}}',
            title: lang.macrosResp
          },
          {
            macros: '{{' + entity_type + '.responsible_user_phone}}',
            title: lang.macrosRespPhone
          },
          {
            macros: '{{' + entity_type + '.responsible_user_email}}',
            title: lang.macrosRespMail
          },
          {
            macros: '{{' + entity_type + '.id}}',
            title: 'Id'
          }
        ];

      _.each(entity_fields, function (field) {
        ms.push({
          macros: '{{' + entity_type + '.cf.' + field.id + '}}',
          title: field.name
        });
      });
      default_ms = default_ms.concat(ms);

      return default_ms;
    };

    this.object2array = function (obj) {
      return Object.keys(obj).map(function (key) {
        return obj[key];
      });
    };

    this.array2object = function (arr) {
      return arr.reduce(function (acc, cur, i) {
        acc[i] = cur;
        return acc;
      }, {});
    };

    this.init_global_variables = function () {
      var user = self.system().amouser, data = self.get_current_account_info(), all_users = data.response.account.users;

      is_admin = _.find(all_users, function (item) {
        return item.login == user && item.is_admin == 'Y';
      });
    };

    this.save_all_settings = function (settings, o) {
      var tpls = JSON.stringify(self.array2object(o.templates_dp)),
        savedata = [{
          'widget_code': settings.widget_code,
          'settings': {
            'login': settings.login,
            'password': settings.password,
            'templates_dp': tpls
          }
        }];

      $.ajax({
        type: 'POST',
        dataType: 'json',
        url: '/private/api/v2/json/widgets/set',
        data: JSON.stringify({'request': {'widgets': {'install': savedata}}}),
        success: function (data) {
        }
      });

      self.set_settings({templates_dp: tpls});

      AMOCRM.widgets.clear_cache();
    };

    this.parse_message_text = function (message, key) {
      var text = '';

      if (!_.isObject(message)) {
        text = message || '';
      } else if (!_.isEmpty(message[key])) {
        text = message[key];
      }

      return text;
    };

    return this;
  };

  return CustomWidget;
});
