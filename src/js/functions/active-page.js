const activePage = window.location.pathname
const navLinks = document.querySelectorAll('.nav__link')

navLinks.forEach(link => {
  if (link.href.includes(activePage)) {
    link.classList.add('nav__link--current');
  }
})
