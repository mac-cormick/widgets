define(function (require) {
  var $ = require('jquery'),
      _ = require('underscore');

  return {
    hasKeys: function (obj, keys) {
      var result = true,
        temp = _.clone(obj);

      _.each(keys, function (key) {
        result = result && _.has(temp, key);
        if (result) {
          temp = _.clone(temp[key]);
        }
      });

      return result;
    },

    getPhones: function (contacts_data) {
      var phones = [],  selected_phones = [];
      _.each(contacts_data, function (contact) {
        var custom_field = _.find(contact.custom_fields, function (item) {
          return item.code === 'PHONE';
        });
        _.each(custom_field.values, function (item) {
          if (!_.contains(selected_phones, item.value.trim().replace(/[^0-9]/ig, ""))) {
            phones.push({
              id: item.value.trim().match(/^\+?(?:[- ()]*\d[- ()]*){10,15}$/),
              text: contact.name
            });
            selected_phones.push(item.value.trim().replace(/[^0-9]/ig, ""));
          }
        })
      });

      return phones;
    }
  };
});
