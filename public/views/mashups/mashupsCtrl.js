define([
	'js/qlik',
	'app',
	'jquery',
	'utils'
], function (qlik, app, $) {

	
	app.controller('views/MashupsCtrl', function ($scope, $modal, $location, dataService, modalService, translateService, selfService, cssInjector, themeService) {
		
		$scope.state = dataService.getState();
		$scope.store = dataService.getStore();
		$scope.trans = translateService;
		
		$scope.switchEdit = selfService.switchEdit;
		$scope.save = selfService.save;
		
		$scope.sortableOptions = {
			handle: '.dragHandle',
			'ui-floating': true
		}
		
		$scope.$watch(function(){
			var store = dataService.getStore();
			return [ store.hub, store.mashups ];
		}, function (newValue, oldValue) {
			if((typeof oldValue[0] != 'undefined' || typeof oldValue[1] != 'undefined') && angular.toJson(newValue) != angular.toJson(oldValue))
				selfService.modified();
		}, true);

		$scope.addMashup = function() {
			
			var mashup = {
				name: 'default.mashup.name',
				title: undefined,
				lang: $scope.trans.lang,
				color: 'blue',
				logo: {
					show: false,
					href: 'http://www2.qlik.com/images/interface/chrome/logo.png'
				},
				theme: { bs: 'default' },
				navbar: {
					invert: false,
					brand: 'Qlik',
					logo: {
						show: false,
						href: 'http://www2.qlik.com/images/interface/chrome/logo.png'
					},
					left: [
						{ id: 1, type: 'link', title: 'default.page.header.title', page: '1', items: [] }
					]
				},
				footer: {
					left: {
						show: true,
						title: 'footer.left',
						href: 'footer.left.href'
					},
					right: {
						show: true,
						title: 'footer.right',
						href: 'footer.right.href'
					}
				},
				pages: {
					'1': {
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
					}
				}
			};
			
			modalService.configMashup(
				'modal.config.mashup.title',
				mashup,
				mashup.pages['1'],
				function(scope) { return typeof scope.mashup.title != 'undefined' && typeof scope.mashup.app != 'undefined' }
			).then(function(result) {
				$scope.store.mashups.push(mashup);
			});

		}
		
		$scope.configMashup = function($itemScope) {
			
			modalService.configMashup(
				'modal.config.mashup.title',
				$scope.store.mashups[$itemScope.$index]
			).then(function() {

			});

		}
		
		$scope.deleteMashup = function($itemScope) {
			
			modalService.del().then(function (result) {
				if(result) {
					$scope.store.mashups.splice($itemScope.$index, 1);
				}
			});
			
		}
		
		$scope.configHub = function() {
			
			var hubMashup = $.extend(true, {}, { theme: $scope.store.hub.theme, footer: $scope.store.hub.footer });
			var hubPage = $.extend(true, {}, { header: $scope.store.hub.header });
			
			modalService.configMashup(
				'modal.config.hub.title',
				hubMashup,
				hubPage,
				undefined,
				[
					'general.name',
					'general.title',
					'general.logo',
					'general.color',
					'general.application'
				]
			).then(function() {
				
				var newTheme = hubMashup.theme;
				themeService.set(newTheme);
				
				$.extend(true, $scope.store.hub, hubMashup)
				$.extend(true, $scope.store.hub, hubPage)
			});
			
		}
	});
	
});