(() => {
    const storageKey = 'prt-cookie-notice';
    const notice = document.querySelector('[data-cookie-notice]');

    if (!notice) {
        return;
    }

    const setNoticeVisibility = (visible) => {
        notice.hidden = !visible;
    };

    try {
        setNoticeVisibility(window.localStorage.getItem(storageKey) !== 'dismissed');
    } catch {
        setNoticeVisibility(true);
    }

    document.querySelectorAll('[data-cookie-accept]').forEach((button) => {
        button.addEventListener('click', () => {
            try {
                window.localStorage.setItem(storageKey, 'dismissed');
            } catch {
                // The notice can still be dismissed during the current visit.
            }

            setNoticeVisibility(false);
        });
    });

    document.querySelectorAll('[data-cookie-settings]').forEach((button) => {
        button.addEventListener('click', () => {
            setNoticeVisibility(true);
        });
    });
})();
