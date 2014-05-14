# Wicker.js

Javascript Module Loader.  
This supports "define", "require" of AMD compatible, and you can manage non-AMD jQuery plugin, global functions like AMD modules with original functions.

=====
## API

Wicker.js has "wicker" namespace.

* [wicker.factory()](#wickerfactoryname-depends-constructor) ... This defines a module, as define of AMD.
* [wicker.carriage()](#wickercarriageurl-baseurl) ... This will loads modules files, as require.confg of "require.js".
* [wicker.config()](#wickerconfigname-props) ... This will configure default values of modules.
* [define()](#defineid-depends-constructor) ... This is the same as `define()` of AMD.
* [require()](#requiredepends-controller) ... Wrapper function for `define()`.
* [dab.exports()](#dabexportsid) ... This exports wicker methos to global from namespace.

======
### wicker.factory(name, depends, constructor)

This defines a module.

- name: String *optional*  
  Module name.
- depends: Array  *optional*  
  Related modules name
- constructor: Function *required if definition*  
  Constructor of module  
  This will be called after all depended modules were loaded and initialized.  
  Arguments: depended modules

#### Basic usage

```
wicker.factory("mymodule", ["jquery"], function($){
    // define your module here
    
    
    // return accessor for this module
    return {
      version: "1.0"
    };
});
```

Module names of "require", "exports", "module" are defined as default modules.

#### Recalling constructor

You can call the constructor again to set the name for the first argument only.  
The module will continue processing as an undefined if return false from the constructor.  
Please return false if you want to park the read of dependent modules.

```
wicker.carriage(["jquery.min.js"]);
(function(){
  var mydata;
  wicker.factory("myconfig", ["jquery"], function($){
    if( !mydata ){
      $.ajax('config.json', {complete: function(xhr){
        mydata = JSON.parse(xhr.responseText);
        
        wicker.factory("myconfig");
        
      }});
      return false;
    }
    return mydata;
  });
}());

// This waits for "myconfig" ajax load
wicker.factory(["myconfig"], function(config){
  console.log( config );
});
```

======
### wicker.carriage(url, baseURL)

This will load the module files.  
This will create script element after DOMContentLoaded event of the document.
All script elements will be set "async" and "defer" attributes.  
If baseURL was omitted, then the baseURL is the URL where wicker.js is.  
Please specify "./" if you want to reference the same URL as the document.

- wicker.carriage( url:String, baseURL:String )  
- wicker.carriage( urls:Array, baseURL:String )  
  Load script file of the url or urls.
- wicker.carriage( options:Object )  
  Similar to "require.config" of require.js.  
  You can set IDs to the url each as below:
```
{
  id: url,
  id: url
}
```
  
```
wicker.carriage( {
    baseURL: "./",
    paths: {
      "jquery": "js/jquery.min.js",
      "jquery.cookie": "js/jquery.cookie.min.js",
      "jquery.lazyload": {
	      "url": "js/jquery.lazyload.min.js",
          'depends': ['jquery'],
		  "global": {"jquery": "jQuery"}
      },
      "A": {
          "url": "js/utils.js",
          "attach": "globalFunction"
      }
    }
});
```

Please refer to wiki for details to load AMD compatible modules, non-AMD modules, and non-AMD libraries.

======
### wicker.config(name, props)

configure or set default values to modules and wicker.js itself.

======
### define(id, depends, constructor)

"define()" of AMD compatible.  
id can be omitted. But if omitted, the filename will be the id, so you need to define one module in one file each.  
`wicker.carriage(id+".js", "./")` is called automatically, the baseURL will be the same as the document.

"depends" can be omitted, and the default depends is ["require", "exports", "module"].

Please refer to wiki for detail.

======
### require(depends, constructor)

This is the same as `define()` except for that id is unused.  

======
### dab.exports(id)

This exports namespace to global variables.  

* dab.exports("wicker")   
  exports "wicker.factory", "wicker.manufacture", "wicker.carriage", "wicker.config".

```
dab.exports("wicker");
// Now you can use "carriage()", "factory()" without "wicker." namespace.
carriage({
  "Backbone": "backbone.min.js",
  "underscore": "underscore.min.js",
  "jquery": "jquery.min.js"
});
require(["Backbone"], function(backbone){
  // use backbone here
});
```

## License

(c) 2014 Wicker Wings

* Source code: The MIT License  
* Documents: CC-BY 3.0 or later  
* Sample code: Public domain or CC0  
