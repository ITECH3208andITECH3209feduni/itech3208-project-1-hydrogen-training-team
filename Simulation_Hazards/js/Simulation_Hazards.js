const mouseover = document.getElementById('mouseover');
const popup = document.getElementById('popup');

mouseover.addEventListener('mouseenter', () => {
	popup.style.display = 'block';
	mouseover.style.border = '3px solid red';
});

mouseover.addEventListener('mouseleave', () => {
	popup.style.display = 'none';
	mouseover.style.border = 'none';
});