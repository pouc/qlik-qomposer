var fs = require('fs');
var Regex = require("regex");
var Zip = require('adm-zip');
var Promise = require('promise');
var Deep = require('deep-diff')
var extend = require('extend');

var read = Promise.denodeify(fs.readFile)
var readdir = Promise.denodeify(fs.readdir)
var write = Promise.denodeify(fs.writeFile)
var unlink = Promise.denodeify(fs.unlink)
var mkdir = Promise.denodeify(fs.mkdir)


function diffExclude(lhs, rhs, exclude) {
	
	var differences = [];
	Deep.observableDiff(lhs || {}, rhs || {}, function (d) {
		
		var ex = true;
		exclude.forEach(function(item) {
			ex = ex && d.path[d.path.length - 1] != item;
		})
		
		if (d && ex) {
			differences.push(d);
		}
	});
	
	return differences;
	
}


function json(name) {
	var that = this;
	
	that.name = name;
	
	that.config = {};
	that.oldConfig = {};
		
	that.load = function() {
	
		return read(__dirname + '/storage/' + that.name + '/config.json', 'utf8')
			.then(function (str) {
				
				that.config = JSON.parse(str)
				return that.loadOld();
				
			}, function() {
				
				var ret = [];
				
				ret.push(that.store(true));
				ret.push(that.storeOld());
				
				return Promise.all(ret);
				
			});
		
	}
	
	that.loadOld = function() {
	
		return read(__dirname + '/storage/' + that.name + '/config.old.json', 'utf8')
			.then(function (str) {
				that.oldConfig = extend(true, {}, that.config);
			}, function() {
				return that.storeOld()
			});
		
	}

	that.store = function(force) {

		var differences = Deep.diff(that.config, that.oldConfig);

		var ret = [];
		if(differences) {
			var timestamp = (new Date()).toISOString().replace(/[^0-9]/g, "");
			ret.push(write(__dirname + '/storage/' + that.name + '/config.diff.' + timestamp + '.json', JSON.stringify(differences)))
			that.oldConfig = extend(true, {}, that.config);
		}
		
		if(force || differences) {
			ret.push(write(__dirname + '/storage/' + that.name + '/config.json', JSON.stringify(that.config)))
		}
		
		return Promise.all(ret);
		
	}
	
	that.storeOld = function() {
		return write(__dirname + '/storage/' + that.name + '/config.old.json', JSON.stringify(that.oldConfig));
	}
	
	that.getRootValues = function() {
		return Object.keys(that.config)
	}
	
	that.get = function(root) {
		if(typeof that.config[root] != 'undefined') {
			var config = JSON.parse(JSON.stringify(that.config[root]));
			return Promise.resolve(config);
		} else {
			return Promise.reject(util.format('%s does not exist!', root))
		}
	}

	that.set = function(root, conf, user) {
		
		var config = JSON.parse(JSON.stringify(conf));
		var differences = Deep.diff(that.config[root], config);
		
		var ret = [];
		if(differences) {
			that.config[root] = config;
			
			var newDate = new Date();
			
			that.config[root].__modif_date = newDate;
			that.config[root].__modif_user = user;
			
			conf.__modif_date = newDate;
			conf.__modif_user = user;
			
			ret.push(that.store());
		}
		
		return Promise.all(ret);
	}
	
	that.remove = function(root, user) {
		
		var ret = [];
		if(typeof that.config[root] != "undefined") {
			delete that.config[root];
			
			ret.push(that.store());
		}
		
		return Promise.all(ret);
	}

	that.init = function() {
		
		return mkdir(__dirname + '/storage/' + that.name)
			.then(function() {
				return that.load();
			}, function() {
				return that.load();
			})
			.then(function() {
				return that;
			})
			
	}
	
	that.clean = function() {
		return readdir(__dirname + '/storage/' + that.name)
			.then(function(files) {

				var maxTimeStamp = -1;
				var diffFilesToZip = [];
				files.forEach(function(item) {
					var match = /config\.diff\.([0-9]+)\.json$/.exec(item);
					if(match) {
						diffFilesToZip.push(item);
						var num = parseInt(match[1]);
						if(num > maxTimeStamp) maxTimeStamp = num;
					}
				})

				var toDo = [];
				if(diffFilesToZip.length > 10) {
					var zip = new Zip();
					
					zip.addLocalFile(__dirname + '/storage/' + that.name + '/config.old.json');
					zip.addLocalFile(__dirname + '/storage/' + that.name + '/config.json');
					
					toDo.push(unlink(__dirname + '/storage/' + that.name + '/config.old.json')
						.then(function() {
							return that.storeOld();
						})
					);
					
					var toDel = [];
					diffFilesToZip.forEach(function(item) {
						zip.addLocalFile(__dirname + '/storage/' + that.name + '/' + item);
						toDel.push(unlink(__dirname + '/storage/' + that.name + '/' + item));
					});
					
					
					zip.writeZip(__dirname + '/storage/' + that.name + '/config.' + maxTimeStamp + '.zip');
					
					toDo = toDo.concat(toDel)
				}
				
				return Promise.all(toDo);
			})
	}

}


function copyFile(source, target, cb) {
	var cbCalled = false;

	var rd = fs.createReadStream(source);
	
	rd.on("error", function(err) {
		done(err);
	});
	
	var wr = fs.createWriteStream(target);
	wr.on("error", function(err) {
		done(err);
	});
	
	wr.on("close", function(ex) {
		done();
	});
	
	rd.pipe(wr);

	function done(err) {
		if (!cbCalled) {
			cb(err);
			cbCalled = true;
		}
	}
}

function image(name) {
	var that = this;
	
	that.name = name;
	
	that.init = function() {
		
		var ret = new Promise(function (resolve, reject) {
		
			mkdir(__dirname + '/storage/' + that.name)
				.then(function() {
					resolve(name);
				}, function() {
					resolve(name);
				})
			
		});
		
		return ret;
	}
	
	that.store = function(path, name) {
		
		var ret = new Promise(function (resolve, reject) {
		
			copyFile(path, __dirname + '/storage/' + that.name + '/' + name, function(error) {
				if(error) reject(error);
				else resolve(name);
			})
		
		});
		
		return ret;
	}
}

function snapshot(name) {
	var that = this;
	
	that.name = name;
	
	that.init = function() {
		
		var ret = new Promise(function (resolve, reject) {
		
			mkdir(__dirname + '/storage/' + that.name)
				.then(function() {
					resolve(name);
				}, function() {
					resolve(name);
				})
			
		});
		
		return ret;
	}
	
	that.store = function(data, name) {

		var ret = new Promise(function (resolve, reject) {
			
			var rdata = data.replace(/^data:image\/\w+;base64,/, "");
			var buf = new Buffer(rdata, 'base64');
			
			fs.writeFile(__dirname + '/storage/' + that.name + '/' + name, buf, function(error) {
				if(error) reject(error);
				else resolve(name);
			})
		
		});
		
		return ret;
	}
}

module.exports = {
	json: json,
	image: image,
	snapshot: snapshot
};
