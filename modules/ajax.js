/*
 * ajax module for wicker.js
 * ver. 0.2.1
 * 
 * Javascript wicker module
 * 
 * (c) 2014, Wicker Wings
 * http://www.wi-wi.jp/
 * http://github.com/heporap/wicker
 */
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
		
	}else if ( window.wicker && typeof window.wicker.factory === "function" ) {
		window.wicker.factory('ajax', function(){
			return accessor;
		});
		
	}else if ( typeof define === "function" && define.amd ) {
		define('ajax', function(){
			return accessor;
		});
	}else if ( typeof window === "object" && typeof window.document === "object" ) {
		window.dab = window.dab || {};
		window.dab.ajax = accessor;
	}
})(this);
