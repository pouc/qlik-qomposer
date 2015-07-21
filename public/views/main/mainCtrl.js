Array.prototype.removeIf = function(callback) {
    var i = this.length;
    while (i--) {
        if (callback(this[i], i)) {
            this.splice(i, 1);
        }
    }
};

String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

define([
	'js/qlik',
	'app',
	'jquery',
	'utils',
	'html2canvas',
	'socketio'
], function (qlik, app, $, util, html2canvas, io) {
	
	var theme = require('core.utils/theme');
	
	app.controller('NavCtrl', function ($scope, $timeout, $location, $http, dataService, modalService, selfService, translateService, themeService, Notification) {
		
		$scope.state = dataService.getState();
		$scope.trans = translateService;

		$scope.switchEdit = selfService.switchEdit;
		$scope.switchEditApp = selfService.switchEditApp;
		$scope.save = selfService.save;
		
		$scope.configPage = function() {
			
			var oldTheme = dataService.getState().mashup.theme;
			
			modalService.configMashup(
				'modal.config.page.title',
				dataService.getState().mashup,
				dataService.getState().page
			).then(function() {
				
				var newTheme = dataService.getState().mashup.theme;
				
				themeService.set(newTheme);
		
				$timeout(qlik.resize, 1000);
			

				
			});
			
		}
		
		$scope.clearPanels = selfService.resetSelected;
		
		$scope.configPanels = function() {
			
			modalService.configPanel(
				dataService.getState().page.rows[0].filter(function(item, index) {
					var found = dataService.getState().selected.filter(function(selectedItem) {
						return selectedItem.$index == index;
					})[0]
					
					if(found) {
						return found.selected;
					}
					return false;
				})
			).then(function() {
				qlik.resize();
			});
		}
		
		$scope.mailPanel = function() {
			
			html2canvas($('#max'), {
				allowTaint: true,
				taintTest: false,
				onrendered: function(canvas) {
					var img = canvas.toDataURL("image/png;base64;");
					
					$http.post($scope.state.baseUrl + 'api/snapshot', angular.toJson({img: img})).
					success(function(data, status, headers, config) {
						
						$http.post($scope.state.baseUrl + 'api/mail', angular.toJson({
							user: $scope.state.user,
							id: $scope.state.maxItem.id,
							snap: data.response
						})).
						success(function(data, status, headers, config) {
							//Notification.success('mail.sent.success');
							Notification.success('E-mail envoyé!');
							
						});
					});

				}
			});
			
			
		}
		
		
		$scope.exportPanel = function($itemScope, $event) {
			
			function download(data, filename) {
				var a = document.createElement('a');
				a.download = filename;
				a.href = data
				document.body.appendChild(a);
				a.click();
				a.remove();
			}
			
			html2canvas($('#max'), {
				allowTaint: true,
				taintTest: false,
				onrendered: function(canvas) {
					var img = canvas.toDataURL("image/png;base64;");
					
					$http.post($scope.state.baseUrl + 'api/snapshot', angular.toJson({img: img})).
					success(function(data, status, headers, config) {
						download($scope.state.baseUrl + 'api/snapshot/' + data.response, 'export.png');
					});

				}
			});
		}
		
		$scope.removePanels = function() {
			modalService.del().then(function (result) {
				if(result) {
					dataService.remove(true);
					dataService.resetSelected();
				}
			});
		}
		
		$scope.selected = function(item) {
			return item.items.filter(function(sub) {
				return sub.page == $scope.state.route.pageId;
			}).length > 0;
		}
		
		$scope.unpublish = function() {
			
			$http.post($scope.state.baseUrl + 'api/unpublish', angular.toJson({
				user: $scope.state.user,
				mashup: $scope.state.mashup.title
			})).
			success(function(data, status, headers, config) {
				if(data.response) {
					Notification.success('Dépublié!');
					$scope.state.mashup.published = false;
					$scope.state.mashup.publishedByMe = false;
					$timeout($scope.save, 10);
				}
				else Notification.error('Pas dépublié ...');
			});


		}
		
		$scope.publish = function() {
			
			$scope.save().then(function() {
				$http.post($scope.state.baseUrl + 'api/publish', angular.toJson({
					user: $scope.state.user,
					mashup: $scope.state.mashup.title
				})).
				success(function(data, status, headers, config) {
					if(data.response) {
						Notification.success('Publié!');
						$scope.state.mashup.published = false;
						$scope.state.mashup.publishedByMe = true;
						$timeout($scope.save, 10);
					}
					else Notification.error('Pas publié ...');
				});
			})
			

		}
		
	});

	app.controller('views/MainCtrl', function ($scope, $modal, $timeout, $window, $location, $http, $q, $sce, dataService, modalService, selfService, translateService, cssInjector) {

		$scope.sortableOptions = {
			handle: '.dragHandle',
			'ui-floating': true
		}
		
		$scope.state = dataService.getState();
		$scope.trans = translateService;
		
		$scope.$watch(function(){
			return dataService.getStore();
		}, function (newValue, oldValue) {
			if(typeof oldValue.mashups != 'undefined' && Object.keys(oldValue.mashups).length > 0 && angular.toJson(newValue) != angular.toJson(oldValue))
				selfService.modified();
		}, true);
		
		$scope.getIframeSrc = function () {
			return $sce.trustAsResourceUrl(((config.isSecure) ? 'https://' : 'http://') + config.host + ':' + config.port + config.prefix + 'sense/app/' + encodeURIComponent($scope.state.mashup.app.id));
		};
		
		$scope.addPanel = function() {
			
			var newPanel = {
				title: 'default.panel.title',
				showTitle: true,
				id: {},
				color: 'default',
				text: 'default.panel.text',
				width: 4,
				height: 200,
				selected: false
			};
			
			modalService.configPanel(
				[ newPanel ]
			).then(function(result) {
				if(result) {
					dataService.add(result)
					qlik.resize();
				}
			});
		}
		
		$scope.selectPanel = function($itemScope) {
			
			$itemScope.selected = !$itemScope.selected;
			
			if($itemScope.selected) {
				$scope.state.selected.push($itemScope);
			} else {
				$scope.state.selected.removeIf(function(item) {
					return item.$id == $itemScope.$id;
				})
			}
			
			dataService.updateState();
			
		};
		
		$scope.linkPanel = function($itemScope, event) {
			
			if($itemScope.item.showLink) {
				$location.path('/{0}/{1}'.format($scope.state.route.mashupId, $itemScope.item.link));
			}
			
		}
		
		$scope.maxPanel = function($itemScope) {
			
			// modalService.maxPanel($itemScope.item);
			
			$scope.maxItem = $itemScope.item;
			$scope.state.maxItem = $itemScope.item;
			$scope.state.max = true;

		};
		
		$scope.configPanel = function(index) {
			
			modalService.configPanel(
				[ dataService.getState().page.rows[0][index] ]
			).then(function() {
				qlik.resize();
			});
			
		};
		
		$scope.deletePanel = function(index) {
			
			modalService.del().then(function (result) {
				if(result) {
					dataService.remove(false, index);
					dataService.resetSelected();
				}
			});
			
		}
		
		var socket = io($scope.state.baseHost);
		$scope.socketConnected = false;
		bindSocket(socket);
		
		function bindSocket(sock) {
			sock.on('connect', function(){
				$scope.$apply(function(){
					$scope.socketConnected = true;
				})
			});
			sock.on('connect_error', function(){
				sock.disconnect();
				$scope.$apply(function(){
					$scope.socketConnected = false;
				})
				
			});
			
			sock.on('disconnect', function(){
				sock.disconnect();
				$scope.$apply(function(){
					$scope.socketConnected = false;
				})
			});
		}

		$scope.reconnectSocket = function() {
			if(!$scope.socketConnected) {
				socket = io.connect($scope.state.baseHost,{'forceNew':true });
				bindSocket(socket);
			}
		}
		
		$scope.$watch('state.max+maxItem', function() {
			$scope.messages = [];
			socket.emit('unsubscribe');
			
			if($scope.state.max && $scope.maxItem) {
				socket.emit('subscribe', $scope.maxItem.id.app + '#' + $scope.maxItem.id.object);
			}
		})
		
		socket.on('comment', function(msg){
			$scope.$apply(function() {
				if(msg.snapshot) msg.snapshot = $scope.state.baseUrl + 'api/snapshot/' + msg.snapshot;
				$scope.messages.push(msg)
			})
			
		});
		
		$scope.messages = [];
		
		$scope.sendMessage = function(message) {
			if(message && message.message && message.message !== '' && message.user) {
				socket.emit('comment', {
					'username': message.user,
					'content': message.message,
					'snapshot': message.snapshot,
					'time': message.time
				});
			}
		};
		
		$scope.snapshot = function() {
			
			var snapDef = $q.defer();
			html2canvas($('#max'), {
				allowTaint: true,
				taintTest: false,
				onrendered: function(canvas) {
					var img = canvas.toDataURL("image/png;base64;");
					
					$http.post($scope.state.baseUrl + 'api/snapshot', angular.toJson({img: img})).
					success(function(data, status, headers, config) {
						snapDef.resolve(data.response);
					});

				}
			});
			
			return snapDef.promise;
		}
		
		
	});
	
});