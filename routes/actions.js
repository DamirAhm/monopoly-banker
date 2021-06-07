//@ts-check

const { Router } = require('express');
const { Game, Player } = require('../Models');
const { ERRORS } = require('../utils/constants');
const { findNextGoing } = require('../utils/players');
const { toAll } = require('../utils/sockets');
const { closeRoom } = require('../utils/rooms');

module.exports = (wss) => {
	const actionsRouter = Router();

	actionsRouter.get('/:gameId/giveTurn', (req, res) => {
		(async () => {
			try {
				const game = await Game.findById(req.params.gameId);

				if (game) {
					const player = await Player.findOne({ isGoing: true });

					if (player) {
						if (player.isGoing) {
							player.isGoing = false;
							player.turnsBeforeNewCircle = Math.max(
								0,
								player.turnsBeforeNewCircle - 1
							);
							player.save();
							const { players } = await game.populate('players');
							const nextGoing = findNextGoing(
								players,
								req.query.playerId
							);

							if (nextGoing) {
								await Player.findByIdAndUpdate(nextGoing, {
									isGoing: true,
								});

								res.send({
									turns: player.turnsBeforeNewCircle,
									nextGoing,
								});
							} else {
								res.send({ error: "Can't find going player" });
							}
						} else {
							res.end();
						}
					} else {
						res.json({ error: ERRORS.PLAYER_NOT_FOUND });
					}
				} else {
					res.json({ error: ERRORS.GAME_NOT_FOUND });
				}
			} catch (error) {
				console.log(error);
				res.json({ error });
			}
		})();
	}); //give turn to next player
	actionsRouter.put('/:gameId/moneyActions', (req, res) => {
		(async () => {
			try {
				const game = await Game.findById(req.params.gameId);

				const player = await Player.findById(req.body.from);

				if (player.isGoing || req.body.undo || req.body.bankerMove) {
					switch (req.body.type) {
						case 'giveMoney': {
							if (req.body.undo) {
								player.moves = player.moves.slice(0, -1);
								player.money += req.body.total;

								if (req.body.for !== 'bank') {
									const receiver = await Player.findById(
										req.body.for
									);
									receiver.money -= +req.body.total;
									await receiver.save();
								}
								await player.save();

								if (player.moves.length === 0) {
									res.json({ type: 'Filler type' });
								} else {
									res.json(
										player.moves[player.moves.length - 1]
									);
								}
							} else {
								if (!req.body.bankerMove) {
									player.moves.push(req.body);
									player.money -= +req.body.total;
								}
								if (req.body.for !== 'bank') {
									const receiver = await Player.findById(
										req.body.for
									);
									receiver.money += +req.body.total;
									await receiver.save();
									await player.save();
									res.send(player.money.toString());
								} else {
									await player.save();
									res.send(player.money.toString());
								}
							}
							break;
						}
						case 'gotCircle': {
							if (req.body.undo) {
								player.moves = player.moves.slice(0, -1);
								player.money -=
									game.startSettings.moneyForCircle;
								player.turnsBeforeNewCircle = 0;
								await player.save();
								res.json(player.moves[player.moves.length - 1]);
							} else {
								if (player.turnsBeforeNewCircle === 0) {
									player.moves.push(req.body);
									player.money +=
										game.startSettings.moneyForCircle;
									player.turnsBeforeNewCircle =
										game.startSettings.minTurnsForCircle;
									await player.save();
									res.send(player.money.toString());
								} else {
									res.json({ error: ERRORS.TOO_MANY_MOVES });
								}
							}
							break;
						}
						case 'receive': {
							const receiver = await Player.findById(
								req.body.for
							);
							receiver.money += +req.body.total;
							await receiver.save();
							break;
						}
						default: {
							const player = await Player.findById(
								req.query.playerId
							);
							res.send(player.money.toString());
						}
					}
				} else {
					res.json({ error: ERRORS.NOT_YOUR_TURN });
				}
			} catch (error) {
				console.log(error);
				res.json({ error });
			}
		})();
	}); //operations with money
	actionsRouter.put('/:gameId/players/lost', (req, res) => {
		(async () => {
			try {
				const { playerId } = req.query;
				const { gameId } = req.params;

				if (playerId) {
					const game = await Game.findById(gameId).populate(
						'players'
					);

					if (game) {
						const { players } = await game;
						const player = players.find(
							(player) => player._id.toString() === playerId
						);

						if (player) {
							player.isLost = true;
							await player.save();

							if (
								players.filter((player) => !player.isLost)
									.length < 2
							) {
								closeRoom(
									gameId,
									{
										gameId: gameId,
										type: 'closeRoom',
									},
									wss
								);
							}
							toAll(wss, (el) =>
								el.send(
									JSON.stringify({
										type: 'deletePlayer',
										id: playerId,
									})
								)
							);
							res.send({});
						} else {
							res.send({ error: ERRORS.PLAYER_NOT_FOUND });
						}
					} else {
						res.send({ error: ERRORS.PLAYERS_NOT_FOUND });
					}
				} else {
					res.send({ error: ERRORS.BAD_QUERY });
				}
			} catch (error) {
				console.log(error);
				res.json({ error });
			}
		})();
	});

	return actionsRouter;
};
