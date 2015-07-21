var Server = require('socket.io');
var io = new Server();

var Config = require('../store/index.js');

function comment() {
	
	var that = this;
	
	that.subscriptions = {};
	that.store = new Config.json('comment');
	
	that.store.init().then(function() {
		var ret = [];
		that.store.getRootValues().forEach(function(root) {
			ret.push(that.store.get(root).then(function(val) {
				that.subscriptions[root] = { messages: val, sockets: [] };;
			}))
		})
		return Promise.all(ret);
	}).then(function() {
		return that.store.clean();
	});
	
	that.init = function(http) {

		io.on('connection', function(socket){
			
			socket.on('comment', function(msg){
				Object.keys(that.subscriptions).forEach(function(key) {
					var val = that.subscriptions[key].sockets;
					var index = that.subscriptions[key].sockets.indexOf(socket);
					if(index != -1) {
						that.subscriptions[key].messages.push(msg);
						that.subscriptions[key].sockets.forEach(function(reciever) {
							reciever.emit('comment', msg);
						});
						that.store.set(key, that.subscriptions[key].messages, msg.username)
					}
				});
				
				

			});
			
			socket.on('subscribe', function(obj) {
				var item = obj;
				if(typeof that.subscriptions[item] == 'undefined') {
					that.subscriptions[item] = { messages: [], sockets: [socket] };
				} else {
					that.subscriptions[item].sockets.push(socket);
				}
				that.subscriptions[item].messages.forEach(function(msg) {
					socket.emit('comment', msg);
				});
			})
			
			socket.on('unsubscribe', function() {
				Object.keys(that.subscriptions).forEach(function(key) {
					var val = that.subscriptions[key].sockets;
					var index = that.subscriptions[key].sockets.indexOf(socket);
					if(index != -1) {
						that.subscriptions[key].sockets.splice(index, 1);
					}
				});
			})
		});
		
		io.serveClient(false);
		io.attach(http);
		
	}
	
}

module.exports = {
	comment: comment
};