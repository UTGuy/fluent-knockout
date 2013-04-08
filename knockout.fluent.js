/* --------------------------------------------------------------
        Namespace system
    -------------------------------------------------------------- */
// Setup the root ns to not polute the global ns
(function($, ko, undefined) {

    var my = {
        root: "Root",
        classes: {},
        mappings: {},
        defaults: {},
        ui: {},
        models: {},
        dataAccess: {},
        i18n: {},
        bases: {},
        exists: function(name) {
            return (my.classes[name] != undefined) &&
                !(my.classes[name] instanceof my.baseModel);
        },
        warn: function(msg) {
            if (console && console.warn)
                console.warn(msg);
            else alert(msg);
        },
        add: function (name, class_container) {
            var fn = function() {
            };
            my.mappings[name] = {};
            my.defaults[name] = {};
            my.ui[name] = fn;
            my.dataAccess[name] = {};
            my.models[name] = fn;
            my.i18n[name] = {};
            my.bases[name] = [];
            my.classes[name] = function (data, instance_container) {

                var container = instance_container || class_container;

                // loop thru the bases
                var loop = function (callback, className, value) {
                    if (className == undefined) className = name;
                    if (value == undefined) value = {};
                    // execute bases first
                    var bases = my.bases[className];
                    for (var i = 0; i < bases.length; i++) {
                        var base = bases[i];
                        loop(callback, base, value);
                    }
                    // now execute me
                    return $.extend(true, value, callback(className, value) || {});
                };

                // combine all base props
                var props = loop(function (base, props) {
                    return $.extend(true, {}, my.defaults[base], props);
                });
                
                // combine all base maps
                var maps = loop(function (base, maps) {
                    return $.extend(true, {}, my.mappings[base], maps);
                });
                
                // combine all base dataAccess
                var da = loop(function (base, da) {
                    return $.extend(true, {}, my.dataAccess[base], da);
                });
                
                // combine all base i18n
                var i18n = loop(function (base, i18n) {
                    return $.extend(true, {}, my.i18n[base], i18n);
                });
                
                // combine data and props
                var dataProps = $.extend(true, {}, props, data);

                // map combined view model
                var vm = ko.mapping.fromJS(dataProps, maps);
                
                loop(function (className) {
                
                    // get a pointer to my class
                    var myClass = my.get(className);
                    
                    // set all dataAccess properties
                    for (var prop in da) {
                        (function(prop) { // they really need their own stack for scoping
                            var fnProp = da[prop];
                            da[prop] = function() {
                                return fnProp.apply({
                                    name: prop,
                                    viewModel: vm,
                                    model: dataProps
                                }, arguments);
                            };
                        })(prop);
                    }

                    // call all ui methods
                    myClass.ui.call(vm, dataProps, da, i18n);
                    
                    // call all model methods
                    myClass.model.call(vm, dataProps, da, i18n);
                });

                // apply bindings (but only if we are the root view model)
                if (name == my.root || container != undefined) {
                    var $elem = $(container || app.settings.defaultContainer);
                    //if ($elem.length == 0) $elem = $("body");
                    if ($elem.length > 0 && !$elem.is(".ko-fluent-bound")) {
                        $elem.data("ko-fluent", vm);
                        ko.applyBindings(vm, $elem[0]);
                        $elem.addClass("ko-fluent-bound");
                    }
                }

                // return the viewmodel
                return vm;
            };
            return my.get(name);
        },
        get: function(name) {
            return {
                map: my.mappings[name],
                defaults: my.defaults[name],
                ui: my.ui[name],
                model: my.models[name],
                dataAccess: my.dataAccess[name],
                i18n: my.i18n[name],
                bases: my.bases[name]
            };
        },
        set : function(name, prop, value) {
            my[prop][name] = value;
        },
        mapArray: function(name, arrName, prop) {
            var map = my.get(name).map;
            if (map[arrName] == undefined)
                map[arrName] = [];
            map[arrName].push(prop);
        },
        mapProp: function(name, propName, propClass, fn) {
            var map = my.get(name).map;
            if (map[propName] == undefined)
                map[propName] = {};
            map[propName][propClass] = fn;
        }
    };
    var utils = {
        unwrap: function(value) {
            return ko.utils.unwrapObservable(value);
        },
        get: function(url, data) {
            return $.getJSON(url, utils.unwrap(data));
        }
    };
    var app = {
        ns: {},
        utils: utils,
        settings: {
           defaultContainer: "body"
        },
        appSettings: function(settings) {
            app.settings = $.extend(app.settings, settings);
        },
        // Returns the root view model
        viewModel: null,
        model: null,
        applyBindings: function (viewModel, container, name) {
            var defferedBinding = $.Deferred();
            $(function () {
                if (viewModel == undefined) {
                    viewModel = window.viewModel;
                }
                app.model = viewModel || {};
                name = name || my.root;
                if (!my.classes[name]) app.add(); // ensure theres a class
                var vm = my.classes[name](app.model, container);
                app.viewModel = vm; // going to deprecate this
                defferedBinding.resolve(vm);
            });
            return defferedBinding;
        },
        get : function(className) {
            return my.get(className || my.root);
        },
        // Returns the class object reference
        // use this to "new MyClass()" (ie. app.getClass("MyClass")(data) will work)
        getClass: function(className) {
            return my.classes[className || my.root];
        },
        update: function(instance, data) {
            return ko.mapping.fromJS(instance, data);
        },
        // Add a new fluent class
        add: function (className,container) {
            if (className == undefined) {
                className = my.root;
            }
            my.add(className, container);
            var obj = {
                // Adds a base class
                base: function(baseName) {
                    my.get(className).bases.push(baseName);
                    return obj;
                },
                // Ingore ONLY these properties
                mapIgnore: function(prop) {
                    my.mapArray(className, 'ignore', prop);
                    return obj;
                },
                // Include ONLY these properties
                mapInclude: function(prop) {
                    my.mapArray(className, 'include', prop);
                    return obj;
                },
                // Include but don't observe these properties
                mapCopy: function(prop) {
                    my.mapArray(className, 'copy', prop);
                    return obj;
                },
                mapUpdate: function(prop, fn) {
                    my.mapProp(className, prop, 'update', fn);
                    return obj;
                },
                mapDate: function(prop) {
                    obj.mapUpdate(prop, function (options) {
                        var data = options.data;
                        if (data != undefined) {
                            if (typeof (data) == "string") {
                                var ticks = Date.parse(data);
                                if (ticks != undefined)
                                    return new Date(ticks);
                            }
                        }
                        return data;
                    });
                    return obj;
                },
                // Maps a property to a user defined class
                map: function(prop, name, observe, fn) {
                    my.mapProp(className, prop, 'create', function (options) {
                        var className = name || prop;
                        if (my.classes[className] == undefined)
                            throw "Attempting to use unregistered class '" + className + "'. Make sure the class or file has been added to the page.";
                        var instance = my.classes[name || prop](options.data);
	                    return observe ? ko.observable(instance) : instance;
                    });
                    return obj;
                },
                mapKey: function (prop, keyName, fn) {
                    if (fn == undefined) {
                        fn = function(data) {
                            return ko.utils.unwrapObservable(data[keyName]);
                        };
                    }
                    my.mapProp(className, prop, 'key', fn);
                    return obj;
                },
                // Ensure your data has default properties
                prop: function (name, value, observe) {
                    my.get(className).defaults[name] = value;
                    return obj;
                },
                propObject: function (name) {
                    return obj.prop(name, {});
                },
                propNull: function (name) {
                    return obj.prop(name, null);
                },
                propString: function (name) {
                    return obj.prop(name, "");
                },
                propDate: function (name) {
                    return obj.prop(name, new Date()).mapDate(name);
                },
                propArray: function (name) {
                    return obj.prop(name, []);
                },
                propFalse: function (name) {
                    return obj.prop(name, false);
                },
                propTrue: function (name) {
                    return obj.prop(name, true);
                },
                propInt: function (name) {
                    return obj.prop(name, 0);
                },
                // Add ui specific functionality
                ui: function(fn) {
                    my.set(className, "ui", fn);
                    return obj;
                },
                // Add view model specific ko computed, subscribables, etc.
                model: function(fn) {
                    my.set(className, "models", fn);
                    return obj;
                },
                // Adds a data access function
                // usage: .dataAccess("getCars",function(data){
                //          return $.getJSON(data.carUrl,{ color: 'red' });
                //        });
                dataAccess: function (name, fn) {
                    var prop = my.get(className)["dataAccess"] || {};
                    prop[name] = fn;
                    my.set(className, "dataAccess", prop);
                    return obj;
                },
                // You are done with fluent methods and need a pointer to the class.
                done: function() {
                    return app.getClass(className);
                }
            };
            return obj;
        }
    };

    ko.fluent = app;
})(jQuery, ko);