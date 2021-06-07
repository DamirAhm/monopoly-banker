let btn = document.getElementById('createNewRoomBtn');

btn.addEventListener('click', async () => {
	const res = await axios.post(document.location.href);

	if (res.data.error) {
		throw res.data.error;
	}

	document.location.assign(`/${res.data}/starter-settings`);
});
