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

let onPlayerPick = (playerId) => {
	if (playerId) {
		axios
			.get(
				concatURL(
					document.location.origin,
					document.location.pathname,
					'players',
					`?id=${playerId}`
				)
			)
			.then((res) => {
				if (!res.data.error) {
					if (res.data.isPicked) {
						e.preventDefault();
						appendNotification('This player is already picked');
					} else {
						document.location.assign(
							concatURL(
								document.location.origin,
								document.location.pathname,
								playerId
							)
						);
					}
				} else {
					appendNotification(res.data.error);
				}
			});
	}
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

//* give event listeners
urlSpan?.addEventListener('click', (e) => {
	e.target.classList.add('blink');
	setTimeout(() => e.target.classList.remove('blink'), 1000);
	copy(document.location.href);
});
for (const player of players) {
	player.addEventListener('click', () => onPlayerPick(player.id));
}
