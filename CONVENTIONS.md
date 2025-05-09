Project conventions
- Code must run entirely client-side (i.e. in-browser)
- Prefer solutions not requiring a build step - such as vanilla HTML/JS/CSS
- Minimize use of dependencies, and vendor them
  E.g. if using HTMX, ensure (by providing instructions or executing commands) it's downloaded into the project sources, and referenced accordingly,
  as opposed to being loaded client-side from a CDN. I.e. `js/library.js` is OK, `https://cdn.blahblah/library.js` is not.
- You're free to use most recent HTML, CSS and JavaScript features that are supported in recent versions of modern browsers (Firefox, Chrome)
  But, again, for frontend code, strongly prefer tools and features that work in the browser *without transpilation or any kind of build step*.
- Prefer separating concerns into different JavaScript files to keep individual files focused and reduce the amount of repeated, unmodified code in diffs. For example, mathematical or algorithmic logic should be in its own file, separate from DOM manipulation or application flow logic.
