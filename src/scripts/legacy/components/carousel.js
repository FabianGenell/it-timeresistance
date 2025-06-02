import { qs, qsa, listen, addClass, removeClass, hasClass } from '../utils.js';

const selectors$M = {
    sliderContainer: '.swiper',
    visibleSlides: '.swiper-slide-visible'
};
const classes$o = {
    overflow: 'has-overflow',
    carousel: 'carousel'
};
export default function Carousel(node) {
    let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    // Pass the swiper container or the contain section
    const swiperContainer = hasClass(node, classes$o.carousel) ? node : qs(selectors$M.sliderContainer, node);
    if (!swiperContainer) return;
    let carousel;
    const events = [];
    const defaultSwiperOptions = {
        slidesPerView: 2,
        grabCursor: true,
        preloadImages: false,
        watchSlidesProgress: true,
        on: {
            init: function () {
                handleOverflow(this.slides);
            },
            breakpoint: function () {
                onBreakpointChange(this.slides);
            }
        }
    };
    const nextButton = qs('[data-next]', node);
    const prevButton = qs('[data-prev]', node);
    const useNav = nextButton && prevButton;

    // Account for additional padding if slides overflow container
    const handleOverflow = (slides) => {
        // Allow breakpoints config settings to apply
        setTimeout(() => {
            const hasOverflow = hasClass(swiperContainer, classes$o.overflow);
            const needsOverflow = qsa(selectors$M.visibleSlides, swiperContainer).length !== slides.length;
            if (!hasOverflow && needsOverflow) {
                addClass(swiperContainer, classes$o.overflow);
            } else if (hasOverflow && !needsOverflow) {
                removeClass(swiperContainer, classes$o.overflow);
            }
        }, 0);
    };
    const onBreakpointChange = (slides) => {
        handleOverflow(slides);
    };
    function handleFocus(event) {
        const slide = event.target.closest('.swiper-slide');
        const slideIndex = [...slide.parentElement.children].indexOf(slide);

        // TODO: ideally this would be dependant on if slide didn't have
        // `swiper-slide-visible` class (so would slide only as needed)
        // however that doesn't work with mobile peek, so brut forcing for now
        // and will always sliding now

        if (document.body.classList.contains('user-is-tabbing')) {
            carousel.slideTo(slideIndex);
        }
    }
    import(flu.chunks.swiper).then((_ref) => {
        let { Swiper, Navigation } = _ref;
        let swiperOptions = Object.assign(defaultSwiperOptions, options);

        // nextEl and prevEl can be passed in check if they are before
        // using the defaults
        if ('navigation' in swiperOptions) {
            swiperOptions = Object.assign(swiperOptions, {
                modules: [Navigation]
            });
        } else if (useNav) {
            swiperOptions = Object.assign(swiperOptions, {
                modules: [Navigation],
                navigation: {
                    nextEl: nextButton,
                    prevEl: prevButton
                }
            });
        }
        carousel = new Swiper(swiperContainer, swiperOptions);
        events.push(listen(swiperContainer, 'focusin', handleFocus));
    });
    return {
        destroy: () => {
            var _carousel;
            (_carousel = carousel) === null || _carousel === void 0 || _carousel.destroy();
            events.forEach((unsubscribe) => unsubscribe());
        }
    };
}
