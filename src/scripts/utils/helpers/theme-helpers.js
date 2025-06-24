document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('click', (evt) => {
        const link = evt.target.tagName === 'A' ? evt.target : evt.target.closest('a');
        setExternalLink(link);
    });

    document.querySelectorAll('a').forEach((link) => {
        setExternalLink(link);
    });

    function setExternalLink(link) {
        if (
            link &&
            link.tagName === 'A' &&
            link.href &&
            window.location.hostname !== new URL(link.href).hostname
        ) {
            link.target = '_blank';
        }
    }

    // Ensure anchor scrolling is smooth (this shouldn't be added in the CSS)
    document.addEventListener('click', (evt) => {
        if (
            evt.target.tagName === 'A' &&
            evt.target.href &&
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
