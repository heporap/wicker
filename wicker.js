/*
 * Wicker.js 0.3.6
 * 
 * Javascript module loader
 * 
 * (c) 2014 Wicker Wings
 * http://www.wi-wi.jp/
 * http://github.com/heporap/wicker
 */
(function(root, undefined) {
	'use strict';
	var CONST_REQUIRE = 'require',
		CONST_EXPORTS = 'exports',
		CONST_MODULE = 'module';
	var __FILENAME__, __BASEURL__, __DEFINE_BASEURL__ = './';
	var document = window.document;
	/*
	 * 擬似グローバル変数
	 */
	var modules = {},
		isDOMContentLoaded = false,
		modCount = 1,
		lastModID,
		currentGlobals={};
	
	defineCommonModules();
	normalizeBaseURL();
	
	/*
	 * <script>にdata-baseurl属性を付けると、その属性値をbaseURLとする。
	 * 相対パスはドキュメントのURLを基準とする。
	 * 属性がなければwicker.jsのあるURLをwicker.factoryのbaseURL初期値とする。
	 * 
	 * defineのbaseURL初期値はドキュメントURL。
	 * data-baseurl属性はdefineのbaseURLを上書きする。
	 * 
	 * data-baseurlに特殊キーワード "wicker:" を指定する事で、wicker.jsのURLをbaseURLとする。（defineの初期値を上書きする。）
	 *  ":" 記号がない場合は ./wicker と同義。
	 * urlを続ける事で、wicker.jsのパスから相対パスを規定値に使用する。
	 * 例） data-baseurl="wicker:modules/"
	 * 
	 * urlは相対パス、絶対パス、絶対URL（プロトコルあり、なし）のいずれかを取る。
	 * 例) data-baseurl="wicker:modules/"
	 *     data-baseurl="wicker:/modules/"
	 *     data-baseurl="wicker:://example.com/modules/"
	 *     data-baseurl="wicker:http://example.com/modules/"
	 * 
	 * <script>にdata-main属性を付けると、その属性値をモジュール名としてdefineする。
	 * 
	 * defer async属性はファイル名がwicker.jsに限る。
	 * 実行ファイルをロードするタイミングの問題から、data-main属性による実行が必須となる。
	 */
	function normalizeBaseURL(){
		var scripts = document.getElementsByTagName('script'),
			script = scripts[scripts.length-1],
			src = script.src || location.href,
			modMain,
			i;
		
		if( document.body ){
			for( i = 0; i < scripts.length; i++ ){
				if( /wicker\.js/.test(scripts[i].src) ){
					script = scripts[i];
					break;
				}
			}
			src = script.src;
		}
		
		src = src.match(/^([^?#]+)/)[1];
		__FILENAME__ = src.substring(src.lastIndexOf('/')+1);
		src = __FILENAME__? src.replace(new RegExp('\/'+__FILENAME__+'.*'), '/'): src;
		
		__BASEURL__ = script.getAttribute('data-baseurl');
		if( __BASEURL__ ){
			if( __BASEURL__.match( /^wicker:(.*)/ ) ){
				__BASEURL__ = RegExp.$1;
			}else{
				src = location.href;
			}
			__DEFINE_BASEURL__ = __BASEURL__ = normalizePath(src, __BASEURL__);
		}else{
			__BASEURL__ = src;
			__DEFINE_BASEURL__ = './';
		}
		modMain = script.getAttribute('data-main');
		if( modMain ){
			carriage(addExt([modMain]));
//			carriage({modMain:addExt([modMain])});
//			define(!/\.js$/.test(d)?modMain:null, [modMain],{});
		}
	}
	
	/*
	 * baseURLと相対パスから絶対URLを生成
	 */
	function normalizePath(loc, rel){
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
		
	}
	

	/*
	 * モジュールの生成
	 * URLの扱い
	 * "wicker:" から始まるパス：wicker.jsのURLをbaseURLとして相対パス
	 * "module:" から始まるパス：define/factoryを呼び出したモジュールのURLをbaseURLとして相対パス
	 * 呼び出しモジュールのURLを認識できない場合はscript.onloadでの処理を期待する
	 */
	function makeModule(id, depends, constructor, opt, oldMod){
		function Module(id, depends, constructor, url, attach){
			this.name = id;
			this.attach = attach;
			this.depends = [];
			this.constructor = constructor;
			this.initialized = false;
			this.url = url;
			this.context = null;
			this.confs = {};
			
			copy(depends, this.depends);
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
		
		if( !isDefined(id) ){
			id = 'wicker_'+modCount++;
		}
		
		var url = isString(opt)? opt: opt? opt.url: '';
		var attach = isString(opt)? id: opt && opt.attach? opt.attach: id;
		
		var module = new Module(id, depends||[], constructor, url, attach);
		
		if( oldMod ){
			module.url = oldMod.url;
			module.loaded = oldMod.loaded;
			
			module.config(oldMod.confs);
		}
		return module;
	}
	
	/* 
	 * グローバル変数の一時利用
	 */
	function makeGlobalSim(gnames, id){
		function GlobalSim(globalName, modName){
			this.globalName = globalName;
			this.contextModName = modName;
			this.oldVar = undefined;
			this.moduleIDs = [];
			this.isSwapping = false;
		}
		GlobalSim.prototype = {
			swap: function(){
				if( this.isSwapping ){
					return;
				}
				if( modules[this.contextModName] && modules[this.contextModName].context ){
					this.oldVar = window[this.globalName];
					window[this.globalName] = modules[this.contextModName].context;
					this.isSwapping = true;
				}
			},
			recover: function(){
				if( modules[this.contextModName] ){
					window[this.globalName] = this.oldVar;
				}
				this.isSwapping = false;
			},
			addID: function(ids){
				var i, n, k;
				this.moduleIDs.push(ids);
				for( i = 0; i < this.moduleIDs.length; i++ ){
					n = this.moduleIDs[i];
					k = this.moduleIDs.lastIndexOf(n);
					while( i < k ){
						this.moduleIDs.splice(k, 1);
						k = this.moduleIDs.lastIndexOf(n);
					}
				}
				
			},
			hasModule: function(id){
				return this.moduleIDs.indexOf(id) !== -1;
			},
			isLastModule: function(id){
				return !this.moduleIDs.length || this.moduleIDs.length === 1 && this.moduleIDs.indexOf(id) !== -1;
			},
			removeID: function(id){
				if( this.hasModule(id) ){
					this.moduleIDs.splice(this.moduleIDs.indexOf(id), 1);
				}
			}
			
		};
		
		var i, name;
		if( !gnames ){
			return;
		}
		for( i in gnames ){
			name = gnames[i];
			if( !currentGlobals[name] ){
				currentGlobals[name] = new GlobalSim(name, i);
			}
			currentGlobals[name].addID(id);
		}
	}
	
	/*
	 * ウインドウロード完了時の処理を登録。
	 * 基本的にcontrollerを実行のみ。
	 */
	function onDOMContentLoaded(){
		if( !isDOMContentLoaded ){
			isDOMContentLoaded = true;
			lastModID=null;
			if( root.removeEventListener ){
				document.removeEventListener('DOMContentLoaded', onDOMContentLoaded, false);
				root.removeEventListener('load', onDOMContentLoaded, false);
			}
			if( document.detachEvent ){
				document.detachEvent('onload', onDOMContentLoaded);
			}
		}
		
		var id, mod, g, gs;
		var doc = document,
			parent = doc.querySelector('script').parentNode,
			script;
			
			for( g in currentGlobals ){
				gs = currentGlobals[g];
				mod = modules[ g ];
				if( mod ){
					var readyDepends = isLoadedModules( mod.depends );
					if( gs.moduleIDs.length && mod.initialized && readyDepends ){
						gs.swap();
					}
				}
			
			}
		
		for( id in modules ){
			mod = modules[id];
			if( !mod.loaded && mod.url && isLoadedModules(mod.depends) ){
				// wicker: module: から始まるURLはURLを調整するため待機
				if( /^wicker:|^module:/.test(mod.url) ){
					continue;
				}
				script = doc.createElement('script');
				script.setAttribute('src', mod.url);
				script.setAttribute('async', 'async');
				script.setAttribute('defer', 'defer');
				if( script.addEventListener ){
					script.addEventListener('load', onloadScript, false);
				}else if( script.attachEvent ){
					script.attachEvent('onload', onloadScript);
				}
				parent.insertBefore(script, null);
				mod.loaded = true;
			}
		}
		
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
		var ids = [], id, i, g, mod, lastMod;
		for(id in modules ){
			mod = modules[id];
			if( /^wicker:|^module:/.test(mod.url) ){
				mod.url = normalizePath(url, mod.url.match(/^(?:wicker:|module:)(.*)/)[1]);
				continue;
			}
		
			if( mod.url === url ){
				if( lastModID && /^wicker/.test(lastModID) && lastModID !== id){
					lastMod = modules[lastModID];
					if( lastMod.constructor && !lastMod.initialized ){
						var tmp = modules[id];
						mod = modules[id] = lastMod;
						mod.name = id;
						mod.url = url;
						mod.loaded = true;
						copy(tmp.confs, mod.confs);
						
						tmp = null;
						
						delete modules[lastModID];
						lastModID=lastMod=null;
					}else if( !!modules[lastModID].context ){
						mod.context = modules[lastModID].context;
						mod.initialized = true;
						
						delete modules[lastModID];
						lastModID=lastMod=null;
						recallAdapter(id);
						
					}
					continue;
					
				}
				ids.push(id);
			}
		}
		
		for( i = 0, g=false; i < ids.length; i++ ){
			id = ids[i];
			mod = modules[id];
			if( !mod.initialized && isLoadedModules(mod.depends)){
				
				g = adapter(id);
				if( !mod.constructor ){
					mod.context = ( window[mod.attach] )? window[mod.attach]: true;
					mod.initialized = true;
				}
				if( g ){
					recallAdapter(id);
				}
			}
		}
		var gsim;
		for( g in currentGlobals ){
			gsim = currentGlobals[g];
			gsim.removeID(id);
			
			if( !gsim.moduleIDs.length ){
				gsim.recover();
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
			baseURL = arg.baseURL || baseURL;
			
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
		
		makeGlobalSim(opt.global, mod.name);
		
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
	function factory(){
		var name = null, depends = [CONST_REQUIRE, CONST_EXPORTS, CONST_MODULE], constructor, confs,
			i;
		
		for(i = 0; i < arguments.length; i++ ){
			if( isString( arguments[i] ) ){
				name = arguments[i];
			}else if( isArray(arguments[i]) ){
				depends = arguments[i];
			}else if( isFunction(arguments[i]) ){
				constructor = arguments[i];
			}else if( !!arguments[i] ){
				
				name = arguments[i].name;
				confs = {};
				copy(arguments[i], confs);
				delete confs.id;
				
			}
		}
		
		if( arguments.length === 1 && name ){
			lastModID = null;
			if( adapter(name) ){
				recallAdapter(name);        
			}
			lastModID = name;
			return name;
		}
		
		if( name && modules[name] && modules[name].initialized ){
			return name;
		}
		var mod = makeModule(name, depends, constructor, {}, name? modules[name]: null);
		name = mod.name;
		
		if( confs ){
			mod.config(confs);
		}
		modules[name] = mod;
		
		lastModID = null;
		if( adapter(name) ){
			recallAdapter(name);
		}
		lastModID = name;
		
		return name;
	}
	
	/*
	 * compatibility with AMD
	 */
	function define(){
		var name = null, depends = [CONST_REQUIRE, CONST_EXPORTS, CONST_MODULE], constructor,
			i;
		
		for(i = 0; i < arguments.length; i++ ){
			if( isString( arguments[i] ) ){
				name = arguments[i];
			}else if( isArray(arguments[i]) ){
				depends = arguments[i];
			}else if( !!arguments[i] ){
				constructor = arguments[i];
			}
		}
		
		if( !isFunction(arguments[i]) ){
			constructor = (function(o){ return function(){return o;}; }(constructor));
		}

console.log(name+'; '+depends.join(','));
		carriage( addExt(depends), __DEFINE_BASEURL__ );
		
		factory(name, depends, constructor);
		
		name = depends = constructor = null;
		
	}
/*	function define(){
		var name = null, depends = [CONST_REQUIRE, CONST_EXPORTS, CONST_MODULE], constructor,
			i;
		var mk = function(o){ return function(){return o;}; };
		
		for(i = 0; i < arguments.length; i++ ){
			if( isString( arguments[i] ) ){
				name = arguments[i];
			}else if( isArray(arguments[i]) ){
				depends = arguments[i];
			}else if( isFunction(arguments[i]) ){
				constructor = arguments[i];
			}else if( !!arguments[i] ){
				constructor = mk(arguments[i]);
			}
		}
		
console.log(name+'; '+depends.join(','));
		carriage( addExt(depends), __DEFINE_BASEURL__ );
//		if(name){
//			carriage( addExt([name]), __DEFINE_BASEURL__ );
//		}
		
		factory(name, depends, constructor);
		
		name = depends = constructor = null;
		
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
				if( adapter(name) ){
					recallAdapter(name);
				}
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
	 *
	function manufacture(depends, controller){
		factory(null, depends, controller);
	}
	
	/*
	 * 
	 */
	function require(depends, controller){
		define(depends, controller);
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
	 * require: 
	 *   compatible CommonJS require('')
	 * exports: 
	 *   define()のconstructorの中でexportsのプロパティに代入した内容がモジュールcontextとして保存される。
	 * module: 
	 *   How does it work?
	 */
	function defineCommonModules(){
		factory(CONST_REQUIRE, [], function(){
			return function(id, callback){
				if( arguments.length === 2 && isArray(id) && isFunction(callback) ){
					return define(id, callback);
				}else{
					return (modules[id])? modules[id].context: null;
				}
			};
		});
		
		factory(CONST_EXPORTS, [], function(){
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
		
		factory(CONST_MODULE, [], function(){
			return {};
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
	function isArray(o){
		return isDefined(o) && o.constructor === Array;
	}
	function isFunction(o){
		return isDefined(o) && typeof o === 'function';
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
	wicker.manufacture = factory;
	wicker.carriage = carriage;
	wicker.config = config;
	root.define = define;
	root.define.amd = {};
	root.require = require;
	
	function preDOMContentLoaded(){
			if (document.readyState == 'complete') {
				onDOMContentLoaded();
				document.detachEvent('onreadystatechange', preDOMContentLoaded);
			}
	}
	
	if( root.addEventListener ){
		document.addEventListener('DOMContentLoaded', onDOMContentLoaded, false);
		root.addEventListener('load', onDOMContentLoaded, false);
	}
	if( document.attachEvent ){
		document.attachEvent('onreadystatechange', preDOMContentLoaded);
		document.attachEvent('onload', onDOMContentLoaded);
	}
})(this);
