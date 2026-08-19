// site.js - small shared script for navigation toggle and theme (dark) toggle
document.addEventListener('DOMContentLoaded',function(){
  // NAV TOGGLE
  const navToggle = document.getElementById('nav-toggle');
  const navLinks = document.getElementById('nav-links');
  if(navToggle && navLinks){
    navToggle.addEventListener('click',()=>{
      const open = navLinks.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }
  // THEME TOGGLE - unify to id 'theme-toggle'
  const themeToggle = document.getElementById('theme-toggle');
  const body = document.body;
  if(themeToggle){
    // restore
    if(localStorage.getItem('theme') === 'dark') body.classList.add('dark');
    themeToggle.addEventListener('click',()=>{
      body.classList.toggle('dark');
      localStorage.setItem('theme', body.classList.contains('dark') ? 'dark' : 'light');
    });
  }
});
