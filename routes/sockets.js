//@ts-check
const { unpickPlayer, pickPlayer, findWinners } = require('../utils/players');
const { closeRoom } = require('../utils/rooms');
const { toAll } = require('../utils/sockets');
const { Router } = require('express');
const { Player } = require('../Models');

module.exports = (wss) => {
	const socketRouter = Router();

	let pickersConnections = [];
	let playerConnections = new Map();

	socketRouter.ws('/*/*', (ws) => {
		ws.on('message', (msg) => {
			(async () => {
				try {
					let data = JSON.parse(msg);
					if (data) {
						switch (data.type) {
							case 'sendId': {
								if (
									Object.values(playerConnections).find(
										(con) => con && con.id === data.id
									) === undefined
								) {
									playerConnections[ws] = data;
									await pickPlayer(data.id, wss).then(() => {
										ws.send(
											JSON.stringify({
												type: 'confirmPick',
											})
										);
									});
								}
								break;
							}
							case 'closeRoom': {
								if (
									playerConnections[ws] !== undefined &&
									playerConnections[ws].gameId
								) {
									const { gameId } = playerConnections[ws];
									if (gameId) {
										await closeRoom(gameId, data, wss);

										const players = await Player.find({
											gameId,
										});
										const winners = findWinners(players);

										toAll(wss, (socket) =>
											socket.send(
												JSON.stringify({
													...data,
													winners,
												})
											)
										);
									}
								}
								break;
							}
							default: {
								toAll(wss, (socket) =>
									socket.send(JSON.stringify(data))
								);
								break;
							}
						}
					}
				} catch (error) {
					console.log(error);
				}
			})();
		});
		ws.on('close', () => {
			if (playerConnections[ws] !== undefined) {
				unpickPlayer(playerConnections[ws].id, wss);
				delete playerConnections[ws];
			}
		});
		ws.on('error', (error) => {
			console.error('ERROR', error);
		});
	});
	socketRouter.ws('/:gameId', (ws) => {
		pickersConnections.push(ws);
		ws.on('error', (error) => console.log(error));
	});

	return socketRouter;
};
