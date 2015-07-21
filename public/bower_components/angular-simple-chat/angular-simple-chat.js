(function() {
  'use strict';

  angular.module('irontec.simpleChat', ['luegg.directives']);

  angular.module('irontec.simpleChat').directive('irontecSimpleChat', SimpleChat);

  function SimpleChat() {

    var chatTemplate =
    '<div class="row chat-window col-xs-12 col-md-12" ng-class="vm.theme" style="margin-left:10px;">' +
      '<div class="col-xs-12 col-md-12">' +
        '<div class="panel">' +
          '<div class="panel-heading chat-top-bar">' +
            '<div class="col-md-8 col-xs-8">' +
              '<h3 class="panel-title" ng-style="vm.panelStyle"><span class="glyphicon glyphicon-comment"></span> {{vm.title}}</h3>' +
            '</div>' +
            '<div class="col-md-4 col-xs-4" style="text-align: right;">' +
              '<span class="glyphicon" ng-class="vm.chatButtonClass" ng-click="vm.toggle()"></span>' +
            '</div>' +
          '</div>' +
          '<div class="panel-body msg-container-base" ng-style="vm.panelStyle" scroll-glue>' +
            '<div class="row msg-container" ng-repeat="message in vm.messages">' +
			  '<div ng-if="message.snapshot" class="col-md-2 col-xs-2" style="padding-right: 0px;">' +
                '<a href="{{message.snapshot}}" target="_blank"><img class="chat-msg" height="81px" ng-src="{{message.snapshot}}"></img></a>' +
              '</div>' +
              '<div ng-class="{\'col-md-10\': message.snapshot, \'col-xs-10\': message.snapshot, \'col-md-12\': !message.snapshot, \'col-xs-12\': !message.snapshot}">' +
                '<div class="chat-msg" ng-class="vm.username === message.username ?' + " 'chat-msg-sent' : 'chat-msg-receive'" + '" chat-msg-sent">' +
                  '<p>{{message.content}}</p>' +
                  '<strong class="chat-msg-author">{{message.username}}</strong>' +
				  '<p>{{message.time | date:\'dd/MM/yyyy @ h:mm\'}}</p>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="panel-footer" ng-style="vm.panelStyle">' +
            '<form style="display:inherit" >' +
              '<div class="input-group" >' +
			    '<div class="input-group-btn">' +
					'<button type="button" class="btn btn-sm" ng-class="{\'btn-warning\': vm.snapshot}" ng-click="vm.snapshotFunction()"><span class="glyphicon glyphicon-camera"></span></button>' +
				'</div>' +
                '<input type="text" class="form-control input-sm chat-input" placeholder="{{vm.inputPlaceholderText}}" ng-model="vm.writingMessage" />' +
                '<span class="input-group-btn">' +
                  '<input type="submit" class="btn btn-sm chat-submit-button" value="{{vm.submitButtonText}}" ng-click="vm.submitFunction()" />' +
                '</span>' +
              '</div>' +
            '</form>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';

    var directive = {
      restrict: 'EA',
      template: chatTemplate,
      replace: true,
      scope: {
        messages: '=',
        username: '=',
        inputPlaceholderText: '@',
        submitButtonText: '@',
        title: '@',
        theme: '@',
        submitFunction: '&',
        snapshotFunction: '&',
		reconnectFunction: '&',
		connected: '='
      },
      link: link,
      controller: ChatCtrl,
      controllerAs: 'vm'
    };

    function link(scope) {
      if(!scope.inputPlaceholderText) {
        scope.inputPlaceholderText = 'Write your message here...';

      }

      if(!scope.submitButtonText || scope.submitButtonText === '') {
        scope.submitButtonText = 'Send';
      }

      if(!scope.title) {
        scope.title = 'Chat';
      }
    }

    return directive;
  }

  ChatCtrl.$inject = ['$scope'];

  function ChatCtrl($scope) {
    var vm = this;
    var isHidden = false;

    vm.messages = $scope.messages;
    vm.username = $scope.username;
	
	$scope.$watch('inputPlaceholderText+submitButtonText+title+theme+connected', function() {
		vm.inputPlaceholderText = $scope.inputPlaceholderText;
		vm.submitButtonText = $scope.submitButtonText;
		vm.title = $scope.title;
		vm.theme = 'chat-th-' + ($scope.connected ? 'material' : 'irontech');
	})

    vm.writingMessage = '';
    vm.submitFunction = function() {
      $scope.submitFunction()({
		  message: vm.writingMessage,
		  user: vm.username,
		  snapshot: vm.snapshot,
		  time: new Date()
	  });
      vm.writingMessage = undefined;
	  vm.snapshot = undefined;
    };

    vm.panelStyle = {'display': 'block'};
    vm.chatButtonClass= 'glyphicon-minus icon_minim';

    vm.toggle = toggle;
	
	$scope.$watch('connected', function() {
		if(!$scope.connected) {
			isHidden = false;
			toggle();
		}
	})

	function toggle() {
		if(isHidden) {
			if($scope.connected) {
				vm.chatButtonClass = 'glyphicon-minus icon_minim';
				vm.panelStyle = {'display': 'block'};
				$('#comment').css({'width': ""})
				isHidden = false;
			} else {
				$scope.reconnectFunction()();
			}
		} else {
			vm.chatButtonClass = 'glyphicon-plus icon_minim';
			vm.panelStyle = {'display': 'none'};
			$('#comment').css({'width': 'auto'})
			isHidden = true;
		}

	}
	
	vm.snapshotFunction = snapshotFunction;
	
	function snapshotFunction() {
		$scope.snapshotFunction()().then(function(result) {
			vm.snapshot = result;
		})
	}

  }


})();