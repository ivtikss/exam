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
    const routeTrack = routeNavigation.querySelector('[data-route-track]');
    const routePath = routeNavigation.querySelector('[data-route-path]');
    const progressPath = routeNavigation.querySelector('[data-route-progress]');
    const activeSegment = routeNavigation.querySelector('[data-route-active-segment]');

    if (
        !robot
        || !routeTrack
        || !routePath
        || !progressPath
        || !activeSegment
        || sections.length !== routeStops.length
    ) {
        return;
    }

    let framePending = false;
    let lastScrollPosition = window.scrollY;
    let activeIndex = -1;
    let scanningTimer;
    let movingTimer;

    const updateRoute = () => {
        const sectionPositions = sections.map(
            (section) => section.getBoundingClientRect().top + window.scrollY,
        );
        const markerPositions = routeStops.map((stop) => stop.offsetTop + stop.offsetHeight / 2);
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
        const routeProgress = (previousIndex + progress) / (routeStops.length - 1);
        const routeLength = routePath.getTotalLength();
        const routePoint = routePath.getPointAtLength(routeLength * routeProgress);
        const routeTrackBounds = routeTrack.getBoundingClientRect();
        const routeNavigationBounds = routeNavigation.getBoundingClientRect();
        const routeViewBoxWidth = routeTrack.viewBox.baseVal.width || 100;
        const robotX = routeTrackBounds.left - routeNavigationBounds.left
            + (routePoint.x / routeViewBoxWidth) * routeTrackBounds.width;

        routeNavigation.style.setProperty('--route-robot-x', `${robotX}px`);
        routeNavigation.style.setProperty('--route-robot-y', `${robotPosition}px`);
        progressPath.style.strokeDasharray = `${routeProgress * 100} 100`;
        activeSegment.style.strokeDashoffset = `${100 - routeProgress * 100}`;

        routeStops.forEach((stop, index) => {
            const stopPoint = routePath.getPointAtLength(
                routeLength * (index / (routeStops.length - 1)),
            );
            const stopOffset = (stopPoint.x / routeViewBoxWidth) * routeTrackBounds.width
                - routeTrackBounds.width / 2;
            stop.style.setProperty('--route-stop-offset', `${stopOffset}px`);
        });

        if (Math.abs(scrollPosition - lastScrollPosition) > 1) {
            routeNavigation.dataset.routeDirection = scrollPosition > lastScrollPosition
                ? 'forward'
                : 'backward';
        }

        if (nextActiveIndex !== activeIndex) {
            routeStops.forEach((stop, index) => {
                stop.classList.toggle('is-active', index === nextActiveIndex);
                stop.classList.toggle('is-passed', index < nextActiveIndex);
                stop.setAttribute('aria-current', index === nextActiveIndex ? 'step' : 'false');
            });

            if (activeIndex >= 0) {
                routeNavigation.classList.remove('is-scanning');
                window.requestAnimationFrame(() => {
                    routeNavigation.classList.add('is-scanning');
                });
                window.clearTimeout(scanningTimer);
                scanningTimer = window.setTimeout(() => {
                    routeNavigation.classList.remove('is-scanning');
                }, 680);
            }

            activeIndex = nextActiveIndex;
        }

        lastScrollPosition = scrollPosition;
    };

    const scheduleRouteUpdate = () => {
        if (framePending) {
            return;
        }

        routeNavigation.classList.add('is-moving');
        window.clearTimeout(movingTimer);
        movingTimer = window.setTimeout(() => {
            routeNavigation.classList.remove('is-moving');
        }, 140);

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
