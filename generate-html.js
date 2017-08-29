const fs = require("fs");
const ct = require("common-tags");

const data = require(`./consolidated.json`);

function toDetails(summary, contents, didnotPercent) {
  let color = getColorForPercentage(didnotPercent);
  let didnotPercentFormated = (didnotPercent*100).toFixed(2);
  let percentDisplay = didnotPercent ? `<figure class="percent" style="background:${color}">${didnotPercentFormated}%</figure>` : '';

  return `<details data-percent="${didnotPercentFormated}"><summary>${summary} ${percentDisplay}</summary>${contents}</details>`;
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

var percentColors = [
  {pct: 0.0, color: { r: 0xf5, g: 0xd7, b: 0x78}},
  {pct: 0.5, color: { r: 0xf3, g: 0x6e, b: 0x6e}},
  {pct: 1.0, color: { r: 0xd0, g: 0x0, b: 0x0}}
];

function getColorForPercentage(pct) {
  for (var i = 1; i < percentColors.length - 1; i++) {
    if (pct < percentColors[i].pct) {
      break;
    }
  }
  let lower = percentColors[i - 1];
  let upper = percentColors[i];
  let range = upper.pct - lower.pct;
  let rangePct = (pct - lower.pct) / range;
  let pctLower = 1 - rangePct;
  let pctUpper = rangePct;
  let color = {
    r: Math.floor(lower.color.r * pctLower + upper.color.r * pctUpper),
    g: Math.floor(lower.color.g * pctLower + upper.color.g * pctUpper),
    b: Math.floor(lower.color.b * pctLower + upper.color.b * pctUpper)
  };
  return 'rgb(' + [color.r, color.g, color.b].join(',') + ')';
  // or output as hex if preferred
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
        let didnotPercent = completed/expected;
        let summary = `<span>${item}</span> <figure class="did-not">(${didnot.toLocaleString()} of ${expected.toLocaleString()} were not executed)</figure>`;
        html += toDetails(summary, toHTML(data[item]), didnotPercent);
      }
    }
  }

  return html;
}

const html = toHTML(data);
const report = `
<!doctype html>
<html>
<head>
<style>
body {
  background: white;
  margin: 0px;
  font-family: sans-serif;
  font-size: 1em;
}
header {
  background: #efefef;
  padding: 30px;
  margin: 0 0 20px 0;
}
main {
  padding: 30px;
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
  border: 0px;
}
button, details {
  margin-left: 1em;
}
details {
  padding: 3px 3px 3px 20px;
  font: normal normal 13px monospace;
  transition: height 1s ease;
  position: relative;
}
details:not(:last-child) {
  border-bottom: 1px solid #eee;
}
details[open] {
  padding-bottom: 0px;
}
details[open] details {
  background: #efefef;
  margin-right: 60px;
  margin-bottom: 0px;
}
details[open] details:not(:last-child) {
  border-bottom: 1px solid #d2d1d1;
}
summary {
  width: 100%;
}
summary span {
  width: 230px;
  display: inline-block;
}
summary figure {
  padding: 0px;
  margin: 0px;
  display: inline;
}
figure.did-not {
  position: absolute;
  right: 100px;
}
figure.percent {
  position: absolute;
  right: 0px;
  padding: 1px;
  min-width: 50px;
  text-align: right;
}
</style>
</head>
<body>
<header>
  <h1>wpt-error-report</h1>
  <p>
    The following results consolidate broken test files in <a href="http://github.com/w3c/web-platform-tests">web platform tests</a> test suite that cause <a href="http://wpt.fyi">test results</a> to be inconsistent. Running at <code>e511e5e8af</code>.
  </p>
  <p>
  See <a href="https://github.com/GoogleChrome/wptdashboard/issues/98">GoogleChrome/wptdashboard/issues/98</a> for more discussion.
  </p>
</header>
<button class="toggle">Toggle All Results</button>
<button class="sort" data-mode="by-failure">Sort Results by Failure</button>
<main>
  ${html}
</main>

<script>
document.addEventListener("DOMContentLoaded", () => {
  let isOpen = false;
  document.querySelector("button.toggle").addEventListener("click", () => {
    isOpen = !isOpen;
    [...document.querySelectorAll("details")].forEach(detail => {
      detail.open = isOpen;
    });
  });

  let sortButton = document.querySelector("button.sort");
  let list = document.querySelector('main')
  let items = list.childNodes;
  let itemsArr = [];
  for (var i in items) {
    if (items[i].nodeType == 1) { // get rid of the whitespace text nodes
      itemsArr.push(items[i]);
    }
  }

  sortButton.addEventListener("click", () => {
    if(sortButton.dataset.mode === "by-failure") {
      sortButton.innerText="Sort Alphabetically"
      sortButton.dataset.mode="by-alpha"
      sortByFailures(list, itemsArr);
    } else {
      sortButton.innerText="Sort Results by Failure"
      sortButton.dataset.mode="by-failure"
      sortByAlpha(list, itemsArr);
    }
  });

  function sortByFailures( list, itemsArr ) {
    itemsArr.sort(function(a, b) {
      return parseInt(a.dataset.percent) === parseInt(b.dataset.percent) ? 0 : (parseInt(a.dataset.percent) > parseInt(b.dataset.percent) ? -1 : 1);
    });

    for (i = 0; i < itemsArr.length; ++i) {
      list.appendChild(itemsArr[i]);
    }
  }

  function sortByAlpha( list, itemsArr ) {
    itemsArr.sort(function(a, b) {
      return a.innerText.substr(0,10) === b.innerText.substr(0,10) ? 0 : (a.innerText.substr(0,10) > b.innerText.substr(0,10)) ? 1 : -1;
    });

    for (i = 0; i < itemsArr.length; ++i) {
      list.appendChild(itemsArr[i]);
    }
  }


}, false);
</script>
</body>
</html>
`;

fs.writeFileSync(`./docs/index.html`, report);
