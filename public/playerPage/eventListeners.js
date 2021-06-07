const pickPlayer = document.getElementById('pick-player-to-pay');
const tabs = Array.from(document.getElementsByClassName('tab'));
const playersToPick = Array.from(pickPlayer?.querySelectorAll('.player') || []);
const playersMoves = Array.from(document.getElementsByClassName('playerMove'));
const playersInfos = Array.from(document.getElementsByClassName('playerInfo'));

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

//give actions to options
if (tabs) {
	for (const option of tabs) {
		option.addEventListener('click', (e) => {
			tabAction(e);
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
