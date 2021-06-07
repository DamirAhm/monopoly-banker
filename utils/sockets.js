//@ts-check
const toAll = (wss, cb) => {
	const sockets = getAllClients(wss);

	for (const socket of sockets) {
		cb(socket);
	}
};
const getAllClients = (wss) => wss.getWss().clients;

module.exports = {
	toAll,
	getAllClients,
};
