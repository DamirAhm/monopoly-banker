const { Player } = require('../Models');
const { toAll } = require('./sockets');

//@ts-check
module.exports.pickPlayer = async (id, wss) => {
	return Player.findById(id, (err, player) => {
		if (err) {
			console.log('Error while finding player in pick-player');
		}
		if (player) {
			if (player.isPicked) {
				return 'Player is already picked';
			} else {
				player.isPicked = true;
				return player.save((err) => {
					if (err) {
						console.log('Error while saving player in pick-player');
						return err;
					}
					toAll(wss, (el) =>
						el.send(
							JSON.stringify({
								type: 'pick-player',
								id,
							})
						)
					);
					return null;
				});
			}
		} else {
			return "Can't find player";
		}
	});
};
module.exports.unpickPlayer = async (id, wss) => {
	return Player.findById(id, (err, player) => {
		if (err) {
			console.log('Error while finding player in unpick player');
		}
		if (player) {
			if (!player.isPicked) {
				return 'Player isn`t picked';
			} else {
				player.isPicked = false;
				return player.save((err) => {
					if (err) {
						console.log(
							'Error while saving player in unpick player'
						);
						return err;
					}
					toAll(wss, (el) =>
						el.send(
							JSON.stringify({
								type: 'unpick-player',
								player,
							})
						)
					);
					return null;
				});
			}
		}
	});
};

module.exports.findNextGoing = (players, goingId) => {
	if (players.length === 0) return null;

	const goingPlayerIndex = players.findIndex(
		(player) => player._id.toString() === goingId
	);
	let nextPlayer = players
		.slice(goingPlayerIndex + 1)
		.find((player) => !player.isLost);

	//* If found player is last
	if (nextPlayer === undefined) {
		nextPlayer = players
			.slice(0, goingPlayerIndex)
			.find((player) => !player.isLost);
	}

	return nextPlayer._id || null;
};
module.exports.findWinners = (players) => {
	const didNotLost = players.filter((player) => !player.isLost);
	if (didNotLost.length === 1) {
		return didNotLost;
	}

	const max = Math.max(...players.map(({ money }) => money));

	return players.filter(({ money, isLost }) => !isLost && money === max);
};

module.exports.findNotPickedPlayersInGame = ({ players }) =>
	players.filter((player) => !player.isPicked);
