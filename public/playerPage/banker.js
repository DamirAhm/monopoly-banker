function onPlayerDelete(data) {
	const playerId = data.id;

	if (playerId) {
		removePlayerInfo(playerId);
		removePlayerMoves(playerId);
	}
}
function removePlayerInfo(playerId) {
	const playersInfos = Array.from(
		document.getElementsByClassName('playerInfo')
	);

	const playerInfoToRemove = playersInfos.find(
		({ dataset: { id } }) => id === playerId
	);
	playerInfoToRemove?.remove();
}
function removePlayerMoves(playerId) {
	const playersMoves = Array.from(
		document.getElementsByClassName('playerMove')
	);
	const playerMovesToRemove = playersMoves.find(
		({ dataset: { id } }) => id === playerId
	);
	playerMovesToRemove.remove();
}

//* Only for banker
//? Menu options
function signOut() {
	document.location.assign(`/${gameId}`);
	axios.get(
		concatURL(
			document.location.origin,
			gameId,
			'unpick-player',
			`?id=${playerId}`
		)
	);
}
function closeRoom() {
	timerSpan && timerSpan.remove();
	sendToSocket({
		type: 'closeRoom',
		gameId,
	});
}
function giveUp() {
	if (isGoing) giveTurn();

	axios
		.put(
			concatURL(
				document.location.origin,
				gameId,
				'players/lost',
				`?playerId=${playerId}`
			)
		)
		.then((res) => {
			if (!res.data.error) {
				showAfterLostPopup();
			} else {
				appendNotification(res.data.error);
			}
		});
}

function tabAction(workAreaName) {
	const tab = document.querySelector(`.tab[data-to=${workAreaName}]`);

	if (tab) {
		const activeTab = document.querySelector('.active');
		activeTab?.classList.remove('active');
		tab.classList.add('active');

		changeWorkArea(workAreaName);
	} else {
		throw new Error(`Can't find tab with name ${workAreaName}`);
	}
}
function changeWorkArea(newAreaName) {
	const workAreas = Array.from(document.querySelectorAll('.workArea'));
	workAreas.forEach((el) => (el.style.display = 'none'));

	const workAreaToOpen = document.getElementById(newAreaName);
	if (workAreaToOpen !== null) workAreaToOpen.style.display = 'flex';
}

//* Players' money page
function changePlayerMoney(e) {
	const playerInfoElement = e.target;

	const moneyUpdateForm = createMoneyUpdateForm(playerInfoElement);

	playerInfoElement.replaceWith(moneyUpdateForm);
}
function createMoneyUpdateForm(playerInfoElement) {
	const moneyUpdateForm = document.createElement('form');
	moneyUpdateForm.classList.add('changeMoneyForm');

	const newPlayerInfoElement = playerInfoElement.cloneNode(true);

	const moneySpan = playerInfoElement.querySelector('.playerInfo_money');
	const moneySpanWidth = moneySpan.offsetWidth;
	const newMoneyInput = createMoneyInput(moneySpan.innerText, moneySpanWidth);

	newPlayerInfoElement.replaceChild(
		newMoneyInput,
		newPlayerInfoElement.querySelector('.playerInfo_money')
	);

	const confirmButtons = createConfirmButtons(
		function confirm() {
			confirmMoneyUpdate(
				newPlayerInfoElement.parentNode,
				playerInfoElement
			);
		},
		function reject() {
			rejectMoneyUpdate(
				newPlayerInfoElement.parentNode,
				playerInfoElement
			);
		}
	);

	moneyUpdateForm?.append(newPlayerInfoElement, confirmButtons);

	moneyUpdateForm.onsubmit = (e) => {
		e.preventDefault();

		const receiverId = moneySpan.id.split('money')[0];

		confirmMoneyUpdate(newPlayerInfoElement, moneySpan, receiverId);
	};

	return moneyUpdateForm;
}
function createMoneyInput(defaultValue, width) {
	let moneyInput = document.createElement('input');

	moneyInput.type = 'number';
	moneyInput.autofocus = true;
	moneyInput.style.display = 'inline';
	moneyInput.style.width = width + 20 + 'px';
	moneyInput.defaultValue = defaultValue;
	moneyInput.classList.add('newMoney');

	return moneyInput;
}
function createConfirmButtons(confirm, reject) {
	let btnCont = document.createElement('div');
	btnCont.classList.add('btnCont');

	let confirmBtn = createButton('Update', confirm, { classes: ['confirm'] });
	let backBtn = createButton('Back', reject, { classes: ['back'] });

	btnCont?.appendChild(confirmBtn);
	btnCont?.appendChild(backBtn);

	return btnCont;
}

function confirmMoneyUpdate(playerInfoContainer, oldPlayerInfoElement) {
	const newMoney = playerInfoContainer.querySelector('.newMoney').value;

	const oldMoneySpan =
		oldPlayerInfoElement.querySelector('.playerInfo_money');

	const oldMoneyAmount = oldMoneySpan.innerText;
	const receiverId = getPlayerIdFromMoneySpan(oldMoneySpan);

	let delta = Number(newMoney) - Number(oldMoneyAmount);
	sendMoneyUpdate({ delta, receiverId, playerId });

	rejectMoneyUpdate(playerInfoContainer, oldPlayerInfoElement);
}
function getPlayerIdFromMoneySpan(moneySpan) {
	return moneySpan.id.split('money')[0];
}
async function sendMoneyUpdate({ delta, receiverId, playerId }) {
	const action = {
		total: delta,
		for: receiverId,
		from: playerId,
		undo: false,
		bankerMove: true,
	};
	sendToSocket({
		type: 'giveMoney',
		...action,
	});

	return axios.put(`${originUrl}/moneyActions`, {
		type: 'receive',
		...action,
	});
}
function rejectMoneyUpdate(playerInfoContainer, oldPlayerInfoElement) {
	playerInfoContainer.replaceWith(oldPlayerInfoElement);
}

//* Players' moves page
async function changeMovesCount(moveCont) {
	if (moveCont && moveCont.nextSibling) {
		let id = moveCont.parentElement.parentElement.dataset.id;
		let countElement = moveCont.nextSibling.querySelector('.count');

		const res = await axios.get(`${originUrl}/movesLeft?playerId=${id}`);

		if (!res.data.error) {
			let movesLeft = Math.max(0, res.data - 1);

			countElement.innerText =
				movesLeft !== 0
					? movesLeft +
					  (movesLeft === 1 ? ' move more' : ' moves more')
					: 'No more moves';
		} else {
			appendNotification(res.data.error);
		}
	}
}
async function undoMove(move, playerMove) {
	const res = await axios.put(
		`${originUrl}/moneyActions?playerId=${playerId}`,
		{
			...move,
			undo: true,
		}
	);

	updateMove(playerMove, res.data);
	changeMovesCount(playerMove.querySelector('.moveCont'));

	sendToSocket({ ...move, undo: true });
}
function updateMove(playerMoveCont, move) {
	if (!move.error && !move.undo) {
		const deleteSpan = playerMoveCont.querySelector('.delete');

		let { moveTotal, moveTarget, moveType, deleteSpanDisplay } =
			getMoveFeatures(move);

		deleteSpan.style.display = deleteSpanDisplay;
		if (['gotCircle', 'giveMoney'].includes(move.type)) {
			deleteSpan.onclick = () => {
				undoMove(move, playerMoveCont);
			};
		}

		playerMoveCont.querySelector('.type').innerText = moveType;
		playerMoveCont.querySelector('.total').innerText = moveTotal;
		playerMoveCont.querySelector('.target').innerText = moveTarget;
	} else if (move.error) {
		appendNotification(move.error);
	}
}
function getMoveFeatures(move) {
	let moveType, moveTotal, moveTarget, deleteSpanDisplay;

	switch (move.type) {
		case 'giveMoney': {
			deleteSpanDisplay = 'block';
			let playerName = findPlayerNameById(move.for);
			moveType = 'Gave ';
			moveTotal = move.total + ' k for ';
			moveTarget = playerName;
			break;
		}
		case 'gotCircle': {
			deleteSpanDisplay = 'block';
			moveType = 'Went a circle + ';
			moveTotal = startSettings.moneyForCircle;
			moveTarget = '';
			break;
		}
		default: {
			deleteSpanDisplay = 'none';
			moveType = "Player haven't do anything";
			moveTotal = '';
			moveTarget = '';
		}
	}

	return { moveTotal, moveTarget, moveType, deleteSpanDisplay };
}
function findPlayerNameById(id) {
	if (id === 'bank') return 'Bank';

	return players?.find(({ _id }) => _id === id)?.name ?? 'Can`t find name';
}
function activateMove(playerMove) {
	const deleteSpan = playerMove.querySelector('.delete');

	if (deleteSpan) {
		const move = JSON.parse(playerMove.dataset.move);

		deleteSpan.onclick = () => undoMove(move, playerMove);
	}
}
