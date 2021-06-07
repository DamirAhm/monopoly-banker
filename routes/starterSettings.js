//@ts-check
const { Game, Player } = require('../Models');
const { ERRORS } = require('../utils/constants');
const { toAll } = require('../utils/sockets');
const mongoose = require('mongoose');
const { Router } = require('express');

module.exports = () => {
	const starterSettingsRouter = new Router();

	starterSettingsRouter.post(
		'/:gameId/players/change-sequence',
		(req, res) => {
			(async () => {
				try {
					const game = await Game.findById(req.params.gameId);

					if (game) {
						if (game.players.length === req.body.length) {
							const newPlayerList = req.body.map(({ id }) => id);
							game.players = newPlayerList;
							await game.save();
							res.json({});
						} else {
							res.send({ error: ERRORS.BAD_BODY });
							console.error(ERRORS.BAD_BODY);
						}
					} else {
						res.json({ error: ERRORS.GAME_NOT_FOUND });
					}
				} catch (error) {
					console.log(error);
					res.json({ error });
				}
			})();
		}
	);
	starterSettingsRouter.put('/:gameId/players', (req, res) => {
		(async () => {
			try {
				const { playerId, newName } = req.body;
				await Player.findByIdAndUpdate(playerId, {
					name: newName,
				});
				res.end();
			} catch (error) {
				console.log(error);
				res.json({ error });
			}
		})();
	});
	starterSettingsRouter.post('/:gameId/players', (req, res) => {
		(async () => {
			try {
				const game = await Game.findById(req.params.gameId);

				if (game) {
					const { name } = req.body;

					let newPlayer = new Player({
						_id: new mongoose.Types.ObjectId(),
						name,
						gameId: game._id,
					});

					game.players.push(newPlayer._id);
					await newPlayer.save();
					await game.save();
					res.json(newPlayer._id);
				} else {
					res.json({ error: ERRORS.GAME_NOT_FOUND });
				}
			} catch (error) {
				console.log(error);
				res.json({ error });
			}
		})();
	});
	starterSettingsRouter.delete('/:gameId/players', (req, res) => {
		(async () => {
			try {
				const game = await Game.findById(req.params.gameId);

				if (game) {
					const { playerId } = req.body;
					game.players = game.players.filter(
						(player) => player._id.toString() !== playerId
					);
					game.save();

					await Player.findByIdAndDelete(playerId);

					if (game.isStartSettingsDone) {
						toAll(wss, (el) =>
							el.send(
								JSON.stringify({
									type: 'deletePlayer',
									id: playerId,
								})
							)
						);
					}
					res.end();
				} else {
					res.json({ error: ERRORS.GAME_NOT_FOUND });
				}
			} catch (error) {
				console.log(error);
				res.json({ error });
			}
		})();
	});

	return starterSettingsRouter;
};
