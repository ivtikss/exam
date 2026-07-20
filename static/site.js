(() => {
    const storageKey = 'prt-cookie-notice';
    const notice = document.querySelector('[data-cookie-notice]');

    if (notice) {
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
    }

    const routeNavigation = document.querySelector('[data-route-navigation]');

    if (!routeNavigation) {
        return;
    }

    const routeStops = Array.from(routeNavigation.querySelectorAll('[data-route-stop]'));
    const sections = routeStops
        .map((stop) => document.querySelector(stop.getAttribute('href')))
        .filter(Boolean);
    const robot = routeNavigation.querySelector('[data-route-robot]');

    if (!robot || sections.length !== routeStops.length) {
        return;
    }

    let framePending = false;
    let lastScrollPosition = window.scrollY;
    let activeIndex = -1;

    const updateRoute = () => {
        const sectionPositions = sections.map(
            (section) => section.getBoundingClientRect().top + window.scrollY,
        );
        const markerPositions = routeStops.map(
            (stop) => stop.offsetTop + (stop.offsetHeight - robot.offsetHeight) / 2,
        );
        const scrollPosition = window.scrollY;
        let previousIndex = 0;

        for (let index = 0; index < sectionPositions.length - 1; index += 1) {
            if (scrollPosition >= sectionPositions[index + 1]) {
                previousIndex = index + 1;
            } else {
                break;
            }
        }

        const nextIndex = Math.min(previousIndex + 1, sectionPositions.length - 1);
        const sectionDistance = sectionPositions[nextIndex] - sectionPositions[previousIndex];
        const progress = sectionDistance > 0
            ? Math.min(Math.max((scrollPosition - sectionPositions[previousIndex]) / sectionDistance, 0), 1)
            : 0;
        const robotPosition = markerPositions[previousIndex]
            + (markerPositions[nextIndex] - markerPositions[previousIndex]) * progress;
        const nextActiveIndex = progress >= 0.5 ? nextIndex : previousIndex;

        routeNavigation.style.setProperty('--route-robot-y', `${robotPosition}px`);

        if (Math.abs(scrollPosition - lastScrollPosition) > 1) {
            routeNavigation.dataset.routeDirection = scrollPosition > lastScrollPosition
                ? 'forward'
                : 'backward';
        }

        if (nextActiveIndex !== activeIndex) {
            routeStops.forEach((stop, index) => {
                stop.classList.toggle('is-active', index === nextActiveIndex);
                stop.setAttribute('aria-current', index === nextActiveIndex ? 'step' : 'false');
            });
            activeIndex = nextActiveIndex;
        }

        lastScrollPosition = scrollPosition;
    };

    const scheduleRouteUpdate = () => {
        if (framePending) {
            return;
        }

        framePending = true;
        window.requestAnimationFrame(() => {
            updateRoute();
            framePending = false;
        });
    };

    routeStops.forEach((stop, index) => {
        stop.addEventListener('click', () => {
            routeNavigation.dataset.routeDirection = index >= activeIndex ? 'forward' : 'backward';
        });
    });

    window.addEventListener('scroll', scheduleRouteUpdate, { passive: true });
    window.addEventListener('resize', scheduleRouteUpdate);
    window.addEventListener('load', scheduleRouteUpdate, { once: true });
    scheduleRouteUpdate();
})();
