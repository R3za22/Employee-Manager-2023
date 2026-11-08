# Employee Manager (2023)

A single-page Persian (RTL) employee-management screen: list, search by ID, add, edit, toggle active status and group employees, all in the browser.

> **Built for a friend's university project (2023).** I wrote the front end for a friend's course assignment. There is no backend: data lives in an in-memory array in `index.js` and resets on reload. The people in the sample data are fictional, and the national-ID numbers are sample values.

**Stack:** plain HTML, CSS and one ES module, no build step. IRANSans font, Font Awesome Free 5.15.4 (vendored, CC BY 4.0 icons / OFL fonts / MIT code, see `vendor/fontawesome/LICENSE.txt`).

## Demo

```sh
bash demo/build.sh   # writes dist-demo/ (relative paths, works under /demos/employee-manager/)
```

The demo build adds a dismissible banner and nothing else.

## Images

`images/*.jpg` are the page's background photographs from the original assignment; their original source was not recorded. If you know the source or a licence issue, please open an issue and they will be replaced.
