const pickPlayer = document.getElementById('pick-player-to-pay');
const tabs = Array.from(document.getElementsByClassName('tab'));
const playersToPick = Array.from(pickPlayer?.querySelectorAll('.player') || []);
const playersMoves = Array.from(document.getElementsByClassName('playerMove'));
const playersInfos = Array.from(document.getElementsByClassName('playerInfo'));

const moneyForm = document.getElementById('moneyForm');
const reduceBtn = document.getElementById('minus');
const changePlayerBtn = document.getElementById('changePlayer');
const closeRoomBtn = document.getElementById('closeRoom');
const gotCircleBtn = document.getElementById('gotCircle');
const giveTurnBtn = document.getElementById('nextPlayer');
const playerPickerContainer = document.getElementById('pick-player-to-pay');
const menuElement = document.getElementById('menu');
const toggleMenuBtn = document.getElementById('toggleMenuBtn');
const giveUpBtn = document.getElementById('giveUp');

changePlayerBtn?.addEventListener('click', signOut);
closeRoomBtn?.addEventListener('click', closeRoom);
gotCircleBtn?.addEventListener('click', gotCircleHandler);
giveTurnBtn?.addEventListener('click', giveTurn);
playerPickerContainer?.addEventListener('click', propagationStopper);
menuElement?.addEventListener('click', propagationStopper);
toggleMenuBtn?.addEventListener('click', propagationStopper);
giveUpBtn?.addEventListener('click', giveUp);
reduceBtn?.addEventListener('click', openReceiverPickerModal);
bgCont?.addEventListener('click', closeModal);
moneyForm?.addEventListener('submit', (e) => {
	e.preventDefault();
	openReceiverPickerModal();
});

//give actions to tabs
if (tabs) {
	for (const tab of tabs) {
		tab.addEventListener('click', (e) => {
			//How tf dom events work????
			if (e.target?.parentNode.dataset.to) {
				tabAction(e.target?.parentNode.dataset.to);
			}
		});
	}
}
if (playersToPick) {
	for (const playerToPick of playersToPick) {
		playerToPick.addEventListener('click', onReceiverPick);
	}
}
if (isBanker) {
	if (playersMoves)
		for (const playerMove of playersMoves) {
			if (playerMove.dataset.move) {
				activateMove(playerMove);
			}
		}
	if (playersInfos)
		for (const playerInfo of playersInfos) {
			playerInfo.addEventListener('click', changePlayerMoney);
		}
}

const pageHash = document.location.hash.slice(1);
if (pageHash.length > 0) {
	tabAction(pageHash);
}
