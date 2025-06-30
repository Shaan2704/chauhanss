document.addEventListener('DOMContentLoaded', () => {
  const themeToggle = document.getElementById('theme-toggle');
  const darkIcon = document.getElementById('theme-toggle-dark-icon');
  const lightIcon = document.getElementById('theme-toggle-light-icon');

  const isDark = () => document.documentElement.classList.contains('dark');

  const updateIcons = () => {
    if (isDark()) {
      darkIcon.classList.add('hidden');
      lightIcon.classList.remove('hidden');
    } else {
      lightIcon.classList.add('hidden');
      darkIcon.classList.remove('hidden');
    }
  };

  themeToggle.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
    updateIcons();
  });

  updateIcons();
});
