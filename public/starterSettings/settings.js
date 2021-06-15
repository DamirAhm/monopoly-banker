const playersContainersDOMQuery = '.player-cont:not(.head)';
const playersDOMQuery = '.player:not(.add-player)';

const savedSettings = getSavedSettingsFromStorage();
let bankerId = getSavedBankerIdFromStorage();

const initialPlayersContainers = document.querySelectorAll(
	playersContainersDOMQuery
);

if (!bankerId && initialPlayersContainers.length >= 1) {
	const firstPlayer = initialPlayersContainers[0];
	if (firstPlayer?.previousSibling)
		firstPlayer.previousSibling.checked = true;
	setBankerId(initialPlayersContainers[0].id);
} else if (bankerId) {
	const playersContainers = Array.from(initialPlayersContainers);
	const banker = playersContainers.find((el) => el.id === bankerId);

	if (banker) {
		banker.children[0].checked = true;
	}
}

//? Init saved settings
for (const key in savedSettings) {
	const input = document.querySelector(`input[data-name=${key}]`);

	if (input) {
		if (input.type === 'checkbox') {
			input.checked = savedSettings[key];
		} else {
			input.value = savedSettings[key];
		}
	} else {
		console.warn(`Input with name ${key} from saved settings not found`);
	}
}

//* Global elements
const players = Array.from(document.querySelectorAll('.player'));
const playersContainer = document.querySelector('.players-cont');
const changeSequenceBtn = document.querySelector('#change-sequence-btn');
const bgCont = document.querySelector('.bg-cont');

const blockTogglers = Array.from(document.querySelectorAll('.toggleBlock'));

function createAddPlayerBtnCont() {
	const addPlayerBtnCont = document.createElement('div');
	addPlayerBtnCont.classList.add('add-player-cont');

	const addPlayerBtn = createAddPlayerBtn();

	addPlayerBtnCont.appendChild(addPlayerBtn);

	return addPlayerBtnCont;
}
function createAddPlayerBtn() {
	const addPlayerBtn = document.createElement('button');
	addPlayerBtn.classList.add('player', 'add-player');
	addPlayerBtn.innerText = 'Add player';
	addPlayerBtn.addEventListener('click', () => {
		playerAction(addPlayerBtn);
	});

	return addPlayerBtn;
}
//Enables or disables togglable setting
function setSettingInteractivity(settingElement, isBlocked) {
	settingElement.classList.toggle('blocked');
	const inputs = settingElement.querySelectorAll('input');
	if (isBlocked) {
		for (const input of inputs) {
			input.disabled = true;
		}
	} else {
		for (const input of inputs) {
			input.disabled = false;
		}
	}
}
//action for add players or change names
function playerAction(player) {
	if (!player.classList.contains('changing')) {
		const initialText = player.innerText;
		const isAddPlayerButton = player.classList.contains('add-player');
		const newPlayer = createNewPlayerElement(isAddPlayerButton);

		player.replaceWith(newPlayer);

		let input = document.createElement('input');
		input.classList.add('changeName');

		if (isAddPlayerButton) {
			input.placeholder = initialText;
		} else {
			input.value = initialText;
		}

		input.addEventListener('keypress', (e) => {
			if (e.key === 'Enter') {
				e.preventDefault();
				confirmPlayerAction(newPlayer, initialText);
			}
		});

		const btnCont = createConfirmButtons(
			function onConfirm(e) {
				e.stopPropagation();
				confirmPlayerAction(newPlayer, initialText);
			},
			function onReject(e) {
				e.stopPropagation();
				const itIsCreation = isAddPlayerButton;
				if (itIsCreation) {
					backFromCreation(newPlayer, initialText);
				} else {
					backFromChangingName(newPlayer, initialText);
				}
			}
		);

		newPlayer.appendChild(input);
		newPlayer.appendChild(btnCont);

		input.focus();
	}
}

//Makes player element from addButton element
function makePlayerContainerFromAddButton(player) {
	player.parentNode.classList.add('player-cont');
	player.parentNode.classList.remove('add-player-cont');

	player.classList.remove('add-player');

	const checkbox = createBankerCheckbox();
	const playersAmount = document.querySelectorAll(
		playersContainersDOMQuery
	).length;

	if (playersAmount === 1) {
		checkbox.checked = true;
		setBankerId(player.parentNode.id);
	}
	checkbox.addEventListener('change', () => {
		changeBanker(checkbox);
	});
	player.before(checkbox);

	const deleteButton = createDeleteButton((e) => {
		e.stopPropagation();

		let parent = e.target.parentNode;
		if (parent) {
			let playerId = parent.id;

			deletePlayer(playerId);
		}
	});
	player.after(deleteButton);
}
function createDeleteButton(handler) {
	const deleteButton = document.createElement('button');
	deleteButton.innerText = 'x';
	deleteButton.classList.add('delete');
	deleteButton.addEventListener('click', handler);

	return deleteButton;
}

async function confirmPlayerAction(player, initialText) {
	const inputValue = player.querySelector('input').value.trim();

	const players = Array.from(document.querySelectorAll(playersDOMQuery));

	if (players.some((player) => player.innerText === inputValue)) {
		appendNotification(
			'You trying to create player with name that already in use'
		);
		return;
	}

	if (inputValue !== '') {
		let res;
		if (player.classList.contains('add-player')) {
			res = await createPlayer(player);
		} else {
			res = await changeName(player.parentNode.id, inputValue);
		}

		if (res.error) {
			appendNotification(res.error);
		} else {
			player.innerHTML = inputValue || initialText;
			player.classList.remove('changing');
			player.addEventListener('click', () => {
				playerAction(player);
			});
		}
	} else {
		appendNotification('You are trying to create player with empty name');
		return;
	}
}
function backFromCreation(player, text) {
	const addPlayerBtnCont = createAddPlayerBtnCont();

	player.classList.remove('changing');
	player.innerHTML = text;
	player.parentNode.replaceWith(addPlayerBtnCont);
}
function backFromChangingName(player, text) {
	player.classList.remove('changing');
	player.innerHTML = text;
	player.addEventListener('click', () => playerAction(player));
}

//? Element creation functions
function createBankerCheckbox() {
	let checkbox = document.createElement('input');
	checkbox.classList.add('isBanker');
	checkbox.type = 'checkbox';
	checkbox.addEventListener('click', () => {
		changeBanker(checkbox);
	});

	return checkbox;
}
function createConfirmButtons(onConfirm, onReject) {
	const withDisable = (fn) => (e) => {
		confirmBtn.disabled = true;
		rejectBtn.disabled = true;
		fn(e);
	};

	let confirmBtn = createButton('Confirm', withDisable(onConfirm), {
		classes: ['positiveBtn'],
		id: 'confirm',
		type: 'submit',
	});
	let rejectBtn = createButton('Back', withDisable(onReject), {
		classes: ['negativeBtn'],
		id: 'reject',
	});

	let btnCont = document.createElement('div');
	btnCont.classList.add('btn-cont');

	btnCont.appendChild(rejectBtn);
	btnCont.appendChild(confirmBtn);

	return btnCont;
}
function createNewPlayerElement(isAddPlayerButton) {
	const newPlayer = document.createElement('div');
	newPlayer.classList.add('player');
	if (isAddPlayerButton) {
		newPlayer.classList.add('add-player');
	}
	newPlayer.classList.add('changing');

	return newPlayer;
}

//? Api wrappers
async function createPlayer(player) {
	const inputValue = player.querySelector('input').value.trim();

	const res = await addPlayer(inputValue);

	if (!res.error) {
		player.parentNode.id = res;

		const playersAmount = document.querySelectorAll(
			playersContainersDOMQuery
		).length;

		if (
			playersAmount < 5 &&
			document.querySelectorAll('.add-player').length !== 0
		) {
			let addPlayerBtnCont = createAddPlayerBtnCont();
			playersContainer.appendChild(addPlayerBtnCont);
		}

		makePlayerContainerFromAddButton(player);
	}
	return res;
}
async function addPlayer(name) {
	const response = await axios.post(
		concatURL(document.location.origin, gameId, 'players'),
		{
			name,
		}
	);

	return response.data;
}
async function changeName(playerId, newName) {
	const res = await axios.put(
		concatURL(document.location.origin, gameId, 'players'),
		{
			playerId,
			newName,
		}
	);

	return res.data;
}
function deletePlayer(playerId) {
	let addPlayerBtnCont = createAddPlayerBtnCont();

	axios
		.delete(concatURL(document.location.origin, gameId, 'players'), {
			data: { playerId },
		})
		.then(() => {
			const parent = document.getElementById(playerId);
			const wasBanker = parent.children[0].checked;
			parent.remove();

			const playersContainers = document.querySelectorAll(
				playersContainersDOMQuery
			);
			if (wasBanker) {
				if (playersContainers.length > 0) {
					const newBankerElement = playersContainers[0];
					newBankerElement.children[0].checked = true;
					setBankerId(newBankerElement.id);
				} else {
					setBankerId(undefined);
				}
			}

			if (
				playersContainers.length <= 6 &&
				document.querySelectorAll('.add-player').length === 0
			) {
				playersContainer.appendChild(addPlayerBtnCont);
			}
		});
}

function initSequenceChange() {
	if (document.querySelectorAll('.player-cont:not(.head)').length > 1) {
		const newSequence = [];

		//create player pickers from players
		const players = document.querySelectorAll('.player-cont:not(.head)');
		let playersElems = [];

		players.forEach(({ id, children }) => {
			let elem = document.createElement('button');
			elem.innerText = children[1].innerText;
			elem.id = id;
			elem.classList.add('player');
			elem.addEventListener('click', () => {
				const parent = elem.parentElement;

				newSequence.push(elem);
				elem.remove();

				if (parent && parent.children.length === 0) {
					confirmSequenceChanges(newSequence);
				}
			});
			playersElems.push(elem);
		});

		const changeSequencePlayersCont = bgCont.querySelector(
			'.change-sequence-players'
		);
		changeSequencePlayersCont?.append(...playersElems);

		bgCont.style.display = 'flex';
	} else {
		appendNotification(
			'You can`t change sequence with less than 2 players',
			'warn'
		);
	}
}
function confirmSequenceChanges(newSequence) {
	const newSequenceData = [];
	const players = document.querySelectorAll('.player-cont:not(.head)');
	for (let i = 0; i < players.length; i++) {
		players[i].children[1].innerText = newSequence[i].innerText;
		players[i].id = newSequence[i].id;
		players[i].children[0].checked = players[i].id === bankerId;
		newSequenceData.push({
			id: newSequence[i].id,
			name: newSequence[i].innerText,
		});
	}

	axios.post('./players/change-sequence', newSequenceData);
	bgCont.style.display = 'none';
}
function stopSequenceChanging() {
	bgCont.style.display = 'none';
	document.querySelector('.change-sequence-players').innerHTML = '';
}

function resetSettings() {
	const settingElements = document.querySelectorAll('.setting');

	for (const settingElement of settingElements) {
		const valueInput = settingElement.querySelector(
			"input.value:not([type='checkbox'])"
		);
		const checkboxInput = settingElement.querySelector(
			"input.value[type='checkbox']"
		);
		if (valueInput && valueInput.dataset.default && valueInput.value) {
			valueInput.value = valueInput.dataset.default;
		}
		if (
			checkboxInput &&
			checkboxInput.dataset.default &&
			checkboxInput.value
		) {
			checkboxInput.checked = checkboxInput.dataset.default === 'true';
		}
	}

	for (const blockToggler of blockTogglers) {
		const togglableBlock = document.querySelector(blockToggler.dataset.to);
		setSettingInteractivity(
			togglableBlock,
			blockToggler.dataset.default === 'true'
		);
	}
}
function createRoom() {
	if (document.querySelectorAll('.player-cont').length >= 2) {
		if (
			bankerId.trim() !== '' ||
			document.querySelectorAll('.player-cont input:checked').length === 1
		) {
			const startSettings = { bankerId };
			const settingElements = Array.from(
				document.querySelectorAll('.setting')
			);

			for (const settingElement of settingElements) {
				const valueInput = settingElement.querySelector(
					"input.value:not([type='checkbox'])"
				);

				if (valueInput && valueInput.dataset.name && valueInput.value) {
					startSettings[valueInput.dataset.name] = valueInput.value;
				}

				const checkboxInput = settingElement.querySelector(
					"input.value[type='checkbox']"
				);
				if (checkboxInput && checkboxInput.dataset.name) {
					startSettings[checkboxInput.dataset.name] =
						checkboxInput.checked;
				}
			}

			axios
				.post(
					concatURL(
						document.location.origin,
						document.location.pathname
					),
					startSettings
				)
				.then(() => {
					document.location.assign(`/${gameId}`);
				});
		} else {
			appendNotification('You should pick one banker', 'warn');
		}
	} else {
		appendNotification('Minimal players count is 2', 'warn');
	}
}

function changeBanker(playerCheckbox) {
	//set isBanker checkbox

	let checkBoxes = document.querySelectorAll('.isBanker');
	for (let i = 0; i < checkBoxes.length; i++) {
		checkBoxes[i].checked = false;
	}
	playerCheckbox.checked = true;
	setBankerId(playerCheckbox.parentElement.id);
}

function getSavedSettingsFromStorage() {
	try {
		const settingsString = localStorage.getItem('settings');

		if (settingsString) {
			const settings = JSON.parse(settingsString);

			return settings;
		}

		return {};
	} catch (e) {
		console.log(e);
	}
}
function saveSettingsToStorage(updates) {
	const settings = getSavedSettingsFromStorage();
	const updatedSettings = Object.assign(settings, updates);

	localStorage.setItem('settings', JSON.stringify(updatedSettings));
}
function getSavedBankerIdFromStorage() {
	return localStorage.getItem('bankerId');
}
function setBankerId(newId) {
	bankerId = newId;
	localStorage.setItem('bankerId', newId);
}
