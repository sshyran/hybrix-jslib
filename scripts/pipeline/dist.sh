#!/bin/sh
OLDPATH=$PATH
WHEREAMI=$(pwd)

VERSION="v"$(cat package.json | grep version | cut -d'"' -f4)
echo "[i] Version $VERSION"

COMPONENT=interface

echo "[.] Create service account key (required for gsutil)"
mkdir -p /hybrixd
echo "$SERVICE_ACCOUNT_KEY2" > /hybrixd/key.json

echo "[.] Copy boto file  (required for gsutil)"

echo "$BOTO_CONF" > ~/.boto

echo "[.] Copying to latest folder"

gsutil cp "./hybrix-lib.web.js" "gs://hybrix-dist/$COMPONENT/latest/hybrix-lib.web.js"
gsutil cp "./hybrix-lib.nodejs.js" "gs://hybrix-dist/$COMPONENT/latest/hybrix-lib.nodejs.js"

echo "[.] Copying to version folder"

gsutil cp "./hybrix-lib.web.js" "gs://hybrix-dist/$COMPONENT/$VERSION/hybrix-lib.web.js"
gsutil cp "./hybrix-lib.nodejs.js" "gs://hybrix-dist/$COMPONENT/$VERSION/hybrix-lib.nodejs.js"

export PATH="$OLDPATH"
cd "$WHEREAMI"
exit 0
