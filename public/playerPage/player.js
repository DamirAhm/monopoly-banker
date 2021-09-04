const host = document.location.host.split('/')[0];
const protocol = document.location.protocol;
const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';

let playersInGame = [];

//* Elements
let moneySpan = document.getElementById('money');
let moneyInput = document.getElementById('input');
let timerSpan = document.getElementById('timer');
let bgCont = document.querySelector('.bg-cont');

const originUrl = `${protocol}//${host}/${gameId}`;

//* Socket
let socket;
let isInitialized = false;
function openSocket() {
	socket = new WebSocket(
		`${wsProtocol}//${host}/${document.location.pathname}`
	);

	//works when web socket opens connection
	socket.onopen = () => {
		sendToSocket({
			type: 'sendId',
			id: playerId,
			gameId,
		});
	};

	//works when web socket receive a message / action
	socket.onmessage = (res) => {
		let data = JSON.parse(res.data);
		switch (data.type) {
			case 'giveTurn': {
				onGiveTurn(data);
				break;
			}
			case 'giveMoney': {
				onGiveMoney(data);
				break;
			}
			case 'gotCircle': {
				onCirclePassed(data);
				break;
			}
			case 'closeRoom': {
				onCloseRoom(data);
				break;
			}
			case 'confirmPick': {
				onPickConfirmed();
				break;
			}
			case 'deletePlayer': {
				onPlayerDelete(data);
				break;
			}
		}
	};
	//works when web socket close connection
	socket.onclose = () => {
		const connectionLabel = document.getElementById('isConnected');
		connectionLabel.innerText = 'You are not connected';
		connectionLabel.classList.remove('connected');
		connectionLabel.classList.add('not-connected');

		setTimeout(openSocket, 1000);
	};
}
function sendToSocket(action) {
	return socket.send(JSON.stringify(action));
}

//* Common
let propagationStopper = (e) => e.stopPropagation();
function closeModal({ target: modal }) {
	modal.style.display = 'none';
}
function changeIsGoing(newState) {
	updateIsGoingLabel(newState);
	updateUserControlsInteractivity(newState);

	isGoing = newState;
}
function updateIsGoingLabel(newState) {
	const turnLabel = document.querySelector('.isMyTurn');

	if (turnLabel) {
		turnLabel.classList.toggle('not-going');
		turnLabel.classList.toggle('going');

		turnLabel.innerText = newState ? 'Your turn' : 'Not your turn';
	}
}
function updateUserControlsInteractivity(newState) {
	document.getElementById('minus').disabled = !newState;
	document.getElementById('gotCircle').disabled =
		!newState || turnsBeforeNewCircle > 0;
	document.getElementById('nextPlayer').disabled = !newState;
	document.getElementById('input').disabled = !newState;
}
function showMessage(...msgs) {
	document.querySelector('.userContent')?.remove();

	for (const msg of msgs) {
		let element;
		if (msg instanceof Element) {
			element = msg;
		} else if (typeof msg === 'string') {
			const title = document.createElement('h1');
			title.innerText = msg;
			element = title;
		} else {
			throw new Error('Invalid message type ' + typeof msg);
		}
		document.querySelector('.container')?.appendChild(element);
	}
}

//* Entire game
//? Modals
//opens a choose player monitor
function openReceiverPickerModal() {
	const moneyAmount = Number(moneyInput?.value);
	const playerMoney = Number(moneySpan?.innerText);

	if (moneyAmount > 0) {
		if (playerMoney > moneyAmount) {
			bgCont.style.display = 'flex';
			document.getElementById('pick-player-to-pay').style.display =
				'flex';
		} else {
			appendNotification('Not enough money', 'warn');
		}
	} else {
		appendNotification('Enter not negative money total', 'warn');
	}
}
//? Game End
function showAfterLostPopup() {
	if (!isBanker) {
		const afterLostPrompt = document.getElementById('afterLostPrompt');

		if (afterLostPrompt) {
			afterLostPrompt.style.display = 'flex';
			bgCont.style.display = 'flex';

			const keepWatchingBtn =
				afterLostPrompt.querySelector('#keepWatching');
			const leaveBtn = afterLostPrompt.querySelector('#leave');

			keepWatchingBtn?.addEventListener('click', keepWatching);
			leaveBtn?.addEventListener('click', leave);
		} else {
			appendNotification('Sorry, error occurred');
			console.log('Can`t find afterLostPrompt element');
		}
	} else {
		removePlayerControls();
	}
}
function keepWatching() {
	bgCont.style.display = 'none';
	afterLostPrompt.style.display = 'none';

	document.getElementById('playerControls')?.remove();
	document.getElementById('playersMoney').style.display = 'flex';
}
function leave() {
	axios.get(
		concatURL(
			document.location.origin,
			gameId,
			'players',
			'delete-player',
			`?playerId=${playerId}`
		)
	);
	document.location.assign('/');
}
function removePlayerControls() {
	document.getElementById('yourControlsBtn')?.remove();

	if (!document.getElementById('moveLogBtn').classList.contains('active')) {
		document.getElementById('playersMoney').style.display = 'flex';
		document.getElementById('otherPlayersBtn').classList.add('active');
	}
	document.querySelector('.tabs').style.gridTemplateColumns = 'repeat(2,1fr)';
}
function createWinnerMsg(players) {
	const element = document.createElement('p');
	element.classList.add('winner');
	if (players.length === 1) {
		const [player] = players;
		element.innerHTML = `Player <span class='winner-name'>${player.name}</span> won the game with <span class='winner-money'>${player.money} k</span>`;
	} else if (players.length > 1) {
		element.innerHTML = `Players <span class='winner-name'>${players
			.map((p) => p.name)
			.join(', ')}</span> won the game with <span class='winner-money'>${
			players[0].money
		} k</span>`;
	}
	return element;
}

//* Player page
async function gotCircleHandler() {
	try {
		if (turnsBeforeNewCircle === 0) {
			let action = {
				type: 'gotCircle',
				from: playerId,
				undo: false,
			};

			const res = await axios.put(
				concatURL(
					document.location.origin,
					gameId,
					'moneyActions',
					`?playerId=${playerId}`
				),
				action
			);

			if (res.data.error) {
				appendNotification(res.data.error);
			} else {
				sendToSocket(action);

				moneySpan.innerText = res.data;
				turnsBeforeNewCircle = 1;
			}
		} else {
			appendNotification('Calm down you get circles too fast', 'warn');
		}
	} catch (err) {
		if (err instanceof Error) {
			appendNotification(err.message);
		} else {
			appendNotification('Unknown error occurred');
		}
	}
}
async function giveTurn() {
	try {
		const res = await axios.get(
			concatURL(
				document.location.origin,
				gameId,
				'giveTurn',
				`?playerId=${playerId}`
			)
		);

		if (!res.data.error && res.data.nextGoing) {
			turnsBeforeNewCircle = res.data.turns;

			if (turnsBeforeNewCircle > 0) {
				if (document.getElementById('gotCircle'))
					document.getElementById('gotCircle').disabled = true;
			} else {
				if (document.getElementById('gotCircle'))
					document.getElementById('gotCircle').disabled = false;
			}

			sendToSocket({
				type: 'giveTurn',
				id: res.data.nextGoing,
			});

			changeIsGoing(false);
		} else {
			appendNotification(
				res.data.error || "Can't find next going player"
			);
		}
	} catch (err) {
		if (err instanceof Error) {
			appendNotification(err.message);
		} else {
			appendNotification('Unknown error occurred');
		}
	}
}
async function onReceiverPick(e) {
	try {
		let moneyAmount = moneyInput.value;
		moneyInput.value = '';

		bgCont.style.display = 'none';
		document.getElementById('pick-player-to-pay').style.display = 'none';

		const res = await axios.put(
			`${originUrl}/moneyActions?playerId=${playerId}`,
			{
				type: 'giveMoney',
				total: +moneyAmount,
				for: e.target.id,
				undo: false,
				from: playerId,
			}
		);

		if (!res.data.error) {
			sendToSocket({
				type: 'giveMoney',
				for: e.target.id,
				total: +moneyAmount,
				from: playerId,
				undo: false,
			});

			moneySpan.innerText = res.data;
		} else {
			appendNotification(res.data.error);
		}

		bgCont?.removeEventListener('click', closeModal);
	} catch (err) {
		if (err instanceof Error) {
			appendNotification(err.message);
		} else {
			appendNotification('Unknown error occurred');
		}
	}
}

//* Timer stuff
if (timerSpan && startSettings.isMaxTimeOn && startSettings.maxTime) {
	let timerIntervalIndex;

	const checkTimer = (time) => {
		if (time <= 0) {
			clearInterval(timerIntervalIndex);
		} else {
			changeTime(getTimeStr(time));
		}
	};

	checkTimer(getTimeLeft());

	timerIntervalIndex = setInterval(
		() => checkTimer(getTimeLeft(startSettings.maxTime)),
		1000
	);
}
function changeTime(timeStr) {
	if (timerSpan) timerSpan.innerText = timeStr;
}

function onPickConfirmed() {
	const connectionLabel = document.getElementById('isConnected');

	if (connectionLabel) {
		connectionLabel.innerText = 'You are connected';
		connectionLabel.classList.add('connected');
		connectionLabel.classList.remove('not-connected');
	}

	isInitialized = true;
}
function onCloseRoom(data) {
	console.log(data);

	if (data.gameId && data.gameId === gameId && data.winners) {
		showMessage('Your game has ended', createWinnerMsg(data.winners || []));

		document.getElementById('changePlayer')?.remove();
		document.getElementById('giveUp')?.remove();
		if (isBanker) {
			document.getElementById('closeRoom')?.remove();
		}
	}
}

function onCirclePassed(data) {
	if (isBanker) {
		let receiverMoneySpan = document.getElementById(data.from + 'money');
		if (receiverMoneySpan) {
			const moneyDiff = data.undo
				? -parseInt(startSettings.moneyForCircle)
				: parseInt(startSettings.moneyForCircle);

			updateMoneySpanValue(receiverMoneySpan, moneyDiff);
		}

		const playerMoves = Array.from(
			document.getElementsByClassName('playerMove')
		);
		const playerMoveToUpdate = playerMoves.find(
			({ dataset: { id } }) => id === data.from
		);

		if (playerMoveToUpdate) {
			updateMove(playerMoveToUpdate, data);

			if (!data.undo) {
				changeMovesCount(playerMoveToUpdate.querySelector('.moveCont'));
			}
		}
	}

	if (data.undo && data.from === playerId) {
		const gotCircleButton = document.getElementById('gotCircle');
		if (gotCircleButton) {
			gotCircleButton.disabled = isGoing;
		}

		if (moneySpan) {
			turnsBeforeNewCircle = 0;
			updateMoneySpanValue(moneySpan, startSettings.moneyForCircle);
		}
	}
}

function onGiveMoney(data) {
	if (moneySpan) {
		if (!data.undo) {
			if (data.for === playerId) {
				updateMoneySpanValue(moneySpan, data.total);
			}
		} else {
			const moneyDiff = playerId === data.for ? -data.total : data.total;

			updateMoneySpanValue(moneySpan, moneyDiff);
		}
	}

	if (isBanker) {
		if (!data.bankerMove) {
			let playersMoves = Array.from(
				document.getElementsByClassName('playerMove')
			);

			const playerMoveToUpdate = playersMoves.find(
				({ dataset: { id } }) => id === data.from
			);

			if (playerMoveToUpdate) {
				updateMove(playerMoveToUpdate, data);
				if (!data.undo) {
					changeMovesCount(
						playerMoveToUpdate.querySelector('.moveCont')
					);
				}
			}
		}
	}

	let fromMoneySpan = document.getElementById(data.from + 'money');
	let forMoneySpan = document.getElementById(data.for + 'money');
	if (data.for !== 'bank') {
		const moneyDiff = data.undo ? -data.total : data.total;
		updateMoneySpanValue(forMoneySpan, moneyDiff);
	}
	if (!data.bankerMove) {
		const moneyDiff = data.undo ? data.total : -data.total;
		updateMoneySpanValue(fromMoneySpan, moneyDiff);
	}
}
function updateMoneySpanValue(moneySpan, diff) {
	const oldMoneyAmount = parseInt(moneySpan.innerText);
	const newMoneyAmount = oldMoneyAmount + Number(diff);

	moneySpan.innerText = newMoneyAmount.toString();
}

function onGiveTurn(data) {
	if (data.id === playerId) {
		changeIsGoing(true);
	}

	if (isBanker) {
		let infos = Array.from(document.getElementsByClassName('playerInfo'));
		let playerMoves = Array.from(
			document.getElementsByClassName('playerMove')
		);

		for (let i = 0; i < infos.length; i++) {
			if (infos[i].classList.contains('going')) {
				infos[i].classList.remove('going');
			}
			if (infos[i].dataset.id === data.id) {
				infos[i].classList.add('going');
			}

			const secondMoveRow = playerMoves[i].querySelector('.sndMoveRow');

			if (secondMoveRow) {
				if (secondMoveRow.classList.contains('going')) {
					secondMoveRow.classList.remove('going');
					secondMoveRow.classList.add('not-going');
				}
				if (playerMoves[i].dataset.id === data.id) {
					secondMoveRow.classList.add('going');
					secondMoveRow.classList.remove('not-going');
				}
			}
		}
	}
}

async function initializeUserInterface() {
	try {
		const playerOnPage = await getPlayerOnPage();

		if (playerOnPage) {
			const messageSpan = document.querySelector('.message');
			const userContentElement = document.querySelector('.userContent');

			if (messageSpan && userContentElement) {
				if (playerOnPage.isPicked && !isInitialized) {
					messageSpan.style.visibility = 'visible';
					userContentElement.remove();
				} else {
					messageSpan.remove();
					userContentElement.style.visibility = 'visible';
				}
				return;
			}
		}

		appendNotification(
			'On this page occurred unknown error, you will be automatically returned to pick page after 5 seconds'
		);
		setTimeout(() => {
			document.location.assign(`/${gameId}`);
		}, 5000);
	} catch (err) {
		if (err instanceof Error) {
			appendNotification(err.message);
		} else {
			appendNotification('Unknown error occurred');
		}
	}
}
async function getPlayerOnPage() {
	try {
		const queryParams = new URLSearchParams({ id: playerId }).toString();
		const res = await axios.get(
			concatURL(
				document.location.origin,
				gameId,
				'players',
				`?${queryParams}`
			)
		);

		if (res.error) {
			appendNotification(res.error);
		}

		return res.data;
	} catch (err) {
		if (err instanceof Error) {
			appendNotification(err.message);
		} else {
			appendNotification('Unknown error occurred');
		}
	}
}

//* Init app
initializeUserInterface();
openSocket();
