//@ts-check
const { Router } = require('express');
const { unpickPlayer, pickPlayer } = require('../utils/players');

module.exports = (wss) => {
	const picksRouter = Router();

	picksRouter.get('/:gameId/pick-player', (req, res) => {
		(async () => {
			try {
				const error = await pickPlayer(req.query.id, wss);

				if (error) {
					console.log(error);
					res.json({ error });
				} else {
					res.json({});
				}
			} catch (error) {
				console.log(error);
				res.json({ error });
			}
		})();
	}); //change isPicked parameter of player to true
	picksRouter.get('/:gameId/unpick-player', (req, res) => {
		(async () => {
			try {
				let error = await unpickPlayer(req.query.id, wss);
				if (error !== null) {
					console.log(error);
					res.send({ error });
				} else {
					res.send({ error: '' });
				}
			} catch (error) {
				console.log(error);
				res.json({ error });
			}
		})();
	}); //change isPicked parameter of player to false

	return picksRouter;
};
