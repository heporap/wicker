/*
 * sprite module for wicker.js
 * ver. 0.4.1
 * 
 * Javascript wicker module
 * 
 * (c) 2014, Wicker Wings
 * http://www.wi-wi.jp/
 * http://github.com/heporap/wicker
 */
(function(window, undefined){
	'use strict';
	
	var Version = 'Sprite 0.4.1';
	
	var defaultValues = {},
		$ajax,
		sprites,
		accessor;
	
	function Sprite(id, data, baseURL){
		this.id = id;
		this.canvas = null;
		this.spriteImg = null;
		this.spriteImgURL = normalizeURL(baseURL, data.src);
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
	 * baseURLとrelURLの結合
	 * ref: wicker.js
	 */
	var normalizeURL = function(loc, rel){
			var paths = loc.split('/'),
				relPaths = rel.split('/'),
				i;
			
			i=rel.indexOf('://');
			if( i!==-1 ){
				return ( i===0 )?location.protocol.replace(/:$/, '')+rel: rel;
			}else if( rel.indexOf('/')===0 ){
				return loc.match(/(^.+:\/\/[^/]*)/)[1]+rel;
			}
			
			paths.pop();
			
			for(i = 0; i < relPaths.length; i++ ){
				if( relPaths[i] === '..' ){
					paths.pop();
				}else if( relPaths[i] !== '.' ){
					paths.push(relPaths[i]);
				}
			}
			return paths.join('/');
		
	};
		
	/* 
	 * create HTMLElement
	 */
	function createElement(tagName){
		return document.createElement(tagName);
	}
	
	/* 
	 * スプライトデータを読み込み開始
	 * 'ajax' モジュール使用
	 * defaultValues.spriteDataURL
	 */
	function loadData(spriteDataURL){
		if( !sprites ){
			sprites = {};
		}
		
		spriteDataURL = spriteDataURL || defaultValues.spriteDataURL;
		if( spriteDataURL ){
		
			$ajax.ajax(spriteDataURL, '', {success: onLoadData, failure: onLoadFailure});
			
		}
		
	}
	
	/* 
	 * スプライトデータ読み込み失敗
	 */
	function onLoadFailure(xhr){
		wicker.factory('sprite');
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
		
		for( id in sprites ){
			result = result && sprites[id].loaded;
		}
		
		if( result ){
			wicker.factory('sprite');
		}
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
		define(['ajax'],{});
		wicker.factory('sprite', ['ajax'], function(aj){
			defaultValues = this;
			$ajax = aj;
			
			if( !sprites ){
				loadData();
				return false;
			}
			
			return accessor;
			
		});
	}else if ( typeof window === 'object' && typeof window.document === 'object' ) {
		$ajax = window.dab.ajax;
		window.dab.sprite = accessor;
	}
		
	
})(this);
