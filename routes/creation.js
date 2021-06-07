//@ts-check
const mongoose = require('mongoose');
const { Game, Player } = require('../Models');
const { ERRORS } = require('../utils/constants');
const { Router } = require('express');

module.exports = () => {
	const creationRouter = Router();

	creationRouter.post('/', (_, res) => {
		(async () => {
			try {
				let newGame = new Game({
					_id: new mongoose.Types.ObjectId(),
				});

				await newGame.save();

				res.json(newGame._id);
			} catch (error) {
				console.log(error);
				res.json({ error });
				return;
			}
		})();
	}); //create new room
	creationRouter.post('/:gameId/starter-settings', (req, res) => {
		(async () => {
			try {
				const game = await Game.findById(req.params.gameId);

				if (game) {
					const players = await Player.find({ gameId: game._id });

					if (players) {
						players[0].isGoing = true;
						for (let i = 0; i < players.length; i++) {
							players[i].money = req.body.startMoney;
							players[i].turnsBeforeNewCircle =
								req.body.minTurnsForCircle;

							await players[i].save();
						}

						game.startSettings = {
							...req.body,
							maxTime: req.body.maxTime * 1000 * 60 || 0,
						};
						game.isStartSettingsDone = true;

						await game.save();
						res.end();
						return;
					} else {
						res.json({ error: ERRORS.PLAYERS_NOT_FOUND });
					}
				} else {
					res.json({ error: ERRORS.GAME_NOT_FOUND });
				}
			} catch (error) {
				console.error(error);
				res.send({ error });
			}
		})();
	}); //Posts starter settings for game

	return creationRouter;
};
