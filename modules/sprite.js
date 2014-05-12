/*
 * sprite module for wicker.js
 * ver. 0.2
 * 
 * Javascript wicker module
 * 
 * (c) 2014, Wicker Wings
 * http://www.wi-wi.jp/
 * http://github.com/heporap/wicker
 */
(function(window, undefined){
	'use strict';
	
	var Version = 'Sprite 0.2';
	
	var defaultValues = {},
		$ajax,
		sprites,
		accessor;
	
	function Sprite(id, data){
		this.id = id;
		this.canvas = null;
		this.spriteImg = null;
		this.spriteImgURL = data.src;
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
		 */
		getSprite: function(posID, output){
			var canvas,
				pos = this.spriteData[posID],
				width = output? output.width: 0,
				height = output? output.height: 0;
				
			output = output || createElement('img');
			canvas = output.getContext? output: createElement('canvas');
			
			var ctx = canvas.getContext('2d');
			
			if( !width || !height ){
				width = pos.w;
				height = pos.h;
			}
			output.width = canvas.width = width;
			output.height = canvas.height = height;
			
			ctx.drawImage(this.canvas, pos.x, pos.y, pos.w, pos.h, 0, 0, width, height);
			
			if( !output.getContext ){
				output.src = canvas.toDataURL();
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
		console.log('load failure '+xhr.status);
	}
	
	/* 
	 * スプライトデータ読み込み完了
	 * スプライト作成
	 */
	function onLoadData(xhr){
		var data = JSON.parse(xhr.responseText);
		var id;
		for( id in data ){
			sprites[id] = new Sprite(id, data[id]);
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
	function getSprite(spriteID, posID, output){
		var s= sprites[spriteID];
		return ( s )? s.getSprite(posID, output): null;
	}
	
	accessor = {
		version: Version,
		loadData: loadData,
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