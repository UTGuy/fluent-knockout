/// <reference path="/Scripts/qunit.js" />
/// <reference path="/Scripts/jquery-1.9.1.js" />
/// <reference path="/Scripts/knockout-2.3.0.js" />
/// <reference path="/Scripts/knockout.mapping-latest.debug.js" />
/// <reference path="../knockout.fluent.js" />

(function() {

    var dom;
    module("knockout.fluent", {
        setup: function() {
            dom = $("<div id='testdoc' stye='display: none'></div>");
            $(document.body).append(dom);
            $(document).triggerHandler("ready");
        },
        teardown: function() {
            dom.remove();
            ko.fluent.clear();
        }
    });

    function applyBindings(viewModel) {
        return ko.fluent.applyBindings(viewModel, "#testdoc");
    }

    QUnit.moduleDone = function() {
        //Neva! this allows me to debug my scripts
    };

    QUnit.test("Null behavior", function() {

        ko.fluent.add()
            .propString("ShoudBeObservable")
            .mapObject("SubModel", "SubModel")
            .model(function() {
                var self = this;
                equal(typeof self.ShoudBeObservable, "function", "This should be an observable function (and not null)");
                equal(self.ShoudBeObservable(), null, "this should be null");

                equal(typeof self.SubModel().AlsoShoudBeObservable, "function", "This should be an observable function (and not null)");
                equal(self.SubModel().AlsoShoudBeObservable(), "", "this should be null");
            });

        ko.fluent.add("SubModel")
            .propString("AlsoShoudBeObservable");

        var viewModel = {
            ShoudBeObservable: null
        };

        applyBindings(viewModel);
    });

    QUnit.test("Root view model", function() {

        var testClass = ko.fluent.add()
            .propString("foo")
            .mapObject("child", "childClass")
            .model(function(model) {
                var self = this;

                equal(self.ducks().length, 3, "There should be 3 ducks");
                self.child().setDucks(self.ducks);
                equal(self.child().TheDucks().length, 3, "There should be 3 ducks");

                self.ducks.push("duck3");
                equal(self.ducks().length, 4, "There should be 4 ducks");
                equal(self.child().TheDucks().length, 4, "There should be 4 ducks");
            })
            .done();

        ko.fluent.add("childBaseClass")
            .prop("foo2", "bar2")
            .propArray("TheDucks")
            .model(function() {
                var self = this;
                self.setDucks = function(ducks) {
                    self.TheDucks = ducks;
                };
            });

        ko.fluent.add("childClass")
            .base("childBaseClass")
            .prop("number", 123)
            .propString("color")
            .model(function(model) {
                var self = this;
                self.color("blue");
            });

        var foo = $('<input type="text" data-bind="value: foo" >');
        var withChild = $('<div data-bind="with: child"></div>');
        var hello = $('<input type="text" data-bind="value: hello" >');
        var color = $('<input type="text" data-bind="value: color" >');
        var number = $('<input type="text" data-bind="value: number" >');
        var duckList = $('<input type="text" data-bind="value: TheDucks().length" >');
        var foo2 = $('<input type="text" data-bind="value: foo2" >');

        dom.append(foo, withChild.append(hello, color, number, foo2, duckList));

        var viewModel = {
            foo: "bar",
            ducks: ["momma", "baby1", "baby2"],
            child: {
                hello: "world"
            }
        };

        applyBindings(viewModel).done(function() {

            equal(foo.val(), "bar", "element value = 'bar'");
            equal(hello.val(), "world", "element value = 'world'");
            equal(color.val(), "blue", "element value = 'blue'");
            equal(number.val(), "123", "element value = '123'");
            equal(foo2.val(), "bar2", "element value = 'bar2'");
            equal(duckList.val(), "4", "There should be 4 ducks");

            ko.fluent.viewModel.foo("bar2");
            equal(foo.val(), "bar2", "element value = 'bar2'");

        });
    });

    QUnit.test("Deep array model updating", function() {

        ko.fluent.add()
            .mapArray("Values", "NumberModel");

        ko.fluent.add("NumberModel")
            .propInt("n1")
            .propInt("n2")
            .ui(function() {
                var self = this;
                self.value = ko.computed(function() {
                    return self.n1() + self.n2();
                });
            });

        applyBindings({
            Values: []
        }).done(function(vm) {

            var values = [
                { n1: 1, n2: 2 },
                { n1: 3, n2: 4 },
                { n1: 5, n2: 6 }
            ];

            console.log(vm);
            ko.fluent.update(vm.Values, values);

            equal(vm.Values().length, 3, "should have 3 values");
            notEqual(vm.Values()[0].value, null, "There should be a value property here");
            equal(vm.Values()[0].value(), 3, "value should be 3");
            equal(vm.Values()[1].value(), 7, "value should be 7");
            equal(vm.Values()[2].value(), 11, "value should be 11");

        });
    });
})();