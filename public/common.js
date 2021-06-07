const concatURL = (...urls) => {
	if (urls.length === 0) {
		return '';
	}
	let result =
		urls[0].match(/(https?|wss?)/) !== null
			? ''
			: document.location.protocol + '//';

	for (const url of urls) {
		if (url.startsWith('/') && result.endsWith('/')) {
			result += url.slice(1);
		} else if (
			!url.startsWith('/') &&
			!result.endsWith('/') &&
			result !== ''
		) {
			result += '/' + url;
		} else {
			result += url;
		}
	}

	return result;
};

const createNotification = (msg, style = 'error') => {
	const container = document.createElement('div');
	container.classList.add('notification');
	if (
		style === 'error' ||
		style === 'warn' ||
		style === 'info' ||
		style === 'success'
	) {
		container.classList.add(style);
	}
	const message = document.createElement('p');
	message.className = 'notification-message';
	message.innerText = msg;

	const remove = document.createElement('span');
	remove.className = 'notification-remove';
	remove.innerHTML = '&#215;';

	container.append(message, remove);

	remove.addEventListener('click', () => container.remove());
	setTimeout(() => container.remove(), 7000);

	return container;
};
const appendNotification = (msg, style = 'error') => {
	document.body.appendChild(createNotification(msg, style));
};
function createButton(
	text = '',
	clickHandler = () => {},
	{ classes = [], id = '', type = 'button' } = {}
) {
	const button = document.createElement('button');

	if (id !== '') {
		button.id = id;
	}
	button.classList.add(...classes);
	button.type = type;
	button.innerText = text;
	button.addEventListener('click', clickHandler);

	return button;
}

const getHours = (time) => {
	const allSeconds = time / 1000;
	const seconds = getSeconds(time);
	const minutes = getMinutes(time);
	return ~~(allSeconds - seconds - minutes * 60) / 60 / 60;
};
const getMinutes = (time) => {
	const allSeconds = time / 1000;
	const seconds = getSeconds(time);
	const minutes = (allSeconds - seconds) / 60;
	return ~~minutes % 60;
};
const getSeconds = (time) => {
	const seconds = time / 1000;
	return ~~(seconds % 60); //~~ - to integer;
};
const getTimeStr = (time) =>
	`${getHours(time)}:${getMinutes(time)}:${getSeconds(time)}`;

const getTimeLeft = (maxTime, createdAt) => maxTime - (Date.now() - createdAt);
