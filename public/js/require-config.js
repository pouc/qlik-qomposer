/*
 * This javascript file is the entry point for the mashup editor.
 * Please customize the sections marked with the // <EDIT THIS> // comments
 * in order for this to work with your own setup
 */
 
 
'use strict';

var root = 				window.location.pathname;
var extRoot = 			root + 'js';
var extBowerRoot =		root + 'bower_components'

var config;

if(typeof require == 'undefined') {
	window.location.replace("/login");
}
else {
	
	require.config({
		
		/*
		 *  You can use /resources as a base URL if you host the mashup editor on the same web server as Qlik Sense
		 *  OR if you use the provided nodejs proxy. If you don't want to use nodejs and host this project on a dif-
		 *  ferent machine that the Qlik Sense server, then you need to customize the base URL here to target the
		 *  /resources directory of the Qlik Sense proxy.
		 */
		 
		// <EDIT THIS> //
		baseUrl: 					"/resources",

		
		/*
		 *  Paths to the loaded modules
		 */
		 
		paths: {
			extJs : 				extRoot,
			extView : 				root + 'views',
			extLang : 				root + 'lang',
			extThemes : 			root + 'themes',
			app:					extRoot + '/app',
			angularRoute:			extBowerRoot + '/angular-route/angular-route-1.2.15',
			angularMocks:			extBowerRoot + '/angular-mocks/angular-mocks',
			angularCssInjector: 	extBowerRoot + '/angular-css-injector/angular-css-injector',
			angularLadda:			extBowerRoot + '/angular-ladda/dist/angular-ladda',
			angularXEditable:		extBowerRoot + '/angular-xeditable/dist/js/xeditable',
			angularUiSortable:		extBowerRoot + '/angular-ui-sortable/sortable',
			angularUiTree:			extBowerRoot + '/angular-ui-tree/angular-ui-tree.min',
			angularBootstrap:		extBowerRoot + '/angular-ui-bootstrap-bower/ui-bootstrap-tpls-0.12.0',
			angularUiNotification:	extBowerRoot + '/angular-ui-notification/angular-ui-notification',
			angularUiContextmenu:	extBowerRoot + '/angular-ui-contextmenu/angular-ui-contextmenu',
			angularFileUpload:		extBowerRoot + '/angular-file-upload/ng-file-upload-all',
			angularScrollGlue:		extBowerRoot + '/angular-scroll-glue/angular-scroll-glue',
			angularSimpleChat:		extBowerRoot + '/angular-simple-chat/angular-simple-chat',
			jqueryUI: 				extBowerRoot + '/jquery-ui/jquery-ui.min',
			jquerySortable: 		extBowerRoot + '/jquery-sortable/jquery.sortable',
			head: 					extBowerRoot + '/head/head',
			html2canvas: 			extBowerRoot + '/html2canvas/html2canvas',
			ladda:					extBowerRoot + '/ladda/dist/ladda.min',
			spin:					extBowerRoot + '/ladda/dist/spin.min',
			text:					extBowerRoot + '/requirejs-text/text',
			socketio: 				extBowerRoot + '/socket.io/socket.io',
		},
		
		/*
		 *  shims
		 */
		 
		shim: {
			'angularRoute': ['angular'],
			'angularMocks': {
				deps: ['angular'],
				exports: 'angular.mock'
			},
			'angularCssInjector': {
				deps: ['angular'],
				exports: 'angularCssInjector'
			},
			'angularLadda': {
				deps: ['angular', 'ladda', 'spin'],
				exports: 'angularLadda'
			},
			'angularXEditable': {
				deps: ['angular'],
				exports: 'angularXEditable'
			},
			'angularUiSortable': {
				deps: ['angular'],
				exports: 'angularUiSortable'
			},
			'angularUiTree': {
				deps: ['angular'],
				exports: 'angularUiTree'
			},
			'angularBootstrap': {
				deps: ['angular'],
				exports: 'angularBootstrap'
			},
			'angularUiNotification': {
				deps: ['angular'],
				exports: 'angularUiNotification'
			},
			'angularUiContextmenu': {
				deps: ['angular'],
				exports: 'angularUiContextmenu'
			},
			'angularFileUpload': {
				deps: ['angular'],
				exports: 'angularFileUpload'
			},
			'angularScrollGlue': {
				deps: ['angular'],
				exports: 'angularScrollGlue'
			},
			'angularSimpleChat': {
				deps: ['angular', 'angularScrollGlue'],
				exports: 'angularSimpleChat'
			},
			'jqueryUI': {
				deps: ['jquery'],
				exports: 'jqueryUI'
			},
			'jquerySortable': {
				deps: ['jquery'],
				exports: 'jquerySortable'
			},
			'head': {
				deps: ['jquery'],
				exports: 'head'
			},'html2canvas': {
				deps: ['jquery'],
				exports: 'html2canvas'
			},
			'ladda': {
				deps: ['angular'],
				exports: 'ladda'
			},
			'spin': {
				deps: ['angular'],
				exports: 'spin'
			},
			'socketio': {
				exports: 'socketio'
			}
		},
		priority: [
			'extJs/main',
			'angular'
		]
	});

	/*
	 *  Config for the web socket connection to Qlik Sense
	 *  Default is local Qlik Sense Desktop installation
	 *  Customize in nodeJS to target a local or remote
	 *  Qlik Sense Server
	 */
	 
	var xhr;
	if (window.XMLHttpRequest) {
		
		// code for IE7+, Firefox, Chrome, Opera, Safari
		xhr = new XMLHttpRequest();
		
	} else {
		
		// code for IE6, IE5
		xhr = new ActiveXObject("Microsoft.XMLHTTP"); 
		
	}

	xhr.onload = function (e) {
		if (xhr.readyState === 4) {
			if (xhr.status === 200) {
				config = JSON.parse(xhr.responseText);
				
				require.undef("text!themes/sense/theme.json");
				
				require([
					'js/qlik',
					'extJs/main'
					], function(qlik) {
						
						// Lazy bootstraping of angular modules in order to have enough time to load them
						// all first. This requires the qva-bootstrap="false" attribute on the html tag
						// of the index.html file. Load the qlik-self-mashup module at the same time.
						
						angular.element(document).ready(function() {
							angular.bootstrap(document, ['qlik-angular', 'qlik-self-mashup']);
						});

					}
				);
				
			} else {
				alert(xhr.statusText);
			}
		}
	};

	xhr.onerror = function (e) {
		alert(xhr.statusText);
	};

	xhr.open("GET", "/mashups/api/masterConfig", true);

	xhr.send();

	

}