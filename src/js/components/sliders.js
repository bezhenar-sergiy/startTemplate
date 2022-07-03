// Подключение свайпера
import Swiper, {
  Navigation,
  Pagination,
  Autoplay,
  EffectFade,
  Thumbs
} from 'swiper'
Swiper.use([Navigation, Pagination, Autoplay, EffectFade, Thumbs])

const swiper = new Swiper('.swiper', {
  slidesPerView: 3,
  spaceBetween: 30,
  loop: true,
  // Navigation arrows
  navigation: {
    nextEl: '.swiper-button-next',
    prevEl: '.swiper-button-prev',
  },
});
