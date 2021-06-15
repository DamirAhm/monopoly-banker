urlSpan?.addEventListener('click', (e) => {
	e.target.classList.add('blink');
	setTimeout(() => e.target.classList.remove('blink'), 1000);
	copy(document.location.href);
});
