//@ts-check
const { Router } = require('express');
const { Game } = require('../Models');
const { findNotPickedPlayersInGame } = require('../utils/players');
const mongoose = require('mongoose');
const { ERRORS } = require('../utils/constants');

module.exports = () => {
	const pagesRouter = Router();

	pagesRouter.get('/', (_, res) => {
		res.render('starterPage');
	}); //return starterPage
	pagesRouter.get('/:gameId', (req, res, next) => {
		(async () => {
			try {
				if (req.params.gameId !== 'favicon.ico') {
					const game = await Game.findById(
						req.params.gameId
					).populate('players');

					if (game) {
						const notPickedPlayers =
							findNotPickedPlayersInGame(game);

						if (game.isStartSettingsDone) {
							res.render('pickPlayersPage', {
								allPicked: notPickedPlayers.length === 0,
								players: notPickedPlayers,
								bankerId: game.startSettings.bankerId,
							});
						} else {
							res.send('Confirm your starter settings');
						}

						return;
					} else {
						console.log({ error: ERRORS.GAME_NOT_FOUND });
					}
				} else {
					console.log({ error: ERRORS.BAD_PARAMS });
				}

				next();
			} catch (error) {
				console.log(error);
				next();
			}
		})();
	}); //return player pick page
	pagesRouter.get('/:gameId/starter-settings', (req, res, next) => {
		(async () => {
			try {
				const game = await Game.findById(req.params.gameId).populate(
					'players'
				);

				if (game) {
					const { players } = game;

					if (players) {
						res.render('starterSettings', {
							players: players.filter(Boolean),
							isStartSettingsDone: game.isStartSettingsDone,
							maxPlayers: players.length >= 6,
							startSettings: game.startSettings,
							gameId: game._id,
						});
						return;
					} else {
						console.log({ error: ERRORS.PLAYERS_NOT_FOUND });
					}
				} else {
					console.log({ error: ERRORS.GAME_NOT_FOUND });
				}

				next();
			} catch (error) {
				console.log({ error });
				next();
			}
		})();
	}); //return game room starter settings
	pagesRouter.get('/:gameId/:playerId', (req, res, next) => {
		(async () => {
			try {
				const { playerId, gameId } = req.params;

				if (mongoose.Types.ObjectId.isValid(playerId)) {
					const game = await Game.findById(gameId).populate(
						'players'
					);

					if (game) {
						const { players } = game;

						const player = players.find(
							(player) => player._id.toString() === playerId
						);

						if (player) {
							let bankerId = game.startSettings.bankerId;
							res.render('playerPage', {
								user: player,
								players,
								isBanker:
									player._id.toString() ===
									bankerId.toString(),
								gameId: player.gameId,
								isGoing: player.isGoing,
								startSettings: game.startSettings,
								createdAt: game.createdAt,
								turnsBeforeCircle: player.turnsBeforeNewCircle,
							});

							return;
						} else {
							console.log({ errors: ERRORS.PLAYER_NOT_FOUND });
						}
					} else {
						console.log({ error: ERRORS.GAME_NOT_FOUND });
					}
				} else {
					console.log({ error: ERRORS.BAD_PLAYER_ID });
				}

				next();
			} catch (error) {
				console.log({ error });
				next();
				return;
			}
		})();
	}); //return player page

	return pagesRouter;
};
