/*! wicker.js modules - 2014-05-16
 * (c) 2014 Wicker Wings
 * License: MIT
 ****/
(function(window, undefined){
	'use strict';
	
	var Version = "ajax 0.2";
	
	function createXHR(){
		if(window.XMLHttpRequest) {
			return new XMLHttpRequest();
		} else if(window.ActiveXObject) {
			try {
				return new ActiveXObject("Msxml2.XMLHTTP");
			} catch(e) {
				return null;
			}
		}
		return null;
	}
	
	/* 
	 * 
	 * ajax( url:String )
	 * ajax( url:String, postData:Mixed )
	 * ajax( url:String, postData:Mixed, callbackSuccess:Function )
	 * ajax( url:String, postData:Mixed, params:Object, callbackSuccess:Function )
	 * ajax( params:Object )
	 *
	 * postData: Object
	 *  { 
	 *    name: value:String,
	 *    name: value:String
	 *  }
	 * postData: Array
	 *  [
	 *    {
	 *       name: value:String,
	 *       value: value:String
	 *    },
	 *    {
	 *       name: value:String,
	 *       value: value:String
	 *    }
	 *  ]
	 */
	function ajax(url, postData, params, callback){
		var o = {},
			xhr, i;
		
		if( !isString(url) ){
			return ajax(url.url, url);
		}
		
		if( arguments.length < 4 && isFunction(params) ){
			callback = params;
			params = {};
		}
		
		params = setupDefault(params);
		
		xhr = createXHR();
		if( !xhr ){
			return null;
		}
		o.xhr = xhr;
		o.url = url;
		
		o.thisContext = params.context || xhr;
		o["200"] = o["304"] = callback || params.success || params.callback || params["200"] || params["304"];
		o.failure = params.failure || noop;
		o.progress = params.progress || noop;
		
		xhr.onreadystatechange = function(){ processAjax(o.thisContext, o); };
		if( params.progress ){
			xhr.addEventListener("progress", function(evt){ progressAjax(params.context, o, evt); } );
		}
		
		xhr.open(params.method, url, params.async, params.user, params.password);
		
		var headers = params.headers;
		if( isFunction(xhr.setRequestHeader) ){
			xhr.setRequestHeader('Conent-Type', params.enctype);
			for(i in headers){
				xhr.setRequestHeader(i, headers[i]);
			}
		}
		if( params.mimetype ){
			xhr.overrideMimeType(params.mimetype);
		}
		
		xhr.send(params.postData);
		
		if( !params.async ){
			processAjax(o.thisContext, o);
		}
		
		return o;
	}
	
	function progressAjax(context, o){
		o.progress.call(context, o);
	}
	
	function processAjax(context, o){
		var xhr = o.xhr;
		if ( xhr.readyState === 4 ){
			if( xhr.status === 0 ){
				o["200"].call(context, xhr, o);
			}else if( o[xhr.status] ){
				o[xhr.status].call(context, xhr, o);
			}else if( xhr.status !== 200 ){
				o.failure.call(context, xhr, o);
			}
		}
	}
	
	function isUndefined(n){
		return typeof n === 'undefined';
	}
	function isNull(n){
		return typeof n === 'null';
	}
	function isDefined(n){
		return !isUndefined(n) && !isNull(n);
	}
	function isString(n){
		return typeof n === 'string';
	}
	function isFunction(n){
		return typeof n === 'function';
	}
	function isArray(n){
		return isDefined(n) && isDefined(n.length);
	}
	
	/*
	 * set the default values for XHR
	 */
	function setupDefault(params){
		if( !params ){
			params = {};
		}
		params.method = params.method || "GET";
		params.postData = params.postData || "";
		params.async = isDefined(params.async)? params.async: true;
		params.user = params.user || "";
		params.password = params.password || "";
		params.enctype = params.enctype || "";
		params.headers = params.headers || [];
		params.enctype = params.enctype || "applecation/x-www-form-urlencoded";
		
		params.method = params.method.toUpperCase();
		
		if( params.method !== "GET" && params.method !== "POST" && params.method !== "HEAD" ){
			throw new Error("This ajax library does not support this method: "+params.method);
		}
		
		params.postData = serialize(params.postData);
		
		return params;
	}
	
	/*
	 * sereialize(string)
	 *  パーセントエンコーディングして"?"に連結する
	 *    "?"+encodeURICoponent(string)
	 * sereialize(array, key)
	 *  keyが指定されていればPHP用にkey[]=value を生成
	 *    "?key[]=array[0]&key[]=array[1]"
	 *  keyが指定されていなければArrayの添字をkeyとする
	 *    "?0=array[0]&1=array[1]"
	 *  配列の各要素がnameプロパティ、valueプロパティを持つオブジェクトであればname=valueを生成
	 *    [
	 *      {name: key1, value: val1},
	 *      {name: key2, value: val2}
	 *    ]
	 *    "?key1=val1&key2=val2
	 * sereialize(object)
	 *  {key: value}のペアをkey=valueに変換
	 *    {
	 *      prop1: value1,
	 *      prop2: value2
	 *    }
	 *    "?prop1=value1&prop2=value2"
	 */
	function serialize(src, arrayKey){
		var result = [], i, sep = '?';
		
		arrayKey = arrayKey?encodeURIComponent(arrayKey)+'[]':'';
			
		var fn = function(a, b){
				if( isString(b) ){
					result.push( a+'='+encodeURIComponent(b) );
					
				}else if( (b.name || b.value) && b.name && b.value ){
					result.push( encodeURIComponent(b.name)+'='+encodeURIComponent(b.value) );
					
				}
		};
		
		if( isString(src) ){
			return sep+(encodeURIComponent(src));
		}
		if( isArray(src) ){
			for( i=0; i<src.length; i++ ){
				fn(arrayKey?arrayKey:i, src[i]);
			}
		}else{
			for( i in src ){
				fn(i, src[i]);
			}
		}
		
		return sep+result.join('&');
	}
	
	function noop(){
	}
	
	var accessor = {
		version: Version,
		ajax: ajax,
		serialize: serialize
	};
	
	
	if( typeof module === 'object' && typeof module.exports === "object" ) {
		module.exports = accessor;
		
	}else if ( wicker && typeof wicker.factory === "function" ) {
		wicker.factory('ajax', function(){
			return accessor;
		});
		
	}else if ( typeof define === "function" && define.amd ) {
		define('ajax', function(){
			return accessor;
		});
	}else if ( typeof window === "object" && typeof window.document === "object" ) {
		window.dab.ajax = accessor;
	}
})(this);
;(function(window, undefined){
	'use strict';
	
	var Version = 'Sprite 0.2';
	
	var defaultValues = {},
		$ajax,
		sprites,
		accessor;
	
	function Sprite(id, data, baseURL){
		baseURL = baseURL.split('/');
		baseURL.splice(-1);
		baseURL = baseURL.join('/');
	
		this.id = id;
		this.canvas = null;
		this.spriteImg = null;
		this.spriteImgURL = baseURL+'/'+data.src;
		this.spriteData = data;
		
		this.initialize();
		
	}
	Sprite.prototype = {
		constructor: Sprite,
		
		/*
		 * 要素の生成
		 */
		initialize: function(){
			this.canvas = createElement('canvas');
			this.spriteImg = createElement('img');
		},
		
		/*
		 * sprite用の画像をダウンロード
		 */
		load: function(){
			var id = this.id;
			
			this.spriteImg.onload = function(){ onLoadImage(id); };
			this.spriteImg.src = this.spriteImgURL;
			
		},
		
		/* 
		 * sprite画像ダウンロードのコールバック
		 * 全てのSpriteインスタンスの、ダウンロード完了をチェックするため、グローバル関数を経由
		 */
		create: function(){
			var canvas = this.canvas;
			
			canvas.width = this.spriteImg.width;
			canvas.height = this.spriteImg.height;
			
			canvas.getContext('2d').drawImage(this.spriteImg, 0, 0);
			
		},
		/* 
		 * スプライトデータから画像を作成する
		 * outputには<img>または<canvas>要素を指定可能。
		 * outputのサイズがspriteのサイズにリサイズされる。
		 * 
		 * canvas-context（canvas.getContext()の戻り値）を渡す時はisContextをtrueにすること。
		 * この場合、spriteのリサイズは行われない。
		 */
		getSprite: function(posID, output, isContext){
			var canvas,
				pos = this.spriteData[posID],
				width = output && !isContext? output.width: 0,
				height = output && !isContext? output.height: 0,
				ctx;
			
			
			if( !width || !height ){
				width = pos.w;
				height = pos.h;
			}
			
			if( isContext ){
				ctx = output;
			}else{
				output = output || createElement('img');
				canvas = output.getContext? output: createElement('canvas');
				ctx = canvas.getContext('2d');
				output.width = canvas.width = width;
				output.height = canvas.height = height;
			}
			
			ctx.drawImage(this.canvas, pos.x, pos.y, pos.w, pos.h, 0, 0, width, height);
			
			if( !isContext && !output.getContext ){
				output.src = canvas.toDataURL();
				canvas = null;
			}
			return output;
			
		}
		
	};
	
	/* 
	 * 
	 */
	function createElement(tagName){
		return document.createElement(tagName);
	}
	
	/* 
	 * スプライトデータを読み込み開始
	 * "ajax" モジュール使用
	 * defaultValues.spriteDataURL
	 */
	function loadData(spriteDataURL){
		if( !sprites ){
			sprites = {};
		}
		
		spriteDataURL = spriteDataURL || defaultValues.spriteDataURL;
		if( spriteDataURL ){
		
			$ajax.ajax(spriteDataURL, '', {success: onLoadData, failure: onLoadFailure});
			
		}else{
			wicker.factory("sprite");
			
		}
		
	}
	
	/* 
	 * スプライトデータ読み込み失敗
	 */
	function onLoadFailure(xhr){
		wicker.factory("sprite");
		throw new Error('load failure '+xhr.status);
	}
	
	/* 
	 * スプライトデータ読み込み完了
	 * スプライト作成
	 */
	function onLoadData(xhr, o){
		var data = JSON.parse(xhr.responseText);
		var id;
		for( id in data ){
			sprites[id] = new Sprite(id, data[id], o.url);
			sprites[id].load();
		}
		
	}
	
	/* 
	 * 
	 */
	function onLoadImage(imgID){
		var id, result = true;
		
		sprites[imgID].loaded = true;
		sprites[imgID].create();
//		create(imgID);
		
		for( id in sprites ){
			result = result && sprites[id].loaded;
		}
		
		if( result ){
			wicker.factory("sprite");
		}
	}
	
	/* 
	 * 
	 *
	function create(id){
		var canvas,
			sprite = sprites[id];
		
		sprite.canvas = canvas = createElement('canvas');
		
		canvas.width = sprite.spriteImg.width;
		canvas.height = sprite.spriteImg.height;
		
		canvas.getContext('2d').drawImage(sprite.spriteImg, 0, 0);
		
	}
	
	/* 
	 * 
	 */
	function getSprite(spriteID, posID, output, isContext){
		var s= sprites[spriteID];
		return ( s )? s.getSprite(posID, output, isContext): null;
	}
	
	accessor = {
		version: Version,
		load: loadData,
		getSprite: getSprite
	};
	
	if( window.wicker ){
		wicker.factory('sprite', ['ajax'], function(aj){
			defaultValues = this;
			$ajax = aj;
			
			if( !sprites ){
				loadData();
				return false;
			}
			
			return accessor;
			
		});
	}else if ( typeof window === "object" && typeof window.document === "object" ) {
		$ajax = window.dab.ajax;
		window.dab.sprite = accessor;
	}
		
	
})(this);
