# Wicker.js

Javascript Module Loader  
AMD互換のdefine、requireの他、独自機能によりAMDに対応していないjQueryプラグインや、グローバル関数で定義されるライブラリをAMDのように扱う事が可能です。

=====
## API

Wicker.js は "wicker" namespace を使用します。

* [wicker.factory()](#wickerfactoryname-depends-constructor) … モジュールを定義。AMDのdefineに相当。
* [wicker.manufacture()](#wickermanufacturedepends-constructor) … コントローラーの定義。AMDのrequireに相当。
* [wicker.carriage()](#wickercarriageurl-baseurl) … モジュールファイルをロード。require.jsのrequire.configに相当。
* [wicker.config()](#wickerconfigname-props) … モジュールのコンフィギュレーションを行います。初期設定値などを指定したい時に。
* [wicker.define()](#wickerdefineid-depends-constructor) … AMDのdefineと同等。
* [wicker.require()](#wickerrequiredepends-controller) … AMDのrequireと同等。
* [dab.exports()](#dabexportsid) … namespaceをグローバル関数にエクスポートします。

======
### wicker.factory(name, depends, constructor)

モジュールを定義します。

- name: String *必須*  
  モジュール名
- depends: Array  *省略可*  
  関連するモジュール名
- constructor: Function *定義の場合は必須*  
  モジュールのコンストラクタ  
  関連モジュールのロードが完了したら呼び出されます。
  引数: 関連モジュール

#### 基本的な用法

```
wicker.factory("mymodule", ["jquery"], function($){
    // define your module here
    
    
    // return accessor for this module
    return {
      version: "1.0"
    };
});
```

モジュール名"require"、"exports"、"module"はデフォルトモジュールとして定義されていますので使用できません。

#### Recalling constructor

第一引数に名前のみ指定する事で、コンストラクターを再度呼び出す事ができます。

```
dab.exports("amd");
wicker.carriage(["jquery.min.js"]);
(function(){
  var mydata;
  wicker.factory("myconfig", ["jquery"], function($){
    if( !mydata ){
      $.ajax('config.json', {complete: function(xhr){
        mydata = JSON.parse(xhr.responseText);
        
        wicker.factory("myconfig");
        
      }});
    }
    return mydata;
  });
}());

// This waits for "myconfig" ajax load
wicker.manufacture(["myconfig"], function(config){
  console.log( config );
});
```

======
### wicker.manufacture(depends, constructor)

モジュールに従属するコントローラーを定義します。
constructorの呼び出しはdocumentのDOMContentLoadedイベントの後です。


```
wicker.manufacture(["jquery", "jquery.cookie"], function($){
    var cookie = $.cookie("key");
    $("#output").html( cookie );
});
```

======
### wicker.carriage(url, baseURL)

モジュールファイルを読み込みます。
scriptタグにより読み込みを行いますが、要素の生成はdocumentのDOMContentLoadedイベントの後です。  
全てのスクリプト要素はdefer属性がつきます。  
baseURLが省略された場合は、**wicker.jsがあるディレクトリ**を基準点とします。
ドキュメントと同じディレクトリを基準にする場合はbaseに './' を指定してください。

- wicker.carriage( url:String )  
	モジュールローダーのURLから相対パスでurlをロード

- wicker.carriage( url:String, baseURL:String )  
	baseURLを基準とする相対パスでurlをロード
- wicker.carriage( url:Array )
- wicker.carriage( url:Array, baseURL:String )  
  urlの各項目に対してcarriage(url:String, base:String)を実行
 
- wicker.carriage( url:Object )  
  requirejsのrequire.configに相当。  
  {  
    id: url,  
    id: url  
  }  
  の形式で、モジュールに対するIDを指定可能。

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

AMD互換、非AMDライブラリ（jQueryプラグインなど）の読み込みなどの、より詳しい使い方はwikiを参照してください。

======
### wicker.config(name, props)

コンフィギュレーション。  
定数を指定する。

======
### wicker.define(id, depends, constructor)

AMD 互換の define。

idは省略可能ですが、idが省略された場合はファイル名をidとして使用しますので、1ファイル1モジュールで定義する必要があります。  
wicker.carriage()を使用して読み込む場合は、グローバル変数を使う事でidの代わりにできます。

carriage(id+".js", "./")を自動的に行います。baseURLはドキュメントのURLになります。  
dependsが省略された場合は["require", "exports", "module"]を初期値として使用します。

詳しい使い方はwikiを参照してください。

======
### wicker.require(depends, controller)

AMD 互換の require。  
使用方法は[wicker.manufacture()](#wickermanufacturedepends-constructor)と同じです。

======
### dab.exports(id)

namespaceをグローバル関数に変換します。  

* dab.exports("wicker")   
wicker.factory, wicker.manufacture, wicker.carriage, wicker.configをエクスポートします。
* dab.exports("amd")  
wicker.define, wicker.requireをエクスポートします。  
jQuery、underscore.js、Backbone.jsなどを使用する時はこの指定を行ってください。


```
dab.exports("amd");
wicker.carriage({
  "Backbone": "backbone.min.js",
  "underscore": "underscore.min.js",
  "jquery": "jquery.min.js"
});
require(["Backbone"], function(backbone){
  // use backbone here
});
```

IDはスペース区切りで複数の指定が可能です。

```
dab.exports("wicker amd");
```

## License

(c) 2014 Wicker Wings

* Source code: The MIT License  
* Documents: CC-BY 3.0 or later  
* Sample code: Public domain or CC0  
