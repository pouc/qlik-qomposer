define([
	'js/qlik',
	'app',
	'jquery',
	'utils'
], function (qlik, app, $, util) {
	
	app.controller('MashupsModalConfigHubCtrl', function ($scope, $modalInstance, dataService, hub) {
		
		$scope.hub = hub;
		$scope.cache = dataService.getCache();
		
		$scope.firstOpen = true;

		$scope.ok = function () {
			$modalInstance.close($scope.hub);
		};

		$scope.cancel = function () {
			$modalInstance.dismiss('cancel');
		};
		
	});
	
	app.controller('ModalConfigMashup', function ($scope, $modalInstance, Upload, cssInjector, dataService, title, config, mashup, isOk, hide) {
		
		cssInjector.add("bower_components/angular-ui-tree/angular-ui-tree.min.css");
		
		$scope.cache = dataService.getCache();
		$scope.state = dataService.getState();
		
		$scope.title = title;
		$scope.config = config;
		$scope.mashup = mashup;
		$scope.hide = hide || [];

		$scope.firstOpen = true;
		
		$scope.inArray = $.inArray;
		
		if(typeof $scope.mashup.app != 'undefined') {
			$scope.mashup.app = $scope.cache.apps.filter(function(app) {
				return app.id == $scope.mashup.app.id;
			})[0];
		}
		
		if(typeof $scope.mashup.theme != 'undefined') {
			$scope.mashup.theme = $scope.cache.themes.filter(function(th) {
				return th.bs == $scope.mashup.theme.bs;
			})[0];
		}
		
		$scope.nameChanged = function() {
			console.log($scope.name)
		}
		
		$scope.onFileSelect = function($files, $event, $rejectedFiles, logo) {

			Upload.upload({
				url: $scope.state.baseUrl + 'api/image',
				method: 'POST',
				file: $files[0]
			}).success(function (data, status, headers, config) {
				logo.href = data.response;
			});

		}
		
		$scope.remove = function(scope) {
		    scope.remove();
		};

		$scope.toggle = function(scope) {
		    scope.toggle();
		};
		
		$scope.addPage = function() {
			$scope.mashup.navbar.left.push({
		        id: $scope.mashup.navbar.left.length,
		        title: 'Page ' + ($scope.mashup.navbar.left.length + 1),
				page: ($scope.mashup.navbar.left.length + 1),
				type: 'link',
		        items: []
		    })
		};

		$scope.moveLastToTheBeginning = function() {
		    var a = $scope.data.pop();
		    $scope.data.splice(0, 0, a);
		};

		$scope.newSubItem = function(scope) {
		    var nodeData = scope.$modelValue;
					
		    nodeData.items.push({
		        id: nodeData.id * 10 + nodeData.items.length,
		        title: nodeData.title + '.' + (nodeData.items.length + 1),
				page: '1',
				type: 'link',
		        items: []
		    });
		};

		$scope.collapseAll = function() {
		    $scope.$broadcast('collapseAll');
		};

		$scope.expandAll = function() {
		    $scope.$broadcast('expandAll');
		};

		$scope.isOk = function() {
			if(isOk) return isOk($scope);
			return true;
		}
		
		$scope.ok = function () {
			
			$modalInstance.close({
				mashup: $scope.mashup,
				config: $scope.config
			});

		};

		$scope.cancel = function () {
			$modalInstance.dismiss('cancel');
		};
		
	});

	app.controller('ModalConfigPanel', function ($scope, $modalInstance, $q, cssInjector, dataService, Notification, rows) {

		cssInjector.add("bower_components/ladda/dist/ladda-themeless.min.css");
		
		$scope.config = rows[0];
		
		var defaultTitle = $scope.config.title;
		
		$scope.state = dataService.getState();
		$scope.cache = dataService.getCache();
		
		$scope.multiple = rows.length > 1;

		$scope.appChanged = function(selectedApp) {
			
			$scope.appLoading = true;
			
			if(typeof selectedApp == 'undefined') {

				$modalInstance.opened.then(function() {
					$modalInstance.dismiss('cancel');
					Notification.error('notif.error.mashup.noApp');
				})
				
				return;
			}
				
			$scope.selectedApp = selectedApp; 
			$scope.app = qlik.openApp(selectedApp.id, config);
			
			$scope.objects = [];
			
			var masterObjects = {
				title: 'Master Objects',
				type: 'masterobject',
				items: []
			}
			
			var masterObjectDef = $q.defer();
			$scope.app.getAppObjectList("masterobject", function(a) {
				a.qAppObjectList.qItems.forEach(function(a) {
					var c = $scope.objects.filter(function(b) {
						return a.qInfo.qId === b.id
					});
					if (!(c.length > 0)) {
						
						var e = a;
						e.type = a.qData.visualization
						e.id = a.qInfo.qId
						e.title = a.qMeta && a.qMeta.title ? a.qMeta.title : "[no title]"
						e.tags = a.qData.tags
						e.appid = $scope.app.id;
						var g = util.getIcon(a.qData.visualization);
						e.icon = g ? g : "toolbar-help"
						
						masterObjects.items.push(e)
					}
				})
				
				masterObjectDef.resolve();
				$scope.totalItems = $scope.objects.length;
			})
			
			$scope.objects.push(masterObjects);
			
			var sheetDef = $q.defer();
			$scope.app.getAppObjectList("sheet", function(c) {
                var h = c.qAppObjectList.qItems.sort(function(a, b) {
                    return a.qData.rank - b.qData.rank
                });
				
				h.forEach(function(c) {
					
					var newSheet = {
						id: c.qInfo.qId,
                        title: c.qData.title,
                        type: 'sheet',
						items: []
					}
					
					c.qData.cells.forEach(function(c) {
                        var g = c;
						
                        g.id = c.name;
						g.appid = $scope.app.id
						newSheet.items.push(g);
						
						$scope.app.getObjectProperties(g.id).then(function(b) {
                            var c = b.properties;
                            var h = util.getIcon(c.qInfo.qType);
							
                            g.icon = h ? g.icon = h : g.icon = "toolbar-help";
							
							g.type = c.qInfo.qType;
							
							c.title && c.title.trim && c.title.trim().length > 0
							? g.title = c.title
							: c.markdown && c.markdown.trim && c.markdown.trim().length > 0
							? $scope.app.getObject(g.id).then(function(b) {})
							: "object" == typeof c.title
							? $scope.app.getObject(g.id).then(function(a) {
                                g.title = a.layout.title
                            })
							:
							c.title
							? g.title = "[no title]"
							: $scope.app.getObject(g.id).then(function(a) {
                                !a.layout.title || a.layout.title && "" === a.layout.title.trim()
								? g.title = "[no title]"
								: g.title = a.layout.title
                            })
                        })
                    })
					
					$scope.objects.push(newSheet);

                })
				
				sheetDef.resolve();
			});
			
			$q.all([masterObjectDef.promise, sheetDef.promise]).then(function() {
				$scope.appLoading = false;
			})

		}
		
		$scope.appChanged($scope.state.mashup.app);
		
		$scope.setObject = function(item) {
			$scope.config.id.app = item.appid;
			$scope.config.id.object = item.id;
			$scope.config.id.type = item.type;
			
			if($scope.config.title == defaultTitle) {
				$scope.config.title = item.title;
				defaultTitle = item.title;
			}
		}
		
		$scope.ok = function () {
			$modalInstance.close($scope.config);
		};

		$scope.cancel = function () {
			$modalInstance.dismiss('cancel');
		};
		
	});

	app.controller('ModalDelete', function ($scope, $modalInstance) {

		$scope.ok = function () {
			$modalInstance.close(true);
		};

		$scope.cancel = function () {
			$modalInstance.dismiss('cancel');
		};
		
	});
	
	app.controller('ModalMax', function ($scope, $modalInstance, $timeout, item) {

		$scope.item = item;
		
		$timeout(function() {
			qlik.resize();
		}, 1000)
		
	
		$scope.ok = function () {
			$modalInstance.close(true);
		};

		$scope.cancel = function () {
			$modalInstance.dismiss('cancel');
		};
	});

})