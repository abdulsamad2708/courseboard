# Courseboard

A browser-based course and grade planner. Add courses and assessments, track due dates, and see a weighted grade based on assessments that have been marked. Data is saved locally in the browser and can be exported or restored from a JSON backup.

## Features

- Create courses with a short code and a personal target grade.
- Add assessments with due dates, points possible, earned points, and course weight.
- Calculate the grade across completed assessments and show how much of the course weight has been graded.
- Keep ungraded work visible as pending and flag past due assessments.
- Remove courses or assessments and save changes automatically.
- Export and import a JSON backup to move data between browsers.
- Load clearly labeled example data to explore the interface.

## Run locally

Open `index.html` in a current browser. No build step, server, or package installation is required. Google Fonts are optional; the page has system-font fallbacks.

## Grade calculation

For each graded assessment, the score ratio is multiplied by its course weight. The current grade is the total weighted score divided by the total weight of graded assessments. Pending work is excluded until a score is entered, and the graded-weight total is displayed to make that clear.

## Built with

HTML, CSS, and vanilla JavaScript. Course data is stored with the browser's `localStorage` API and stays on the current device unless a backup is exported.
