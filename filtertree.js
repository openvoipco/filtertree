/*

Filtertree JQuery plugin - easy way to build filters on page

@name: filtertree
@version: 0.0.1
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
    
    if (typeof(JSON) != 'object')
        throw new Error('JSON is required');
    
    if (typeof($.cookie) != 'function')
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
        maxGroups: 2,
        maxFilters: 3,
        defaultField: '',
        defaultConcat: 'and',
        defaultCond: 'eq',
        onChangeDelay: 500, // this is a delay of firing onChange when user is changing the value data
        editors: {
            bootstrapDatepicker: { // it should be equal to a filter type
                settings: {}, // configuration for the datepicker
                attach: function(plugin, editor) {
                    var el = $(this);
                    if (typeof($.fn.datepicker) === 'function') {
                        el.datepicker(editor.settings);
                        el.datepicker().on('changeDate', function(e) {
                            plugin.settings.onChange.apply(el);
                        });
                        el.data('editor', editor);
                    }
                },
                detach: function(plugin, editor) {
                    var el = $(this);
                    if (typeof($.fn.datepicker) === 'function') {
                        $(this).datepicker('remove');
                        el.data('editor', null);
                    }
                }
            }
        },
        filters: {}, // format is: { fieldName: { label: 'Label', editor: 'date | text' }, ... }
        i18n: {
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
        conditions: {
            eq: 'condition.eq',
            gt: 'condition.gt',
            lt: 'condition.lt',
            ge: 'condition.ge',
            le: 'condition.le',
            contains: 'condition.contains',
            beginswith: 'condition.beginswith',
            endswith: 'condition.endswith'
        },
        concats: {
            and: 'concat.and',
            or: 'concat.or'
        },
        onChange: function() {}
    };
    
    $.filtertree = function(element, options) {

        var $element = $(element);
        var plugin = this;

        // constructor
        plugin.init = function() {
            plugin.settings = $.extend({}, $.ftSettings, options);

            // normalize filters
            if (typeof(plugin.settings.filters) !== 'object')
                plugin.settings.filters = {};
            for (var key in plugin.settings.filters) {
                if (typeof(plugin.settings.filters[key]) !== 'object')
                    plugin.settings.filters[key] = {label: plugin.settings.filters[key]};
            }

            // build widget
            $element
                .addClass('filtertree')
                .empty()
                .append(plugin.buildRoot(plugin.settings.defaultConcat));
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
            if (typeof(data) === 'object' && ('concat' in data)) {
                $element.empty();
                $element.append(plugin.buildRoot(data['concat']));
                plugin.setData(data, plugin.getRoot());
            }
        };
        
        plugin.getRoot = function() {
            return $element.find('> .ft-root');
        };
        
        plugin.setData = function(data, group) {
            if (typeof(data) !== 'object')
                throw new Error('Data is not object');
            if (typeof(group) !== 'object' || !group.length)
                throw new Error('Group is not ready');
            
            if ('concat' in data) { // this is a group
                if (!('filters' in data))
                    throw new Error('Property "filters" is requried');

                for (var i = 0; i < data['filters'].length; i++) {
                    var filter = data['filters'][i];
                    if (typeof(filter) === 'object' && ('concat' in filter)) {
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
            if (typeof(group) !== 'object' || !group.length)
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
            if (typeof(data) === 'object') {
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
            var root = plugin.buildGroup(defaultConcat).addClass('ft-root');
            root.find('.ft-controls')
                .append($('<button title="' + trans('remove.filters') + '" class="ft-button">' + trans('remove.filters') + '</button>').on('click', plugin.onRemoveFilters));
            
            return root;
        }

        // make field list
        plugin.buildFields = function(defaultField) {
            var data = [];
            for (var key in plugin.settings.filters) {
                var filter = plugin.settings.filters[key];
                var label = getProp(filter, 'label', key);
                var editor = getProp(filter, 'editor', '');
                var option = $('<option></option>')
                    .attr('value', key)
                    .data('editor', getProp(plugin.settings.editors, editor))
                    .html(label);
                if (key === defaultField)
                    option.attr('selected', 'selected');
                data.push(option);
            }
            
            return $('<select><select>')
                .attr('title', trans('select.field'))
                .addClass('ft-field')
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
                .addClass('ft-cond')
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
                .append(data)
                .on('change', plugin.settings.onChange);
        };
        
        // make value field
        plugin.buildValue = function(defaultValue) {
            return $('<input>')
                .addClass('ft-value')
                .attr('type', 'text')
                .val(defaultValue || '')
                .on('change', plugin.settings.onValueChange)
                .on('keyup', function() {
                    var $this = $(this);
                    if ($this.data('previousSearch') != $this.val()) {
                        window.clearTimeout($this.data('timerId'));
                        $this.data('previousSearch', $this.val());
                        $this.data('timerId', window.setTimeout(function() {
                            plugin.settings.onChange.apply(this);
                        }, plugin.settings.onChangeDelay));
                    }
                });
        };
        
        plugin.buildGroup = function(defaultConcat) {
            var node = $('<ul></ul>')
                .append(
                    $('<li></li>')
                    .addClass('ft-controls')
                    .append(plugin.buildConcats(defaultConcat))
                    .append($('<button title="' + trans('add.condition') + '" class="ft-button">' + trans('add.condition') + '</button>').on('click', plugin.onAddFilter))
                    .append($('<button title="' + trans('add.group') + '" class="ft-button">' + trans('add.group') + '</button>').on('click', plugin.onAddGroup))
                );
        
            return node;
        };
        
        plugin.buildFilter = function(defaultCond, defaultField, defaultValue) {
            var field = plugin.buildFields(defaultField);
            var node = $('<li></li>')
                .addClass('ft-filter')
                .append(field)
                .append(plugin.buildConditions(defaultCond))
                .append(plugin.buildValue(defaultValue))
                .append($('<button title="' + trans('remove.condition') + '" type="button" class="ft-button">' + trans('remove.condition') + '</button>').on('click', plugin.onRemoveCondition));
            
            // init field
            onChangeField.apply(field);
            
            return node;
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
            return (typeof(obj) === 'object' && (key in obj)) ? obj[key] : defaultValue;
        };

        var trans = function(id) {
            return getProp(plugin.settings.i18n, id, id);
        };
        
        var onChangeField = function(e) {
            var $this = $(this); // select
            var field = $this.children(':selected'); // option
            var value = $this.parent().children('.ft-value');
            var editor = field.data('editor');
            var currentEditor = value.data('editor');
            
            // detach old editor
            if (currentEditor)
                currentEditor.detach.apply(value, [plugin, currentEditor]);
            
            // attach new editor
            if (editor)
                editor.attach.apply(value, [plugin, editor]);
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
