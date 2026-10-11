"use strict";

const STORAGE_KEY = "courseboard-data-v1";
const courseList = document.querySelector("#course-list");
const courseDetail = document.querySelector("#course-detail");
const courseCount = document.querySelector("#course-count");
const toast = document.querySelector("#toast");
let model = loadModel();
let activeCourseId = model.courses[0]?.id ?? null;
let toastTimer;

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadModel() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (value && value.version === 1 && Array.isArray(value.courses)) return value;
  } catch (error) {
    console.warn("Courseboard could not read its saved data.", error);
  }
  return { version: 1, courses: [] };
}

function saveModel() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(model));
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 2600);
}

function courseGrade(course) {
  const graded = course.assignments.filter((item) => item.earned !== null && item.possible > 0);
  const weight = graded.reduce((sum, item) => sum + item.weight, 0);
  if (!weight) return { value: null, weight: 0 };
  const weightedScore = graded.reduce((sum, item) => sum + (item.earned / item.possible) * item.weight, 0);
  return { value: weightedScore / weight * 100, weight };
}

function renderCourses() {
  courseCount.textContent = String(model.courses.length);
  if (!model.courses.length) {
    courseList.innerHTML = '<div class="rail-empty">Add a course to start tracking your semester.</div>';
    return;
  }
  courseList.innerHTML = model.courses.map((course) => {
    const grade = courseGrade(course);
    const selected = course.id === activeCourseId;
    return `<button class="course-choice ${selected ? "selected" : ""}" type="button" data-course-id="${escapeHTML(course.id)}" aria-pressed="${selected}">
      <span class="course-initial">${escapeHTML((course.code || course.name).slice(0, 1).toUpperCase())}</span>
      <span class="course-choice-copy"><strong>${escapeHTML(course.name)}</strong><small>${escapeHTML(course.code || "Course")}</small></span>
      <span class="course-grade-small">${grade.value === null ? "--" : `${grade.value.toFixed(0)}%`}</span>
    </button>`;
  }).join("");
}

function formatDueDate(value) {
  if (!value) return "No due date";
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}

function renderAssignments(course) {
  if (!course.assignments.length) {
    return '<div class="assignment-empty"><span class="empty-mark">＋</span><strong>No assignments yet</strong><p>Add your first assessment to see how your course grade is calculated.</p></div>';
  }
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return `<div class="assignment-table-wrap"><table class="assignment-table"><thead><tr><th>ASSESSMENT</th><th>DUE</th><th>SCORE</th><th>WEIGHT</th><th><span class="sr-only">Remove</span></th></tr></thead><tbody>
    ${course.assignments.slice().sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999")).map((item) => {
      const pending = item.earned === null;
      const overdue = pending && item.due && new Date(`${item.due}T12:00:00`) < today;
      const score = pending ? '<span class="pending-score">Pending</span>' : `${item.earned} / ${item.possible}`;
      return `<tr><td><strong>${escapeHTML(item.name)}</strong>${overdue ? '<small class="overdue-label">OVERDUE</small>' : ""}</td><td>${escapeHTML(formatDueDate(item.due))}</td><td>${score}</td><td>${item.weight}%</td><td><button class="delete-item" type="button" data-delete-assignment="${escapeHTML(item.id)}" aria-label="Remove ${escapeHTML(item.name)}">×</button></td></tr>`;
    }).join("")}
  </tbody></table></div>`;
}

function renderDetail() {
  const course = model.courses.find((item) => item.id === activeCourseId);
  if (!course) {
    courseDetail.innerHTML = '<div class="detail-empty"><div class="empty-orbit">C</div><p class="eyebrow">GET STARTED</p><h2>Your semester starts here.</h2><p>Add a course, then log assessments as they come up. Courseboard calculates a weighted grade from marked assignments.</p></div>';
    return;
  }
  const grade = courseGrade(course);
  const pending = course.assignments.filter((item) => item.earned === null).length;
  const gradeText = grade.value === null ? "--" : `${grade.value.toFixed(1)}%`;
  const targetText = `${Number(course.target).toFixed(0)}%`;
  courseDetail.innerHTML = `
    <div class="detail-heading"><div><p class="eyebrow">${escapeHTML(course.code || "COURSE")}</p><h2>${escapeHTML(course.name)}</h2></div><button class="delete-course" id="delete-course" type="button">Remove course</button></div>
    <div class="grade-cards"><article class="grade-card grade-main"><span>Current grade</span><strong>${gradeText}</strong><small>${grade.weight ? `${grade.weight.toFixed(1)}% of course weight graded` : "No graded assessments yet"}</small></article><article class="grade-card"><span>Target grade</span><strong>${targetText}</strong><small>Your personal goal</small></article><article class="grade-card"><span>To come</span><strong>${pending}</strong><small>Pending assessments</small></article></div>
    <section class="assessment-panel"><div class="panel-heading"><div><p class="eyebrow">GRADEBOOK</p><h3>Assessments</h3></div><span class="assessment-count">${course.assignments.length} TOTAL</span></div>
      ${renderAssignments(course)}
    </section>
    <section class="add-assessment"><div><p class="eyebrow">KEEP YOUR PLAN CURRENT</p><h3>Add an assessment</h3><p>Enter a weight from your course outline. Leave the score blank until it is graded.</p></div>
      <form id="assessment-form"><label>Assessment name<input name="name" maxlength="70" placeholder="e.g. Midterm exam" required></label><div class="assessment-fields"><label>Due date<input name="due" type="date"></label><label>Weight %<input name="weight" type="number" min="0.1" max="100" step="0.1" value="10" required></label><label>Points possible<input name="possible" type="number" min="0.1" step="0.1" placeholder="100" required></label><label>Points earned <span class="optional">(optional)</span><input name="earned" type="number" min="0" step="0.1" placeholder="Leave blank if pending"></label></div><p class="form-error" id="form-error" aria-live="polite"></p><button class="button primary" type="submit">Add to gradebook <span>＋</span></button></form>
    </section>`;
}

function render() {
  renderCourses();
  renderDetail();
}

document.querySelector("#course-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const name = String(form.get("name")).trim();
  const code = String(form.get("code") || "").trim().toUpperCase();
  const target = Number(form.get("target"));
  if (!name || !Number.isFinite(target) || target < 0 || target > 100) return;
  const course = { id: createId(), name, code, target, assignments: [] };
  model.courses.push(course);
  activeCourseId = course.id;
  saveModel(); render(); event.currentTarget.reset();
  document.querySelector("#course-target").value = "85";
  showToast("Course added.");
});

courseList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-course-id]");
  if (!button) return;
  activeCourseId = button.dataset.courseId;
  render();
});

courseDetail.addEventListener("submit", (event) => {
  if (event.target.id !== "assessment-form") return;
  event.preventDefault();
  const course = model.courses.find((item) => item.id === activeCourseId);
  if (!course) return;
  const form = new FormData(event.target);
  const name = String(form.get("name")).trim();
  const possible = Number(form.get("possible"));
  const earnedRaw = String(form.get("earned") || "").trim();
  const earned = earnedRaw === "" ? null : Number(earnedRaw);
  const weight = Number(form.get("weight"));
  const error = document.querySelector("#form-error");
  if (!name || !Number.isFinite(possible) || possible <= 0 || !Number.isFinite(weight) || weight <= 0 || weight > 100) {
    error.textContent = "Enter a name, a positive points total, and a weight between 0 and 100.";
    return;
  }
  if (earned !== null && (!Number.isFinite(earned) || earned < 0 || earned > possible)) {
    error.textContent = "Points earned must be between zero and the points possible.";
    return;
  }
  course.assignments.push({ id: createId(), name, due: String(form.get("due") || ""), possible, earned, weight });
  saveModel(); render(); showToast("Assessment added.");
});

courseDetail.addEventListener("click", (event) => {
  if (event.target.id === "delete-course") {
    const course = model.courses.find((item) => item.id === activeCourseId);
    if (!course || !confirm(`Remove ${course.name} and its assessments?`)) return;
    model.courses = model.courses.filter((item) => item.id !== activeCourseId);
    activeCourseId = model.courses[0]?.id ?? null;
    saveModel(); render(); showToast("Course removed.");
    return;
  }
  const button = event.target.closest("[data-delete-assignment]");
  if (!button) return;
  const course = model.courses.find((item) => item.id === activeCourseId);
  if (!course) return;
  course.assignments = course.assignments.filter((item) => item.id !== button.dataset.deleteAssignment);
  saveModel(); render(); showToast("Assessment removed.");
});

document.querySelector("#export-data").addEventListener("click", () => {
  const file = new Blob([JSON.stringify(model, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(file);
  link.download = "courseboard-backup.json";
  link.click();
  URL.revokeObjectURL(link.href);
  showToast("Backup downloaded.");
});

document.querySelector("#import-button").addEventListener("click", () => document.querySelector("#import-file").click());
document.querySelector("#import-file").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const incoming = JSON.parse(await file.text());
    if (incoming.version !== 1 || !Array.isArray(incoming.courses) || incoming.courses.some((course) => !Array.isArray(course.assignments))) {
      throw new Error("This file is not a Courseboard backup.");
    }
    if (!confirm("Import this backup and replace the courses saved in this browser?")) return;
    model = incoming;
    activeCourseId = model.courses[0]?.id ?? null;
    saveModel(); render(); showToast("Backup imported.");
  } catch (error) {
    showToast(error.message || "Could not read that backup.");
  } finally {
    event.target.value = "";
  }
});

document.querySelector("#load-example").addEventListener("click", () => {
  if (model.courses.length && !confirm("Replace your saved courses with example data?")) return;
  const courseId = createId();
  model = { version: 1, courses: [{
    id: courseId, name: "Introduction to Computing", code: "CS 101", target: 85,
    assignments: [
      { id: createId(), name: "Weekly exercises", due: "", possible: 20, earned: 18, weight: 20 },
      { id: createId(), name: "Programming assignment", due: "", possible: 40, earned: 35, weight: 30 },
      { id: createId(), name: "Midterm exam", due: "", possible: 100, earned: null, weight: 25 }
    ]
  }] };
  activeCourseId = courseId; saveModel(); render(); showToast("Example data loaded.");
});

render();
