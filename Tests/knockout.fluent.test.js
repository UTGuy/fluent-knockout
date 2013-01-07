/// <reference path="../../Scripts/qunit.js" />
/// <reference path="../../Scripts/jquery-1.8.3.js" />
/// <reference path="../../Scripts/knockout-2.2.0.js" />
/// <reference path="../../Scripts/knockout.mapping-latest.js" />
/// <reference path="../knockout.fluent.js" />

(function() {

    var dom;
    module("knockout.fluent", {
        setup: function () {
            dom = $("<div id='testdoc' stye='display: none'></div>");
            $(document.body).append(dom);
            $(document).triggerHandler("ready");
        },
        teardown: function () {
            dom.remove();
        }
    });
    
    QUnit.moduleDone = function () {
         //Neva! this allows me to debug my scripts
    };

    test("Root view model", function () {

        var foo = $('<input type="text" data-bind="value: foo" >');
        dom.append(foo);

        var testClass = ko.fluent.add()
            .map("child", "childClass")
            .model(function (model) {
                var self = this;

                equal(self.ducks().length, 3, "There should be 3 ducks");
                self.child.setDucks(self.ducks);
                equal(self.child.TheDucks().length, 3, "There should be 3 ducks");
                
                self.ducks.push("duck3");
                equal(self.ducks().length, 4, "There should be 4 ducks");
                equal(self.child.TheDucks().length, 4, "There should be 4 ducks");
            })
            .done();

        var viewModel = {
            foo: "bar",
            ducks: ["momma","baby1","baby2"],
            child: {
                hello: "world"
            }
        };

        var childBaseClass = ko.fluent.add("childBaseClass")
            .prop("foo2", "bar2")
            .propArray("TheDucks")
            .model(function() {
                var self = this;
                self.setDucks = function(ducks) {
                    self.TheDucks = ducks;
                };
            })
            .done();

        var childClass = ko.fluent.add("childClass")
            .base("childBaseClass")
            .propString("color")
            
            .prop("number",123)
            .model(function (model) {
                var self = this;
                self.color("blue");
            })
            .done();

        var withChild = $('<div data-bind="with: child"></div>');
        var hello = $('<input type="text" data-bind="value: hello" >');
        var color = $('<input type="text" data-bind="value: color" >');
        var number = $('<input type="text" data-bind="value: number" >');
        var duckList = $('<input type="text" data-bind="value: TheDucks().length" >');
        var foo2 = $('<input type="text" data-bind="value: foo2" >');
        dom.append(withChild.append(hello, color, number, foo2, duckList));

        ko.fluent.applyBindings(viewModel);

        equal(foo.val(), "bar", "element value = 'bar'");
        equal(hello.val(), "world", "element value = 'world'");
        equal(color.val(), "blue", "element value = 'blue'");
        equal(number.val(), "123", "element value = '123'");
        equal(foo2.val(), "bar2", "element value = 'bar2'");
        equal(duckList.val(), "4", "There should be 4 ducks");

        viewModel.foo = "bar2";
        testClass(viewModel);
        equal(foo.val(), "bar2", "element value = 'bar2'");
        
        //todo: test dataAccess
        //todo: test UI
        //todo: test mapIgnore
        //todo: test mapInclude
        //todo: test mapCopy
    });

})();