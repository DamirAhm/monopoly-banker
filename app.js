//@ts-check
const express = require('express'),
	http = require('http'),
	expressWs = require('express-ws'),
	mongoose = require('mongoose'),
	config = require('./config');
const { checkOutdated } = require('./utils/timer.js');
const {
	pagesRouter,
	creationRouter,
	infoRouter,
	starterSettingsRouter,
	picksRouter,
	actionsRouter,
	socketsRouter,
} = require('./routes');
const { Game } = require('./Models/game_schema');

mongoose.connect(
	config.MONGO_URL,
	{ useFindAndModify: false, useNewUrlParser: true },
	(error) => {
		if (error) {
			console.error(error);
		}
		console.log('Successfully connected to: ' + config.MONGO_URL);
	}
);

let app = express();
app.use(express.json());
app.use('/public', express.static('public'));
app.set('view engine', 'pug');
app.set('views', './views');

let server = http.createServer(app);
let wss = expressWs(app, server);

app.use('/', starterSettingsRouter());
app.use('/', creationRouter());
app.use('/', infoRouter());
app.use('/', picksRouter(wss));
app.use('/', actionsRouter(wss));
app.use('/', socketsRouter(wss));
app.use('/', pagesRouter());

app.get('/*', (_, res) => res.render('404'));

checkOutdated(wss);
setInterval(() => checkOutdated(wss), 60 * 1000);

module.exports = server;
