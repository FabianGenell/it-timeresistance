document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('click', (evt) => {
        const link = evt.target.tagName === 'A' ? evt.target : evt.target.closest('a');
        if (link && link.tagName === 'A' && window.location.hostname !== new URL(link.href).hostname) {
            link.target = '_blank';
        }
    });

    // Ensure anchor scrolling is smooth (this shouldn't be added in the CSS)
    document.addEventListener('click', (evt) => {
        if (
            evt.target.tagName === 'A' &&
            window.location.hostname === new URL(evt.target.href).hostname &&
            evt.target.href.includes('#')
        ) {
            document.getElementsByTagName('html')[0].style.scrollBehavior = 'smooth';
            setTimeout(() => {
                document.getElementsByTagName('html')[0].style.scrollBehavior = '';
            }, 1000);
        }
    });
});
