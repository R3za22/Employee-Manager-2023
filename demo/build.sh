#!/usr/bin/env bash
# Static demo build -> dist-demo/ (served under /demos/employee-manager/; all paths are relative).
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf dist-demo && mkdir dist-demo
cp index.html index.js styles.css dist-demo/
cp -r images fonts vendor dist-demo/
cp demo/banner.js dist-demo/demo-banner.js
perl -0pi -e 's#^/\*!.*?\*/##s' dist-demo/vendor/fontawesome/css/all.min.css
rm -f dist-demo/vendor/fontawesome/LICENSE.txt
sed -i 's#</body>#<script src="demo-banner.js"></script></body>#' dist-demo/index.html
echo "built dist-demo/"
