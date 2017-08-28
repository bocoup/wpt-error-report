const fs = require("fs");
const ct = require("common-tags");

const data = require(`./consolidated.json`);

function toDetails(summary, contents) {
  return `<details><summary>${summary}</summary>${contents}</details>`;
}

function toList(records) {
  return ct.stripIndent`
    <ul>
    ${records.map(record => `
    <li>
    <pre>
      ${record.platform} @ ${record.sha}
      ${record.disparity.expected - record.disparity.completed} of ${record.disparity.expected} were not executed.

      Expected: ${record.disparity.expected}
      Completed: ${record.disparity.completed}
    </pre>
    </li>
    `).join('')}
    </ul>
  `;
}

function total(field, data) {
  let value = 0;
  let keys = Object.keys(data);

  for (let key of keys) {
    if (Array.isArray(data[key])) {
      for (let record of data[key]) {
        value += record.disparity[field];
      }
    } else {
      if (data[key]) {
        value += total(field, data[key]);
      }
    }
  }

  return value;
}

function toHTML(data) {
  let keys = Object.keys(data);
  let html = "";

  for (let item of keys) {
    if (typeof data[item] === "object") {
      if (Array.isArray(data[item])) {
        let summary = `${item} (<a href="https://github.com/w3c/web-platform-tests/tree/master${data[item][0].test}" target=_blank>source</a>)`;
        html += toDetails(summary, toList(data[item]));
      } else {
        let expected = total('expected', data[item]);
        let completed = total('completed', data[item]);
        let didnot = expected - completed;
        let summary = `${item} (${didnot} of ${expected} were not executed)`;
        html += toDetails(summary, toHTML(data[item]));
      }
    }
  }

  return html;
}

const html = toHTML(data);
const report = `
<!doctype html>
<style>
button, details {
  margin-left: 1em;
}

body {
  background: white;
  font: normal normal 13px monospace
}

ul {
  margin: 0 0 0 1em; /* indentation */
  padding: 0;
  list-style: none;
  color: #333;
  position: relative;
  margin-left: .5em
}

ul:before {
  content: "";
  display: block;
  width: 0;
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  border-left: 1px solid;
}

li {
  margin: 0;
  padding: 0;
  position: relative;
  border-bottom: 1px solid;
}
</style>

<pre>

</pre>
<button>Toggle All</button>
${html}


<script>
document.addEventListener("DOMContentLoaded", () => {
  let isOpen = false;
  document.querySelector("button").addEventListener("click", () => {
    isOpen = !isOpen;
    [...document.querySelectorAll("details")].forEach(detail => {
      detail.open = isOpen;
    });
  });
}, false);
</script>
`;

fs.writeFileSync(`./docs/index.html`, report);
