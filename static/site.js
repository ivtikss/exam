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
    const scanOverlay = document.querySelector('[data-route-scan-overlay]');
    const scanBeam = scanOverlay?.querySelector('[data-route-beam]');
    const scanCone = scanOverlay?.querySelector('[data-route-beam-cone]');
    const scanLines = Array.from(scanOverlay?.querySelectorAll('[data-route-beam-line]') || []);
    const scanData = Array.from(scanOverlay?.querySelectorAll('[data-route-beam-data]') || []);

    if (
        !robot
        || !routeTrack
        || !routePath
        || !progressPath
        || !activeSegment
        || !scanOverlay
        || !scanBeam
        || !scanCone
        || scanLines.length !== 2
        || scanData.length !== 3
        || sections.length !== routeStops.length
    ) {
        return;
    }

    let framePending = false;
    let lastScrollPosition = window.scrollY;
    let activeIndex = -1;
    let scrollDirection = 'forward';

    const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum);

    const getSectionContainer = (section) => (
        Array.from(section.children).find((child) => child.classList.contains('container'))
        || section
    );

    const getContainerPoint = (section) => {
        const containerBounds = getSectionContainer(section).getBoundingClientRect();
        const isMobile = window.matchMedia('(max-width: 960px)').matches;
        const viewportInset = isMobile ? 44 : 72;

        return {
            x: containerBounds.left,
            y: clamp(
                containerBounds.top + containerBounds.height / 2,
                viewportInset,
                window.innerHeight - viewportInset,
            ),
        };
    };

    const buildCurve = (start, end, startOffset, endOffset, bend) => {
        const distanceX = end.x - start.x;
        const distanceY = end.y - start.y;
        const length = Math.max(Math.hypot(distanceX, distanceY), 1);
        const normal = { x: -distanceY / length, y: distanceX / length };
        const startPoint = {
            x: start.x + normal.x * startOffset,
            y: start.y + normal.y * startOffset,
        };
        const endPoint = {
            x: end.x + normal.x * endOffset,
            y: end.y + normal.y * endOffset,
        };
        const controlOne = {
            x: startPoint.x + Math.max(36, (endPoint.x - startPoint.x) * 0.24),
            y: startPoint.y + (endPoint.y - startPoint.y) * 0.18 + bend,
        };
        const controlTwo = {
            x: endPoint.x - Math.max(48, (endPoint.x - startPoint.x) * 0.28),
            y: endPoint.y - (endPoint.y - startPoint.y) * 0.14 + bend,
        };

        return {
            controlOne,
            controlTwo,
            endPoint,
            normal,
            path: `M ${startPoint.x} ${startPoint.y} C ${controlOne.x} ${controlOne.y} ${controlTwo.x} ${controlTwo.y} ${endPoint.x} ${endPoint.y}`,
            startPoint,
        };
    };

    const getCurvePoint = (curve, progress) => {
        const inverseProgress = 1 - progress;
        const first = inverseProgress ** 3;
        const second = 3 * inverseProgress ** 2 * progress;
        const third = 3 * inverseProgress * progress ** 2;
        const fourth = progress ** 3;

        return {
            x: first * curve.startPoint.x
                + second * curve.controlOne.x
                + third * curve.controlTwo.x
                + fourth * curve.endPoint.x,
            y: first * curve.startPoint.y
                + second * curve.controlOne.y
                + third * curve.controlTwo.y
                + fourth * curve.endPoint.y,
        };
    };

    const clearSectionEffects = () => {
        sections.forEach((section) => {
            section.style.removeProperty('--route-section-scan');
            section.style.removeProperty('--route-section-brightness');
            section.style.removeProperty('--route-section-opacity');
        });
    };

    const updateSectionEffects = (incomingIndex, outgoingIndex, strength, isTransitioning) => {
        clearSectionEffects();

        if (!isTransitioning) {
            return;
        }

        const incoming = sections[incomingIndex];
        const outgoing = sections[outgoingIndex];
        const scanStrength = strength.toFixed(3);

        incoming.style.setProperty('--route-section-scan', scanStrength);
        incoming.style.setProperty(
            '--route-section-brightness',
            (1 + strength * 0.045).toFixed(3),
        );
        outgoing.style.setProperty(
            '--route-section-brightness',
            (1 - strength * 0.045).toFixed(3),
        );
        outgoing.style.setProperty(
            '--route-section-opacity',
            (1 - strength * 0.045).toFixed(3),
        );
    };

    const clearBeamGeometry = () => {
        scanCone.setAttribute('d', '');
        scanLines.forEach((line) => line.setAttribute('d', ''));
        scanData.forEach((dot) => {
            dot.setAttribute('cx', '0');
            dot.setAttribute('cy', '0');
            dot.setAttribute('r', '0');
        });
    };

    const updateScanBeam = (start, target, intensity, isTransitioning) => {
        scanOverlay.style.setProperty(
            '--route-beam-opacity',
            isTransitioning ? intensity.toFixed(3) : '0',
        );
        scanOverlay.style.setProperty('--route-beam-intensity', intensity.toFixed(3));

        if (!isTransitioning) {
            clearBeamGeometry();
            return;
        }

        const isMobile = window.matchMedia('(max-width: 960px)').matches;
        const direction = scrollDirection === 'backward' ? -1 : 1;
        const distance = Math.max(Math.hypot(target.x - start.x, target.y - start.y), 1);
        const curveBend = clamp(
            (target.y - start.y) * 0.1 + direction * 16,
            -56,
            56,
        );
        const baseCurve = buildCurve(start, target, 0, 0, curveBend);

        scanBeam.setAttribute('viewBox', `0 0 ${window.innerWidth} ${window.innerHeight}`);

        if (isMobile) {
            scanCone.setAttribute('d', '');
            scanLines[0].setAttribute('d', `M ${start.x} ${start.y} L ${target.x} ${target.y}`);
            scanLines[1].setAttribute('d', '');
            scanData.forEach((dot) => {
                dot.setAttribute('cx', '0');
                dot.setAttribute('cy', '0');
                dot.setAttribute('r', '0');
            });
            return;
        }

        const coneWidth = clamp(distance * 0.024, 12, 30);
        const coneTop = buildCurve(start, target, -3, -coneWidth, curveBend);
        const coneBottom = buildCurve(start, target, 3, coneWidth, curveBend);
        const conePath = [
            coneTop.path,
            `L ${coneBottom.endPoint.x} ${coneBottom.endPoint.y}`,
            `C ${coneBottom.controlTwo.x} ${coneBottom.controlTwo.y} ${coneBottom.controlOne.x} ${coneBottom.controlOne.y} ${coneBottom.startPoint.x} ${coneBottom.startPoint.y}`,
            'Z',
        ].join(' ');

        scanCone.setAttribute('d', conePath);
        scanLines[0].setAttribute('d', buildCurve(
            start,
            target,
            -1,
            0,
            curveBend * 0.72,
        ).path);
        scanLines[1].setAttribute('d', buildCurve(
            start,
            target,
            1,
            0,
            curveBend * 0.72,
        ).path);

        scanData.forEach((dot, index) => {
            const point = getCurvePoint(baseCurve, [0.36, 0.58, 0.78][index]);
            const offset = [-4, 3, -2][index];

            dot.setAttribute('cx', `${point.x + baseCurve.normal.x * offset}`);
            dot.setAttribute('cy', `${point.y + baseCurve.normal.y * offset}`);
            dot.setAttribute('r', (1.4 + intensity * 1.5).toFixed(2));
        });
    };

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

        if (Math.abs(scrollPosition - lastScrollPosition) > 1) {
            scrollDirection = scrollPosition > lastScrollPosition ? 'forward' : 'backward';
        }

        const nextIndex = Math.min(previousIndex + 1, sectionPositions.length - 1);
        const sectionDistance = sectionPositions[nextIndex] - sectionPositions[previousIndex];
        const progress = sectionDistance > 0
            ? clamp((scrollPosition - sectionPositions[previousIndex]) / sectionDistance, 0, 1)
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
        const isTransitioning = previousIndex !== nextIndex && progress > 0.001 && progress < 0.999;
        const incomingIndex = scrollDirection === 'backward' ? previousIndex : nextIndex;
        const outgoingIndex = scrollDirection === 'backward' ? nextIndex : previousIndex;
        const phase = scrollDirection === 'backward' ? 1 - progress : progress;
        const beamIntensity = isTransitioning ? 4 * phase * (1 - phase) : 0;

        routeNavigation.style.setProperty('--route-robot-x', `${robotX}px`);
        routeNavigation.style.setProperty('--route-robot-y', `${robotPosition}px`);
        routeNavigation.style.setProperty('--route-active-pulse', beamIntensity.toFixed(3));
        routeNavigation.dataset.routeDirection = scrollDirection;
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

        const robotBounds = robot.getBoundingClientRect();
        const beamStart = {
            x: robotBounds.left + robotBounds.width / 2,
            y: robotBounds.top + robotBounds.height / 2,
        };
        const beamTarget = getContainerPoint(sections[incomingIndex]);

        updateScanBeam(beamStart, beamTarget, beamIntensity, isTransitioning);
        updateSectionEffects(incomingIndex, outgoingIndex, beamIntensity, isTransitioning);

        if (nextActiveIndex !== activeIndex) {
            routeStops.forEach((stop, index) => {
                stop.classList.toggle('is-active', index === nextActiveIndex);
                stop.classList.toggle('is-passed', index < nextActiveIndex);
                stop.setAttribute('aria-current', index === nextActiveIndex ? 'step' : 'false');
            });
            sections.forEach((section, index) => {
                section.classList.toggle('is-route-active', index === nextActiveIndex);
                section.classList.toggle('is-route-past', index < nextActiveIndex);
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
            scrollDirection = index >= activeIndex ? 'forward' : 'backward';
            routeNavigation.dataset.routeDirection = scrollDirection;
        });
    });

    window.addEventListener('scroll', scheduleRouteUpdate, { passive: true });
    window.addEventListener('resize', scheduleRouteUpdate);
    window.addEventListener('load', scheduleRouteUpdate, { once: true });
    scheduleRouteUpdate();
})();
