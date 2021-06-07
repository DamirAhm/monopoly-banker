//@ts-check
const { Game } = require('../Models');
const { closeRoom } = require('../utils/rooms');

module.exports.checkOutdated = async (wss) => {
	try {
		const games = await Game.find({});
		for (const game of games) {
			const isMaxTimeGone =
				game.startSettings.isMaxTimeOn &&
				Date.now() - game.createdAt >= game.startSettings.maxTime;

			if (
				Date.now() - game.createdAt >= 24 * 60 * 60 * 1000 ||
				game.isGameOver ||
				isMaxTimeGone
			) {
				await closeRoom(
					game._id,
					{
						gameId: game._id.toString(),
						type: 'closeRoom',
					},
					wss
				);
			}
		}
	} catch (error) {
		console.log(error);
	}
};
