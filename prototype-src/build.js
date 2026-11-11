"use strict";

const fs = require("node:fs");
const path = require("node:path");
const renderPage = require("./render-page");

const root = path.join(__dirname, "..");
const template = fs.readFileSync(path.join(__dirname, "template.html"), "utf8").replace(/\r\n/g, "\n");
const files = fs.readdirSync(path.join(__dirname, "assets"));

function build(project) {
  const prefix = project ? "../" : "";
  const assets = extension => Object.fromEntries(
    files.filter(file => path.extname(file) === extension).map(file => [
      path.basename(file, extension), prefix + "prototype-src/assets/" + file
    ])
  );
  const page = renderPage(project || "karluu", assets(".jpg"), assets(".mp4"));
  const values = {
    ROOT: prefix,
    THEME: project || "karluu",
    PROJECT: project ? ' data-project="' + project + '"' : "",
    ...Object.fromEntries(Object.entries(page).map(([key, value]) => ["PAGE_" + key.toUpperCase(), value]))
  };
  const html = template.replace(/__([A-Z_]+)__/g, (token, key) => {
    if (!Object.hasOwn(values, key)) throw new Error("Unknown template marker: " + token);
    return values[key];
  });
  const output = path.join(root, project, "index.html");
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, html.replace(/[ \t]+$/gm, ""));
  console.log("Built " + path.relative(root, output) + " (" + Buffer.byteLength(html) + " bytes)");
}

for (const project of ["", "karluu", "mariupol"]) build(project);
