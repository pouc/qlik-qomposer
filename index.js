var httpProxy = require('http-proxy');
var http = require('http');
var https = require('https');
var request = require('request')
var express = require('express');
var cors = require('cors');
var bodyParser = require('body-parser');
var fs = require('fs');
var url = require('url');

var app = express();
app.use(cors());
app.use(bodyParser.json({limit: '1024kb'}));


// Master config

var masterConfig = require('./config.js').config;
var target = ((masterConfig.isSecure) ? 'https://' : 'http://') + masterConfig.host + ':' + masterConfig.port + masterConfig.prefix;

fs.watch('./config.js', function(event) {
	masterConfig = require('./config.js').config;
	target = ((masterConfig.isSecure) ? 'https://' : 'http://') + masterConfig.host + ':' + masterConfig.port + masterConfig.prefix;
});

var server;
if(masterConfig.isNodeSecure) {
	var options = {
	  key: fs.readFileSync('./certs/key.pem'),
	  cert: fs.readFileSync('./certs/cert.pem')
	};
	
	server = https.Server(options, app)
	
	
} else {
	
	server = http.Server(app)
	
}


/*
 * Login
 */
 
 function ifnotundef(a, b) {
	 return ((typeof a != 'undefined') ? a : b)
 }
 
app.get('/login', function (req, res) {

	var prot = (ifnotundef(masterConfig.isInternalSecure, masterConfig.isSecure) ? https : http);
	var hubReq = prot.get({
		hostname: ifnotundef(masterConfig.internalHost, masterConfig.host),
		port: ifnotundef(masterConfig.internalPort, masterConfig.port),
        path: ifnotundef(masterConfig.internalPrefix, masterConfig.prefix) + 'hub/',
		method: 'GET',
		rejectUnauthorized: false,
		agent: false
    }, function(response) {

		res.writeHead(302, {
			'Location': ((masterConfig.isSecure) ? 'https://' : 'http://') + masterConfig.host + ':' + masterConfig.port + masterConfig.prefix + 'extensions/bounce/bounce.html?bounceUrl=' + ((masterConfig.isNodeSecure) ? 'https://' : 'http://') + masterConfig.nodeHost + ':' + masterConfig.nodePort + masterConfig.nodePrefix
		});
		
		res.end();

    });
	
	hubReq.on('socket', function (socket) {
		socket.setTimeout(5000);  
		socket.on('timeout', function() {
			hubReq.abort();
		});
	});

	hubReq.on('error', function() {
		res.status(500).send('Qlik Sense unavailable!');
	});


});


/*
 * Static content (mashup editor)
 */

var staticRouter = express.Router();
staticRouter.use(express.static(__dirname + '/public'));

app.use('/', staticRouter);


/*
 * Themes
 */

var themeRouter = express.Router();
themeRouter.use(express.static(__dirname + '/themes'));

app.use('/resources/themes', themeRouter);


/*
 * Qlik Sense resources proxy to avoid domain errors
 */
 
var proxy = httpProxy.createProxyServer();
var resourcesRouter = express.Router();

resourcesRouter.get(["/resources/*", "/qrs/*", "/extensions/*"], function(request, response, next){
	var target = (ifnotundef(masterConfig.isInternalSecure, masterConfig.isSecure) ? 'https://' : 'http://') + ifnotundef(masterConfig.internalHost, masterConfig.host) + ':' + ifnotundef(masterConfig.internalPort, masterConfig.port) + ifnotundef(masterConfig.internalPrefix, masterConfig.prefix);
	//console.log(target);
	
	proxy.web(request, response, {
		target: target,
		headers: {
			host: ifnotundef(masterConfig.internalHost, masterConfig.host),
			port: ifnotundef(masterConfig.internalPort, masterConfig.port)
		},
		timeout: 5000,
		xfwd: false,
		changeOrigin: true,
		hostRewrite: ifnotundef(masterConfig.internalHost, masterConfig.host),
		autoRewrite: true,
		secure: false
	});
})

proxy.on('proxyRes', function (proxyRes, req, res) {
	//console.log(3)
	//console.log('RAW Response from the target', proxyRes.statusCode);

	//if(proxyRes.statusCode == 302)
	//res.status(500).send('Something broke!');
});

proxy.on('error', function (err, req, res) {
	console.log(err)
	res.status(500).send('Something broke!');
});

app.use("/", resourcesRouter);



/*
 *  Load modules
 */

// Master config
 
app.get('/mashups/api/masterConfig', function (req, res) {
	res.send(masterConfig);
});

// Comments 
var Comment = require('./lib/comment/index.js');

var comment = new Comment.comment();
comment.init(server);


// Config & publish

var mashups = {};
var publishedMashups = {};

var Config = require('./lib/store/index.js');

var config = new Config.json('config');
config.init().then(function() {
	var ret = [];
	config.getRootValues().forEach(function(root) {
		ret.push(config.get(root).then(function(val) {
			mashups[root] = val;
		}))
	})
	return Promise.all(ret);
}).then(function() {
	return config.clean();
});

var publishedConfig = new Config.json('published');
publishedConfig.init().then(function() {
	var ret = [];
	publishedConfig.getRootValues().forEach(function(root) {
		ret.push(publishedConfig.get(root).then(function(val) {
			publishedMashups[root] = val;
		}))
	})
	return Promise.all(ret);
}).then(function() {
	return publishedConfig.clean();
});

app.post('/mashups/api/config/:user', function (req, res) {
	var toStore = req.body;
	
	mashups[req.params.user] = toStore;
	config.set(req.params.user, toStore, req.params.user)
	
	res.send('{"response": "ok"}');
});

app.get('/mashups/api/config/:user', function (req, res) {
	
	// if user does not exist, create him with default config
	if(typeof mashups[req.params.user] == 'undefined') {
		
		var newStore = {
			"user":{
				"prefLang":"en-us",
				"savedAt": new Date()
			},
			"hub":{
				"theme": { "bs": "default", qs:"sense" },
				"prefLang":"en-us",
				"header":{
					"show":true,
					"title":"default.hub.header.title",
					"description":"default.hub.header.description",
					"link":{
						"show":true,
						"href":"default.hub.header.link.href",
						"title":"default.hub.header.link"
					},
					"invert":false,
					"logo":{
						"show":false
					}
				},
				"footer":{
					"left":{
						"show":true,
						"title":"footer.left",
						"href":"footer.left.href"
					},
					"right":{
						"show":true,
						"title":"footer.right",
						"href":"footer.right.href"
					}
				}
			},
			"mashups":[]
		};
		
		mashups[req.params.user] = newStore;
		config.set(req.params.user, newStore, req.params.user)
		
	}
	
	// clone user config
	var ret = JSON.parse(JSON.stringify(mashups[req.params.user]));
	var retDate = new Date(ret['__modif_date'])
	
	var pub = publishedMashups;
	
	// for each published mashup ...
	Object.keys(pub).forEach(function(key) {
		var item = JSON.parse(JSON.stringify(pub[key]));
		
		item.published = true;
		item.publishedByMe = false;
		
		var index = -1;
		for(var i = ret.mashups.length - 1; i >= 0; i--) {
			if(ret.mashups[i].title === item.title) {
				index = i;
			}
		}
		
		// If user is not the mashup owner then show the shared mashup
		if(item['__modif_user'] != req.params.user) {
			
			var pubDate = new Date(item['__modif_date'])

			if(index == - 1) {
				ret.mashups.push(item);
			}
			else if (pubDate > retDate) {
				ret.mashups[index] = item;
			}

		} else {
			
			// Published mashup has been deleted by owner
			if(index == - 1) {
				delete publishedMashups[key];
				publishedConfig.remove(key, req.params.user);
				
			}
			else
			{
				ret.mashups[index].published = false;
				ret.mashups[index].publishedByMe = true;
			}
			
			
		}
			
	})
	
	res.send(ret);

});

app.post('/mashups/api/publish', function(req, res) {

	var body = req.body;

	var user = body.user;
	var mashup = body.mashup;
	
	var published = false;
	
	if(typeof mashups[user] != 'undefined') {
		mashups[user].mashups.forEach(function(mash) {
			if(mash.title == mashup) {
				if(typeof publishedMashups[mash.title] == 'undefined' || publishedMashups[mash.title]['__modif_user'] == body.user) {
					publishedMashups[mash.title] = JSON.parse(JSON.stringify(mash));
					if(typeof publishedMashups[mash.title].published != 'undefined') delete publishedMashups[mash.title].published
					publishedConfig.set(mash.title, publishedMashups[mash.title], user)
					published = true;
				}
			}
		})
	}
	
	res.send({"response": published});
	
})

app.post('/mashups/api/unpublish', function(req, res) {

	var body = req.body;
	
	var unpublished = false;
	
	if(typeof mashups[body.user] != 'undefined') {
		Object.keys(publishedMashups).forEach(function(key) {
			if(key == body.mashup) {
				if(typeof publishedMashups[key] != 'undefined' && publishedMashups[key]['__modif_user'] == body.user) {
					delete publishedMashups[key];
					publishedConfig.remove(key, body.user);
					unpublished = true;
				}
			}
		})
	}
	
	if(unpublished) {
		Object.keys(mashups).forEach(function(key) {
			mashups[key].mashups.forEach(function(item) {
				if(item.title == body.mashup && item.published && item['__modif_user'] == body.user) {
					delete item.published;
					delete item['__modif_user'];
					config.set(key, mashups[key], body.user)
				}
			})
		})
	}
	
	res.send({"response": unpublished});
	
})


// Images

var shortid = require('shortid');
var path = require('path')

var router = express.Router();
var multiparty = require('connect-multiparty');
var multipartyMiddleware = multiparty();

var image = new Config.image('image');
image.init();

router.post('/', multipartyMiddleware, function(req, res) {
    var file = req.files.file;
	
	var newImage = shortid.generate() + path.extname(file.path)
	
	image.store(file.path, newImage)
	.then(function() {
		res.send({ "response": newImage });
	}, function() {
		res.status(500).send('Something broke!');
	})

});

app.use('/mashups/api/image', router);
app.use('/mashups/api/image', express.static(__dirname + '/lib/store/storage/image'));


// Snapshots

var snapshot = new Config.snapshot('snapshot');
snapshot.init();

app.post('/mashups/api/snapshot', function(req, res) {

	var snap = shortid.generate() + '.png';
	
	snapshot.store(req.body.img, snap)
	.then(function() {
		res.send({ "response": snap });
	}, function() {
		res.status(500).send('Something broke!');
	})
	
})

app.use('/mashups/api/snapshot', express.static(__dirname + '/lib/store/storage/snapshot'));
 
 
/*
 * Let's go girlz!
 */

var server = server.listen(masterConfig.nodePort, function () {

	var host = server.address().address;
	var port = server.address().port;

	console.log('listening at ' + ((masterConfig.isNodeSecure) ? 'https://' : 'http://') + '%s:%s', host, port);

});

