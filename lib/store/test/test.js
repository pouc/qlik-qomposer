var Promise = require('promise');
var chai = require('chai');
var chaiAsPromised = require("chai-as-promised");
var fs = require('fs');

chai.use(chaiAsPromised);

var expect = chai.expect;
var should = chai.should();

var readdir = Promise.denodeify(fs.readdir)

var Config = require('../index.js');


function check( done, f ) {
	try {
		f()
		done()
	} catch(e) {
		done(e)
	}
}


var testConfig;

describe('Config object...', function() {
	
	testConfig = new Config('test');
	
	it('should have a name', function() {
		expect(testConfig.name).to.not.be.undefined;
		expect(testConfig.name).to.equal('test');
	});

	it('should have an empty config', function() {
		expect(testConfig.config).to.not.be.null;
		expect(typeof testConfig.config).to.equal('object');
		expect(Object.keys(testConfig.config).length).to.equal(0);
	})

	it('should have an empty old config', function() {
		expect(testConfig.oldConfig).to.not.be.null;
		expect(typeof testConfig.oldConfig).to.equal('object');
		expect(Object.keys(testConfig.oldConfig).length).to.equal(0);
	})

	it('should have a not null load function', function() {
		expect(testConfig.load).to.not.be.null;
		expect(typeof testConfig.load).to.equal('function');
	})
	
	it('should have a not null loadOld function', function() {
		expect(testConfig.loadOld).to.not.be.null;
		expect(typeof testConfig.loadOld).to.equal('function');
	})
	
	it('should have a not null store function', function() {
		expect(testConfig.store).to.not.be.null;
		expect(typeof testConfig.store).to.equal('function');
	})
	
	it('should have a not null storeOld function', function() {
		expect(testConfig.storeOld).to.not.be.null;
		expect(typeof testConfig.storeOld).to.equal('function');
	})
	
	it('should have a not null get function', function() {
		expect(testConfig.get).to.not.be.null;
		expect(typeof testConfig.get).to.equal('function');
	})
	
	it('should have a not null set function', function() {
		expect(testConfig.set).to.not.be.null;
		expect(typeof testConfig.set).to.equal('function');
	})
	
	it('should have a not null init function', function() {
		expect(testConfig.init).to.not.be.null;
		expect(typeof testConfig.init).to.equal('function');
	})
	
	it('should have a not null clean function', function() {
		expect(testConfig.clean).to.not.be.null;
		expect(typeof testConfig.clean).to.equal('function');
	})
	
})

describe('Config \'test\' directory', function() {
	
	var step;
	
	it('should be empty', function(done) {

		step = readdir(__dirname + '/../store/test');
		expect(step).to.be.rejected.notify(done);

	});
	
	describe('init', function() {
		
		var init;
		
		it('should end', function(done) {
			
			init = step.then(undefined, function() {
				return testConfig.init();
			})
			
			expect(init).to.be.fulfilled.notify(done);

		});
		
		it('should have created the empty test directory', function(done) {
			
			init = init.then(function() {
				return readdir(__dirname + '/../store/test');
			})
			.then(function(files) {
				check(done, function() {
					expect(Array.isArray(files)).to.be.true;
					expect(files.length).to.equal(0);
				})
			})

		});
		
		/*
		
		
		it('should end', function(done) {
			
			expect(init).to.be.fulfilled
			
			
		});
		*/
		
	})

	
	
	
	

});


describe('Init...', function() {
	
	/*
	var init = testConfig.init();
	
	it('should end', function(done) {
		init.then(function() {
			done();
		})
		
	});*/
	
});

/*
describe('Config \'test\' directory', function() {

	it('has created the \'test\' config directory', function(done) {

		fs.readdir(__dirname + '/../store/test', function(err, files) {
			expect(err).to.not.be.null;
			done();
		})

	});*/