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
  <main>
    ${html}
  </main>
`;

fs.writeFileSync(`./docs/results.html`, report);
