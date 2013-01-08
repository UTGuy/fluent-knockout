fluent-knockout
===============

A fluent class mapper for knockout

= Knockout.Fluent.Js =
//A library  that reduces the complexity of knockout and its mapping plugin//

== Methods ==

=== **add** === 
//creates a new class and adds it//
==== params: ====
* className (optional) - //if not defined will look for window.viewModel//

=== **mapIgnore** === 
//Ingore ONLY these properties//
==== params: ====
* prop - //the name of the property//

=== **mapInclude** === 
//Include ONLY these properties//
==== params: ====
* prop - //the name of the property//

=== **mapCopy** === 
//Include but don't observe these properties//
==== params: ====
* prop - //the name of the property//

=== **map** === 
//Maps a property to a user defined class//
==== params: ====
* prop - //the name of the property//
* name (optional) - //the name of the class ( ie. add("MyClassName") ), defaults to '{prop}Item'//

=== **key** (todo) === 
//Uniquely identifying objects//

=== **prop** === 
//Ensure your incoming model has default properties//
==== params: ====
* key - //the name of the property//
* value - //the default value to give it//

=== **propNull** === 
//Ensure your incoming model has **null** property//
==== params: ====
* key - //the name of the property//

=== **propString** === 
//Ensure your incoming model has **empty string** property//
==== params: ====
* key - //the name of the property//

=== **propDate** === 
//Ensure your incoming model has **date** property//
==== params: ====
* key - //the name of the property//

=== **propArray** === 
//Ensure your incoming model has **empty array** property//
==== params: ====
* key - //the name of the property//

=== **propFalse** === 
//Ensure your incoming model has **false** property//
==== params: ====
* key - //the name of the property//

=== **propTrue** === 
//Ensure your incoming model has **true** property//
==== params: ====
* key - //the name of the property//

=== **ui** === 
//Add ui specific functionality//
==== function params: ====
* model - //the incoming model for this class//
* da - //the dataAccess instance for this class//
* i18n - //todo//

=== **model** === 
//Add viewModel specific functionality//
==== function params: ====
* model - //the incoming model for this class//
* da - //the dataAccess instance for this class//
* i18n - //todo//

=== **dataAccess** === 
//Add viewModel specific functionality//
==== function params: ====
* name - //the dataAccess name you would like to assign the function to//
* fn - //the function to be called ( ie. da.name(myParam) )//

=== **done** === 
//You are done with fluent methods and need a pointer to the class you just created//

== Examples ==
{{{
#!javascript

(function ($, app, viewModel, undefined) {

    var root = app.add()
        .ui(function (model, da, i18n) {
            var self = this;
            self.search = function () {
                da.search(self.Criteria);
            };
        }).model(function (model, da, i18n) {

        }).dataAccess("search", function (criteria) {
            return $.getJSON("/MyNetwork/Index/Search", ko.utils.unwrapObservable(criteria));
        }).done();

    app.applyBindings(viewModel);

})(jQuery, ko.fluent, viewModel);
}}}