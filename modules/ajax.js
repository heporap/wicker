/*
 * ajax module for wicker.js
 * ver. 0.1
 * 
 * Javascript wicker module
 * 
 * (c) 2014, Wicker Wings
 * http://www.wi-wi.jp/
 * http://github.com/heporap/wicker
 */
(function(window, undefined){
	'use strict';
	
	var Version = "ajax 0.1";
	
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
				o["200"].call(context, xhr);
			}else if( o[xhr.status] ){
				o[xhr.status].call(context, xhr);
			}else if( xhr.status !== 200 ){
				o.failure.call(context, xhr);
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
		return !isUndefined(n) && isNull(n);
	}
	function isString(n){
		return typeof n === 'string';
	}
	function isFunction(n){
		return typeof n === 'function';
	}
	function isArray(n){
		return isDefined(n) && !isUndefined(n.length);
	}
	
	/*
	 * 
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
	 * 
	 */
	function serialize(src){
		var result = [], i, sep = '?';
		if( isString(src) ){
			return sep+src;
		}
		if( isArray(src) ){
			return serialize(encodeURIComponent(src.join(',')));
		}
		for( i in src ){
			if( isString(src[i]) ){
				result.push( encodeURIComponent(i)+'='+encodeURIComponent(src[i]) );
			}else{
				result.push( encodeURIComponent(src[i].name)+'='+encodeURIComponent(src[i].value) );
			}
		}
		
		return seriarize(result.join('&'));
	}
	
	function noop(){
	}
	
	var accessor = {
		version: Version,
		ajax: ajax,
		serialize: serialize,
		setupDefault: setupDefault
	};
	
	
	if( typeof module === "object" && module && typeof module.exports === "object" ) {
		module.exports = accessor;
		
	}else if ( typeof define === "function" && define.amd ) {
		define('ajax', function(){
			return accessor;
		});
	}else if ( typeof window === "object" && typeof window.document === "object" ) {
		window.dab.ajax = accessor;
	}
})(this);
