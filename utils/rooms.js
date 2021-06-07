const { Game, Player } = require('../Models');
const { findWinners } = require('./players');
const { toAll } = require('./sockets');

//@ts-check
module.exports.closeRoom = async (gameId, data, wss) => {
	try {
		const game = await Game.findByIdAndDelete(gameId);

		const winners = findWinners(players);

		await Player.remove({ gameId });

		toAll(wss, (el) => el.send(JSON.stringify({ ...data, winners })));

		toAll(wss, (el) => el.send(JSON.stringify(data)));
	} catch (err) {
		console.error(err);
		toAll(wss, (el) =>
			el.send(JSON.stringify({ error: err, type: 'error' }))
		);
	}
};
