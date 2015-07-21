'use strict';

// First, checks if it isn't implemented yet.
if (!String.prototype.format) {
  String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) { 
      return typeof args[number] != 'undefined'
        ? args[number]
        : match
      ;
    });
  };
}

define("utils", [], function() {

	function a(a) {
		return c[a]
	}

	function b(a, b) {
		c[a] = b
	}
	var c = {};
	function tp(a) {
		switch (a.toLowerCase()) {
			case "barchart":
				return "bar-chart-vertical";
			case "linechart":
				return "line-chart";
			case "table":
				return "table";
			case "pivot-table":
				return "pivot-table";
			case "components":
				return "components";
			case "piechart":
				return "pie-chart";
			case "filterpane":
				return "filterpane";
			case "listbox":
				return "list";
			case "gauge":
				return "gauge-chart";
			case "kpi":
				return "kpi";
			case "scatterplot":
				return "scatter-chart";
			case "text-image":
				return "text-image";
			case "treemap":
				return "treemap";
			case "map":
				return "map";
			case "combochart":
				return "combo-chart";
			default:
				return "extension"
		}
	}

	function getIcon(a) {
		return "" + tp(a)
	}
	return {
		getIcon: getIcon,
		getType: a,
		getRegisteredNames: function() {
			return Object.keys(c)
		},
		getLibraryInfo: function(a) {
			return c[a] ? c[a].getLibraryInfo() : null
		},
		getTemplateIconClassName: function(a) {
			return c[a] ? c[a].getTemplateIconClassName() : null
		},
		getIconChar: function(a) {
			return c[a] ? c[a].getIconChar() : null
		},
		registerType: b
	}
});



define([
	'js/qlik',
	'jquery',
	'app',
	'text!extLang/languages.json',
	'head',
	'extView/main/mainCtrl',
	'extView/mashups/mashupsCtrl',
	'extView/modal/modalCtrl'
], function(qlik, $, app, langs, head) {
	
	$.expr[':'].regex = function(elem, index, match) {
		var matchParams = match[3].split(','),
			validLabels = /^(data|css):/,
			attr = {
				method: matchParams[0].match(validLabels) ? 
							matchParams[0].split(':')[0] : 'attr',
				property: matchParams.shift().replace(validLabels,'')
			},
			regexFlags = 'ig',
			regex = new RegExp(matchParams.join('').replace(/^s+|s+$/g,''), regexFlags);
		return regex.test($(elem)[attr.method](attr.property));
	}
	
	app.service('translateService', [ function() {
		
		var state = {
			lang: 'en-us',
			langs: JSON.parse(langs).languages
		}
		
		angular.forEach(state.langs, function(lang) {
			require([
				'text!extLang/' + lang.title + '/translations.json'
			], function(langFile) {
				state[lang.title] = JSON.parse(langFile);
			})
		})
		
		state.translate = function(tran) {
			if(typeof state[state.lang] == 'undefined') return tran;
			var trans = state[state.lang][tran];
			if(typeof trans == 'undefined') return tran;
			return trans;
		}
		
		return state;
		
	}])

	app.directive("trans", [ 'translateService', function(trans) {
		
		
		return {
			restrict: "A",
			
			scope: {
				trans : '='
			},
			
			link: function(scope, elem, attrs) {

				elem.data('init', elem.html());
				elem.data('editing', false);
				
				switch(elem[0].nodeName) {
					case "TEXTAREA":
					case "INPUT":

						elem.bind('focusin', function(event) {
							elem.data('editing', true);
							elem.val(elem.data('untrans'));
						})
						
						elem.bind('keyup', function(event) {
							elem.data('untrans', elem.val())
							scope.$apply(function() {
								scope.trans = elem.val();
							});
						})
						
						elem.bind('blur', function(event) {
							elem.val(trans.translate(elem.data('untrans')));
							elem.data('editing', false);
						})
						
						scope.$watch('trans', function (val) {
							elem.data('untrans', scope.trans);
						});
						
						scope.$watch(function() { return elem.data('untrans'); }, function (val) {
							if(!elem.data('editing'))
								elem.val(trans.translate(elem.data('untrans')));
						});
						
						break;
					
					default:
						scope.$watch('trans', function (val) {
							elem.data('untrans', scope.trans);
						});
						
						scope.$watch(function() { return elem.data('untrans'); }, function (val) {
							elem.html(trans.translate(elem.data('untrans')) + elem.data('init'));
						});
						
						break;
				}
			
				scope.$watch(
					function() { return trans; },
					function() {
						switch(elem[0].nodeName) {
							case "TEXTAREA":
							case "INPUT":
								elem.val(trans.translate(scope.trans));
								break;
							
							default:
								elem.html(trans.translate(scope.trans) + elem.data('init'));
								break;
						}
						
					},
					true
				)
			}
		}
	}]);
	
	app.filter("trans", [ 'translateService', function(trans) {
		return function(input) {
			return trans.translate(input);
		};
	}])
	
	app.filter("logo", [ 'dataService', function(dataService) {
		return function(input) {
			if (input && input.indexOf('/') == -1) return dataService.getState().baseUrl + 'api/image/' + input;
			return input;
		};
	}])
	
	var theme = require('core.utils/theme');
	
	app.service('stateService', [ '$routeParams', function($routeParams) {
		
		var host = ((config.isNodeSecure) ? 'https://' : 'http://') + config.nodeHost + ':' + config.nodePort + config.nodePrefix;
		var url = host + 'mashups/';
		
		var state = {
			edit: false,
			ready: false,
			multiselect: false,
			selected: [],
			modified: false,
			route: $routeParams,
			mashup: {},
			page: {},
			user: 'pending ...',
			baseUrl: url,
			baseHost: host,
			app: undefined
		}
		
		return state;
		
	}])
	
	app.service('themeService', [ '$q', 'stateService', '$rootScope', function($q, stateService, $rootScope) {
		
		return {
			
			set: function(newTheme) {
				
				var ret = [];
				var state = stateService;
				
				state.ready = false;
				
				var curBsTheme = undefined;
				$('head > link:regex(href,css/[^/]*/bootstrap\.min\.css)').each(function(index, link) {
					curBsTheme = $(link).attr('href').match(/css\/([^\/]*)\/bootstrap\.min\.css/)[1]
				})
				
				
				if(newTheme.bs != curBsTheme) {
					var bsThemeDef = $q.defer();
					ret.push(bsThemeDef.promise);
					
					$('head > link:regex(href,css/[^/]*/bootstrap\.min\.css)').each(function(index, link) {
						link.remove();
					})
					
					head.load({test: "css/" + newTheme.bs + "/bootstrap.min.css" }, function() {
						
						bsThemeDef.resolve();
						
					})
				}
				
				if(newTheme.qs != theme.name) {
					var qsThemeDef = $q.defer();
					ret.push(qsThemeDef.promise);
				
					theme.ThemeChanged.once(function() {
						$('div.qvplaceholder').trigger('themeChanged');
						qsThemeDef.resolve();
					})
					
					theme.set(newTheme.qs);
					
				}
				
				if(ret.length == 0) {
					var fakeDef = $q.defer();
					ret.push(fakeDef.promise);
					fakeDef.resolve();
				}
				
				return $q.all(ret).then(function() {
					state.ready = true;
				});
				
			}
			
		}
		
	}])
	
	app.service('dataService', ['$route', '$routeParams', '$rootScope', '$http', '$q', '$location', 'Notification', 'translateService', 'cssInjector', 'themeService', 'stateService', function($route, $routeParams, $rootScope, $http, $q, $location, Notification, trans, cssInjector, themeService, stateService) {
		
		
		
		var state = stateService;
		
		var cache = {
			apps: [],
			themes: [],
			tiles: [],
			icons:[]
		}

		var store = { };
		
		var getStore = function() {
			return store;
		}
		
		var setStore = function() {
			
			if(state.modified) {
				store.user.prefLang = trans.lang;
				store.user.savedAt = new Date();
				
				return $http.post(state.baseUrl + 'api/config/' + encodeURI(state.user), angular.toJson(store)).
					success(function(data, status, headers, config) {
						state.modified = false;
						Notification.success('notif.saved.ok');
					}).
					error(function(data, status, headers, config) {
						state.modified = false;
						Notification.success('notif.saved.ko');
					});
			} else {
				var def = $q.defer();
				def.resolve()
				return def.promise;
			}

		}
		
		var findMashup = function(title) {
			return store.mashups.filter(function(item) {
				return item.title == title;
			})[0];
		}
		
		var updateMashup = function(params) {
			
			var oldApp = state.app;
			var retDef = $q.defer();
			
			if(params && params.mashupId) {
				
				if(typeof params.mashupId != 'undefined' && typeof findMashup(params.mashupId) != 'undefined') {
					
					var newMashup = findMashup(params.mashupId);
					if(state.mashup != newMashup) {
						
						state.mashup = newMashup;
						
						
						themeService.set(state.mashup.theme).then(function() {
							state.app = qlik.openApp(state.mashup.app.id, config);
							retDef.resolve();
						})
							
						
						//cssInjector.removeAll();
						//cssInjector.add("css/" + state.mashup.theme.bs + "/bootstrap.min.css");
						
						

					} else {
						
						retDef.resolve();
						
					}
					
				} else {
					
					state.mashup = undefined;
					state.page = undefined;
					
					$location.path('/mashups');
					retDef.resolve();
					
				}
				
			} else {
				
				state.mashup = undefined;
				state.page = undefined;
				
				if(typeof state.app != 'undefined') {
					state.app = undefined;
				}
				
				themeService.set(store.hub.theme).then(function() {
					retDef.resolve();
				});
				
			}
			
			return retDef.promise;
			
		}
		
		var updatePage = function(params) {
			
			var retDef = $q.defer();
			
			if(typeof state.mashup != 'undefined') {
				if(typeof params.pageId != 'undefined' && typeof state.mashup.pages != 'undefined' && typeof state.mashup.pages[params.pageId] != 'undefined')
						state.page = state.mashup.pages[params.pageId];
				else {
					
					state.page = {
						header: {
							show: true,
							invert: false,
							title: 'default.page.header.title',
							description: 'default.page.header.description',
							logo: {
								show: false,
								href: 'http://www2.qlik.com/images/interface/chrome/logo.png'
							},
							link: {
								show: true,
								title: 'default.page.header.link',
								href: 'default.page.header.link.href'
							}
						},
						rows: [
							[

							]
						]
					};
					
					state.mashup.pages[params.pageId] = state.page;
				}
			}
				
			retDef.resolve();
			return retDef.promise;
			
		}
		
		var updateState = function(param) {

			state.max = false;
			var params = param || $routeParams;
			
			return updateMashup(params).then(function() {
				return updatePage(params);
			}).then(function() {
				state.multiselect = (state.selected.length > 0);
			})

		}
		

		// Loading config
		
		var global = qlik.getGlobal(config)
		var repoLoaded = global.isPersonalMode().then(function (reply) {
			
			if(reply.qReturn) {
				return { qReturn: { UserId: 'Desktop' } };
			} else {
				var authDef = $q.defer();
				global.getAuthenticatedUser(function(reply) {
					var result = {};
					reply.qReturn.split(';').forEach(function(item) {
						var split = item.trim().split('=');
						result[split[0]] = split[1];
					})
					authDef.resolve({ qReturn: result });
				}, config);
				return authDef.promise;
			}
			
		}).then(function(reply) {
			
			state.user = reply.qReturn.UserId;
			
		}).then(function() {
			
			return $http.get(
				state.baseUrl + 'api/config/' + encodeURI(state.user),
				{ timeout: 1500 }
			).success(function(data, status, headers, config) {
					
				Notification.info('notif.repo.remote.loaded');
				
				trans.lang = data.user.prefLang;
				
				store.user = data.user;
				store.hub = data.hub;
				store.mashups = data.mashups;

				
				state.modified = false;
				
			}).error(function(data, status, headers, config) {
				
				alert('Unable to reach node server ...')
				
			});

			
		})
		
		
		// Loading themes
		
		var themesLoaded = $http.get(
			'/css/themes.json',
			{ timeout: 1500 }
		).success(function(data, status, headers, config) {
				
			cache.themes = data.themes;
			cache.tiles = data.tiles;
			cache.icons = data.icons;
			
		}).error(function(data, status, headers, config) {
			
			alert('Themes are not available ...')
			
		}).then(function(){
			
			var retVal = [];
			angular.forEach(cache.themes, function(theme) {
				var themeLoadedDef = $q.defer();
				retVal.push(themeLoadedDef.promise);
				
				require([
					'text!themes/' + theme.qs + '/theme.json'
				], function() {
					themeLoadedDef.resolve();
				})
			})
			
			return $q.all(retVal);
			
		});
		

		// loading apps
		
		var appsLoadedDef = $q.defer();
		qlik.getAppList(function(b) {
			b.forEach(function(a) {
				cache.apps.push({
					id: a.qDocId,
					type: a.qDocName
				})
			});
			appsLoadedDef.resolve();
		}, config);
		

		// applying state
		
		$q.all([repoLoaded, appsLoadedDef.promise, themesLoaded]).then(function () {

			for(var i = store.mashups.length - 1; i >= 0; i--) {
				var mash = store.mashups[i];
				
				var appFound = false;
				cache.apps.forEach(function(app) {
					if (typeof mash.app == 'undefined' || app.id == mash.app.id) appFound = true;
				})
				
				if(typeof mash.app != 'undefined' && !appFound) {
					store.mashups.splice(i, 1);
				}
			}
		
			return updateState($routeParams);
		});
		
			
			
		var resetSelected = function() {
			state.selected.forEach(function(item) {
				item.selected = false;
			})
			
			state.selected = [];
			state.multiselect = false;
		};
		
		var add = function(row) {
			state.page.rows[0].push(row);
		}
		
		var remove = function(selected, index) {
			if(!selected) {	
				state.page.rows[0].splice(index, 1);
			} else {
				
				state.page.rows[0].removeIf(function(item, index) {
					var found = state.selected.filter(function(selectedItem) {
						return selectedItem.$index == index;
					})[0]
					
					if(found) {
						return found.selected;
					}
					return false;
				})
			}
			
			Notification.success('notif.panel.removed');
		}
		
		var self = {

			getState: function () {
                return state;
            },
			getCache: function () {
                return cache;
            },
			
			updateState: updateState,
			
			getStore: getStore,
			setStore: setStore,
            
			resetSelected: resetSelected,
			
			add: add,
			remove: remove
        };
		
		
		
		$rootScope.$on("$routeChangeStart", function(event, next, current){
			updateState(next.params);
		})
		
		return self;

	}]);
	
	app.service('modalService',  ['$modal', 'dataService', function ($modal, dataService) {
		
		var configPanel = function(rows) {
			
			var modalInstance = $modal.open({
				animation: true,
				templateUrl: 'views/modal/modal.config.panel.html',
				controller: 'ModalConfigPanel',
				size: 'lg',
				resolve: {
					rows: function () {
						return $.extend(true, [], rows);
					}
				}
			});
			
			return modalInstance.result.then(function (result) {
				
				if(rows.length == 1) {

					$.extend(true, rows[0], result);
					
					return rows[0];
					
				} else {
					
					rows.forEach(function(item) {
						item.showTitle = result.showTitle;
						item.color = result.color;
						item.width = result.width;
						item.height = result.height;
					});
					
					return rows;
					
				}
				
			});
			
		}
		
		var maxPanel = function(item) {
			
			var modalInstance = $modal.open({
				animation: true,
				templateUrl: 'views/modal/modal.max.html',
				controller: 'ModalMax',
				size: 'lg',
				resolve: {
					item: function () {
						return item;
					}
				}
			});
			
			return modalInstance.result;
			
		}
		
		var configMashup = function(title, mashup, config, isOk, hide) {
			
			var modalInstance = $modal.open({
				animation: true,
				templateUrl: 'views/modal/modal.config.mashup.html',
				controller: 'ModalConfigMashup',
				size: 'lg',
				resolve: {
					title: function() {
						return title;
					},
					mashup: function() {
						if(mashup) return $.extend(true, {}, mashup);
					},
					config: function() {
						if(config) return $.extend(true, {}, config);
					},
					isOk: function() {
						if(isOk) return isOk;
					},
					hide: function() {
						if(hide) return hide;
					}
				}
			});
			
			return modalInstance.result.then(function (result) {
				
				if(result) {
					
					if(mashup) {
						$.extend(true, mashup, result.mashup);
						mashup.navbar = result.mashup.navbar;
					}
					
					if(config) {
						$.extend(true, config, result.config);
					}

				}
				
			});			
			
		}
		
		var del = function() {
			
			var modalInstance = $modal.open({
				animation: true,
				templateUrl: 'views/modal/modal.delete.html',
				controller: 'ModalDelete'
			});
			
			return modalInstance.result;
			
		}
		
		var modal = {
			configPanel: configPanel,
			configMashup: configMashup,
			maxPanel: maxPanel,
			del: del
		};
		
		return modal;
	}])
	
	app.service('selfService', [ 'modalService', 'dataService', function (modalService, dataService) {
		
		var state = dataService.getState();
		
		var switchEdit = function() {
			state.edit = !state.edit;
			if(!state.edit && state.modified) {
				dataService.setStore();
			}
			if(!state.edit) {
				state.editApp = false;
			}
			if(state.edit) {
				state.max = false;
			}
			dataService.resetSelected();
		}
		
		var switchEditApp = function() {
			state.editApp = !state.editApp;
		}
		
		var modified = function() {
			state.modified = true;
		}
		
		var save = function() {
			return dataService.setStore();
		}
		
        var self = {
            switchEdit: switchEdit,
			switchEditApp: switchEditApp,
			modified: modified,
			save: save,
			resetSelected: dataService.resetSelected,
        };
		
		return self;
    }]);
	
	return app;
});
