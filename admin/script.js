const SHEET_URL = 'https://script.google.com/macros/s/AKfycbyUM1FJuw0_DMl6CSsFf3a2jp_LmA8M3OodNmlVZiI6Rsxeww-obVZq_jYLs2mvzoYT/exec'; // Replace with your actual URL

async function fetchTasks() {
  const res = await fetch(SHEET_URL);
  const tasks = await res.json();
  renderTasks(tasks);
}
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}


function renderTasks(tasks) {
  const tbody = document.getElementById('taskBody');
  tbody.innerHTML = '';

  const client = document.getElementById('clientFilter').value.toLowerCase();
  const taskName = document.getElementById('taskFilter').value.toLowerCase();
  const status = document.getElementById('statusFilter').value.toLowerCase();
  const dueDate = document.getElementById('dueDateFilter').value;

  const now = new Date();

  tasks.forEach(task => {
    if (
      (client && !task.Client.toLowerCase().includes(client)) ||
      (taskName && !task.Task.toLowerCase().includes(taskName)) ||
      (status && !task.Status.toLowerCase().includes(status)) ||
      (dueDate && new Date(task['Due Date']) > new Date(dueDate))
    ) return;

    const tr = document.createElement('tr');
    const due = new Date(task['Due Date']);

    // Conditional formatting
    if (due < now) {
      tr.classList.add('overdue');
    } else if ((due - now) / (1000 * 60 * 60 * 24) < 3) {
      tr.classList.add('due-soon');
    }

    tr.innerHTML = `
      <td>${task.Client}</td>
      <td>${task.Task}</td>
      <td>${formatDate(task['Due Date'])}</td>
      <td>${task.Status}</td>
      <td>
        <div class="status-container">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${task['% Completed']}%;"></div>
          </div>
     <span>${task['% Completed']}%</span>
        </div>
      </td>

    `;
    tbody.appendChild(tr);
  });
}

function sortTable(n) {
  const table = document.getElementById("taskTable");
  let switching = true;
  let dir = "asc";
  let switchcount = 0;

  while (switching) {
    switching = false;
    let rows = Array.from(table.rows).slice(1);
    for (let i = 0; i < rows.length - 1; i++) {
      let x = rows[i].cells[n].innerText.toLowerCase();
      let y = rows[i + 1].cells[n].innerText.toLowerCase();
      if ((dir == "asc" && x > y) || (dir == "desc" && x < y)) {
        rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
        switching = true;
        switchcount++;
        break;
      }
    }
    if (switchcount === 0 && dir === "asc") {
      dir = "desc";
      switching = true;
    }
  }
}

document.querySelectorAll('#filters input').forEach(input => {
  input.addEventListener('input', fetchTasks);
});

fetchTasks();
