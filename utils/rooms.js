const { Game, Player } = require('../Models');

//@ts-check
module.exports.closeRoom = async (gameId) => {
	try {
		await Game.findByIdAndDelete(gameId);
		await Player.remove({ gameId });
	} catch (err) {
		console.error(err);
	}
};
