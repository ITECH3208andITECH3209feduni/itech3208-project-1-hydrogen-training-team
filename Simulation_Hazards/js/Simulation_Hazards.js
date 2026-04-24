// Retrieves the image and textbox based on their id's
const mouseover = document.getElementById('dingoImg');
const popup = document.getElementById('dingoTxt');

// What happens when mouseover the image
mouseover.addEventListener('mouseover', (e) => {
	popup.style.display = 'block';   // Show textbox
	mouseover.style.border = '3px solid red';   // Add border to image as visual feedback
	// Position textbox relative to mouse
	popup.style.left = (e.pageX + 10) + 'px';
	popup.style.top = (e.pageY + 10) + 'px';
});

// What happens when move mouse while mouseover image
mouseover.addEventListener('mousemove', (e) => {
	// Position textbox relative to mouse
	popup.style.left = (e.pageX + 10) + 'px';
	popup.style.top = (e.pageY + 10) + 'px';
});

// What happens when mouse moves off image
mouseover.addEventListener('mouseleave', () => {
	popup.style.display = 'none';   // Hide textbox
	mouseover.style.border = 'none';   // Remove border from image as visual feedback
});