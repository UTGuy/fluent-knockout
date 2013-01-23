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
        add: function(name) {
            var fn = function() {
            };
            my.mappings[name] = {};
            my.defaults[name] = {};
            my.ui[name] = fn;
            my.dataAccess[name] = {};
            my.models[name] = fn;
            my.i18n[name] = {};
            my.bases[name] = [];
            my.classes[name] = function (data) {

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
                if (name == my.root)
                    ko.applyBindings(vm);
                
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
            map[propName].create = fn;
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
        // Returns the root view model
        viewModel: null,
        model: null,
        applyBindings: function (viewModel) {
            $(function() {
                if (viewModel == undefined) {
                    viewModel = window.viewModel;
                }
                app.model = viewModel;
                app.viewModel = my.classes[my.root](viewModel);
            });
        },
        get : function(className) {
            return my.get(className || my.root);
        },
        // Returns the class object reference
        // use this to "new MyClass()" (ie. app.getClass("MyClass")(data) will work)
        getClass: function(className) {
            return my.classes[className || my.root];
        },
        // Add a new fluent class
        add: function (className) {
            if (className == undefined)
                className = my.root;
            my.add(className);
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
                // Maps a property to a user defined class
                map: function(prop, name, observe) {
                    my.mapProp(className, prop, 'create', function(options) {
                    	var instance = my.classes[name || prop]( options.data );
	                    return observe ? ko.observable(instance) : instance;
                    });
                    return obj;
                },
                key: function(prop, name, fn) {
                    my.mapProp(className, prop, 'key', fn);
                    return obj;
                },
                // Ensure your data has default properties
                prop: function(key, value) {
                    my.get(className).defaults[key] = value;
                    return obj;
                },
                propObject: function (key) {
                    return obj.prop(key, {});
                },
                propNull: function(key) {
                    return obj.prop(key, null);
                },
                propString: function(key) {
                    return obj.prop(key, "");
                },
                propDate: function(key) {
                    return obj.prop(key, new Date());
                },
                propArray: function(key) {
                    return obj.prop(key, []);
                },
                propFalse: function(key) {
                    return obj.prop(key, false);
                },
                propTrue: function(key) {
                    return obj.prop(key, true);
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