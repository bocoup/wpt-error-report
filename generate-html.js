const fs = require("fs");
const ct = require("common-tags");

const data = require(`./consolidated.json`);

function toDetails(summary, contents) {
  return `<details>${summary} ${contents}</details>`;
}

function toList(records) {
  return ct.stripIndent`
    <ul>
    ${records.map(record => `
    <li><pre>${record.platform} @ <a href="http://wpt.fyi${record.test}" target=_blank>${record.sha}</a>
    ${record.disparity.expected - record.disparity.completed} of ${record.disparity.expected} were not executed.
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

const percentColors = [
  {pct: 0.0, color: { r: 0xf5, g: 0xd7, b: 0x78}},
  {pct: 0.5, color: { r: 0xf3, g: 0x6e, b: 0x6e}},
  {pct: 1.0, color: { r: 0xd0, g: 0x00, b: 0x00}},
];

function getColorForPercentage(pct) {
  for (var i = 1; i < percentColors.length - 1; i++) {
    if (pct < percentColors[i].pct) {
      break;
    }
  }

  let { [ i - 1 ]: lower, [i]: upper } = percentColors;

  let range = upper.pct - lower.pct;
  let rangePct = (pct - lower.pct) / range;
  let pctLower = 1 - rangePct;
  let pctUpper = rangePct;

  let r = Math.floor(lower.color.r * pctLower + upper.color.r * pctUpper);
  let g = Math.floor(lower.color.g * pctLower + upper.color.g * pctUpper);
  let b = Math.floor(lower.color.b * pctLower + upper.color.b * pctUpper);

  return `rgb(${r}, ${g}, ${b})`;
}

function toHTML(data) {
  let keys = Object.keys(data);
  let html = "";

  for (let item of keys) {
    if (typeof data[item] === "object") {
      if (Array.isArray(data[item])) {
        let summary = ct.stripIndent`
        <summary>${item} (<a href="https://github.com/w3c/web-platform-tests/tree/master${data[item][0].test}" target=_blank>source</a>)</summary>
        `;
        html += toDetails(summary.trim(), toList(data[item]));
      } else {
        let expected = total('expected', data[item]);
        let completed = total('completed', data[item]);

        let didNotRun = expected - completed;
        let percent = didNotRun/expected;


        let color = getColorForPercentage(percent);
        let didnotPercentFormated = (percent*100).toFixed(2);
        let percentDisplay = percent ? `
          <figure class="percent" style="background:${color}">
            ${didnotPercentFormated}%
          </figure>` : '';


        let summary = ct.stripIndent`
        <summary data-percent="${didnotPercentFormated}"><span>${item}</span>
          <figure class="did-not">
            (${didNotRun.toLocaleString()} of
            ${expected.toLocaleString()} were not executed)
          </figure>
          ${percentDisplay}
        </summary>
        `;
        html += toDetails(summary, toHTML(data[item]));
      }
    }
  }

  return html;
}

const html = toHTML(data);

fs.writeFileSync(`./docs/results.html`, html);
