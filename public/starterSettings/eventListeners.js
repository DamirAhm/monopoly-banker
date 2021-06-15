//set add-player button
let addPlayerBtn = document.querySelector('.add-player');
addPlayerBtn.addEventListener('click', () => {
	playerAction(addPlayerBtn);
});
//add actions to player buttons
for (const player of players) {
	player.addEventListener('click', () => {
		playerAction(player);
	});

	if (player.parentNode.classList.contains('player-cont')) {
		player.nextSibling?.addEventListener('click', (e) => {
			e.stopPropagation();

			const parent = e.target.parentNode;
			if (parent) {
				let playerId = parent.id;

				deletePlayer(playerId);
			}
		});
		player.previousSibling?.addEventListener('change', (e) => {
			changeBanker(e.target);
		});
	}
}
//add action to change sequence btn
changeSequenceBtn?.addEventListener('click', initSequenceChange);
bgCont?.addEventListener('click', stopSequenceChanging);
document
	.querySelector('#closeChangeSequence')
	?.addEventListener('click', stopSequenceChanging);
document
	.querySelector('.change-sequence-cont')
	?.addEventListener('click', (e) => e.stopPropagation());
//set reset button
document.querySelector('#reset')?.addEventListener('click', resetSettings);
//set create button
document.querySelector('#next')?.addEventListener('click', createRoom);

const settingsInputs = Array.from(document.querySelectorAll('.settings input'));
for (const input of settingsInputs) {
	input.addEventListener('change', (e) => {
		if (input.type === 'checkbox') {
			saveSettingsToStorage({
				[input.dataset.name]: e.target.checked,
			});
		} else {
			saveSettingsToStorage({
				[input.dataset.name]: e.target.value,
			});
		}
	});
}

//give actions to options
for (const toggler of Array.from(blockTogglers)) {
	if (toggler.checked) {
		const elementToToggle = document.querySelector(toggler.dataset.to);
		setSettingInteractivity(elementToToggle, false);
	}
	toggler.addEventListener('change', (e) => {
		const elementToToggle = document.querySelector(e.target.dataset.to);
		setSettingInteractivity(elementToToggle, !e.target.checked);
	});
}
