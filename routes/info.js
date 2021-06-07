//@ts-check
const { Game, Player } = require('../Models');
const { ERRORS } = require('../utils/constants');
const { Router } = require('express');

module.exports = () => {
	const infoRouter = Router();

	infoRouter.get('/:gameId/players', (req, res) => {
		(async () => {
			try {
				const game = await Game.findById(req.params.gameId).populate(
					'players'
				);

				if (game) {
					if (req.query.id) {
						const player = await Player.findById(req.query.id);

						if (player) {
							res.json(player);
						} else {
							res.json({ error: ERRORS.PLAYER_NOT_FOUND });
						}
					} else {
						const { players } = game;

						if (players) {
							res.json({ players });
						} else {
							console.error(ERRORS.PLAYERS_NOT_FOUND);
							res.send({ error: ERRORS.PLAYERS_NOT_FOUND });
						}
					}
				} else {
					console.log(ERRORS.GAME_NOT_FOUND);
					res.json({ error: ERRORS.GAME_NOT_FOUND });
				}
			} catch (error) {
				res.json({ error });
				console.error(error);
			}
		})();
	}); //return game room players
	infoRouter.get('/:gameId/movesLeft', (req, res) => {
		async () => {
			try {
				if (req.query.playerId) {
					const player = await Player.findById(req.query.playerId);

					res.send(player.moves.length);
				} else {
					res.json({ error: ERRORS.BAD_QUERY });
				}
			} catch (error) {
				console.log(error);
				res.json({ error });
			}
		};
	});

	return infoRouter;
};
