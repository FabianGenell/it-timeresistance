document.addEventListener('click', (event) => {
    const button = event.target.closest('.jdgm-write-rev-link');
    const reviewForm = document.querySelector('.jdgm-form-wrapper');

    if (button) {
        event.preventDefault();

        if (!reviewForm) {
            return;
        }

        if (reviewForm.style.display === 'none') {
            reviewForm.style.display = 'block';
        } else {
            reviewForm.style.display = 'none';
        }
    }
});
