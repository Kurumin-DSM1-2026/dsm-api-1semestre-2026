document.addEventListener('click', function (event) {
  const navMenu = document.getElementById('nav-menu');

  if (!navMenu.contains(event.target)) {
    navMenu.classList.remove('collapsed');
    navMenu.classList.remove('show');
  }
});
