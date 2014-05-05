/*
 * Wicker.js 0.1
 * 
 * Javascript module loader
 * 
 * (c) 2014 Wicker Wings
 * http://www.wi-wi.jp/
 * http://github.com/heporap/wicker
 */
(function(root, undefined) {
	'use strict';
	var __FILENAME__, __BASEURL__;
	
	(function(){
		var scripts = document.getElementsByTagName('script'),
			script = scripts[scripts.length-1],
			src = script.src || location.href;
		src = src.match(/^([^?#]+)/)[1];
		__FILENAME__ = src.substring(src.lastIndexOf('/')+1);
		__BASEURL__ = src.replace(new RegExp('\/'+__FILENAME__+'.*'), '/');
	})();
	
	/*
	 * 擬似グローバル変数
	 */
	var modules = {},
		controllers = [],
		isDOMContentLoaded = false,
		modCount = 1,
		lastModID;
	
	defineCommonModules();
	/*
	 * 
	 */
	function makeModule(id, depends, constructor, opt){
		function Module(id, depends, constructor, url, attach, global){
			this.name = id;
			this.attach = attach;
			this.depends = [];
			this.global = {};
			this._global = {};
			this.constructor = constructor;
			this.initialized = false;
			this.url = url;
			this.context = null;
			this.confs = {};
			
			copy(depends, this.depends);
			copy(global, this.global);
		}
		Module.prototype = {
			config: function(arg){
				var i;
				if(arg){
					for( i in arg ){
						this.confs[i]=arg[i];
					}
				}
			}
		};
		
		if( !id ){
			id = 'wicker_'+modCount++;
		}
		
		var url = isString(opt)? opt: opt? opt.url: "";
		var global = isString(opt)? {}: opt && opt.global? opt.global: {};
		var attach = isString(opt)? id: opt && opt.attach? opt.attach: id;
		
		var module = new Module(id, depends||[], constructor, url, attach, global);
		
		return module;
	}
	
	
	/*
	 * ウインドウロード完了時の処理を登録。
	 * 基本的にcontrollerを実行のみ。
	 */
	function onDOMContentLoaded(){
		if( !isDOMContentLoaded ){
			isDOMContentLoaded = true;
			root.removeEventListener('DOMContentLoaded', onDOMContentLoaded, false);
		}
		
		var id, mod;
		var doc = document,
			parent = doc.querySelector('script').parentNode,
			script;
		
		for( id in modules ){
			mod = modules[id];
			if( !mod.loaded && mod.url && isLoadedModules(mod.depends) ){
				for( var i in mod.global ){
					mod._global[i] = window[mod.global[i]];
					window[mod.global[i]] = modules[i].context;
				}
				script = doc.createElement('script');
				script.setAttribute('src', modules[id].url);
				script.setAttribute('async', 'async');
				script.setAttribute('defer', 'defer');
				if( script.addEventListener ){
					script.addEventListener('load', onloadScript, false);
				}else if( script.attachEvent ){
					script.attachEvent('onload', onloadScript);
				}
				parent.insertBefore(script, null);
				modules[id].loaded = true;
			}
		}
		
		callControllers();
	}
	
	/*
	 * <script> onload
	 */
	 
	function onloadScript(event){
		var target = event.target||event.srcElement;
		applyScript(target.getAttribute('src'));
		removeScript(target);
		onDOMContentLoaded();
	}
	
	/*
	 * URLからモジュールIDの検証と擬似コンストラクタの生成または実行
	 */
	function applyScript(url){
		var ids = [], id, i, mod;
		for(id in modules ){
			mod = modules[id];
			if( mod.url === url ){
				if( lastModID ){
					var tmp = modules[id];
					mod = modules[id] = modules[lastModID];
					mod.name = id;
					mod.url = url;
					mod.loaded = true;
					copy(tmp.confs, mod.confs);
					
					tmp = null;
					
					if( /^wicker/.test(lastModID) ){
						delete modules[lastModID];
						continue;
					}
					
				}
				ids.push(id);
				
			}
		}
		
		for( i = 0; i < ids.length; i++ ){
			id = ids[i];
			mod = modules[id];
			if( !mod.initialized ){
				
				adapter(id);
				recallAdapter(id);
				
				if( !mod.constructor ){
					mod.context = ( window[mod.attach] )? window[mod.attach]: true;
					mod.initialized = true;
				}
				for( id in mod.global ){
					window[mod.global[id]] = mod._global[id];
					mod._global[id] = null;
				}
			}
		}
		
		lastModID = null;
		
	}
	
	/*
	 * <script>要素の除去
	 */
	function removeScript(element){
		if( element.removeEventListener ){
			element.removeEventListener('load', onloadScript, false);
		}else if( element.detachEvent ){
			element.detachEvent('onload', onloadScript);
		}
		element.parentNode.removeChild(element);
		
	}
	
	/* 
	 * コンフィギュレーション
	 * 定数を指定する
	 */
	function config(name, props){
		if( arguments.length === 1 ){
			configWicker(name);
		}else{
			configModule(name, props);
		}
	}
	
	/*
	 * 単純コピー
	 */
	function copy(from, to){
		var i;
		if( from.constructor === Array ){
			for( i = 0; i < from.length; i++ ){
				to.push( from[i] );
			}
		}else{
			for(i in from){
				if( from.hasOwnProperty(i) ){
					to[i] = from[i];
				}
			}
		}
	}
	
	/*
	 * name: String
	 * props: Object
	 */
	function configModule(name, props){
		if( !modules[name] ){
			modules[name] = makeModule(name, [], null, {});
		}
		modules[name].config(props);
		
		factory(name);
	}
	
	/*
	 * モジュールファイルをロードする。
	 * baseが省略された場合はモジュールローダーのディレクトリと同じディレクトリにあるファイルを示す。
	 * ドキュメントと同じディレクトリを基準にする場合はbaseに './' を指定する
	 * 
	 * carriage( url:String )
	 *   モジュールローダーのURLから相対パスでurlをロード
	 * 
	 * carriage( url:String, baseURL:String )
	 *   baseURLを基準とする相対パスでurlをロード
	 * carriage( url:Array )
	 * carriage( url:Array, baseURL:String )
	 *   urlの各項目に対してcarriage(url:String, base:String)を実行
	 * 
	 * carriage( url:Object )
	 *   requirejsのrequire.configに相当
	 *     carriage( {
	 *         baseURL: path,
	 *         paths: {
	 *           id: url,
	 *           id: url
	 *         }
	 *       }, baseURL);
	 */
	function carriage(arg, baseURL, id, opt){
		var url;
		
		if( arg.constructor === Array ){
			for( id = 0; id < arg.length; id++ ){
				carriage(arg[id], baseURL);
			}
			
		}else if( isString(arg) ){
			url = arg;
			baseURL = ( url.indexOf('/')===0 || url.indexOf('://')!==-1)? '': baseURL? baseURL: __BASEURL__;
			createScript(id, baseURL+url, opt);
			
		}else{
			baseURL = arg.baseURL || baseURL || __BASEURL__;
			
			var paths = arg.paths || arg;
			for( id in paths ){
				var item = paths[id];
				if( isString(item) ){
					url = item;
					opt = {};
				}else{
					url = item.url;
					opt = item;
				}
				carriage(url, baseURL, id, opt);
			}
			
		}
	}

	
	/*
	 * id、URLからモジュールを作成
	 * id can be null or undefined
	 */
	function createScript(id, url, opt){
		var i, mod;
		
		lastModID = null;
		
		// 指定IDが初期化済み、または指定URLがありロード前なら終了
		if( id && modules[id] ){
			return;
		}
		
		// 指定URLが読み込み済みなら終了
		for( i in modules ){
			if( modules[i].url === url ){
				modules[i].loaded = true;
			}
		}
		
		if( !opt ){
			opt = {};
		}
		opt.url = url;
		mod = makeModule(id, opt.depends, null, opt);
		modules[mod.name] = mod;
		
		if( isDOMContentLoaded ){
			onDOMContentLoaded();
		}
		
	}
	
	/*
	 * モジュールをロード、定義する
	 * name: String
	 *     module name
	 * name: Object
	 *     {
	 *       name: String = module name *required
	 *       other propeties = constant value
	 *     }
	 * depends: Array
	 *     dependent modules
	 * model: Function
	 *     arguments: dependent modules
	 *
	 ** basic difinition
	 * factory(name:String, depends:Array, constructor:Function);
	 *
	 ** depends can be omitted
	 * factory(name:String, constructor:Function);
	 * 
	 ** difinition with configuration properties on the first argument
	 * factory({name:name, prop: prop, ...}, depends:Array, constructor:Function);
	 * factory({name:name, prop: prop, ...}, constructor:Function);
	 * 
	 ** recalling constructor
	 * factory(name:String);
	 */
	function factory(opts, depends, constructor){
		var name, confs;
		
		if( arguments.length === 1 ){
			name = opts;
			lastModID = null;
			adapter(name);
			recallAdapter(name);
			lastModID = name;
			return name;
		}
		
		if( arguments.length === 2 ){
			constructor = depends;
			depends = [];
		}
		
		if( isString(opts) ){
			name = opts;
		}else if( isDefined(opts) ){
			name = opts.id || opts.name;
			confs = {};
			copy(opts, confs);
			delete confs.id;
		}
		
		if( name && modules[name] && modules[name].initialized ){
			return false;
		}
		
		var mod = makeModule(name, depends, constructor, {});
		name = mod.name;
		var oldMod = modules[name];
		if( oldMod ){
			mod.config(oldMod.confs);
			mod.url = oldMod.url;
		}else if(confs){
			mod.config(confs);
		}
		modules[name] = mod;
		oldMod = null;
		
		lastModID = null;
		adapter(name);
		recallAdapter(name);
		lastModID = name;
		
		return name;
	}
	
	/*
	 * compatibility with AMD
	 */
	function define(id, depends, constructor){
		if( arguments.length === 1 ){
			constructor = id;
			depends = ['require', 'exports', 'module'];
			id = null;
		}else if( arguments.length === 2 ){
			constructor = depends;
			if( isString(id) ){
				depends = ['require', 'exports', 'module'];
			}else{
				depends =id;
				id = null;
			}
		}
		carriage( addExt(depends, '.js'), './');
		factory(id, depends, constructor);
	
	}
	
	/*
	 * 待機中のモジュール、コントローラーの確認と実行
	 * 
	 */
	function recallAdapter(id){
		var name;
		// 待機中モジュールの確認と実行
		for( name in modules ){
			// 初期化がまだであること  // 引数モジュールに依存する事
			if( !modules[name].initialized && modules[name].depends.indexOf(id) !== -1 ){
				adapter(name);
			}
		}
		
		callControllers();
		
	}
	
	/*
	 * 
	 */
	function callControllers(){
		// 待機中コントローラーの確認と実行
		var i = controllers.length;
		while(i--){
			var con = controllers[i];
			if( isLoadedModules(con.depends) ){
				con.controller.apply(null, collector( con.depends ));
				controllers.splice(i,1);
			}
		}
	}
	
	/*
	 * モジュールの関連性を検証、結合
	 * name: String
	 *   検証するモジュール名
	 */
	function adapter(name){
		var mod = modules[name], con, attach = mod.attach;
		
		// 依存モジュールが定義済みか確認
		if( !isLoadedModules(mod.depends) ){
			return false;
		}
		
		// モジュールのコンストラクタの呼び出し
		if( mod.constructor ){
			mod.context = mod.constructor.apply(mod.confs, collector( mod.depends ));
			
			if( isUndefined(mod.context) ){
				con = modules.exports.context;
				if( con.hasData() ){
					mod.context = {};
					copy(con, mod.context);
					con.clear();
				
				}else{
					mod.context = window[attach] || true;
				
				}
			}
			
			mod.initialized = true;
			
		}
		
		return 1;
	}
	/*
	 * モジュールを使っての呼び出し
	 */
	function manufacture(depends, controller){
		var queue = {
				"depends": depends,
				"controller": controller
			};
		controllers.push( queue );
		
		if( isDOMContentLoaded ){
			callControllers();
		}
	}
	
	/*
	 * compatibility with AMD
	 */
	function require(depends, controller){
		if( arguments.length === 1 ){
			if( isString(depends) ){
				return crequire(depends);
			}else{
				controller = depends;
				depends = ['require', 'exports', 'module'];
			}
		}
		
		carriage( addExt(depends, '.js'), './');
		manufacture(depends, controller);
	}
	
	/*
	 * compatibility with CommonJS' require()
	 */
	function crequire(name){
		return modules[name].context;
	}
	
	/*
	 * add file extension to module_id
	 */
	function addExt(args){
		var result = {},
				i, d;
		for( i = 0; i < args.length; i++ ){
			d= args[i];
			result[args[i]]=( !/\.js$/.test(d) )? d+'.js': d;
		}
		return result;
	}
	
	/*
	 * define "require", "exports", "module" modules
	 * they are usually used in define() and require()
	 */
	function defineCommonModules(){
		factory('require', [], function(){
			return function(id){
				return (modules[id])? modules[id].context: null;
			};
		});
		
		factory('exports', [], function(){
			function Exports(){}
			Exports.prototype.clear = function(){
				for(var key in this ){
					if(this.hasOwnProperty(key)){
						delete this[key];
					}
				}
			};
			Exports.prototype.hasData = function(){
				for(var key in this ){
					if(this.hasOwnProperty(key)){
						return true;
					}
				}
				return false;
			};
			return new Exports();
		});
		
		factory('module', [], function(){
			var a = {};
			return a;
		});
		
		lastModID = null;
		
	}
	
	function isUndefined(o){
		return o===undefined;
	}
	function isNull(o){
		return o===null;
	}
	function isDefined(o){
		return !isUndefined(o) && !isNull(o);
	}
	function isString(o){
		return isDefined(o) && typeof o === 'string';
	}
	
	/*
	 * 関連モジュールアクセサーを集める
	 */
	function collector(modNames){
		var result = [],
			i, m;
		for( i = 0; i < modNames.length; i++ ){
			m=modules[modNames[i]];
			if( m && m.context ){
				result.push(m.context);
			}
		}
		return result;
	}
	/*
	 * 全ての関連モジュールがロード済みか確認
	 * returnValue: Boolean
	 *   false: 読み込みがまだ
	 *   true: 全て読み込み完了
	 */
	function isLoadedModules(modNames){
		return collector(modNames).length === modNames.length;
	}
	
	/**
	 * globals
	 **/
	var dab = root.dab || {};
	root.dab = dab;
	dab.klass = dab.klass || {};
	dab.klass.wicker = 'factory manufacture carriage config';
	dab.klass.amd = 'wicker.define wicker.require';
	
	if( !dab.exports ){
		dab.exports = function(args){
			var i,k,klassName,subName;
			args = args.split(/ /);
			for( i = 0; i < args.length; i++ ){
				klassName = args[i];
				if( this.klass[ klassName ] ){
					var modnames = this.klass[ klassName ].split(' ');
					for( k = 0; k < modnames.length; k++ ){
						subName = modnames[k];
						if( subName.indexOf('.')===-1){
							root[subName] = root[klassName][subName];
						}else{
							var n = subName.split('.');
							root[n[1]] = root[n[0]][n[1]];
						}
					}
				}
			}
		};
	}
	
	var wicker = {};
	root.wicker = wicker;
	
	wicker.factory = factory;
	wicker.manufacture = manufacture;
	wicker.carriage = carriage;
	wicker.config = config;
	wicker.define = define;
	wicker.define.amd = {};
	wicker.require = require;
	
	root.addEventListener('DOMContentLoaded', onDOMContentLoaded, false);
	
})(this);
