const fileContents = `
/* main.css */

@import "style.css";
@import  url('./colormode.css');
@import   "./blocks/fonts.sass"
@import "../bootstrap-icons.scss";
@import "../../icons_min.css";

/* custom code */
.btn {
  display: inline-flex;
  gap: 0 4px;
  align-items: center;
}
`

function fixImport(content) {
  const css = content.replace(/@import +([url(]*)["']([./]*)([a-z-_/]+)\.?(.*)['"]\)?/gi, '@import "$2$3"')
  console.log(css)
}

fixImport(fileContents)
