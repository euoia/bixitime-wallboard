var
	koa = require('koa'),
	hbs = require('koa-hbs'),
	log = require('winston'),
	request = require('cogent'),
	querystring = require('querystring');

// Application configuration.
var appPort = process.env.BIXI_WALLBOARD_PORT || 3014;

// Configure logging.
log.remove(log.transports.Console);
log.add(log.transports.Console, {timestamp: true});

// Configure koa.
var app = koa();

app.use(hbs.middleware({
  viewPath: __dirname + '/views'
}));

// Pass through IP address from apache reverse proxy.
app.proxy = true;

app.use(function *(next) {
	this.query = querystring.parse(this.querystring);
	yield next;
});

app.use(function *(next) {
	log.info(`Received request from ${this.ip} for ${this.path} ${this.querystring}`);
	yield next;
});

// Handle requests.
app.use(function *(){
	// Default to Berri / St-Antoine.
	var stationId = this.query['station_id'] || 4;
	var query = querystring.stringify({
		'station_id': stationId
	});

	var response = yield* request(`http://api.bixitime.com/station?${query}`, true);
	if (response.statusCode !== 200) {
		log.info('Error making request to the API', response.statusCode);
		this.status = 503;
		return;
	}

	var station = response.body[0];

    //We should use percentages based on total number of stations
	var color = '#5cb85c';
	if (station.bikes <= 10) {
    	if (station.bikes <= 5) {
		    color = '#d9534f';
	    }
        color = '#f0ad4e';
    }




	yield this.render('wallboard', {
		title: station.name,
		bikes: station.bikes,
		color: color
	});
});

app.listen(appPort);
log.info(`Server running on port ${appPort}`);
