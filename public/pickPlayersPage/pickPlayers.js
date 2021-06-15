//* elements
const players = Array.from(document.getElementsByClassName('player'));
const urlSpan = document.getElementById('url');

const wsProtocol = document.location.protocol === 'https:' ? 'wss:' : 'ws:';
const ws = new WebSocket(
	concatURL(
		`${wsProtocol}//${document.location.host}`,
		document.location.pathname
	)
);

ws.onopen = () => {
	ws.send(
		JSON.stringify({
			type: 'connect',
		})
	);
};

const copy = async (str) => {
	return navigator.clipboard.writeText(str);
};

ws.onmessage = (msg) => {
	const data = JSON.parse(msg.data);

	switch (data.type) {
		case 'pick-player': {
			const { id } = data;

			removePlayer(id);
			break;
		}
		case 'unpick-player': {
			const { player } = data;

			if (player) {
				addPlayerToList(player);
			}
		}
	}
};

const removePlayer = (id) => {
	if (id) {
		const playerToRemove = players.find((el) => el.id === id);
		playerToRemove?.remove();
	}
};
const addPlayerToList = (playerData) => {
	let player = document.createElement('div');
	player.classList.add('player', 'center');
	player.innerText = playerData.name;
	player.addEventListener('click', onPlayerPick);

	document.getElementById('playersCont').appendChild(player);
};
