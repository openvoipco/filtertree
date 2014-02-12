/*

Filtertree i18n file

@author: Roman Davydov <openvoip.co@gmail.com>
@site: http://www.openvoip.co


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
    
    if (typeof($.ftSettings) !== 'object')
        throw new Error('Filtertree not loaded');
    
    $.extend(true, $.ftSettings, {
        i18n: {
            'select.concatination': 'Выберите соединение условий',
            'select.condition': 'Выберите условие',
            'select.field': 'Выберите поле',
            'add.condition': 'Добавить условие',
            'add.group': 'Добавить группу',
            'remove.condition': 'Удалить условие',
            'remove.filters': 'Удалить все фильтры',
            'condition.eq': 'Равно',
            'condition.gt': 'Больше чем',
            'condition.lt': 'Меньше чем',
            'condition.ge': 'Больше или равно чем',
            'condition.le': 'Меньше или равно чем',
            'condition.contains': 'Содержит',
            'condition.beginswith': 'Начинается с',
            'condition.endswith': 'Заканчивается',
            'concat.and': 'И',
            'concat.or': 'Или'
        }
    });
    
})(jQuery);
