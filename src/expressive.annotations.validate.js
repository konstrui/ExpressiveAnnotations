﻿/* expressive.annotations.validate.js - v2.5.1
 * Client-side component of ExpresiveAnnotations - annotation-based conditional validation library.
 * https://github.com/JaroslawWaliszko/ExpressiveAnnotations
 *
 * Copyright (c) 2014 Jaroslaw Waliszko
 * Licensed MIT: http://opensource.org/licenses/MIT */

(function($, window) {
    'use strict';
var
    backup = window.ea, // map over the ea in case of overwrite

    api = { // to be accesssed from outer scope
        settings: {
            debug: false, // output debug messages to the web console (should be disabled for release code)
            dependencyTriggers: 'change keyup', // a string containing one or more DOM field event types (such as "change", "keyup" or custom event names) for which fields directly dependent on referenced DOM field are validated
            parseValue: function(value, type, defaultParseCallback) { // provide custom deserialization for values according to certain types they represents,
                return defaultParseCallback(value, type);             // e.g. for objects when stored in non-json format or dates when stored in non-standard format (not proper for Date.parse(dateString)),
            }                                                         // i.e. suppose DOM field date string is given in dd/mm/yyyy format:
                                                                      // parseValue = function(value, type, defaultParseCallback) { // value string is given as a raw value extracted from DOM element
                                                                      //     switch (type) {
                                                                      //         case 'datetime': 
                                                                      //             var arr = value.split('/'); return new Date(arr[2], arr[1] - 1, arr[0]).getTime(); // return milliseconds since January 1, 1970, 00:00:00 UTC
                                                                      //         default:
                                                                      //             return defaultParseCallback(value, type); // for other types run the built-in logic
                                                                      //     }
                                                                      // }
        },
        addMethod: function(name, func) {
            toolchain.addMethod(name, func);
        },
        noConflict: function() {
            if (window.ea === this) {
                window.ea = backup;
            }
            return this;
        }
    },

    logger = {
        dump: function(message) {
            if (api.settings.debug && console && typeof console.log === 'function')
                console.log(message);
        },
        warn: function(message) {
            if (api.settings.debug && console && typeof console.warn === 'function')
                console.warn(message);
        }
    },

    toolchain = {
        methods: {},
        addMethod: function(name, func) { // add multiple function signatures to methods object (methods overloading, based only on numbers of arguments)
            var old = this.methods[name];
            this.methods[name] = function() {
                if (func.length === arguments.length) {
                    return func.apply(this, arguments);
                }
                if (typeof old === 'function') {
                    return old.apply(this, arguments);
                }
            };
        },
        registerMethods: function(model) {
            var name, body;
            this.initialize();
            for (name in this.methods) {
                if (this.methods.hasOwnProperty(name)) {
                    body = this.methods[name];
                    model[name] = body;
                }
            }
        },
        initialize: function() {
            this.addMethod('Now', function() { // return milliseconds
                return Date.now(); // now() is faster than new Date().getTime()
            });
            this.addMethod('Today', function() { // return milliseconds
                return new Date(new Date().setHours(0, 0, 0, 0)).getTime();
            });
            this.addMethod('Date', function(year, month, day) { // months are 1-based, return milliseconds
                return new Date(year, month - 1, day).getTime();
            });
            this.addMethod('Date', function(year, month, day, hour, minute, second) { // months are 1-based, return milliseconds
                return new Date(year, month - 1, day, hour, minute, second).getTime();
            });
            this.addMethod('TimeSpan', function(days, hours, minutes, seconds) { // return milliseconds
                return seconds * 1e3 + minutes * 6e4 + hours * 36e5 + days * 864e5;
            });
            this.addMethod('Length', function(str) {
                return str !== null && str !== undefined ? str.length : 0;
            });
            this.addMethod('Trim', function(str) {
                return str !== null && str !== undefined ? $.trim(str) : null;
            });
            this.addMethod('Concat', function(strA, strB) {
                return [strA, strB].join('');
            });
            this.addMethod('Concat', function(strA, strB, strC) {
                return [strA, strB, strC].join('');
            });
            this.addMethod('CompareOrdinal', function(strA, strB) {
                if (strA === strB) {
                    return 0;
                }
                if (strA !== null && strB === null) {
                    return 1;
                }
                if (strA === null && strB !== null) {
                    return -1;
                }
                return strA > strB ? 1 : -1;
            });
            this.addMethod('CompareOrdinalIgnoreCase', function(strA, strB) {
                strA = (strA !== null && strA !== undefined) ? strA.toLowerCase() : null;
                strB = (strB !== null && strB !== undefined) ? strB.toLowerCase() : null;
                return this.CompareOrdinal(strA, strB);
            });
            this.addMethod('StartsWith', function(str, prefix) {
                return str !== null && str !== undefined && prefix !== null && prefix !== undefined && str.slice(0, prefix.length) === prefix;
            });
            this.addMethod('StartsWithIgnoreCase', function(str, prefix) {
                str = (str !== null && str !== undefined) ? str.toLowerCase() : null;
                prefix = (prefix !== null && prefix !== undefined) ? prefix.toLowerCase() : null;
                return this.StartsWith(str, prefix);
            });
            this.addMethod('EndsWith', function(str, suffix) {
                return str !== null && str !== undefined && suffix !== null && suffix !== undefined && str.slice(-suffix.length) === suffix;
            });
            this.addMethod('EndsWithIgnoreCase', function(str, suffix) {
                str = (str !== null && str !== undefined) ? str.toLowerCase() : null;
                suffix = (suffix !== null && suffix !== undefined) ? suffix.toLowerCase() : null;
                return this.EndsWith(str, suffix);
            });
            this.addMethod('Contains', function(str, substr) {
                return str !== null && str !== undefined && substr !== null && substr !== undefined && str.indexOf(substr) > -1;
            });
            this.addMethod('ContainsIgnoreCase', function(str, substr) {
                str = (str !== null && str !== undefined) ? str.toLowerCase() : null;
                substr = (substr !== null && substr !== undefined) ? substr.toLowerCase() : null;
                return this.Contains(str, substr);
            });
            this.addMethod('IsNullOrWhiteSpace', function(str) {
                return str === null || !/\S/.test(str);
            });
            this.addMethod('IsDigitChain', function(str) {
                return /^\d+$/.test(str);
            });
            this.addMethod('IsNumber', function(str) {
                return /^[\+-]?\d*\.?\d+(?:[eE][\+-]?\d+)?$/.test(str);
            });
            this.addMethod('IsEmail', function(str) {
                // taken from HTML5 specification: http://www.w3.org/TR/html5/forms.html#e-mail-state-(type=email)
                return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(str);
            });
            this.addMethod('IsUrl', function(str) {
                // contributed by Diego Perini: https://gist.github.com/dperini/729294 (https://mathiasbynens.be/demo/url-regex)
                return /^(?:(?:https?|ftp):\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/\S*)?$/i.test(str);
            });
            this.addMethod('IsRegexMatch', function(str, regex) {
                return str !== null && str !== undefined && regex !== null && regex !== undefined && new RegExp(regex).test(str);
            });
            this.addMethod('Guid', function(str) {
                var guid = typeHelper.guid.tryParse(str);
                if (guid.error) {
                    throw guid.msg;
                }
                return guid;
            });
        }
    },

    typeHelper = {
        array: {
            contains: function(arr, item) {
                var i = arr.length;
                while (i--) {
                    if (arr[i] === item) {
                        return true;
                    }
                }
                return false;
            }
        },
        object: {
            keys: function(obj) {
                var key, arr = [];
                for (key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        arr.push(key);
                    }
                }
                return arr;
            },
            tryParse: function(value) {
                try {
                    return $.parseJSON(value);
                } catch (ex) {
                    return { error: true, msg: 'Given value was not recognized as a valid JSON. ' + ex };
                }
            }
        },
        string: {
            format: function(text, params) {
                var i, param;
                if (params instanceof Array) {
                    for (i = 0; i < params.length; i++) {
                        param = params[i];
                        param = typeof param === 'object' || param instanceof Object ? JSON.stringify(param, null, 4) : param;
                        text = text.replace(new RegExp('\\{' + i + '\\}', 'gm'), param.replace(/\$/g, '$$$$')); // escape $ sign for string.replace
                    }
                    return text;
                }
                for (i = 0; i < arguments.length - 1; i++) {
                    param = arguments[i + 1];
                    param = typeof param === 'object' || param instanceof Object ? JSON.stringify(param, null, 4) : param;
                    text = text.replace(new RegExp('\\{' + i + '\\}', 'gm'), param.replace(/\$/g, '$$$$'));
                }
                return text;
            },
            tryParse: function(value) {
                if (typeHelper.isString(value)) {
                    return value;
                }
                if (value !== undefined && value !== null) {
                    return value.toString();
                }
                return { error: true, msg: 'Given value was not recognized as a valid string.' };
            }
        },
        bool: {
            tryParse: function(value) {
                if (typeHelper.isBool(value)) {
                    return value;
                }
                if (typeHelper.isString(value)) {
                    value = $.trim(value).toLowerCase();
                    if (value === 'true' || value === 'false') {
                        return value === 'true';
                    }
                }
                return { error: true, msg: 'Given value was not recognized as a valid boolean.' };
            }
        },
        number: {
            tryParse: function(value) {
                function isNumber(n) {
                    return typeHelper.isNumeric(parseFloat(n)) && isFinite(n);
                }

                if (isNumber(value)) {
                    return parseFloat(value);
                }
                return { error: true, msg: 'Given value was not recognized as a valid float.' };
            }
        },
        timespan: {
            tryParse: function(value) {
                if (typeHelper.isTimeSpan(value)) {
                    var DAY = 2, HOUR = 3, MINUTE = 4, SECOND = 5, MILLISECOND = 6;
                    var match = /(\-)?(?:(\d*)\.)?(\d+)\:(\d+)(?:\:(\d+)\.?(\d{3})?)?/.exec(value);
                    var sign = (match[1] === '-') ? -1 : 1;
                    var d = {
                        days: typeHelper.number.tryParse(match[DAY] || 0) * sign,
                        hours: typeHelper.number.tryParse(match[HOUR] || 0) * sign,
                        minutes: typeHelper.number.tryParse(match[MINUTE] || 0) * sign,
                        seconds: typeHelper.number.tryParse(match[SECOND] || 0) * sign,
                        milliseconds: typeHelper.number.tryParse(match[MILLISECOND] || 0) * sign
                    };
                    var millisec = d.milliseconds +
                        d.seconds * 1e3 + // 1000
                        d.minutes * 6e4 + // 1000 * 60
                        d.hours * 36e5 +  // 1000 * 60 * 60
                        d.days * 864e5;   // 1000 * 60 * 60 * 24
                    return millisec;
                }
                return { error: true, msg: 'Given value was not recognized as a valid .NET style timespan string.' };
            }
        },
        date: {
            tryParse: function(value) {
                if (typeHelper.isDate(value)) {
                    return value.getTime(); // return the time value in milliseconds
                }
                if (typeHelper.isString(value)) {
                    var millisec = Date.parse(value); // default parsing of string representing an RFC 2822 or ISO 8601 date
                    if (typeHelper.isNumeric(millisec)) {
                        return millisec;
                    }
                }
                return { error: true, msg: 'Given value was not recognized as a valid RFC 2822 or ISO 8601 date.' };
            }
        },
        guid: {
            tryParse: function(value) {
                if (typeHelper.isGuid(value)) {
                    return value.toUpperCase();
                }
                return { error: true, msg: 'Given value was not recognized as a valid guid - guid should contain 32 digits with 4 dashes (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx).' };
            }
        },
        isTimeSpan: function(value) {
            return /(\-)?(?:(\d*)\.)?(\d+)\:(\d+)(?:\:(\d+)\.?(\d{3})?)?/.test(value); // regex for recognition of .NET style timespan string, taken from moment.js v2.9.0
        },
        isNumeric: function(value) {
            return typeof value === 'number' && !isNaN(value);
        },
        isDate: function(value) {
            return value instanceof Date;
        },
        isString: function(value) {
            return typeof value === 'string' || value instanceof String;
        },
        isBool: function(value) {
            return typeof value === 'boolean' || value instanceof Boolean;
        },
        isGuid: function(value) {
            return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value); // basic check
        },
        tryParse: function(value, type) {
            switch (type) {
                case 'timespan':
                    return typeHelper.timespan.tryParse(value);
                case 'datetime':
                    return typeHelper.date.tryParse(value);
                case 'numeric':
                    return typeHelper.number.tryParse(value);
                case 'string':
                    return typeHelper.string.tryParse(value);
                case 'bool':
                    return typeHelper.bool.tryParse(value);
                case 'guid':
                    return typeHelper.guid.tryParse(value);
                default:
                    return typeHelper.object.tryParse(value);
            }
        }
    },

    modelHelper = {
        getPrefix: function(value) {
            return value.substr(0, value.lastIndexOf('.') + 1);
        },
        extractValue: function(form, name, prefix, type) {
            function getValue(element) {
                var elementType = $(element).attr('type');
                switch (elementType) {
                    case 'checkbox':
                        if (field.length > 2) {
                            logger.warn(typeHelper.string.format('DOM field {0} found {1} times - ambiguity introduced.', name, field.length));
                        }
                        return $(element).is(':checked');
                    case 'radio':
                        return $(element).filter(':checked').val();
                    default:
                        if (field.length > 1) {
                            logger.warn(typeHelper.string.format('DOM field {0} found {1} times - ambiguity introduced.', name, field.length));
                        }
                        return $(element).val();
                }
            }

            var field, rawValue, parsedValue;
            name = prefix + name;
            field = $(form).find(typeHelper.string.format(':input[name="{0}"]', name));
            if (field.length === 0) {
                throw typeHelper.string.format('DOM field {0} not found.', name);
            }
            rawValue = getValue(field);
            if (rawValue === undefined || rawValue === null || rawValue === '') { // field value not set
                return null;
            }
            parsedValue = api.settings.parseValue(rawValue, type, typeHelper.tryParse); // convert field value to required type
            if (parsedValue.error) {
                throw typeHelper.string.format('DOM field {0} value conversion to {1} failed. {2}', name, type, parsedValue.msg);
            }
            return parsedValue;
        },
        deserializeObject: function(form, fieldsMap, constsMap, prefix) {
            function buildField(fieldName, fieldValue, object) {
                var props, parent, i;
                props = fieldName.split('.');
                parent = object;
                for (i = 0; i < props.length - 1; i++) {
                    fieldName = props[i];
                    if (!parent[fieldName]) {
                        parent[fieldName] = {};
                    }
                    parent = parent[fieldName];
                }
                fieldName = props[props.length - 1];
                parent[fieldName] = fieldValue;
            }

            var model = {}, name, type, value;
            for (name in fieldsMap) {
                if (fieldsMap.hasOwnProperty(name)) {
                    type = fieldsMap[name];
                    value = this.extractValue(form, name, prefix, type);
                    buildField(name, value, model);
                }
            }
            for (name in constsMap) {
                if (constsMap.hasOwnProperty(name)) {
                    value = constsMap[name];
                    buildField(name, value, model);
                }
            }
            return model;
        },
        ctxEval: function(exp, ctx) { // evaluates expression in the scope of context object
            return (new Function('expression', 'context', 'with(context){return eval(expression)}'))(exp, ctx); // function constructor used on purpose (a hack), for 'with' statement not to collide with strict mode, which
                                                                                                                // is applied to entire module scope (BTW 'use strict'; pragma intentionally not put to function constructor)
        }
    },

    validationHelper = {
        referencesMap: [],
        collectReferences: function(fields, refField, prefix) {
            var i, name;
            for (i = 0; i < fields.length; i++) {
                name = prefix + fields[i];
                if (name !== refField) {
                    this.referencesMap[name] = this.referencesMap[name] || [];
                    if (!typeHelper.array.contains(this.referencesMap[name], refField)) {
                        this.referencesMap[name].push(refField);
                    }
                }
            }
        },
        validateReferences: function(name, form) {
            var i, field, referencedFields;
            referencedFields = this.referencesMap[name];
            if (referencedFields !== undefined && referencedFields !== null) {
                logger.dump(typeHelper.string.format('Validation triggered for following {0} dependencies: {1}.', name, referencedFields.join(', ')));
                i = referencedFields.length;
                while (i--) {
                    field = $(form).find(typeHelper.string.format(':input[data-val][name="{0}"]', referencedFields[i]));
                    if (field.length !== 0) {
                        field.valid();
                    }
                }
            } else {
                logger.dump(typeHelper.string.format('No dependencies of {0} field detected.', name));
            }
        },
        binded: false,
        bindFields: function(form) {
            if (!this.binded) {
                if (api.settings.dependencyTriggers !== undefined && api.settings.dependencyTriggers !== null) {
                    var namespacedEvents = [];
                    $.each(api.settings.dependencyTriggers.split(/\s+/), function(idx, event) {
                        if (/\S/.test(event)) {
                            namespacedEvents.push(typeHelper.string.format('{0}.expressive.annotations', event));
                        }
                    });
                    $(form).find('input, select, textarea').on(namespacedEvents.join(' '), function(event) {
                        var field = $(this).attr('name');
                        logger.dump(typeHelper.string.format('Dependency validation trigger - {0} event, handled.', event.type));
                        validationHelper.validateReferences(field, form); // validate referenced fields only
                    });
                }
                this.binded = true;
            }
        }
    },

    annotations = ' abcdefghijklmnopqrstuvwxyz'; // suffixes for attributes annotating single field multiple times

    $.each(annotations.split(''), function() { // it would be ideal to have exactly as many handlers as there are unique annotations, but the number of annotations isn't known untill DOM is ready
        var adapter = typeHelper.string.format('assertthat{0}', $.trim(this));
        $.validator.unobtrusive.adapters.add(adapter, ['expression', 'fieldsmap', 'constsmap'], function(options) {
            options.rules[adapter] = {
                prefix: modelHelper.getPrefix(options.element.name),
                form: options.form,
                expression: options.params.expression,
                fieldsMap: $.parseJSON(options.params.fieldsmap),
                constsMap: $.parseJSON(options.params.constsmap)
            };
            if (options.message) {
                options.messages[adapter] = options.message;
            }
            var rules = options.rules[adapter];
            validationHelper.bindFields(options.form);
            validationHelper.collectReferences(typeHelper.object.keys(rules.fieldsMap), options.element.name, rules.prefix);
        });
    });

    $.each(annotations.split(''), function() {
        var adapter = typeHelper.string.format('requiredif{0}', $.trim(this));
        $.validator.unobtrusive.adapters.add(adapter, ['expression', 'fieldsmap', 'constsmap', 'allowempty'], function(options) {
            options.rules[adapter] = {
                prefix: modelHelper.getPrefix(options.element.name),
                form: options.form,
                expression: options.params.expression,
                fieldsMap: $.parseJSON(options.params.fieldsmap),
                constsMap: $.parseJSON(options.params.constsmap),
                allowEmpty: $.parseJSON(options.params.allowempty)
            };
            if (options.message) {
                options.messages[adapter] = options.message;
            }
            var rules = options.rules[adapter];
            validationHelper.bindFields(options.form);
            validationHelper.collectReferences(typeHelper.object.keys(rules.fieldsMap), options.element.name, rules.prefix);
        });
    });

    $.each(annotations.split(''), function() {
        var method = typeHelper.string.format('assertthat{0}', $.trim(this));
        $.validator.addMethod(method, function(value, element, params) {
            value = element.type === 'checkbox' ? element.checked : value; // special treatment for checkbox, because when unchecked, false value should be retrieved instead of undefined
            if (!(value === undefined || value === null || value === '')) { // check if the field value is set (continue if so, otherwise skip condition verification)
                var model = modelHelper.deserializeObject(params.form, params.fieldsMap, params.constsMap, params.prefix);
                toolchain.registerMethods(model);
                logger.dump(typeHelper.string.format('AssertThat expression of {0} field:\n{1}\nwill be executed within following context (methods hidden):\n{2}', element.name, params.expression, model));
                if (!modelHelper.ctxEval(params.expression, model)) { // check if the assertion condition is not satisfied
                    return false; // assertion not satisfied => notify
                }
            }
            return true;
        }, '');
    });

    $.each(annotations.split(''), function() {
        var method = typeHelper.string.format('requiredif{0}', $.trim(this));
        $.validator.addMethod(method, function(value, element, params) {
            value = element.type === 'checkbox' ? element.checked : value;
            if (value === undefined || value === null || value === '' // check if the field value is not set (undefined, null or empty string treated at client as null at server)
                || (!/\S/.test(value) && !params.allowEmpty)) {
                var model = modelHelper.deserializeObject(params.form, params.fieldsMap, params.constsMap, params.prefix);
                toolchain.registerMethods(model);
                logger.dump(typeHelper.string.format('RequiredIf expression of {0} field:\n{1}\nwill be executed within following context (methods hidden):\n{2}', element.name, params.expression, model));
                if (modelHelper.ctxEval(params.expression, model)) { // check if the requirement condition is satisfied
                    return false; // requirement confirmed => notify
                }
            }
            return true;
        }, '');
    });

    // for testing only (section to be removed in release code)
    api.___6BE7863DC1DB4AFAA61BB53FF97FE169 = {
        typeHelper: typeHelper,
        modelHelper: modelHelper,
        toolchain: toolchain
    };
    // --------------------------------------------------------

    window.ea = api; // expose some tiny api to the ea global object

}(jQuery, window));
