var app_cached_providers = {};

function getURLParameter(a) {
    return (RegExp(a + "=(.+?)(&|$)").exec(location.search) || [null, null])[1]
}

define([
	'js/qlik',
	'angular',
	'angularRoute',
	'angularBootstrap',
	'angularUiSortable',
	'angularUiTree',
	'angularUiNotification',
	'angularUiContextmenu',
	'angularFileUpload',
	'angularSimpleChat',
	'angularCssInjector',
	'angularLadda'
], function(qlik, angular) {
	
	var app = angular.module('qlik-self-mashup', [
		'ngRoute',
		'ngAnimate',
		'ui.bootstrap',
		'ui.sortable',
		'ui.tree',
		'ui-notification',
		'ui.bootstrap.contextMenu',
		'ngFileUpload',
		'irontec.simpleChat',
		'angular.css.injector',
		'angular-ladda'
	]);
	
	app.controller('DefaultCtrl', function ($scope) {
		
	});
	
	app.config(function(NotificationProvider) {
        NotificationProvider.setOptions({
            delay: 10000,
            startTop: 100,
            startRight: 10,
            verticalSpacing: 10,
            horizontalSpacing: 20,
            positionX: 'right',
            positionY: 'top'
        });
    });
	
	var views = {
		/* main: { template: 'views/main/main.html', ctrl: 'views/MainCtrl', ctrlFile: 'extView/main/mainCtrl'  } */
	}
	
	app.config(['$routeProvider', function($routeProvider) {
		
		$routeProvider.when('/mashups', {
			templateUrl: 'views/mashups/mashups.html',
			controller: 'views/MashupsCtrl'
		});
		
		$routeProvider.when('/app/:appId', {
			templateUrl: 'views/app/app.html',
			controller: 'views/AppCtrl'
		});
		
		$routeProvider.when('/:mashupId/:pageId', {
			templateUrl: 'views/main/main.html',
			controller: 'views/MainCtrl'
		});
		
		$.each(views, function(k, v) {
			$routeProvider.when('/' + k, {
				templateUrl: v.template,
				controller: v.ctrl,
				resolve: {
					loadMainCtrl: ["$q", function($q) { 
						var deferred = $q.defer();
						require([v.ctrlFile], function() { deferred.resolve(); });
						return deferred.promise;
					}],
				},
			});
		})
		
		$routeProvider.otherwise({redirectTo: '/mashups'});
	}]);
	
	app.config(['$controllerProvider', '$compileProvider',
		function(controllerProvider, compileProvider) {
			app_cached_providers.$controllerProvider = controllerProvider;
			app_cached_providers.$compileProvider = compileProvider;
		}
	]);
	
	app.filter('startFrom', function() {
		return function(input, start) {
			start = +start; //parse to int
			return (input) ? input.slice(start) : [];
		}
	});
	
	app.directive("qvPlaceholder", function() {
		return {
			restrict: "A",
			
			scope: {
				qvPlaceholder : '='
			},
			
			link: function(scope, elem, attrs) {
				
				$(elem).on('themeChanged', function(event) {
					$(elem).empty();
					
					//setTimeout(function(){
						scope.$parent.state.app.getObject(elem, scope.qvPlaceholder.object);
					//}, 1000);

				})

				scope.$watch('qvPlaceholder.object', function(newValue, oldValue, scope) {

					if (typeof scope.qvPlaceholder.type !== 'undefined') {
						$(elem).empty();
					
						$(elem).removeClass('qv');
						$(elem).removeClass('qvtarget');
					
						if (scope.qvPlaceholder.type != "snapshot") {
							scope.$parent.state.app.getObject(elem, scope.qvPlaceholder.object).then(function (o) {
								//scope.qvPlaceholder.objectRef = o;
							});
						} else {
							scope.$parent.state.app.getSnapshot(elem, scope.qvPlaceholder.object).then(function () {});
						}
					}
					
				});
				
				$(elem).on('dragover', function (event) {
					
					event.preventDefault();
					$(this).addClass("drop-hover");
					
				}).on('dragleave', function (event) {
					
					event.preventDefault();
					$(this).removeClass("drop-hover");
					
				}).on('drop', function (event) {
					
					event.preventDefault();
					$(this).removeClass("drop-hover");
					
					var id = event.originalEvent.dataTransfer.getData('text').split("#")[1];
					var type = event.originalEvent.dataTransfer.getData('text').split("#")[0];
					
					var app = qlik.openApp(decodeURI(getURLParameter('app')), config);
					
					scope.$apply(function(){
						scope.qvPlaceholder.app = app.id;
						scope.qvPlaceholder.object = id;
						scope.qvPlaceholder.type = type;
					});
					
					app.close();
					
				});
			}
		}
	});
	
	app.directive('backImg', function($filter){
		return {
			restrict: "A",
			
			scope: {
				backImg : '=',
				backImgIf: '='
			},
			
			link: function(scope, element, attrs) {
				
				scope.$watch('backImg+backImgIf', function(newValue, oldValue) {

					if(scope.backImg && scope.backImgIf) {
						var url = $filter('logo')(scope.backImg);
						
						element.css({
							'background-image': 'url(' + url +')',
							'background-size': 'cover',
							'background-repeat': 'no-repeat',
							'background-position': 'center'
						});
					} else {
						element.css({
							'background-image': 'none'
						});
					}
					
				});
			}
		}
	});
	
	app.directive('currentSelections', function($filter){
		return {
			restrict: "A",
			
			scope: {
				currentSelections : '='
			},
			
			link: function(scope, element, attrs) {
				
				scope.$watch('currentSelections', function (newValue, oldValue) {
					if(typeof scope.currentSelections != 'undefined') {
						scope.currentSelections.getObject(element, 'CurrentSelections');
					}
				});
				
			}
		}
	});
	
	
	

	return app;
});