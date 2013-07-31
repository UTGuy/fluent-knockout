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
                function loop(callback, className, value) {
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
                }

                function combine(myProp) {
                    return loop(function (base, obj) {
                        return mesh(myProp[base], obj);
                    });
                }
                
                function mesh(obj1, obj2) {
                    return $.extend(true, {}, obj1, obj2);
                }

                // combine all base props
                var props = combine(my.defaults);
                
                // combine all base maps
                var maps = combine(my.mappings);
                
                // combine all base dataAccess
                var da = combine(my.dataAccess);
                
                // combine all base i18n
                var i18n = combine(my.i18n);
                
                // mesh props and data
                var dataProps = mesh(props, data);

                // map combined view model
                var vm = ko.mapping.fromJS(dataProps, maps);
                
                // fix: make sure all observable arrays have __ko_mapping__ property (if applicable)
                for (var vmPropName in vm) {
                    var vmProp = vm[vmPropName];
                    var propMap = vm.__ko_mapping__[vmPropName];
                    // test for observable array
                    if (vmProp != undefined && 
                        propMap != undefined &&
                        ko.isObservable(vmProp) &&
                        !(vmProp.destroyAll === undefined)) {
                        vmProp.__ko_mapping__ = propMap;
                    }
                }

                function createDataAccess(propName, fnProp) {
                    return function () {
                        return fnProp.apply({
                            name: propName,
                            viewModel: vm,
                            model: dataProps
                        }, arguments);
                    };
                }
                
                // set all dataAccess properties
                for (var prop in da) {
                    da[prop] = createDataAccess(prop, da[prop]);
                }
                
                loop(function (className) {
                    // get a pointer to my class
                    var myClass = my.get(className);
                    
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
                        ko.applyBindings(vm, $elem[0]);
                        $elem.addClass("ko-fluent-bound").data("ko-fluent", vm);
                    }
                }

                // return the viewmodel
                return vm;
            };
            return my.get(name);
        },
        get: function (name) {
            with (my) return {
                map: mappings[name],
                defaults: defaults[name],
                ui: ui[name],
                model: models[name],
                dataAccess: dataAccess[name],
                i18n: i18n[name],
                bases: bases[name]
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
            defaultContainer: "body",
            // override this to parse your own dates a certain way
            parseDate: function(date) {
                if (typeof (data) == "string") {
                    var ticks = Date.parse(data);
                    if (ticks != undefined)
                        return new Date(ticks);
                }
            }
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
                var RootClass = app.getClass(name || my.root);

                // ensure theres a class
                if (RootClass == undefined) 
                    RootClass = app.add().done();

                // get the model
                app.model = viewModel || window.viewModel || {};
                
                // create the viewModel
                var vm = new RootClass(app.model, container);
                
                // going to deprecate this
                app.viewModel = vm; 
                
                // notify any subscribers
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
            return ko.mapping.fromJS(data, {}, instance);
        },
        // Clears all the fluent mappings
        clear: function() {
            my.classes = {};
            my.mappings = {};
            my.defaults = {};
            my.ui = {};
            my.models = {};
            my.dataAccess = {};
            my.i18n = {};
            my.bases = {};
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
                mapUpdateDate: function(prop) {
                    obj.mapUpdate(prop, function (options) {
                        var date = options.data;
                        if (date != undefined) {
                            var dt = app.settings.parseDate(date);
                            if (dt != undefined)
                                return dt;
                        }
                        return date;
                    });
                    return obj;
                },
                // Maps a property to a user defined class
                map: function(prop, name, observe) {
                    my.mapProp(className, prop, 'create', function(options) {
                        var propClassName = name || prop;
                        var PropClass = app.getClass(propClassName);
                        if (PropClass == undefined)
                            throw "Attempting to use unregistered class '" + propClassName + "'. Make sure the class or file has been added to the page.";
                        var instance = new PropClass(options.data);
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
                mapObject: function (prop, name, observe) {
                    if (observe == undefined) observe = true;
                    return this.propObject(prop).map(prop, name, observe);
                },
                mapNull: function (prop, name, observe) {
                    if (observe == undefined) observe = true;
                    return this.propNull(prop).map(prop, name, observe);
                },
                mapArray: function (prop, name) {
                    return this.propArray(prop).map(prop, name);
                },
                mapDates: function (prop) {
                    return this.propArray(prop).mapUpdateDate(prop);
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
                    return obj.prop(name, new Date()).mapUpdateDate(name);
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
                propDouble: function (name) {
                    return obj.prop(name, 0.0);
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