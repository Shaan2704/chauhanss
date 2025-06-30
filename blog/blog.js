document.addEventListener("DOMContentLoaded", () => {
  fetch("blog-data.json")
    .then(response => response.json())
    .then(posts => {
      const container = document.getElementById("blog-posts");

      if (!Array.isArray(posts)) {
        container.innerHTML = "<p>No blog posts available.</p>";
        return;
      }

      posts.forEach(post => {
        const postElement = document.createElement("article");
        postElement.className = "mb-10 p-6 border rounded-lg shadow-sm bg-white dark:bg-gray-800";

        postElement.innerHTML = `
          <h2 class="text-2xl font-semibold mb-2">${post.title}</h2>
          <p class="text-sm text-gray-500 mb-4">${post.date} • ${post.author}</p>
          <p class="text-gray-700 dark:text-gray-300">${post.content}</p>
        `;

        container.appendChild(postElement);
      });
    })
    .catch(error => {
      console.error("Error loading blog posts:", error);
      document.getElementById("blog-posts").innerHTML = "<p>Error loading blog content.</p>";
    });
}); // 👈 This closing parenthesis + brace was probably missing
