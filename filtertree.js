/*

Filtertree JQuery plugin - easy way to build filters on page

@name: filtertree
@version: 0.0.2
@author: Roman Davydov <openvoip.co@gmail.com>
@site: http://www.openvoip.co
@license: MIT


The MIT License (MIT)

Copyright (c) 2014 Roman Davydov <openvoip.co@gmal.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

(function($) {
    
    if (!$.isPlainObject(JSON))
        throw new Error('JSON is required');
    
    if (!$.isFunction($.cookie))
        throw new Error('$.cookie is required');
    
    String.prototype.hashCode = function() {
        var hash = 0;
        if (this.length == 0)
            return hash;
        for (i = 0; i < this.length; i++) {
            char = this.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash;
    }
    
    $.ftSettings = {
        salt: '', // is being used in the state hash creation (good for unique state per control)
        maxGroups: 100, // maximum groups in a group
        maxFilters: 100, // maximum filters in a group
        defaultField: '', // default field to be selected
        defaultConcat: 'and', // default concatination
        defaultCond: 'eq', // default condition
        onChangeDelay: 500, // this is a delay of firing onChange when user is changing the value data
        filters: {}, // format is: { fieldName: { label: 'Label', editor: 'editor id like bootstrapDatepicker', editorSettings: { this object will be used to construct editor } }, ... }
        i18n: { // internationalization
            'select.concatination': 'Select concatination',
            'select.condition': 'Select condition',
            'select.field': 'Select field',
            'add.condition': 'Add condition',
            'add.group': 'Add group',
            'remove.condition': 'Remove condition',
            'remove.filters': 'Remove all',
            'condition.eq': 'Equal to',
            'condition.gt': 'Greater than',
            'condition.lt': 'Less than',
            'condition.ge': 'Greater or Equal than',
            'condition.le': 'Less or Equal than',
            'condition.contains': 'Contains',
            'condition.beginswith': 'Begins with',
            'condition.endswith': 'Ends with',
            'concat.and': 'And',
            'concat.or': 'Or'
        },
        conditions: { // available conditions
            eq: 'condition.eq',
            gt: 'condition.gt',
            lt: 'condition.lt',
            ge: 'condition.ge',
            le: 'condition.le',
            contains: 'condition.contains',
            beginswith: 'condition.beginswith',
            endswith: 'condition.endswith'
        },
        concats: { // available concatinations
            and: 'concat.and',
            or: 'concat.or'
        },
        style: { // use it to add css classes to elements
            addButtonText: true,
            groupClass: '',
            filterClass: '',
            addButtonClass: '',
            addGroupButtonClass: '',
            removeButtonClass: '',
            resetButtonClass: '',
            concatClass: '',
            fieldClass: '',
            condClass: '',
            valueClass: ''
        },
        editors: { // available editors for filters
            bootstrapDatepicker: {
                settings: { // configuration for the datepicker
                    format: 'yyyy-mm-dd'
                },
                attach: function(plugin, settings) {
                    var el = $(this);
                    if ($.isFunction($.fn.datepicker)) {
                        el.datepicker(settings)
                        .on('changeDate', plugin.settings.onChange);
                    }
                },
                detach: function(plugin) {
                    var el = $(this);
                    if ($.isFunction($.fn.datepicker)) {
                        $(this).datepicker('remove');
                    }
                }
            },
            listPicker: {
                settings: {
                   items: {}
                },
                attach: function(plugin, settings) {
                    var el = $(this);
                    var select = $('<select></select>')
                        .addClass(el.attr('class'))
                        .on('change', plugin.settings.onChange);
                    for(var key in settings.items) {
                        var option = $('<option></option>').attr('value', key).html(settings.items[key]);
                        if (key == el.val())
                            option.attr('selected', 'selected');
                        select.append(option);
                    }
                    el.replaceWith(select);
                },
                detach: function(plugin) {
                    var el = $(this);
                    el.replaceWith(plugin.buildValue(''));
                },
                conditions: ['eq']
            }
        },        
        onChange: function() {}, // use it for handling any filters change
        onInit: function() {} // use it to handle init
    };
    
    $.filtertree = function(element, settings) {

        var $element = $(element);
        var plugin = this;

        // constructor
        plugin.init = function() {
            plugin.settings = $.extend(true, {}, $.ftSettings, settings);
            
            // normalize filters
            if (!$.isPlainObject(plugin.settings.filters))
                throw new Error('Object expected');
            for (var key in plugin.settings.filters) {
                var filter = plugin.settings.filters[key];
                if (!$.isPlainObject(filter))
                    plugin.settings.filters[key] = {label: filter};
            }

            // build widget
            $element
                .addClass('filtertree')
                .empty()
                .append(plugin.buildRoot(plugin.settings.defaultConcat));
        
            plugin.settings.onInit.apply(plugin);
        }

        // public methods
        plugin.save = function() {
            $.cookie(getConfigHash(), JSON.stringify(plugin.getData(plugin.getRoot())));
        };

        plugin.load = function() {
            var raw = $.cookie(getConfigHash());
            if (!raw)
                return;
            
            var data = $.parseJSON(raw);
            if ($.isPlainObject(data) && ('concat' in data)) {
                $element.empty();
                $element.append(plugin.buildRoot(data['concat']));
                plugin.setData(data, plugin.getRoot());
            }
        };
        
        plugin.getRoot = function() {
            return $element.find('> .ft-root');
        };
        
        plugin.setData = function(data, group) {
            if (!$.isPlainObject(data))
                throw new Error('Data is not object');
            if (!(group instanceof $) || !group.length)
                throw new Error('Group is not ready');
            
            if ('concat' in data) { // this is a group
                if (!('filters' in data))
                    throw new Error('Property "filters" is requried');

                for (var i = 0; i < data['filters'].length; i++) {
                    var filter = data['filters'][i];
                    if ($.isPlainObject(filter) && ('concat' in filter)) {
                        var subgroup = plugin.buildGroup(filter['concat']);
                        group.append(
                            $('<li></li>')
                            .addClass('ft-group')
                            .append(subgroup)
                        );
                        plugin.setData(filter, subgroup);
                    } else {
                        plugin.setData(filter, group);
                    }
                }
                
            } else { // this is a field
                if (!('name' in data))
                    throw new Error('Property "name" is requried');

                group.append(plugin.buildFilter(
                    getProp(data, 'cond', plugin.settings.defaultCond),
                    data['name'],
                    getProp(data, 'value', '')
                ));
            }
        }
        
        plugin.getData = function(group) {
            if (!(group instanceof $) || !group.length)
                throw new Error('Group is not ready');
            
            var result = null;
            var concat = group.find('> .ft-controls > .ft-concat');
            if (concat.length == 1) {
                result = {
                    concat: concat.val(),
                    filters: []
                };
                var filters = group.find('> .ft-filter, > .ft-group');
                for (var i = 0; i < filters.length; i++) {
                    var filter = $(filters[i]);
                    if (filter.hasClass('ft-group')) {
                        var subgroup = filter.find('> ul');
                        result.filters.push(plugin.getData(subgroup));
                    } else {
                        result.filters.push({
                            name: filter.find('> .ft-field').val(),
                            cond: filter.find('> .ft-cond').val(),
                            value: filter.find('> .ft-value').val()
                        });
                    }
                }
            }
            return result;
        };
        
        plugin.getQuery = function() {
            return plugin.buildQuery(plugin.getData(plugin.getRoot()));
        };
        
        plugin.buildQuery = function(data) {
            var result = '';
            if ($.isPlainObject(data)) {
                if ('concat' in data) {
                    var concat = data['concat'];
                    var filters = [];
                    for (var i = 0; i < data['filters'].length; i++) {
                        filters.push(plugin.buildQuery(data['filters'][i]));
                    }
                    result = filters.length ? '(' + filters.join(' ' + trans(plugin.settings.concats[concat]) + ' ') + ')' : '';
                } else {
                    result = (plugin.settings.filters[data.name].label || data.name) + ' ' + trans(plugin.settings.conditions[data.cond]) + ' "' + data.value + '"';
                }
            }
            return result;
        };
                
        plugin.onAddFilter = function(e) {
            e.preventDefault();
            var $this = $(this);
            var ul = $this.parent().parent();
            
            // check max
            if (ul.find('> .ft-filter').length >= plugin.settings.maxFilters)
                return;

            // add
            ul.append(plugin.buildFilter(plugin.settings.defaultCond, plugin.settings.defaultField));
            
            plugin.settings.onChange.apply(this);
        };
        
        plugin.onAddGroup = function(e) {
            e.preventDefault();
            var $this = $(this);
            var ul = $this.parent().parent();
            
            // check max
            if (ul.find('> .ft-group').length >= plugin.settings.maxGroups)
                return;
            
            // add
            ul.append(
                $('<li></li>')
                .addClass('ft-group')
                .append(plugin.buildGroup(plugin.settings.defaultConcat).append(plugin.buildFilter(plugin.settings.defaultCond, plugin.settings.defaultField)))
            );
    
            plugin.settings.onChange.apply(this);
        };
        
        plugin.onRemoveCondition = function(e) {
            e.preventDefault();
            var $this = $(this);
            var li = $this.parent();
            var ul = li.parent();
            
            // remove node
            li.remove();
            
            // remove parents if empty
            var remove_ul = null;
            while (!ul.find('.ft-filter').length && !ul.hasClass('ft-root')) {
                remove_ul = ul.parent(); // parent's li
                ul = ul.parent().parent();
            }
            if (remove_ul !== null)
                remove_ul.remove();
            
            plugin.settings.onChange.apply(this);
        };
        
        plugin.onRemoveFilters = function(e) {
            e.preventDefault();
            
            if ($element.find('.ft-filter, .ft-group').length) {
                $element
                    .empty()
                    .append(plugin.buildRoot(plugin.settings.defaultConcat));

                plugin.settings.onChange.apply(this);
            }
        };

        plugin.buildRoot = function(defaultConcat) {
            var root = plugin.buildGroup(defaultConcat).addClass('ft-root').addClass(plugin.settings.style.groupClass);
            root.find('.ft-controls').append(
                plugin.buildButton(plugin.onRemoveFilters, trans('remove.filters'), plugin.settings.style.resetButtonClass)
            );
            
            return root;
        }

        plugin.buildButton = function(handler, title, cssClass) {
            var button = $('<button></button>')
                .addClass('ft-button ' + cssClass)
                .addClass(plugin.settings.style.buttonClass)
                .attr('title', title)
                .on('click', handler);
    
            if (plugin.settings.style.addButtonText)
                button.html(title);
            
            return button;
        }
        
        plugin.buildFields = function(defaultField) {
            var data = [];
            for (var key in plugin.settings.filters) {
                var filter = plugin.settings.filters[key];
                var label = getProp(filter, 'label', key);
                var editor = getProp(plugin.settings.editors, getProp(filter, 'editor', ''));
                var editorSettings = getProp(filter, 'editorSettings');
                var option = $('<option></option>')
                    .attr('value', key)
                    .data('editor', editor)
                    .data('editorSettings', editorSettings)
                    .html(label);
                if (key === defaultField)
                    option.attr('selected', 'selected');
                data.push(option);
            }
            
            return $('<select><select>')
                .attr('title', trans('select.field'))
                .addClass('ft-field')
                .addClass(plugin.settings.style.fieldClass)
                .append(data)
                .on('change', onChangeField)
                .on('change', plugin.settings.onChange)
        };
        
        // make condition list
        plugin.buildConditions = function(defaultCond) {
            var data = [];
            for (var key in plugin.settings.conditions) {
                var option = $('<option></option>').attr('value', key).html(trans(plugin.settings.conditions[key]));
                if (key === defaultCond)
                    option.attr('selected', 'selected');
                data.push(option);
            }
            return $('<select><select>')
                .attr('title', trans('select.condition'))
                .data('defaultCond', defaultCond)
                .addClass('ft-cond')
                .addClass(plugin.settings.style.condClass)
                .append(data)
                .on('change', plugin.settings.onChange);
        };
            
        // make concats list
        plugin.buildConcats = function(defaultConcat) {
            var data = [];
            for (var key in plugin.settings.concats) {
                var option = $('<option></option>').attr('value', key).html(trans(plugin.settings.concats[key]));
                if (key === defaultConcat)
                    option.attr('selected', 'selected');
                data.push(option);
            }
            return $('<select><select>')
                .attr('title', trans('select.concatination'))
                .addClass('ft-concat')
                .addClass(plugin.settings.style.concatClass)
                .append(data)
                .on('change', plugin.settings.onChange);
        };
        
        // make value field
        plugin.buildValue = function(defaultValue) {
            return $('<input>')
                .addClass('ft-value')
                .addClass(plugin.settings.style.valueClass)
                .attr('type', 'text')
                .val(defaultValue || '')
                .on('change', plugin.settings.onChange)
                .on('keyup', function() {
                    plugin.delayHandler.apply(this, [plugin.settings.onChange, plugin.settings.onChangeDelay]);
                });
        };
        
        plugin.buildGroup = function(defaultConcat) {
            var node = $('<ul></ul>')
                .append(
                    $('<li></li>')
                    .addClass('ft-controls')
                    .addClass(plugin.settings.style.groupClass)
                    .append(plugin.buildConcats(defaultConcat))
                    .append(plugin.buildButton(plugin.onAddFilter, trans('add.condition'), plugin.settings.style.addButtonClass))
                    .append(plugin.buildButton(plugin.onAddGroup, trans('add.group'), plugin.settings.style.addGroupButtonClass))
                );
        
            return node;
        };
        
        plugin.buildFilter = function(defaultCond, defaultField, defaultValue) {
            var fields = plugin.buildFields(defaultField);
            var node = $('<li></li>')
                .addClass('ft-filter')
                .addClass(plugin.settings.style.filterClass)
                .append(fields)
                .append(plugin.buildConditions(defaultCond))
                .append(plugin.buildValue(defaultValue))
                .append(plugin.buildButton(plugin.onRemoveCondition, trans('remove.condition'), plugin.settings.style.removeButtonClass));
            
            // init field
            onChangeField.apply(fields);
            
            return node;
        };
        
        plugin.delayHandler = function(callback, delay) {
            var $this = $(this);
            if ($this.data('previousSearch') != $this.val() && $.isFunction(callback)) {
                window.clearTimeout($this.data('timerId'));
                $this.data('previousSearch', $this.val());
                $this.data('timerId', window.setTimeout(function() {
                    callback.apply($this);
                }, delay));
            }
        };        


        // private methods
        var getConfigHash = function() {
            var hash = [
                plugin.settings.salt,
                $element.attr('name'),
                $element.attr('id')
            ];
            for (var key in plugin.settings.filters)
                hash.push(key);
            
            return hash.join(':').hashCode().toString();
        };
        
        var getProp = function(obj, key, defaultValue) {
            return ($.isPlainObject(obj) && (key in obj)) ? obj[key] : defaultValue;
        };

        var trans = function(id) {
            return getProp(plugin.settings.i18n, id, id);
        };
        
        var onChangeField = function(e) {
            var $this = $(this); // select
            var field = $this.children(':selected'); // option
            var cond = $this.parent().children('.ft-cond'); // conditions select
            var editor = field.data('editor');
            var currentEditor = $this.data('currentEditor');
            
            // detach old editor
            if (currentEditor) {
                var value = $this.parent().children('.ft-value');
                
                currentEditor.detach.apply(value, [plugin]);
                $this.data('currentEditor', null);
            }
            
            // enable all conditions
            cond.children().removeAttr('disabled');
            
            // attach new editor
            if (editor) {
                var editorSettings = field.data('editorSettings');
                var value = $this.parent().children('.ft-value'); // get updated value element
                
                editor.attach.apply(value, [plugin, $.extend(true, {}, editor.settings, editorSettings)]);
                $this.data('currentEditor', editor);
                
                // filter conditions
                if ($.isArray(editor.conditions)) {
                    cond.children().attr('disabled', 'disabled');
                    for (var i = 0; i < editor.conditions.length; i++) {
                        var c = editor.conditions[i];
                        cond.children('option[value="' + c + '"]').removeAttr('disabled');
                    }
                    var option = cond.children(':selected'); // selecting current condition
                    if (option.is(':disabled')) {
                        option = cond.children('option[value="' + cond.data('defaultCond') + '"]'); // selecting default condition
                        if (option.is(':disabled'))
                            option = cond.children(':first'); // selecting first found condition
                    }
                    if (option.length) {
                        cond.val(option.attr('value'));
                    } else {
                        cond.val('');
                    }                    
                }
            }
        }
        
        // construct
        plugin.init();
    }

    $.fn.filtertree = function(options) {
        return this.each(function() {
            if (undefined == $(this).data('filtertree')) {
                var plugin = new $.filtertree(this, options);
                
                $(this).data('filtertree', plugin);
            }
        });
    }

})(jQuery);
